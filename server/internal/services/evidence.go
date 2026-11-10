package services

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"proofrail-backend/internal/config"
	"proofrail-backend/internal/models"
)

type EvidenceService struct {
	db              *gorm.DB
	cfg             *config.Config
	timelineService *TimelineService
	aiService       *AIService
}

func NewEvidenceService(db *gorm.DB, cfg *config.Config, timelineService *TimelineService, aiService *AIService) *EvidenceService {
	return &EvidenceService{db: db, cfg: cfg, timelineService: timelineService, aiService: aiService}
}

type AddURLEvidenceInput struct {
	EvidenceType string `json:"evidence_type" binding:"required"`
	ExternalURL  string `json:"external_url" binding:"required"`
	Description  string `json:"description"`
}

func (s *EvidenceService) AddURLEvidence(userID, transactionID string, input AddURLEvidenceInput) (*models.Evidence, error) {
	var tx models.Transaction
	if err := s.db.Where("id = ? AND user_id = ?", transactionID, userID).First(&tx).Error; err != nil {
		return nil, errors.New("transaction not found or access denied")
	}

	parsedURL, err := url.ParseRequestURI(input.ExternalURL)
	if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
		return nil, errors.New("invalid URL: must be valid http or https URL")
	}

	hash := sha256.Sum256([]byte(input.ExternalURL))
	hashHex := hex.EncodeToString(hash[:])

	ev := &models.Evidence{
		ID:            uuid.New().String(),
		TransactionID: tx.ID,
		EvidenceType:  input.EvidenceType,
		ExternalURL:   input.ExternalURL,
		Description:   input.Description,
		SHA256Hash:    hashHex,
		UploadedBy:    userID,
		CreatedAt:     time.Now(),
	}

	if err := s.db.Create(ev).Error; err != nil {
		return nil, err
	}

	// If transaction was paid, advance to in_progress or delivered
	if tx.Status == models.StatusPaid {
		tx.Status = models.StatusDelivered
		_ = s.db.Save(&tx)
	}

	_ = s.timelineService.Record(
		tx.ID,
		"DELIVERY_RECORDED",
		"MERCHANT",
		userID,
		fmt.Sprintf("Delivery Proof Attached: %s", input.EvidenceType),
		fmt.Sprintf("Linked delivery URL: %s (%s)", input.ExternalURL, input.Description),
		map[string]interface{}{"evidence_id": ev.ID, "url": input.ExternalURL},
	)

	// Automatically run Pre-Dispute Health Check upon evidence submission
	if s.aiService != nil {
		go func(t models.Transaction) {
			_, _ = s.aiService.RunHealthCheck(&t)
		}(tx)
	}

	return ev, nil
}

func (s *EvidenceService) UploadFileEvidence(userID, transactionID string, file *multipart.FileHeader, evidenceType, description string) (*models.Evidence, error) {
	var tx models.Transaction
	if err := s.db.Where("id = ? AND user_id = ?", transactionID, userID).First(&tx).Error; err != nil {
		return nil, errors.New("transaction not found or access denied")
	}

	// 10MB limit
	const maxFileSize = 10 * 1024 * 1024
	if file.Size > maxFileSize {
		return nil, errors.New("file exceeds maximum allowed size (10MB)")
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{
		".png": true, ".jpg": true, ".jpeg": true, ".webp": true, ".pdf": true, ".txt": true, ".zip": true,
	}
	if !allowedExts[ext] {
		return nil, fmt.Errorf("unsupported file extension: %s", ext)
	}

	src, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()

	// Compute SHA-256 hash
	hasher := sha256.New()
	safeFilename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	storagePath := filepath.Join(s.cfg.StorageDir, safeFilename)

	dst, err := os.Create(storagePath)
	if err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}
	defer dst.Close()

	tee := io.TeeReader(src, hasher)
	written, err := io.Copy(dst, tee)
	if err != nil {
		return nil, err
	}

	sha256Hash := hex.EncodeToString(hasher.Sum(nil))

	ev := &models.Evidence{
		ID:            uuid.New().String(),
		TransactionID: tx.ID,
		EvidenceType:  evidenceType,
		FileName:      file.Filename,
		StoragePath:   storagePath,
		Description:   description,
		SHA256Hash:    sha256Hash,
		FileSize:      written,
		MimeType:      file.Header.Get("Content-Type"),
		UploadedBy:    userID,
		CreatedAt:     time.Now(),
	}

	if err := s.db.Create(ev).Error; err != nil {
		_ = os.Remove(storagePath)
		return nil, err
	}

	// If transaction was paid, advance to in_progress or delivered
	if tx.Status == models.StatusPaid {
		tx.Status = models.StatusDelivered
		_ = s.db.Save(&tx)
	}

	_ = s.timelineService.Record(
		tx.ID,
		"EVIDENCE_UPLOADED",
		"MERCHANT",
		userID,
		fmt.Sprintf("Evidence Uploaded: %s", file.Filename),
		fmt.Sprintf("Uploaded %s (%s, SHA-256: %s)", file.Filename, evidenceType, sha256Hash[:12]+"..."),
		map[string]interface{}{"evidence_id": ev.ID, "filename": file.Filename, "hash": sha256Hash},
	)

	// Automatically run Pre-Dispute Health Check upon evidence submission
	if s.aiService != nil {
		go func(t models.Transaction) {
			_, _ = s.aiService.RunHealthCheck(&t)
		}(tx)
	}

	return ev, nil
}

func (s *EvidenceService) ListByTransaction(userID, transactionID string) ([]models.Evidence, error) {
	var tx models.Transaction
	if err := s.db.Where("id = ? AND user_id = ?", transactionID, userID).First(&tx).Error; err != nil {
		return nil, errors.New("transaction not found or access denied")
	}

	var list []models.Evidence
	err := s.db.Where("transaction_id = ?", transactionID).Order("created_at desc").Find(&list).Error
	return list, err
}

func (s *EvidenceService) Delete(userID, evidenceID string) error {
	var ev models.Evidence
	if err := s.db.Where("id = ?", evidenceID).First(&ev).Error; err != nil {
		return errors.New("evidence not found")
	}

	var tx models.Transaction
	if err := s.db.Where("id = ? AND user_id = ?", ev.TransactionID, userID).First(&tx).Error; err != nil {
		return errors.New("access denied")
	}

	if ev.StoragePath != "" {
		_ = os.Remove(ev.StoragePath)
	}

	return s.db.Delete(&ev).Error
}
