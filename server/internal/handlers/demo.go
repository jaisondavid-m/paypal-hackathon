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
	database.SeedAllUsers(h.db)

	var user models.User
	_ = h.db.Where("email = ?", "demo@proofrail.ai").First(&user)
	token, _ := middleware.GenerateToken(user.ID, user.Email, h.cfg)

	var alexTx models.Transaction
	_ = h.db.Where("(transaction_code = 'PR-2026-9021' OR transaction_code = 'PR-DEMO-9021') AND user_id = ?", user.ID).First(&alexTx)
	if alexTx.ID == "" {
		_ = h.db.Where("user_id = ? AND status = ?", user.ID, "DELIVERED").First(&alexTx)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"message":        "All lifecycle transaction scenarios seeded successfully!",
			"user":           user,
			"token":          token,
			"transaction_id": alexTx.ID,
		},
		"meta": gin.H{"status": "seeded"},
	})
}
