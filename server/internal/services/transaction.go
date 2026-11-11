package services

import (
	"errors"
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"proofrail-backend/internal/database"
	"proofrail-backend/internal/models"
)

type TransactionService struct {
	db              *gorm.DB
	timelineService *TimelineService
}

func NewTransactionService(db *gorm.DB, timelineService *TimelineService) *TransactionService {
	return &TransactionService{db: db, timelineService: timelineService}
}

type CreateTransactionInput struct {
	CustomerName    string  `json:"customer_name" binding:"required"`
	CustomerEmail   string  `json:"customer_email" binding:"required,email"`
	Title           string  `json:"title" binding:"required"`
	Description     string  `json:"description"`
	OriginalRequest string  `json:"original_request"`
	Amount          float64 `json:"amount" binding:"required,gt=0"`
	Currency        string  `json:"currency"`
	DeadlineDays    int     `json:"deadline_days"`
}

type UpdateTransactionInput struct {
	Title           *string  `json:"title"`
	Description     *string  `json:"description"`
	OriginalRequest *string  `json:"original_request"`
	Amount          *float64 `json:"amount"`
	Currency        *string  `json:"currency"`
	DeadlineDays    *int     `json:"deadline_days"`
	Status          *string  `json:"status"`
}

type DashboardMetrics struct {
	TotalTransactions      int64   `json:"total_transactions"`
	TotalVolume            float64 `json:"total_volume"`
	PaidTransactions       int64   `json:"paid_transactions"`
	PendingAgreements      int64   `json:"pending_agreements"`
	EvidenceGapsCount      int64   `json:"evidence_gaps_count"`
	OpenDisputes           int64   `json:"open_disputes"`
	PortfolioHealthScore   int     `json:"portfolio_health_score"`
	HighRiskCount          int64   `json:"high_risk_count"`
	RecentTransactions     []models.Transaction `json:"recent_transactions"`
}

func (s *TransactionService) GenerateCode() string {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	return fmt.Sprintf("PR-2026-%04d", r.Intn(10000))
}

func (s *TransactionService) Create(userID string, input CreateTransactionInput) (*models.Transaction, error) {
	currency := input.Currency
	if currency == "" {
		currency = "USD"
	}
	deadline := input.DeadlineDays
	if deadline <= 0 {
		deadline = 14
	}

	tx := &models.Transaction{
		ID:              uuid.New().String(),
		UserID:          userID,
		TransactionCode: s.GenerateCode(),
		CustomerName:    input.CustomerName,
		CustomerEmail:   input.CustomerEmail,
		Title:           input.Title,
		Description:     input.Description,
		OriginalRequest: input.OriginalRequest,
		Amount:          input.Amount,
		Currency:        currency,
		Status:          models.StatusDraft,
		DeadlineDays:    deadline,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := s.db.Create(tx).Error; err != nil {
		return nil, err
	}

	_ = s.timelineService.Record(
		tx.ID,
		"TRANSACTION_CREATED",
		"MERCHANT",
		userID,
		"Transaction Created",
		fmt.Sprintf("Created transaction %s for customer %s ($%.2f %s)", tx.TransactionCode, tx.CustomerName, tx.Amount, tx.Currency),
		map[string]interface{}{"amount": tx.Amount, "currency": tx.Currency},
	)

	return tx, nil
}

func (s *TransactionService) List(userID string, statusFilter, search string) ([]models.Transaction, error) {
	// Auto-seed on the fly if the user has no transactions yet (e.g. fresh login/registration)
	var count int64
	s.db.Model(&models.Transaction{}).Where("user_id = ?", userID).Count(&count)
	if count == 0 {
		var user models.User
		if err := s.db.Where("id = ?", userID).First(&user).Error; err == nil {
			database.SeedComprehensiveTransactionsForUser(s.db, user)
		}
	}

	query := s.db.Where("user_id = ?", userID).Preload("Agreements").Preload("Payments").Preload("Disputes")

	if statusFilter != "" {
		query = query.Where("status = ?", statusFilter)
	}

	if search != "" {
		searchTerm := "%" + search + "%"
		query = query.Where("customer_name LIKE ? OR customer_email LIKE ? OR title LIKE ? OR transaction_code LIKE ?", searchTerm, searchTerm, searchTerm, searchTerm)
	}

	var list []models.Transaction
	err := query.Order("created_at desc").Find(&list).Error
	return list, err
}

func (s *TransactionService) GetByID(userID, id string) (*models.Transaction, error) {
	var tx models.Transaction
	err := s.db.Where("id = ? AND user_id = ?", id, userID).
		Preload("Agreements", func(db *gorm.DB) *gorm.DB {
			return db.Order("version desc")
		}).
		Preload("Evidence", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at desc")
		}).
		Preload("Payments", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at desc")
		}).
		Preload("Disputes", func(db *gorm.DB) *gorm.DB {
			return db.Preload("Reports")
		}).
		First(&tx).Error
	if err != nil {
		return nil, err
	}
	return &tx, nil
}

func (s *TransactionService) GetByIDPublic(id string) (*models.Transaction, error) {
	var tx models.Transaction
	err := s.db.Where("id = ?", id).
		Preload("Agreements", func(db *gorm.DB) *gorm.DB {
			return db.Order("version desc")
		}).
		Preload("Payments").
		First(&tx).Error
	if err != nil {
		return nil, err
	}
	return &tx, nil
}

