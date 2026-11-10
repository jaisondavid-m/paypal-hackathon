package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"proofrail-backend/internal/config"
	"proofrail-backend/internal/models"
)

type AgreementService struct {
	db              *gorm.DB
	cfg             *config.Config
	timelineService *TimelineService
}

func NewAgreementService(db *gorm.DB, cfg *config.Config, timelineService *TimelineService) *AgreementService {
	return &AgreementService{db: db, cfg: cfg, timelineService: timelineService}
}

type SaveAgreementInput struct {
	Title              string   `json:"title" binding:"required"`
	Deliverables       []string `json:"deliverables"`
	Scope              []string `json:"scope"`
	Amount             float64  `json:"amount" binding:"required,gt=0"`
	Currency           string   `json:"currency"`
	DeadlineDays       int      `json:"deadline_days"`
	RevisionPolicy     string   `json:"revision_policy"`
	Responsibilities   []string `json:"responsibilities"`
	AcceptanceCriteria string   `json:"acceptance_criteria"`
	RefundTerms        string   `json:"refund_terms"`
	MissingInfo        []string `json:"missing_info"`
	Ambiguities        []string `json:"ambiguities"`
}

type ReadinessResult struct {
	Score       int      `json:"score"`
	Missing     []string `json:"missing"`
	Suggestions []string `json:"suggestions"`
}

func (s *AgreementService) CalculateReadiness(input SaveAgreementInput) ReadinessResult {
	score := 0
	var missing []string
	var suggestions []string

	if len(input.Deliverables) > 0 {
		score += 25
	} else {
		missing = append(missing, "Deliverables not defined")
		suggestions = append(suggestions, "List clear, concrete project deliverables.")
	}

	if input.Amount > 0 && input.Currency != "" {
		score += 15
	} else {
		missing = append(missing, "Amount and currency")
		suggestions = append(suggestions, "Specify total transaction value and currency.")
	}

	if input.DeadlineDays > 0 {
		score += 15
	} else {
		missing = append(missing, "Delivery deadline")
		suggestions = append(suggestions, "Set an expected delivery timeframe in days.")
	}

	if len(input.RevisionPolicy) > 0 {
		score += 10
	} else {
		missing = append(missing, "Revision policy")
		suggestions = append(suggestions, "State how many revision rounds are included.")
	}

	if len(input.RefundTerms) > 0 {
		score += 10
	} else {
		missing = append(missing, "Refund and cancellation terms")
		suggestions = append(suggestions, "Document refund policy or non-refundable clauses.")
	}

	if len(input.Responsibilities) > 0 {
		score += 15
	} else {
		missing = append(missing, "Customer/merchant responsibilities")
		suggestions = append(suggestions, "Assign dependencies (e.g. customer content, hosting).")
	}

	if len(input.AcceptanceCriteria) > 0 {
		score += 10
	} else {
		missing = append(missing, "Acceptance criteria")
		suggestions = append(suggestions, "Define how the customer verifies milestone completion.")
	}

	return ReadinessResult{
		Score:       score,
		Missing:     missing,
		Suggestions: suggestions,
	}
}

func (s *AgreementService) SaveAgreement(userID, transactionID string, input SaveAgreementInput) (*models.Agreement, error) {
	var tx models.Transaction
	if err := s.db.Where("id = ? AND user_id = ?", transactionID, userID).First(&tx).Error; err != nil {
		return nil, errors.New("transaction not found or access denied")
	}

	// Calculate latest version
	var latestAgreement models.Agreement
	version := 1
	if err := s.db.Where("transaction_id = ?", transactionID).Order("version desc").First(&latestAgreement).Error; err == nil {
		version = latestAgreement.Version + 1
		// Mark previous as SUPERSEDED if it wasn't approved yet
		if latestAgreement.Status != "APPROVED" {
			latestAgreement.Status = "SUPERSEDED"
			_ = s.db.Save(&latestAgreement)
		}
	}

	readiness := s.CalculateReadiness(input)

	deliverablesJSON, _ := json.Marshal(input.Deliverables)
	scopeJSON, _ := json.Marshal(input.Scope)
	respJSON, _ := json.Marshal(input.Responsibilities)
	missingJSON, _ := json.Marshal(append(input.MissingInfo, readiness.Missing...))
	ambiguitiesJSON, _ := json.Marshal(input.Ambiguities)

	currency := input.Currency
	if currency == "" {
		currency = tx.Currency
	}

	agreement := &models.Agreement{
		ID:                   uuid.New().String(),
		TransactionID:        transactionID,
		Version:              version,
		Title:                input.Title,
		DeliverablesJSON:     string(deliverablesJSON),
		ScopeJSON:            string(scopeJSON),
		Amount:               input.Amount,
		Currency:             currency,
		DeadlineDays:         input.DeadlineDays,
		RevisionPolicy:       input.RevisionPolicy,
		ResponsibilitiesJSON: string(respJSON),
		AcceptanceCriteria:   input.AcceptanceCriteria,
		RefundTerms:          input.RefundTerms,
		ReadinessScore:       readiness.Score,
		MissingInfoJSON:      string(missingJSON),
		AmbiguitiesJSON:      string(ambiguitiesJSON),
		Status:               "PENDING_APPROVAL",
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}

	if err := s.db.Create(agreement).Error; err != nil {
		return nil, err
	}

	// Update transaction amount & currency to match agreement
	tx.Amount = input.Amount
	tx.Currency = currency
	tx.Status = models.StatusAgreementPending
	_ = s.db.Save(&tx)

	_ = s.timelineService.Record(
		tx.ID,
		"AGREEMENT_SAVED",
		"MERCHANT",
		userID,
		fmt.Sprintf("Agreement Version %d Saved", agreement.Version),
		fmt.Sprintf("Saved agreement terms with readiness score %d/100 ($%.2f %s)", agreement.ReadinessScore, agreement.Amount, agreement.Currency),
		map[string]interface{}{"version": agreement.Version, "readiness_score": agreement.ReadinessScore},
	)

	return agreement, nil
}

