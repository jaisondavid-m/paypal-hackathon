package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"proofrail-backend/internal/services"
)

type TransactionHandler struct {
	txService *services.TransactionService
	aiService *services.AIService
}

func NewTransactionHandler(txService *services.TransactionService, aiService *services.AIService) *TransactionHandler {
	return &TransactionHandler{txService: txService, aiService: aiService}
}

func (h *TransactionHandler) Create(c *gin.Context) {
	userID := c.GetString("userID")
	var input services.CreateTransactionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	tx, err := h.txService.Create(userID, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "CREATION_FAILED", "message": err.Error()},
		})
		return
	}

	// Run initial baseline pre-dispute health check
	if h.aiService != nil {
		_, _ = h.aiService.RunHealthCheck(tx)
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": tx,
		"meta": gin.H{"status": "success"},
	})
}

func (h *TransactionHandler) List(c *gin.Context) {
	userID := c.GetString("userID")
	statusFilter := c.Query("status")
	search := c.Query("search")

	list, err := h.txService.List(userID, statusFilter, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "FETCH_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": list,
		"meta": gin.H{"total": len(list)},
	})
}

func (h *TransactionHandler) GetByID(c *gin.Context) {
	userID := c.GetString("userID")
	id := c.Param("id")

	tx, err := h.txService.GetByID(userID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Transaction not found"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": tx,
		"meta": gin.H{"status": "success"},
	})
}

func (h *TransactionHandler) Update(c *gin.Context) {
	userID := c.GetString("userID")
	id := c.Param("id")

	var input services.UpdateTransactionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	tx, err := h.txService.Update(userID, id, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "UPDATE_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": tx,
		"meta": gin.H{"status": "success"},
	})
}

func (h *TransactionHandler) DashboardMetrics(c *gin.Context) {
	userID := c.GetString("userID")
	metrics, err := h.txService.GetDashboardMetrics(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "METRICS_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": metrics,
		"meta": gin.H{"status": "success"},
	})
}

// HealthCheck executes the Pre-Dispute Health Check on a transaction
func (h *TransactionHandler) HealthCheck(c *gin.Context) {
	userID := c.GetString("userID")
	id := c.Param("id")

	tx, err := h.txService.GetByID(userID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Transaction not found"},
		})
		return
	}

	result, err := h.aiService.RunHealthCheck(tx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "HEALTH_CHECK_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
		"meta": gin.H{"status": "success", "health_score": result.HealthScore, "risk_level": result.RiskLevel},
	})
}

// ScanAllHealth re-scans all active transactions and records audit logs
func (h *TransactionHandler) ScanAllHealth(c *gin.Context) {
	userID := c.GetString("userID")

	count, err := h.aiService.ScanAllHealthChecks(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "SCAN_ALL_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{"scanned_count": count},
		"meta": gin.H{"status": "success", "message": "Portfolio transactions re-scanned and audited"},
	})
}
