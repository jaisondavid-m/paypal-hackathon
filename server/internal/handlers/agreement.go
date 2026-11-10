package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"proofrail-backend/internal/services"
)

type AgreementHandler struct {
	agreementService *services.AgreementService
	aiService        *services.AIService
}

func NewAgreementHandler(agreementService *services.AgreementService, aiService *services.AIService) *AgreementHandler {
	return &AgreementHandler{
		agreementService: agreementService,
		aiService:        aiService,
	}
}

type ExtractTermsRequest struct {
	RawText string `json:"raw_text" binding:"required"`
}

func (h *AgreementHandler) ExtractTerms(c *gin.Context) {
	var input ExtractTermsRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "raw_text is required"},
		})
		return
	}

	extracted, err := h.aiService.ExtractAgreement(input.RawText)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "EXTRACTION_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": extracted,
		"meta": gin.H{"status": "success"},
	})
}

func (h *AgreementHandler) SaveAgreement(c *gin.Context) {
	userID := c.GetString("userID")
	txID := c.Param("id")

	var input services.SaveAgreementInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	agreement, err := h.agreementService.SaveAgreement(userID, txID, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "SAVE_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": agreement,
		"meta": gin.H{"version": agreement.Version, "readiness_score": agreement.ReadinessScore},
	})
}

func (h *AgreementHandler) GenerateApprovalLink(c *gin.Context) {
	userID := c.GetString("userID")
	txID := c.Param("id")

	approval, publicURL, err := h.agreementService.GenerateApprovalLink(userID, txID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "LINK_GENERATION_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"approval":   approval,
			"public_url": publicURL,
			"token":      approval.RawToken,
			"expires_at": approval.ExpiresAt,
		},
		"meta": gin.H{"status": "success"},
	})
}

func (h *AgreementHandler) GetPublicAgreement(c *gin.Context) {
	token := c.Param("token")
	agreement, tx, approval, err := h.agreementService.GetByToken(token)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"agreement": agreement,
			"transaction": gin.H{
				"id":               tx.ID,
				"transaction_code": tx.TransactionCode,
				"title":            tx.Title,
				"customer_name":    tx.CustomerName,
				"customer_email":   tx.CustomerEmail,
				"merchant_name":    tx.User.Name,
				"business_name":    tx.User.BusinessName,
				"amount":           tx.Amount,
				"currency":         tx.Currency,
				"status":           tx.Status,
			},
			"approval": gin.H{
				"status":     approval.ApprovalStatus,
				"expires_at": approval.ExpiresAt,
				"approved_at": approval.ApprovedAt,
			},
		},
		"meta": gin.H{"status": "success"},
	})
}

type ApprovePublicRequest struct {
	CustomerNotes string `json:"customer_notes"`
}

func (h *AgreementHandler) ApprovePublicAgreement(c *gin.Context) {
	token := c.Param("token")
	var req ApprovePublicRequest
	_ = c.ShouldBindJSON(&req)

	approval, err := h.agreementService.ApproveByToken(token, req.CustomerNotes)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "APPROVAL_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": approval,
		"meta": gin.H{"status": "approved", "timestamp": approval.ApprovedAt},
	})
}
