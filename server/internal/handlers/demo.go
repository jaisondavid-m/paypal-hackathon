package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"proofrail-backend/internal/config"
	"proofrail-backend/internal/database"
	"proofrail-backend/internal/middleware"
	"proofrail-backend/internal/models"
)

type DemoHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewDemoHandler(db *gorm.DB, cfg *config.Config) *DemoHandler {
	return &DemoHandler{db: db, cfg: cfg}
}

func (h *DemoHandler) Seed(c *gin.Context) {
	demoUser := database.EnsureDemoUser(h.db)
	database.SeedComprehensiveTransactionsForUser(h.db, demoUser)

	token, err := middleware.GenerateToken(demoUser.ID, demoUser.Email, h.cfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "TOKEN_ERROR", "message": "Failed to generate demo authentication token"},
		})
		return
	}

	var alexTx models.Transaction
	_ = h.db.Where("user_id = ? AND (transaction_code = 'PR-DEMO-9021' OR transaction_code = 'PR-2026-9021')", demoUser.ID).First(&alexTx)
	if alexTx.ID == "" {
		_ = h.db.Where("user_id = ?", demoUser.ID).Order("created_at desc").First(&alexTx)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"message":        "All lifecycle transaction scenarios seeded successfully!",
			"user":           demoUser,
			"token":          token,
			"transaction_id": alexTx.ID,
		},
		"meta": gin.H{"status": "seeded"},
	})
}
