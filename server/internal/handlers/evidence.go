package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"proofrail-backend/internal/services"
)

type EvidenceHandler struct {
	evidenceService *services.EvidenceService
	txService       *services.TransactionService
	aiService       *services.AIService
	timelineService *services.TimelineService
}

func NewEvidenceHandler(evidenceService *services.EvidenceService, txService *services.TransactionService, aiService *services.AIService, timelineService *services.TimelineService) *EvidenceHandler {
	return &EvidenceHandler{
		evidenceService: evidenceService,
		txService:       txService,
		aiService:       aiService,
		timelineService: timelineService,
	}
}

func (h *EvidenceHandler) AddURL(c *gin.Context) {
	userID := c.GetString("userID")
	txID := c.Param("id")

	var input services.AddURLEvidenceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	ev, err := h.evidenceService.AddURLEvidence(userID, txID, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "ADD_EVIDENCE_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": ev,
		"meta": gin.H{"status": "success"},
	})
}

func (h *EvidenceHandler) UploadFile(c *gin.Context) {
	userID := c.GetString("userID")
	txID := c.Param("id")

	evidenceType := c.PostForm("evidence_type")
	if evidenceType == "" {
		evidenceType = "DELIVERY_SCREENSHOT"
	}
	description := c.PostForm("description")

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "FILE_REQUIRED", "message": "No file uploaded"},
		})
		return
	}

	ev, err := h.evidenceService.UploadFileEvidence(userID, txID, file, evidenceType, description)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "UPLOAD_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": ev,
		"meta": gin.H{"status": "uploaded", "hash": ev.SHA256Hash},
	})
}

func (h *EvidenceHandler) List(c *gin.Context) {
	userID := c.GetString("userID")
	txID := c.Param("id")

	list, err := h.evidenceService.ListByTransaction(userID, txID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "FETCH_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": list,
		"meta": gin.H{"total": len(list)},
	})
}

func (h *EvidenceHandler) Delete(c *gin.Context) {
	userID := c.GetString("userID")
	evidenceID := c.Param("id")

	if err := h.evidenceService.Delete(userID, evidenceID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "DELETE_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"meta": gin.H{"status": "deleted"},
	})
}

func (h *EvidenceHandler) AnalyzeGaps(c *gin.Context) {
	userID := c.GetString("userID")
	txID := c.Param("id")

	tx, err := h.txService.GetByID(userID, txID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "TRANSACTION_NOT_FOUND", "message": "Transaction not found"},
		})
		return
	}

	analysis, err := h.aiService.AnalyzeEvidenceGaps(tx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "ANALYSIS_FAILED", "message": err.Error()},
		})
		return
	}

	_ = h.timelineService.Record(
		tx.ID,
		"EVIDENCE_ANALYZED",
		"AI",
		"ai_gap_analyzer",
		"Evidence Gap Analysis Run",
		analysis.Disclaimer,
		map[string]interface{}{"completeness_score": analysis.CompletenessScore, "status": analysis.Status},
	)

	c.JSON(http.StatusOK, gin.H{
		"data": analysis,
		"meta": gin.H{"status": "success"},
	})
}

func (h *EvidenceHandler) Timeline(c *gin.Context) {
	userID := c.GetString("userID")
	txID := c.Param("id")

	// Verify ownership
	_, err := h.txService.GetByID(userID, txID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Transaction not found"},
		})
		return
	}

	events, err := h.timelineService.GetEventsByTransaction(txID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "TIMELINE_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": events,
		"meta": gin.H{"total": len(events)},
	})
}
