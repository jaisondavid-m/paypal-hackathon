package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/segmentio/kafka-go"

	"proofrail-backend/internal/config"
	"proofrail-backend/internal/database"
	"proofrail-backend/internal/handlers"
	"proofrail-backend/internal/infra"
	"proofrail-backend/internal/middleware"
	"proofrail-backend/internal/services"
)

func main() {
	cfg := config.Load()
	db := database.InitDB(cfg)

	// 1. Initialize Distributed Infrastructure (Redis & Kafka with Graceful Fallback)
	redisClient := infra.NewRedisClient(cfg.RedisURL)
	kafkaProducer := infra.NewKafkaProducer(cfg.KafkaBrokers)

	// 2. Initialize Services (Injected with Redis caching & write-behind queues)
	timelineService := services.NewTimelineService(db, redisClient)
	defer timelineService.Close()

	authService := services.NewAuthService(db, cfg)
	txService := services.NewTransactionService(db, timelineService)
	agreementService := services.NewAgreementService(db, cfg, timelineService)
	aiService := services.NewAIService(db, cfg)
	paypalService := services.NewPayPalService(db, cfg, timelineService, aiService)
	evidenceService := services.NewEvidenceService(db, cfg, timelineService, aiService)
	disputeService := services.NewDisputeService(db, aiService, timelineService, redisClient)

	// 3. Initialize Handlers
	authHandler := handlers.NewAuthHandler(authService)
	txHandler := handlers.NewTransactionHandler(txService, aiService)
	agreementHandler := handlers.NewAgreementHandler(agreementService, aiService)
	paypalHandler := handlers.NewPayPalHandler(paypalService, kafkaProducer, redisClient)
	evidenceHandler := handlers.NewEvidenceHandler(evidenceService, txService, aiService, timelineService)
	disputeHandler := handlers.NewDisputeHandler(disputeService)
	demoHandler := handlers.NewDemoHandler(db, cfg)

	// 4. Start Background Kafka Consumer for Webhook Events (if Kafka is available)
	if kafkaProducer.IsAvailable() {
		ctx := context.Background()
		brokers := strings.Split(cfg.KafkaBrokers, ",")
		infra.StartConsumer(ctx, brokers, "paypal.dispute.webhooks", "proofrail-webhook-group", func(msg kafka.Message) error {
			var env handlers.WebhookPayloadEnvelope
			if err := json.Unmarshal(msg.Value, &env); err != nil {
				return err
			}
			headers := http.Header{}
			for k, v := range env.Headers {
				headers[k] = v
			}
			log.Printf("[Kafka Consumer] Processing streamed webhook event (Key: %s)\n", string(msg.Key))
			return paypalService.ProcessWebhook(headers, []byte(env.Body))
		})
	}

	r := gin.Default()

	// Global Middleware
	r.Use(middleware.CORSMiddleware())

	// Static file serving for evidence attachments
	r.Static("/uploads", cfg.StorageDir)

	// Health Check with Distributed Topology Status
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":      "ok",
			"app":         "ProofRail AI API",
			"version":     "1.0.0",
			"environment": "enterprise",
			"tagline":     "From what was promised to what can be proven",
			"topology": gin.H{
				"redis_cache_available":   redisClient.IsAvailable(),
				"kafka_stream_available":  kafkaProducer.IsAvailable(),
				"db_driver":              cfg.DBDriver,
				"write_behind_batching":  redisClient.IsAvailable(),
			},
		})
	})

	// Demo Seeder
	r.POST("/api/demo/seed", demoHandler.Seed)

	// Public Routes
	api := r.Group("/api")
	{
		// Auth
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		// Public Agreement Review & Approval Portal
		public := api.Group("/public")
		{
			public.GET("/agreements/:token", agreementHandler.GetPublicAgreement)
			public.POST("/agreements/:token/approve", agreementHandler.ApprovePublicAgreement)
		}

		// PayPal Webhooks (verified, idempotent with Redis + Kafka async pipeline)
		api.POST("/webhooks/paypal", paypalHandler.Webhook)

		// Protected Routes
		protected := api.Group("/")
		protected.Use(middleware.AuthRequired(cfg))
		{
			// Current user
			protected.GET("/auth/me", authHandler.Me)

			// Dashboard
			protected.GET("/dashboard/metrics", txHandler.DashboardMetrics)

			// Transactions
			protected.POST("/transactions", txHandler.Create)
			protected.GET("/transactions", txHandler.List)
			protected.GET("/transactions/:id", txHandler.GetByID)
			protected.PATCH("/transactions/:id", txHandler.Update)

			// AI Agreement Extraction
			protected.POST("/ai/extract-agreement", agreementHandler.ExtractTerms)
			protected.POST("/transactions/:id/ai/extract-agreement", agreementHandler.ExtractTerms)

			// Agreements & Approvals
			protected.POST("/transactions/:id/agreements", agreementHandler.SaveAgreement)
			protected.POST("/transactions/:id/agreements/approval-link", agreementHandler.GenerateApprovalLink)

			// PayPal Sandbox Order & Capture (with strict money guard)
			protected.POST("/transactions/:id/paypal/order", middleware.RejectMoneyFieldsInBody(), paypalHandler.CreateOrder)
			protected.POST("/paypal/orders/:orderId/capture", paypalHandler.CaptureOrder)

			// Real PayPal Disputes API
			protected.GET("/paypal/disputes", paypalHandler.ListDisputes)
			protected.GET("/paypal/disputes/:disputeId", paypalHandler.GetDispute)
			protected.POST("/paypal/disputes/:disputeId/provide-evidence", paypalHandler.ProvideEvidence)

			// Pre-Dispute Health Check (Unique Selling Point)
			protected.POST("/transactions/:id/health-check", txHandler.HealthCheck)
			protected.POST("/health-check/scan-all", txHandler.ScanAllHealth)

			// Evidence Vault & Timeline
			protected.POST("/transactions/:id/evidence/url", evidenceHandler.AddURL)
			protected.POST("/transactions/:id/evidence/upload", evidenceHandler.UploadFile)
			protected.GET("/transactions/:id/evidence", evidenceHandler.List)
			protected.DELETE("/evidence/:id", evidenceHandler.Delete)
			protected.POST("/transactions/:id/evidence/analyze", evidenceHandler.AnalyzeGaps)
			protected.GET("/transactions/:id/timeline", evidenceHandler.Timeline)

			// Disputes & Grounded Reports
			protected.GET("/disputes", disputeHandler.List)
			protected.POST("/transactions/:id/disputes", disputeHandler.Create)
			protected.GET("/disputes/:id", disputeHandler.GetByID)
			protected.POST("/disputes/:id/report", disputeHandler.GenerateReport)
			protected.GET("/disputes/:id/report", disputeHandler.GetReport)
		}
	}

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("[ProofRail API] Starting server on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Server startup failed: %v", err)
	}
}
