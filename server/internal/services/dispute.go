package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"proofrail-backend/internal/infra"
	"proofrail-backend/internal/models"
)

type DisputeService struct {
	db              *gorm.DB
	aiService       *AIService
	timelineService *TimelineService
	redis           *infra.RedisClient
}

func NewDisputeService(db *gorm.DB, aiService *AIService, timelineService *TimelineService, rdb *infra.RedisClient) *DisputeService {
	return &DisputeService{
		db:              db,
		aiService:       aiService,
		timelineService: timelineService,
		redis:           rdb,
	}
}

type CreateDisputeInput struct {
	Reason         string   `json:"reason" binding:"required"`
	SourceType     string   `json:"source_type"` // SIMULATED or PAYPAL
	DisputedAmount *float64 `json:"disputed_amount"`
}

func (s *DisputeService) CreateDispute(userID, transactionID string, input CreateDisputeInput) (*models.Dispute, error) {
	var tx models.Transaction
	if err := s.db.Where("id = ? AND user_id = ?", transactionID, userID).First(&tx).Error; err != nil {
		return nil, errors.New("transaction not found or access denied")
	}

	sourceType := input.SourceType
	if sourceType == "" {
		sourceType = "SIMULATED"
	}

	amount := tx.Amount
	if input.DisputedAmount != nil && *input.DisputedAmount > 0 {
		amount = *input.DisputedAmount
	}

	due := time.Now().Add(10 * 24 * time.Hour)
	dispute := &models.Dispute{
		ID:             uuid.New().String(),
		TransactionID:  tx.ID,
		SourceType:     sourceType,
		Reason:         input.Reason,
		Status:         "OPEN",
		DisputedAmount: amount,
		Currency:       tx.Currency,
		ResponseDueAt:  &due,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := s.db.Create(dispute).Error; err != nil {
		return nil, err
	}

	// Update transaction status to DISPUTED
	tx.Status = models.StatusDisputed
	_ = s.db.Save(&tx)

	// Invalidate user dispute cache
	if s.redis != nil && s.redis.IsAvailable() {
		_ = s.redis.Del(context.Background(), "proofrail:disputes:user:"+userID)
	}

	_ = s.timelineService.Record(
		tx.ID,
		"DISPUTE_OPENED",
		"SYSTEM",
		dispute.ID,
		fmt.Sprintf("Payment Dispute Filed (%s)", sourceType),
		fmt.Sprintf("Dispute opened for reason: %s. Amount: $%.2f %s. Evidence response required.", dispute.Reason, dispute.DisputedAmount, dispute.Currency),
		map[string]interface{}{"dispute_id": dispute.ID, "source": sourceType, "reason": dispute.Reason},
	)

	return dispute, nil
}

func (s *DisputeService) ListDisputes(userID string) ([]models.Dispute, error) {
	cacheKey := "proofrail:disputes:user:" + userID

	// 1. Check L1 Cache
	if s.redis != nil && s.redis.IsAvailable() {
		var cached []models.Dispute
		if err := s.redis.GetJSON(context.Background(), cacheKey, &cached); err == nil && len(cached) > 0 {
			return cached, nil
		}
	}

	// 2. Query Relational Database
	var disputes []models.Dispute
	err := s.db.Joins("JOIN transactions ON transactions.id = disputes.transaction_id").
		Where("transactions.user_id = ?", userID).
		Preload("Transaction").
		Order("disputes.created_at desc").
		Find(&disputes).Error
	if err != nil {
		return nil, err
	}

	// 3. Cache result for 60 seconds
	if s.redis != nil && s.redis.IsAvailable() && len(disputes) > 0 {
		_ = s.redis.Set(context.Background(), cacheKey, disputes, 60*time.Second)
	}

	return disputes, nil
}

func (s *DisputeService) GetDisputeByID(userID, disputeID string) (*models.Dispute, error) {
	cacheKey := "proofrail:dispute:" + disputeID

	// 1. Check L1 Cache
	if s.redis != nil && s.redis.IsAvailable() {
		var cached models.Dispute
		if err := s.redis.GetJSON(context.Background(), cacheKey, &cached); err == nil {
			if cached.Transaction == nil || cached.Transaction.UserID == userID {
				return &cached, nil
			}
		}
	}

	// 2. Query Database
	var dispute models.Dispute
	err := s.db.Where("id = ?", disputeID).
		Preload("Transaction", func(db *gorm.DB) *gorm.DB {
			return db.Preload("Agreements").Preload("Evidence").Preload("Payments")
		}).
		Preload("Reports").
		First(&dispute).Error
	if err != nil {
		return nil, err
	}

	// Ownership check
	if dispute.Transaction != nil && dispute.Transaction.UserID != userID {
		return nil, errors.New("access denied")
	}

	// 3. Cache result for 60 seconds
	if s.redis != nil && s.redis.IsAvailable() {
		_ = s.redis.Set(context.Background(), cacheKey, dispute, 60*time.Second)
	}

	return &dispute, nil
}

func (s *DisputeService) GenerateReport(userID, disputeID string) (*models.EvidenceReport, *GroundedDisputeReport, error) {
	dispute, err := s.GetDisputeByID(userID, disputeID)
	if err != nil {
		return nil, nil, err
	}

	var user models.User
	_ = s.db.Where("id = ?", userID).First(&user)

	groundedReport, err := s.aiService.GenerateDisputeReport(dispute.Transaction, dispute, &user)
	if err != nil {
		return nil, nil, err
	}

	reportBytes, _ := json.Marshal(groundedReport)

	report := &models.EvidenceReport{
		ID:            uuid.New().String(),
		TransactionID: dispute.TransactionID,
		DisputeID:     dispute.ID,
		Title:         fmt.Sprintf("Evidence Packet — %s (%s)", dispute.Transaction.TransactionCode, dispute.Reason),
		Summary:       fmt.Sprintf("Comprehensive chronological evidence dossier supporting $%.2f %s transaction.", dispute.DisputedAmount, dispute.Currency),
		ReportJSON:    string(reportBytes),
		Status:        "REVIEWED",
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := s.db.Create(report).Error; err != nil {
		return nil, nil, err
	}

	// Invalidate dispute cache to reflect new report
	if s.redis != nil && s.redis.IsAvailable() {
		_ = s.redis.Del(context.Background(), "proofrail:dispute:"+disputeID)
	}

	_ = s.timelineService.Record(
		dispute.TransactionID,
		"REPORT_GENERATED",
		"AI",
		report.ID,
		"AI Dispute Evidence Report Compiled",
		"Generated source-grounded dispute report citing verified agreements, PayPal captures, and delivery proof.",
		map[string]interface{}{"report_id": report.ID},
	)

	return report, groundedReport, nil
}