func (s *AgreementService) GenerateApprovalLink(userID, transactionID string) (*models.CustomerApproval, string, error) {
	var tx models.Transaction
	if err := s.db.Where("id = ? AND user_id = ?", transactionID, userID).First(&tx).Error; err != nil {
		return nil, "", errors.New("transaction not found")
	}

	var agreement models.Agreement
	if err := s.db.Where("transaction_id = ?", transactionID).Order("version desc").First(&agreement).Error; err != nil {
		return nil, "", errors.New("no agreement found for this transaction")
	}

	// Generate high-entropy 32-byte cryptographic token
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return nil, "", err
	}
	rawToken := hex.EncodeToString(bytes)

	hash := sha256.Sum256([]byte(rawToken))
	tokenHash := hex.EncodeToString(hash[:])

	approval := &models.CustomerApproval{
		ID:               uuid.New().String(),
		TransactionID:    transactionID,
		AgreementID:      agreement.ID,
		AgreementVersion: agreement.Version,
		TokenHash:        tokenHash,
		RawToken:         rawToken,
		CustomerEmail:    tx.CustomerEmail,
		ApprovalStatus:   "PENDING",
		ExpiresAt:        time.Now().Add(14 * 24 * time.Hour), // 14-day validity
		CreatedAt:        time.Now(),
	}

	if err := s.db.Create(approval).Error; err != nil {
		return nil, "", err
	}

	publicURL := fmt.Sprintf("%s/public/agreements/%s", s.cfg.AppURL, rawToken)

	_ = s.timelineService.Record(
		tx.ID,
		"AGREEMENT_SENT",
		"MERCHANT",
		userID,
		"Customer Approval Link Generated",
		fmt.Sprintf("Created approval link for agreement version %d", agreement.Version),
		map[string]interface{}{"version": agreement.Version, "expires_at": approval.ExpiresAt},
	)

	return approval, publicURL, nil
}

func (s *AgreementService) GetByToken(rawToken string) (*models.Agreement, *models.Transaction, *models.CustomerApproval, error) {
	hash := sha256.Sum256([]byte(rawToken))
	tokenHash := hex.EncodeToString(hash[:])

	var approval models.CustomerApproval
	if err := s.db.Where("token_hash = ?", tokenHash).First(&approval).Error; err != nil {
		return nil, nil, nil, errors.New("approval link invalid or expired")
	}

	if time.Now().After(approval.ExpiresAt) {
		return nil, nil, nil, errors.New("approval link has expired")
	}

	var agreement models.Agreement
	if err := s.db.Where("id = ?", approval.AgreementID).First(&agreement).Error; err != nil {
		return nil, nil, nil, errors.New("agreement not found")
	}

	var tx models.Transaction
	if err := s.db.Where("id = ?", approval.TransactionID).Preload("User").First(&tx).Error; err != nil {
		return nil, nil, nil, errors.New("transaction not found")
	}

	return &agreement, &tx, &approval, nil
}

func (s *AgreementService) ApproveByToken(rawToken, customerNotes string) (*models.CustomerApproval, error) {
	hash := sha256.Sum256([]byte(rawToken))
	tokenHash := hex.EncodeToString(hash[:])

	var approval models.CustomerApproval
	if err := s.db.Where("token_hash = ?", tokenHash).First(&approval).Error; err != nil {
		return nil, errors.New("approval link invalid")
	}

	if approval.ApprovalStatus == "APPROVED" {
		// Idempotent: already approved
		return &approval, nil
	}

	if time.Now().After(approval.ExpiresAt) {
		return nil, errors.New("approval link has expired")
	}

	now := time.Now()
	approval.ApprovalStatus = "APPROVED"
	approval.ApprovedAt = &now
	approval.CustomerNotes = customerNotes
	if err := s.db.Save(&approval).Error; err != nil {
		return nil, err
	}

	// Update agreement status
	_ = s.db.Model(&models.Agreement{}).Where("id = ?", approval.AgreementID).Update("status", "APPROVED")

	// Update transaction status
	_ = s.db.Model(&models.Transaction{}).Where("id = ?", approval.TransactionID).Update("status", models.StatusApproved)

	_ = s.timelineService.Record(
		approval.TransactionID,
		"AGREEMENT_APPROVED",
		"CUSTOMER",
		approval.CustomerEmail,
		fmt.Sprintf("Agreement Version %d Approved by Customer", approval.AgreementVersion),
		fmt.Sprintf("Customer (%s) formally approved terms and deliverables for Version %d", approval.CustomerEmail, approval.AgreementVersion),
		map[string]interface{}{"version": approval.AgreementVersion, "approved_at": now},
	)

	return &approval, nil
}