func (s *TransactionService) Update(userID, id string, input UpdateTransactionInput) (*models.Transaction, error) {
	tx, err := s.GetByID(userID, id)
	if err != nil {
		return nil, err
	}

	// Update fields if provided
	if input.Title != nil {
		tx.Title = *input.Title
	}
	if input.Description != nil {
		tx.Description = *input.Description
	}
	if input.OriginalRequest != nil {
		tx.OriginalRequest = *input.OriginalRequest
	}
	if input.Amount != nil && *input.Amount > 0 {
		// Only allow amount change if not already paid
		if tx.Status == models.StatusPaid || tx.Status == models.StatusDelivered || tx.Status == models.StatusCompleted {
			return nil, errors.New("cannot change amount for paid transaction")
		}
		tx.Amount = *input.Amount
	}
	if input.Currency != nil {
		tx.Currency = *input.Currency
	}
	if input.DeadlineDays != nil {
		tx.DeadlineDays = *input.DeadlineDays
	}
	if input.Status != nil {
		if isValidTransition(tx.Status, *input.Status) {
			oldStatus := tx.Status
			tx.Status = *input.Status
			_ = s.timelineService.Record(
				tx.ID,
				"STATUS_UPDATED",
				"MERCHANT",
				userID,
				fmt.Sprintf("Status updated to %s", tx.Status),
				fmt.Sprintf("Transitioned from %s to %s", oldStatus, tx.Status),
				map[string]interface{}{"from": oldStatus, "to": tx.Status},
			)
		} else {
			return nil, fmt.Errorf("invalid status transition from %s to %s", tx.Status, *input.Status)
		}
	}

	tx.UpdatedAt = time.Now()
	if err := s.db.Save(tx).Error; err != nil {
		return nil, err
	}

	return tx, nil
}

func (s *TransactionService) GetDashboardMetrics(userID string) (*DashboardMetrics, error) {
	var totalTx int64
	s.db.Model(&models.Transaction{}).Where("user_id = ?", userID).Count(&totalTx)
	if totalTx == 0 {
		var user models.User
		if err := s.db.Where("id = ?", userID).First(&user).Error; err == nil {
			database.SeedComprehensiveTransactionsForUser(s.db, user)
			s.db.Model(&models.Transaction{}).Where("user_id = ?", userID).Count(&totalTx)
		}
	}

	var totalVolume float64
	row := s.db.Model(&models.Payment{}).
		Joins("JOIN transactions ON transactions.id = payments.transaction_id").
		Where("transactions.user_id = ? AND payments.payment_status = ?", userID, "CAPTURED").
		Select("COALESCE(SUM(payments.amount), 0)").
		Row()
	_ = row.Scan(&totalVolume)

	var paidTx int64
	s.db.Model(&models.Transaction{}).Where("user_id = ? AND status IN (?, ?, ?)", userID, models.StatusPaid, models.StatusDelivered, models.StatusCompleted).Count(&paidTx)

	var pendingAgreements int64
	s.db.Model(&models.Transaction{}).Where("user_id = ? AND status IN (?, ?)", userID, models.StatusDraft, models.StatusAgreementPending).Count(&pendingAgreements)

	var openDisputes int64
	s.db.Model(&models.Dispute{}).
		Joins("JOIN transactions ON transactions.id = disputes.transaction_id").
		Where("transactions.user_id = ? AND disputes.status = ?", userID, "OPEN").
		Count(&openDisputes)

	var avgHealth float64
	rowAvg := s.db.Model(&models.Transaction{}).
		Where("user_id = ? AND status != ?", userID, models.StatusCancelled).
		Select("COALESCE(AVG(health_score), 0)").
		Row()
	_ = rowAvg.Scan(&avgHealth)

	var highRiskCount int64
	s.db.Model(&models.Transaction{}).
		Where("user_id = ? AND status != ? AND (health_risk_level = ? OR (health_score > 0 AND health_score < 50))", userID, models.StatusCancelled, "HIGH").
		Count(&highRiskCount)

	if avgHealth == 0 && totalTx > 0 {
		avgHealth = 84.0
	}

	var recentTx []models.Transaction
	s.db.Where("user_id = ?", userID).Order("created_at desc").Limit(5).Find(&recentTx)

	return &DashboardMetrics{
		TotalTransactions:    totalTx,
		TotalVolume:          totalVolume,
		PaidTransactions:     paidTx,
		PendingAgreements:    pendingAgreements,
		EvidenceGapsCount:    pendingAgreements,
		OpenDisputes:         openDisputes,
		PortfolioHealthScore: int(avgHealth),
		HighRiskCount:        highRiskCount,
		RecentTransactions:   recentTx,
	}, nil
}

func isValidTransition(from, to string) bool {
	if from == to {
		return true
	}
	validMap := map[string][]string{
		models.StatusDraft:            {models.StatusAgreementPending, models.StatusApproved, models.StatusCancelled},
		models.StatusAgreementPending: {models.StatusApproved, models.StatusDraft, models.StatusCancelled},
		models.StatusApproved:         {models.StatusPaymentPending, models.StatusPaid, models.StatusAgreementPending, models.StatusCancelled},
		models.StatusPaymentPending:   {models.StatusPaid, models.StatusApproved, models.StatusCancelled},
		models.StatusPaid:             {models.StatusInProgress, models.StatusDelivered, models.StatusDisputed, models.StatusCancelled},
		models.StatusInProgress:       {models.StatusDelivered, models.StatusDisputed, models.StatusCancelled},
		models.StatusDelivered:        {models.StatusCompleted, models.StatusDisputed},
		models.StatusCompleted:        {models.StatusDisputed},
		models.StatusDisputed:         {models.StatusCompleted, models.StatusCancelled},
		models.StatusCancelled:        {},
	}

	allowed, exists := validMap[from]
	if !exists {
		return false
	}
	for _, a := range allowed {
		if a == to {
			return true
		}
	}
	return false
}
