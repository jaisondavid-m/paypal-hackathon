package services

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"proofrail-backend/internal/models"
)

type TimelineService struct {
	db *gorm.DB
}

func NewTimelineService(db *gorm.DB) *TimelineService {
	return &TimelineService{db: db}
}

func (s *TimelineService) Record(transactionID, eventType, actorType, actorID, title, description string, meta interface{}) error {
	metaJSON := "{}"
	if meta != nil {
		if bytes, err := json.Marshal(meta); err == nil {
			metaJSON = string(bytes)
		}
	}

	event := &models.TimelineEvent{
		ID:            uuid.New().String(),
		TransactionID: transactionID,
		EventType:     eventType,
		ActorType:     actorType,
		ActorID:       actorID,
		Title:         title,
		Description:   description,
		MetadataJSON:  metaJSON,
		CreatedAt:     time.Now(),
	}

	return s.db.Create(event).Error
}

func (s *TimelineService) GetEventsByTransaction(transactionID string) ([]models.TimelineEvent, error) {
	var events []models.TimelineEvent
	err := s.db.Where("transaction_id = ?", transactionID).Order("created_at asc").Find(&events).Error
	return events, err
}
