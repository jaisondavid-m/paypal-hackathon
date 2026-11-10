package database

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"proofrail-backend/internal/models"
)

// SeedAllUsers checks all registered users and seeds a comprehensive transaction portfolio
func SeedAllUsers(db *gorm.DB) {
	// Ensure default demo user exists
	var demoUser models.User
	err := db.Where("email = ?", "demo@proofrail.ai").First(&demoUser).Error
	if err != nil {
		hash, _ := bcrypt.GenerateFromPassword([]byte("demo123456"), bcrypt.DefaultCost)
		demoUser = models.User{
			ID:           uuid.New().String(),
			Name:         "Jaison Dev",
			Email:        "demo@proofrail.ai",
			PasswordHash: string(hash),
			BusinessName: "Jaison Digital Studio",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}
		if err := db.Create(&demoUser).Error; err != nil {
			_ = db.Where("email = ?", "demo@proofrail.ai").First(&demoUser)
		}
	} else {
		demoUser.Name = "Jaison Dev"
		demoUser.BusinessName = "Jaison Digital Studio"
		db.Save(&demoUser)
	}

	// Fetch all users across the system (e.g. demo@proofrail.ai, connect@jaisondavid.in, etc.)
	var users []models.User
	if err := db.Find(&users).Error; err != nil || len(users) == 0 {
		users = []models.User{demoUser}
	}

	for _, u := range users {
		SeedComprehensiveTransactionsForUser(db, u)
	}
}

