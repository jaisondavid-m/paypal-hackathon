package services

import (
	"testing"
	"time"

	"proofrail-backend/internal/config"
	"proofrail-backend/internal/models"
)

func TestAIEvidenceGapAnalysisHeuristic(t *testing.T) {
	ai := NewAIService(nil, &config.Config{})

	deliverables := []string{
		"Responsive website development",
		"Interactive contact form",
		"Production deployment",
	}

	evidenceList := []models.Evidence{
		{
			ID:           "ev-1",
			EvidenceType: models.EvidenceDeploymentURL,
			ExternalURL:  "https://preview.clientsite.com",
			Description:  "Production deployment endpoint",
		},
		{
			ID:           "ev-2",
			EvidenceType: models.EvidenceDeliveryScreenshot,
			FileName:     "screenshot_home.png",
			Description:  "Full page screenshot",
			SHA256Hash:   "abcdef1234567890abcdef1234567890",
		},
	}

	summary := []EvidenceSummaryItem{
		{ID: "ev-1", Type: "DEPLOYMENT_URL", Source: "https://preview.clientsite.com"},
		{ID: "ev-2", Type: "DELIVERY_SCREENSHOT", Source: "screenshot_home.png"},
	}

	res := ai.analyzeGapsHeuristically(deliverables, evidenceList, summary, true, true, true, true, false)

	if res.CompletenessScore < 80 {
		t.Errorf("Expected completeness score >= 80, got %d", res.CompletenessScore)
	}

	if len(res.DeliverableMatrix) != 3 {
		t.Errorf("Expected 3 deliverables in matrix, got %d", len(res.DeliverableMatrix))
	}

	if res.DefensibilityIndex.OverallScore == 0 {
		t.Errorf("Expected defensibility index score > 0")
	}

	if !res.SellerProtectionStatus.Eligible {
		t.Errorf("Expected seller protection eligible when payment, approval, and URL exist")
	}
}

func TestAIDisputeRebuttalFallback(t *testing.T) {
	ai := NewAIService(nil, &config.Config{})

	tx := &models.Transaction{
		TransactionCode: "PR-2026-9021",
		CustomerName:    "Alex Morgan",
		CustomerEmail:   "alex@example.com",
		Amount:          2000.0,
		Currency:        "USD",
	}

	dispute := &models.Dispute{
		PayPalDisputeID: "PP-D-12345",
		Reason:          "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
		DisputedAmount:  2000.0,
		Currency:        "USD",
	}

	agreement := models.Agreement{Version: 1}
	approval := models.CustomerApproval{AgreementVersion: 1}
	now := time.Now()
	approval.ApprovedAt = &now
	payment := models.Payment{PayPalCaptureID: "7E298134UP981023X"}
	evidences := []models.Evidence{
		{EvidenceType: "DEPLOYMENT_URL", Description: "Live URL", SHA256Hash: "1234567890abcdef"},
	}

	rebuttal := ai.generateRebuttalWithGemini(tx, dispute, "Test Merchant", agreement, approval, payment, evidences, nil)

	if rebuttal.ExecutiveSummary == "" {
		t.Errorf("Expected non-empty executive summary")
	}

	if rebuttal.ResolutionCenterSubmissionText == "" {
		t.Errorf("Expected non-empty resolution center submission text")
	}

	if len(rebuttal.KeyEvidencePoints) == 0 {
		t.Errorf("Expected key evidence points to be populated")
	}
}
