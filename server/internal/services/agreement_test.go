package services

import (
	"testing"
)

func TestCalculateReadiness(t *testing.T) {
	service := &AgreementService{}

	// Case 1: Empty input -> 0 score
	emptyInput := SaveAgreementInput{}
	res := service.CalculateReadiness(emptyInput)
	if res.Score != 0 {
		t.Errorf("Expected 0 readiness score for empty agreement, got %d", res.Score)
	}

	// Case 2: Complete agreement -> 100 score
	fullInput := SaveAgreementInput{
		Deliverables:       []string{"Responsive website", "Contact form"},
		Amount:             2000.00,
		Currency:           "USD",
		DeadlineDays:       14,
		RevisionPolicy:     "Two rounds included",
		RefundTerms:        "Non-refundable once milestone accepted",
		Responsibilities:   []string{"Client supplies assets"},
		AcceptanceCriteria: "Staging URL reviewed within 5 days",
	}

	fullRes := service.CalculateReadiness(fullInput)
	if fullRes.Score != 100 {
		t.Errorf("Expected 100 readiness score for complete agreement, got %d", fullRes.Score)
	}
	if len(fullRes.Missing) != 0 {
		t.Errorf("Expected 0 missing items, got %d", len(fullRes.Missing))
	}
}

func TestExtractHeuristically(t *testing.T) {
	aiService := &AIService{}

	prompt := "Hi Alex, I need a business website for $2,000 USD with contact form and admin dashboard. Deadline is 20 days. Two rounds of revisions included."
	extracted := aiService.extractHeuristically(prompt)

	if extracted.Amount != 2000.00 {
		t.Errorf("Expected amount 2000, got %f", extracted.Amount)
	}
	if extracted.Currency != "USD" {
		t.Errorf("Expected currency USD, got %s", extracted.Currency)
	}
	if extracted.DeadlineDays != 20 {
		t.Errorf("Expected 20 days deadline, got %d", extracted.DeadlineDays)
	}
	if len(extracted.Deliverables) < 2 {
		t.Errorf("Expected at least 2 deliverables, got %d", len(extracted.Deliverables))
	}
}

func TestIsValidTransition(t *testing.T) {
	// DRAFT to AGREEMENT_PENDING is valid
	if !isValidTransition("DRAFT", "AGREEMENT_PENDING") {
		t.Errorf("Expected DRAFT -> AGREEMENT_PENDING to be valid")
	}

	// APPROVED to PAID directly without PAYMENT_PENDING is allowed
	if !isValidTransition("APPROVED", "PAID") {
		t.Errorf("Expected APPROVED -> PAID to be valid")
	}

	// CANCELLED to PAID is invalid
	if isValidTransition("CANCELLED", "PAID") {
		t.Errorf("Expected CANCELLED -> PAID to be invalid")
	}
}