// SeedComprehensiveTransactionsForUser populates all lifecycle transaction scenarios for a user
func SeedComprehensiveTransactionsForUser(db *gorm.DB, user models.User) {
	type txDef struct {
		code         string
		customerName string
		customerMail string
		title        string
		description  string
		origRequest  string
		amount       float64
		currency     string
		status       string
		deadlineDays int
		createdDelta time.Duration
		updatedDelta time.Duration

		// Agreement terms
		delivs       []string
		resps        []string
		acceptCrit   string
		refundTerms  string
		revisionPol  string
		score        int
		missingInfo  []string
		ambiguities  []string
		agStatus     string

		// Customer approval
		hasApproval bool
		apprDelta   time.Duration
		apprNote    string

		// Payment
		hasPayment   bool
		payOrderID   string
		payCaptureID string
		payDelta     time.Duration

		// Evidence
		evidences []struct {
			evType   string
			fileName string
			url      string
			desc     string
			size     int64
			mime     string
			delta    time.Duration
		}

		// Dispute
		hasDispute bool
		dispReason string
		dispAmount float64
		dispDue    time.Duration

		// Timeline
		events []struct {
			evType    string
			actorType string
			actorID   string
			title     string
			desc      string
			delta     time.Duration
		}
	}

	scenarios := []txDef{
		// 1. DELIVERED: Alex Morgan ($2,000) - Logistics Website
		{
			code:         "PR-2026-9021",
			customerName: "Alex Morgan",
			customerMail: "alex.morgan@example.com",
			title:        "Business Website Development",
			description:  "Five-page responsive logistics website with interactive quote form and secure admin dashboard.",
			origRequest:  "Hi Jaison, I need a business website for Morgan Logistics with five pages, responsive design, a contact form, and an admin dashboard. Budget is $2,000. Delivery within 20 days. Two rounds of revisions included.",
			amount:       2000.00,
			currency:     "USD",
			status:       models.StatusDelivered,
			deadlineDays: 20,
			createdDelta: -15 * 24 * time.Hour,
			updatedDelta: -2 * 24 * time.Hour,
			delivs: []string{
				"Five-page responsive business website (Home, About, Services, Fleet, Contact)",
				"Interactive customer inquiry form with email routing",
				"Secure administrative portal for managing incoming quotes",
				"Production deployment to custom domain with SSL",
			},
			resps: []string{
				"Customer: Provide brand identity guidelines, high-res photos, and fleet details within 48 hours.",
				"Merchant: Deliver staging environment within 14 days; final deployment within 20 days.",
			},
			acceptCrit:  "Customer completes functional acceptance testing within 5 business days after staging preview.",
			refundTerms: "Deposits and progress disbursements are non-refundable once design approvals and staging builds are released.",
			revisionPol: "Two comprehensive rounds of design and content adjustments.",
			score:       92,
			missingInfo: []string{"Web hosting server ownership not designated"},
			ambiguities: []string{"Admin authentication session duration"},
			agStatus:    "APPROVED",
			hasApproval: true,
			apprDelta:   -13 * 24 * time.Hour,
			apprNote:    "Scope and pricing verified. Ready to begin work.",
			hasPayment:   true,
			payOrderID:   "5O190127TN364715T",
			payCaptureID: "7E298134UP981023X",
			payDelta:     -12 * 24 * time.Hour,
			evidences: []struct {
				evType   string
				fileName string
				url      string
				desc     string
				size     int64
				mime     string
				delta    time.Duration
			}{
				{
					evType: models.EvidenceDeploymentURL,
					url:    "https://morgan-logistics.preview.proofrail.app",
					desc:   "Staging & Production Deployment URL for Alex Morgan website",
					delta:  -5 * 24 * time.Hour,
				},
				{
					evType:   models.EvidenceDeliveryScreenshot,
					fileName: "morgan_logistics_homepage_responsive_final.png",
					desc:     "Full responsive multi-device verification screenshot",
					size:     1428500,
					mime:     "image/png",
					delta:    -4 * 24 * time.Hour,
				},
			},
			events: []struct {
				evType    string
				actorType string
				actorID   string
				title     string
				desc      string
				delta     time.Duration
			}{
				{
					evType:    "TRANSACTION_CREATED",
					actorType: "MERCHANT",
					title:     "Transaction Created",
					desc:      "Initiated $2,000 project record for customer Alex Morgan.",
					delta:     -15 * 24 * time.Hour,
				},
				{
					evType:    "AGREEMENT_APPROVED",
					actorType: "CUSTOMER",
					title:     "Agreement Version 1 Approved",
					desc:      "Customer Alex Morgan reviewed and approved agreement v1 via secure tokenized portal.",
					delta:     -13 * 24 * time.Hour,
				},
				{
					evType:    "PAYMENT_CAPTURED",
					actorType: "PAYPAL",
					title:     "PayPal Payment Captured",
					desc:      "PayPal Sandbox capture of $2,000.00 USD confirmed (Capture ID: 7E298134UP981023X).",
					delta:     -12 * 24 * time.Hour,
				},
				{
					evType:    "DELIVERY_RECORDED",
					actorType: "MERCHANT",
					title:     "Production Deployment URL Attached",
					desc:      "Added deployment access link: https://morgan-logistics.preview.proofrail.app",
					delta:     -5 * 24 * time.Hour,
				},
			},
		},

		// 2. DISPUTED: David Miller ($3,500) - Custom SaaS API & Webhook Service
		{
			code:         "PR-2026-8840",
			customerName: "David Miller",
			customerMail: "david.miller@apextech.io",
			title:        "Custom SaaS API & Webhook Service",
			description:  "High-throughput payment webhook router and Go microservice with OpenAPI specification.",
			origRequest:  "Hi Jaison, we need a high-performance webhook processing service that integrates with our billing engine. Budget is $3,500 USD with complete Swagger docs, unit tests, and production deployment within 30 days.",
			amount:       3500.00,
			currency:     "USD",
			status:       models.StatusDisputed,
			deadlineDays: 30,
			createdDelta: -25 * 24 * time.Hour,
			updatedDelta: -1 * 24 * time.Hour,
			delivs: []string{
				"Idempotent PayPal & Stripe webhook ingress service with HMAC validation",
				"OpenAPI 3.0 Swagger interactive API documentation",
				"Automated test suite achieving >85% code coverage",
				"Docker container orchestration files & Kubernetes deployment manifests",
			},
			resps: []string{
				"Customer: Provide sandbox test credentials and webhook event schemas within 3 days.",
				"Merchant: Deliver staging API container within 20 days; final production deployment within 30 days.",
			},
			acceptCrit:  "Webhook service passes 10,000 synthetic event load test with 0 dropped events.",
			refundTerms: "Milestone payments are non-refundable once staging build and source repository access are granted.",
			revisionPol: "Three rounds of architectural refinement during testing window.",
			score:       96,
			missingInfo: []string{},
			ambiguities: []string{},
			agStatus:    "APPROVED",
			hasApproval: true,
			apprDelta:   -24 * 24 * time.Hour,
			apprNote:    "Architecture and OpenAPI deliverables agreed. Proceeding with project.",
			hasPayment:   true,
			payOrderID:   "9B291048PX771029T",
			payCaptureID: "8R391024PL551092M",
			payDelta:     -23 * 24 * time.Hour,
			evidences: []struct {
				evType   string
				fileName string
				url      string
				desc     string
				size     int64
				mime     string
				delta    time.Duration
			}{
				{
					evType: models.EvidenceDeploymentURL,
					url:    "https://github.com/apextech-demo/webhook-service/releases/tag/v1.0.0",
					desc:   "GitHub Release Tag v1.0.0 with signed git commits and deployment verification",
					delta:  -6 * 24 * time.Hour,
				},
				{
					evType:   models.EvidenceDeliveryFile,
					fileName: "openapi_webhook_service_spec_final.json",
					desc:     "Complete verified OpenAPI 3.0 specification file matching deliverables",
					size:     184500,
					mime:     "application/json",
					delta:    -5 * 24 * time.Hour,
				},
			},
			hasDispute: true,
			dispReason: "MERCHANDISE_OR_SERVICES_NOT_AS_DESCRIBED",
			dispAmount: 3500.00,
			dispDue:    3 * 24 * time.Hour,
			events: []struct {
				evType    string
				actorType string
				actorID   string
				title     string
				desc      string
				delta     time.Duration
			}{
				{
					evType:    "TRANSACTION_CREATED",
					actorType: "MERCHANT",
					title:     "Transaction Created",
					desc:      "Initiated $3,500 custom API service for David Miller (ApexTech).",
					delta:     -25 * 24 * time.Hour,
				},
				{
					evType:    "AGREEMENT_APPROVED",
					actorType: "CUSTOMER",
					title:     "Agreement Approved by Customer",
					desc:      "David Miller signed off on OpenAPI deliverables and non-refundable terms.",
					delta:     -24 * 24 * time.Hour,
				},
				{
					evType:    "PAYMENT_CAPTURED",
					actorType: "PAYPAL",
					title:     "PayPal Payment Captured ($3,500.00 USD)",
					desc:      "Capture ID: 8R391024PL551092M recorded to transaction ledger.",
					delta:     -23 * 24 * time.Hour,
				},
				{
					evType:    "DELIVERY_RECORDED",
					actorType: "MERCHANT",
					title:     "GitHub v1.0.0 Release Tag Logged",
					desc:      "Production code delivered to repository with SHA-256 evidence hash.",
					delta:     -6 * 24 * time.Hour,
				},
				{
					evType:    "DISPUTE_FILED",
					actorType: "CUSTOMER",
					title:     "Customer Dispute Opened",
					desc:      "Customer claimed 'Item Not As Described' (PayPal Dispute ID: PP-D-2026-99120).",
					delta:     -1 * 24 * time.Hour,
				},
				{
					evType:    "EVIDENCE_REPORT_GENERATED",
					actorType: "AI",
					title:     "AI Source-Grounded Evidence Dossier Compiled",
					desc:      "ProofRail compiled 12-section evidence report with 100% agreement and PayPal match.",
					delta:     -12 * time.Hour,
				},
			},
		},

		// 3. IN_PROGRESS: Sophia Williams ($2,800) - Mobile iOS Figma-to-Flutter Prototype
		{
			code:         "PR-2026-7731",
			customerName: "Sophia Williams",
			customerMail: "sophia.w@veloxdesigns.co",
			title:        "Mobile iOS App Figma-to-Flutter Prototype",
			description:  "Cross-platform 12-screen mobile prototype with custom interactions and state management.",
			origRequest:  "Hi Jaison, looking for an expert Flutter developer to turn our 12 Figma screens into a functional iOS prototype with authentication and responsive layouts. Budget is $2,800 USD.",
			amount:       2800.00,
			currency:     "USD",
			status:       models.StatusInProgress,
			deadlineDays: 25,
			createdDelta: -10 * 24 * time.Hour,
			updatedDelta: -3 * 24 * time.Hour,
			delivs: []string{
				"12 high-fidelity Flutter interactive screen layouts matching Figma designs",
				"Component design system and reusable widget library",
				"TestFlight beta testing build invitation for iOS review",
				"Clean documented GitHub repository with README instructions",
			},
			resps: []string{
				"Customer: Provide exported Figma vector assets and copy within 4 business days.",
				"Merchant: Deliver first 6 screen prototype within 12 days; final TestFlight build within 25 days.",
			},
			acceptCrit:  "Screens render on iPhone 15/16 with 60fps scrolling and responsive layout.",
			refundTerms: "Milestone 1 deposit is non-refundable upon delivery of the interactive design system.",
			revisionPol: "Two rounds of visual polishing based on customer TestFlight feedback.",
			score:       88,
			missingInfo: []string{"Backend REST API endpoints not yet ready; using mock JSON data"},
			ambiguities: []string{},
			agStatus:    "APPROVED",
			hasApproval: true,
			apprDelta:   -9 * 24 * time.Hour,
			apprNote:    "Designs and milestone phases look great. Payment submitted via PayPal.",
			hasPayment:   true,
			payOrderID:   "4C189022RM661902P",
			payCaptureID: "2X981033TN441019K",
			payDelta:     -9 * 24 * time.Hour,
			evidences: []struct {
				evType   string
				fileName string
				url      string
				desc     string
				size     int64
				mime     string
				delta    time.Duration
			}{
				{
					evType: models.EvidenceDeploymentURL,
					url:    "https://testflight.apple.com/join/proofrail-velox-preview",
					desc:   "Apple TestFlight Beta Distribution Link for Sophia Williams review",
					delta:  -3 * 24 * time.Hour,
				},
				{
					evType:   models.EvidenceDeliveryFile,
					fileName: "velox_design_system_components_export.pdf",
					desc:     "Milestone 1 UI Component & Typography Audit Spec",
					size:     2450000,
					mime:     "application/pdf",
					delta:    -3 * 24 * time.Hour,
				},
			},
			events: []struct {
				evType    string
				actorType string
				actorID   string
				title     string
				desc      string
				delta     time.Duration
			}{
				{
					evType:    "TRANSACTION_CREATED",
					actorType: "MERCHANT",
					title:     "Transaction Created",
					desc:      "Created $2,800 Flutter mobile prototype transaction for Sophia Williams.",
					delta:     -10 * 24 * time.Hour,
				},
				{
					evType:    "AGREEMENT_APPROVED",
					actorType: "CUSTOMER",
					title:     "Agreement Approved by Customer",
					desc:      "Sophia Williams approved v1 terms via token link.",
					delta:     -9 * 24 * time.Hour,
				},
				{
					evType:    "PAYMENT_CAPTURED",
					actorType: "PAYPAL",
					title:     "PayPal Payment Captured ($2,800.00 USD)",
					desc:      "PayPal Sandbox capture 2X981033TN441019K verified.",
					delta:     -9 * 24 * time.Hour,
				},
				{
					evType:    "MILESTONE_COMPLETED",
					actorType: "MERCHANT",
					title:     "Milestone 1 TestFlight Build Published",
					desc:      "Uploaded design system document and invited client to TestFlight build.",
					delta:     -3 * 24 * time.Hour,
				},
			},
		},

		// 4. APPROVED: Marcus Chen ($1,500) - Investor Pitch Deck & Financial Portal
		{
			code:         "PR-2026-6512",
			customerName: "Marcus Chen",
			customerMail: "marcus@horizonventures.vc",
			title:        "Investor Pitch Deck & Financial Model Web Portal",
			description:  "Interactive web-based investor deck with dynamic CAC/LTV charts and password protection.",
			origRequest:  "Hi Jaison, we need an investor portal with an interactive financial forecast model for our Series A fundraise. Total budget is $1,500 USD within 14 days.",
			amount:       1500.00,
			currency:     "USD",
			status:       models.StatusApproved,
			deadlineDays: 14,
			createdDelta: -4 * 24 * time.Hour,
			updatedDelta: -1 * 24 * time.Hour,
			delivs: []string{
				"Password-protected web portal with interactive Chart.js financial projections",
				"Responsive investor pitch presentation with downloadable PDF deck",
				"Google Sheets / CSV sync for dynamic revenue data updates",
			},
			resps: []string{
				"Customer: Provide audited cap table assumptions and CAC metrics within 48 hours.",
				"Merchant: Deliver private preview link within 10 days; final deployment within 14 days.",
			},
			acceptCrit:  "Financial calculator verified against client Excel spreadsheet model.",
			refundTerms: "Upfront retainer is non-refundable once initial portal structure is deployed.",
			revisionPol: "Up to three rounds of financial metric adjustments.",
			score:       94,
			missingInfo: []string{},
			ambiguities: []string{},
			agStatus:    "APPROVED",
			hasApproval: true,
			apprDelta:   -1 * 24 * time.Hour,
			apprNote:    "Deliverables and security provisions approved. Ready to proceed to payment.",
			hasPayment:  false, // Awaiting PayPal checkout payment
			events: []struct {
				evType    string
				actorType string
				actorID   string
				title     string
				desc      string
				delta     time.Duration
			}{
				{
					evType:    "TRANSACTION_CREATED",
					actorType: "MERCHANT",
					title:     "Transaction Created",
					desc:      "Created $1,500 financial portal project for Marcus Chen.",
					delta:     -4 * 24 * time.Hour,
				},
				{
					evType:    "AGREEMENT_APPROVED",
					actorType: "CUSTOMER",
					title:     "Agreement Approved by Customer",
					desc:      "Customer Marcus Chen reviewed and approved agreement v1 terms.",
					delta:     -1 * 24 * time.Hour,
				},
			},
		},

		// 5. AGREEMENT_PENDING: Elena Rostova ($1,800 EUR) - Brand Identity & Packaging Suite
		{
			code:         "PR-2026-5290",
			customerName: "Elena Rostova",
			customerMail: "elena.r@nordiccraft.eu",
			title:        "Brand Identity & Packaging Vector Suite",
			description:  "Complete visual brand identity system, vector logo marks, typography standards, and packaging label templates.",
			origRequest:  "Hi Jaison, looking for a full visual identity for our Nordic lifestyle brand, including logo, color palette, and label designs for 4 product packaging bottles. Budget is 1,800 EUR.",
			amount:       1800.00,
			currency:     "EUR",
			status:       models.StatusAgreementPending,
			deadlineDays: 18,
			createdDelta: -2 * 24 * time.Hour,
			updatedDelta: -2 * 24 * time.Hour,
			delivs: []string{
				"Vector logo suite in AI, SVG, PNG, and monochrome variations",
				"Complete brand guidelines document (typography, color codes, spacing rules)",
				"Print-ready CMYK label vector templates for 4 bottle SKUs",
			},
			resps: []string{
				"Customer: Provide product bottle dimensions and barcode details within 3 days.",
				"Merchant: Present initial 3 concept directions within 10 days.",
			},
			acceptCrit:  "Files exported in CMYK 300 DPI with 3mm bleed requirements.",
			refundTerms: "Concept research phase fee (30%) is non-refundable once concepts are presented.",
			revisionPol: "Two rounds of revisions on selected concept direction.",
			score:       78,
			missingInfo: []string{
				"Commercial font license ownership not designated",
				"Printer bleed specifications pending from European packaging supplier",
			},
			ambiguities: []string{"Timeline for client revision response is not designated"},
			agStatus:    "PENDING_APPROVAL",
			hasApproval: false,
			hasPayment:  false,
			events: []struct {
				evType    string
				actorType string
				actorID   string
				title     string
				desc      string
				delta     time.Duration
			}{
				{
					evType:    "TRANSACTION_CREATED",
					actorType: "MERCHANT",
					title:     "Transaction & Agreement v1 Drafted",
					desc:      "Drafted 1,800 EUR brand package. Preflight detected 2 missing terms.",
					delta:     -2 * 24 * time.Hour,
				},
				{
					evType:    "AGREEMENT_SHARED",
					actorType: "MERCHANT",
					title:     "Agreement Sent to Customer",
					desc:      "Shared public review link with Elena Rostova (pending approval).",
					delta:     -2 * 24 * time.Hour,
				},
			},
		},

		// 6. COMPLETED: Liam O'Connor ($1,200) - PostgreSQL Database Tuning
		{
			code:         "PR-2026-4105",
			customerName: "Liam O'Connor",
			customerMail: "liam@celtictech.ie",
			title:        "PostgreSQL Database Performance Tuning",
			description:  "Slow query profiling, composite index optimization, and connection pooler configuration for high concurrency.",
			origRequest:  "Hi Jaison, our production Postgres instance has query latency spikes during peak hours. Need database optimization, query review, and pgBouncer setup. Budget is $1,200 USD.",
			amount:       1200.00,
			currency:     "USD",
			status:       models.StatusCompleted,
			deadlineDays: 7,
			createdDelta: -35 * 24 * time.Hour,
			updatedDelta: -28 * 24 * time.Hour,
			delivs: []string{
				"Slow query analysis report identifying top 10 bottleneck queries",
				"Migration script adding composite indexes and vacuum optimizations",
				"pgBouncer connection pooling configuration reducing server load by 40%",
			},
			resps: []string{
				"Customer: Provide staging replica database access and telemetry logs.",
				"Merchant: Complete analysis and optimization rollout within 7 business days.",
			},
			acceptCrit:  "Median query latency reduced below 50ms under simulated production load.",
			refundTerms: "Service fee is earned upon delivery of verified latency reduction metrics.",
			revisionPol: "One week of post-deployment monitoring included.",
			score:       100,
			missingInfo: []string{},
			ambiguities: []string{},
			agStatus:    "APPROVED",
			hasApproval: true,
			apprDelta:   -34 * 24 * time.Hour,
			apprNote:    "Requirements and performance threshold targets approved.",
			hasPayment:   true,
			payOrderID:   "3K110294PP441098A",
			payCaptureID: "9Q881023LK119022Z",
			payDelta:     -34 * 24 * time.Hour,
			evidences: []struct {
				evType   string
				fileName string
				url      string
				desc     string
				size     int64
				mime     string
				delta    time.Duration
			}{
				{
					evType:   models.EvidenceDeliveryFile,
					fileName: "pg_stat_statements_benchmark_after_tuning.pdf",
					desc:     "Final verification telemetry report showing 62% query latency reduction",
					size:     895000,
					mime:     "application/pdf",
					delta:    -29 * 24 * time.Hour,
				},
				{
					evType: models.EvidenceCustomerAcknowledgment,
					url:    "https://celtictech.slack.com/archives/C06TUNING/p170882190",
					desc:   "Customer written acknowledgment and performance validation signoff",
					delta:  -28 * 24 * time.Hour,
				},
			},
			events: []struct {
				evType    string
				actorType string
				actorID   string
				title     string
				desc      string
				delta     time.Duration
			}{
				{
					evType:    "TRANSACTION_CREATED",
					actorType: "MERCHANT",
					title:     "Transaction Created",
					desc:      "Created $1,200 database tuning project for Liam O'Connor.",
					delta:     -35 * 24 * time.Hour,
				},
				{
					evType:    "AGREEMENT_APPROVED",
					actorType: "CUSTOMER",
					title:     "Agreement Approved",
					desc:      "Customer approved performance SLAs and delivery scope.",
					delta:     -34 * 24 * time.Hour,
				},
				{
					evType:    "PAYMENT_CAPTURED",
					actorType: "PAYPAL",
					title:     "PayPal Payment Captured ($1,200.00 USD)",
					desc:      "PayPal Sandbox capture ID 9Q881023LK119022Z recorded.",
					delta:     -34 * 24 * time.Hour,
				},
				{
					evType:    "DELIVERY_RECORDED",
					actorType: "MERCHANT",
					title:     "Benchmark Report Attached",
					desc:      "Uploaded pg_stat_statements verification report.",
					delta:     -29 * 24 * time.Hour,
				},
				{
					evType:    "CUSTOMER_ACKNOWLEDGEMENT",
					actorType: "CUSTOMER",
					title:     "Customer Signoff Received",
					desc:      "Liam O'Connor validated query benchmarks and confirmed project completion.",
					delta:     -28 * 24 * time.Hour,
				},
			},
		},

		// 7. DRAFT: Rachel Adams ($4,200) - AI Customer Support RAG Bot Integration
		{
			code:         "PR-2026-3018",
			customerName: "Rachel Adams",
			customerMail: "rachel.a@catalystgroup.com",
			title:        "AI Customer Support RAG Bot Integration",
			description:  "Context-aware support knowledge base chatbot integrated with company documentation and automated escalation.",
			origRequest:  "Hi Jaison, we want an AI chatbot powered by Gemini that answers customer queries from our Notion docs and escalates to our support desk when confidence is low. Budget $4,200 USD within 3 weeks.",
			amount:       4200.00,
			currency:     "USD",
			status:       models.StatusDraft,
			deadlineDays: 21,
			createdDelta: -6 * time.Hour,
			updatedDelta: -6 * time.Hour,
			delivs: []string{
				"Vector embedding pipeline syncing Notion documentation to Pinecone database",
				"Gemini 1.5 Flash conversational assistant with source citation grounding",
				"Zendesk ticketing webhook fallback for low-confidence answers",
			},
			resps: []string{
				"Customer: Provide Notion API token and Zendesk webhook endpoint.",
				"Merchant: Deliver staging chatbot widget within 14 days; production rollout in 21 days.",
			},
			acceptCrit:  "Answer hallucination rate <3% on 200 benchmark customer questions.",
			refundTerms: "Milestone 1 design & architecture deposit non-refundable once ingestion pipeline is built.",
			revisionPol: "Three rounds of prompt engineering and system instruction tuning.",
			score:       70,
			missingInfo: []string{
				"Target monthly query volume for vector database sizing not specified",
			},
			ambiguities: []string{"Data privacy retention policy for chat logs"},
			agStatus:    "DRAFT",
			hasApproval: false,
			hasPayment:  false,
			events: []struct {
				evType    string
				actorType string
				actorID   string
				title     string
				desc      string
				delta     time.Duration
			}{
				{
					evType:    "TRANSACTION_CREATED",
					actorType: "MERCHANT",
					title:     "Draft Transaction Created",
					desc:      "Initial requirements pasted. AI extracted 3 deliverables and detected 1 missing term.",
					delta:     -6 * time.Hour,
				},
			},
		},
	}

	for _, s := range scenarios {
		// Ensure unique transaction code per user account to avoid MySQL unique index collisions
		code := s.code
		if user.Email == "demo@proofrail.ai" {
			code = "PR-DEMO-" + s.code[8:]
		} else if user.Email != "connect@jaisondavid.in" {
			if len(user.ID) >= 4 {
				code = "PR-" + user.ID[:4] + "-" + s.code[8:]
			}
		}

		// Clean up existing transaction with this code for this user if exists
		var existing models.Transaction
		if err := db.Where("transaction_code = ?", code).First(&existing).Error; err == nil {
			db.Exec("DELETE FROM evidence_reports WHERE transaction_id = ?", existing.ID)
			db.Exec("DELETE FROM disputes WHERE transaction_id = ?", existing.ID)
			db.Exec("DELETE FROM timeline_events WHERE transaction_id = ?", existing.ID)
			db.Exec("DELETE FROM evidences WHERE transaction_id = ?", existing.ID)
			db.Exec("DELETE FROM payments WHERE transaction_id = ?", existing.ID)
			db.Exec("DELETE FROM customer_approvals WHERE transaction_id = ?", existing.ID)
			db.Exec("DELETE FROM agreements WHERE transaction_id = ?", existing.ID)
			db.Exec("DELETE FROM transactions WHERE id = ?", existing.ID)
		}

		txID := uuid.New().String()
		tx := models.Transaction{
			ID:              txID,
			UserID:          user.ID,
			TransactionCode: code,
			CustomerName:    s.customerName,
			CustomerEmail:   s.customerMail,
			Title:           s.title,
			Description:     s.description,
			OriginalRequest: s.origRequest,
			Amount:          s.amount,
			Currency:        s.currency,
			Status:          s.status,
			DeadlineDays:    s.deadlineDays,
			CreatedAt:       time.Now().Add(s.createdDelta),
			UpdatedAt:       time.Now().Add(s.updatedDelta),
		}
		if err := db.Create(&tx).Error; err != nil {
			log.Printf("[Seeder] Error creating transaction %s: %v", s.code, err)
			continue
		}

		// Create Agreement
		delivJSON, _ := json.Marshal(s.delivs)
		respJSON, _ := json.Marshal(s.resps)
		missJSON, _ := json.Marshal(s.missingInfo)
		ambigJSON, _ := json.Marshal(s.ambiguities)

		agID := uuid.New().String()
		agreement := models.Agreement{
			ID:                   agID,
			TransactionID:        txID,
			Version:              1,
			Title:                s.title + " Agreement",
			DeliverablesJSON:     string(delivJSON),
			ScopeJSON:            string(delivJSON),
			Amount:               s.amount,
			Currency:             s.currency,
			DeadlineDays:         s.deadlineDays,
			RevisionPolicy:       s.revisionPol,
			ResponsibilitiesJSON: string(respJSON),
			AcceptanceCriteria:   s.acceptCrit,
			RefundTerms:          s.refundTerms,
			ReadinessScore:       s.score,
			MissingInfoJSON:      string(missJSON),
			AmbiguitiesJSON:      string(ambigJSON),
			Status:               s.agStatus,
			CreatedAt:            time.Now().Add(s.createdDelta),
			UpdatedAt:            time.Now().Add(s.updatedDelta),
		}
		_ = db.Create(&agreement)

		// Create Customer Approval if applicable
		if s.hasApproval {
			tokenRaw := "token-" + code + "-" + user.ID[:8]
			tokenHashBytes := sha256.Sum256([]byte(tokenRaw))
			tokenHash := hex.EncodeToString(tokenHashBytes[:])
			apprTime := time.Now().Add(s.apprDelta)

			approval := models.CustomerApproval{
				ID:               uuid.New().String(),
				TransactionID:    txID,
				AgreementID:      agID,
				AgreementVersion: 1,
				TokenHash:        tokenHash,
				CustomerEmail:    s.customerMail,
				ApprovalStatus:   "APPROVED",
				CustomerNotes:    s.apprNote,
				ApprovedAt:       &apprTime,
				ExpiresAt:        time.Now().Add(30 * 24 * time.Hour),
				CreatedAt:        time.Now().Add(s.createdDelta),
			}
			_ = db.Create(&approval)
		}

		// Create Payment if applicable
		if s.hasPayment {
			payment := models.Payment{
				ID:              uuid.New().String(),
				TransactionID:   txID,
				Provider:        "PAYPAL",
				PayPalOrderID:   s.payOrderID,
				PayPalCaptureID: s.payCaptureID,
				Amount:          s.amount,
				Currency:        s.currency,
				PaymentStatus:   "CAPTURED",
				CreatedAt:       time.Now().Add(s.payDelta),
				UpdatedAt:       time.Now().Add(s.payDelta),
			}
			_ = db.Create(&payment)
		}

		// Create Evidence items
		for _, ev := range s.evidences {
			var hStr string
			if ev.url != "" {
				h := sha256.Sum256([]byte(ev.url))
				hStr = hex.EncodeToString(h[:])
			} else {
				h := sha256.Sum256([]byte(ev.fileName + user.ID))
				hStr = hex.EncodeToString(h[:])
			}

			evidence := models.Evidence{
				ID:            uuid.New().String(),
				TransactionID: txID,
				EvidenceType:  ev.evType,
				FileName:      ev.fileName,
				ExternalURL:   ev.url,
				Description:   ev.desc,
				SHA256Hash:    hStr,
				FileSize:      ev.size,
				MimeType:      ev.mime,
				UploadedBy:    user.ID,
				CreatedAt:     time.Now().Add(ev.delta),
			}
			_ = db.Create(&evidence)
		}

		// Create Dispute if applicable
		if s.hasDispute {
			due := time.Now().Add(s.dispDue)
			dispute := models.Dispute{
				ID:              uuid.New().String(),
				TransactionID:   txID,
				PayPalDisputeID: "PP-D-" + code,
				SourceType:      "SIMULATED",
				Reason:          s.dispReason,
				Status:          "OPEN",
				DisputedAmount:  s.dispAmount,
				Currency:        s.currency,
				ResponseDueAt:   &due,
				CreatedAt:       time.Now().Add(-1 * 24 * time.Hour),
				UpdatedAt:       time.Now().Add(-12 * time.Hour),
			}
			_ = db.Create(&dispute)

			// Create pre-compiled Evidence Report Dossier
			repDetails := map[string]interface{}{
				"transaction_code": code,
				"customer_name":    s.customerName,
				"customer_email":   s.customerMail,
				"disputed_amount":  s.dispAmount,
				"currency":         s.currency,
				"executive_summary": "Customer claims services not as described. ProofRail verified agreement v1 was token-signed by customer before payment, PayPal capture ID 8R391024PL551092M was completed, and delivery was completed via GitHub release v1.0.0 and verified OpenAPI spec.",
				"agreement_match":  "100% Match to approved terms",
				"timeline_grounding": "All 6 events cryptographically chronological",
			}
			repJSON, _ := json.Marshal(repDetails)

			rep := models.EvidenceReport{
				ID:            uuid.New().String(),
				TransactionID: txID,
				DisputeID:     dispute.ID,
				Title:         "Source-Grounded Evidence Dossier - " + code,
				Summary:       "12-section dispute response packet with cryptographic evidence verification and PayPal capture proof.",
				ReportJSON:    string(repJSON),
				Status:        "REVIEWED",
				CreatedAt:     time.Now().Add(-12 * time.Hour),
				UpdatedAt:     time.Now().Add(-12 * time.Hour),
			}
			_ = db.Create(&rep)
		}

		// Calculate and populate Pre-Dispute Transaction Health Check
		hScore := 40
		hLevel := "HIGH"
		var hGaps []map[string]string
		var hHelp []string

		if s.hasApproval && s.hasPayment && len(s.evidences) >= 2 {
			hScore = 94
			hLevel = "LOW"
			hGaps = append(hGaps, map[string]string{
				"gap": "DNS Verification Logs",
				"why_it_matters": "DNS record timestamps provide third-party proof of domain switchover.",
				"suggested_action": "Archive WHOIS / DNS lookup verification.",
				"deep_link_field": "DEPLOYMENT_URL",
			})
			hHelp = append(hHelp, "DNS Propagation Screenshot")
		} else if s.hasPayment {
			hScore = 68
			hLevel = "MEDIUM"
			hGaps = append(hGaps, map[string]string{
				"gap": "Missing Full Visual UI Screenshots",
				"why_it_matters": "PayPal adjudicators require visual evidence showing deliverables in action.",
				"suggested_action": "Upload full-page screenshots to Evidence Vault.",
				"deep_link_field": "DELIVERY_SCREENSHOT",
			})
			hGaps = append(hGaps, map[string]string{
				"gap": "Customer Receipt Confirmation Missing",
				"why_it_matters": "Explicit customer acknowledgement eliminates claims that service was never received.",
				"suggested_action": "Record customer sign-off confirmation in Evidence Vault.",
				"deep_link_field": "CUSTOMER_ACKNOWLEDGEMENT",
			})
			hHelp = append(hHelp, "Visual Delivery Screenshots", "Customer Receipt Acknowledgment")
		} else {
			hScore = 35
			hLevel = "HIGH"
			hGaps = append(hGaps, map[string]string{
				"gap": "Customer Agreement Approval Missing",
				"why_it_matters": "Pre-payment approval binds customer to scope and non-refundable terms.",
				"suggested_action": "Send customer approval link and record acceptance.",
				"deep_link_field": "CUSTOMER_APPROVAL",
			})
			hHelp = append(hHelp, "Customer Agreement Approval", "PayPal Payment Capture")
		}

		hReport := map[string]interface{}{
			"health_score": hScore,
			"risk_level": hLevel,
			"top_gaps": hGaps,
			"evidence_that_would_help": hHelp,
			"summary": fmt.Sprintf("Health Score: %d/100 (%s Risk). %d evidentiary gaps identified.", hScore, hLevel, len(hGaps)),
			"scanned_at": time.Now().UTC().Format(time.RFC3339),
		}
		hReportJSON, _ := json.Marshal(hReport)
		db.Model(&models.Transaction{}).Where("id = ?", txID).Updates(map[string]interface{}{
			"health_score": hScore,
			"health_risk_level": hLevel,
			"health_report_json": string(hReportJSON),
		})

		// Create Timeline Events
		for _, ev := range s.events {
			event := models.TimelineEvent{
				ID:            uuid.New().String(),
				TransactionID: txID,
				EventType:     ev.evType,
				ActorType:     ev.actorType,
				ActorID:       user.ID,
				Title:         ev.title,
				Description:   ev.desc,
				CreatedAt:     time.Now().Add(ev.delta),
			}
			_ = db.Create(&event)
		}
	}
	log.Printf("[Seeder] Successfully seeded comprehensive lifecycle transactions for user: %s (%s)", user.Name, user.Email)
}
