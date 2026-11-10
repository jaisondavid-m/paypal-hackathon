package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"

	"proofrail-backend/internal/services"
)

type DisputeHandler struct {
	disputeService *services.DisputeService
}

func NewDisputeHandler(disputeService *services.DisputeService) *DisputeHandler {
	return &DisputeHandler{disputeService: disputeService}
}

func (h *DisputeHandler) List(c *gin.Context) {
	userID := c.GetString("userID")
	list, err := h.disputeService.ListDisputes(userID)
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

func (h *DisputeHandler) Create(c *gin.Context) {
	userID := c.GetString("userID")
	txID := c.Param("id")

	var input services.CreateDisputeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	dispute, err := h.disputeService.CreateDispute(userID, txID, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "DISPUTE_CREATION_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": dispute,
		"meta": gin.H{"status": "created", "source": dispute.SourceType},
	})
}

func (h *DisputeHandler) GetByID(c *gin.Context) {
	userID := c.GetString("userID")
	id := c.Param("id")

	dispute, err := h.disputeService.GetDisputeByID(userID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Dispute not found"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": dispute,
		"meta": gin.H{"status": "success"},
	})
}

func (h *DisputeHandler) GenerateReport(c *gin.Context) {
	userID := c.GetString("userID")
	id := c.Param("id")

	report, grounded, err := h.disputeService.GenerateReport(userID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "REPORT_GENERATION_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"report":          report,
			"grounded_packet": grounded,
		},
		"meta": gin.H{"status": "generated"},
	})
}

func (h *DisputeHandler) GetReport(c *gin.Context) {
	userID := c.GetString("userID")
	id := c.Param("id")

	dispute, err := h.disputeService.GetDisputeByID(userID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Dispute not found"},
		})
		return
	}

	if len(dispute.Reports) == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "REPORT_NOT_FOUND", "message": "No report generated yet"},
		})
		return
	}

	latestReport := dispute.Reports[len(dispute.Reports)-1]
	var parsed services.GroundedDisputeReport
	_ = json.Unmarshal([]byte(latestReport.ReportJSON), &parsed)

	if parsed.ReportID == "" {
		rep, grounded, err := h.disputeService.GenerateReport(userID, id)
		if err == nil && rep != nil && grounded != nil {
			latestReport = *rep
			parsed = *grounded
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"report":          latestReport,
			"grounded_packet": parsed,
		},
		"meta": gin.H{"status": "success"},
	})
}
