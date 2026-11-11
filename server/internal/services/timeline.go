package services

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"proofrail-backend/internal/infra"
	"proofrail-backend/internal/models"
)

type TimelineService struct {
	db          *gorm.DB
	redis       *infra.RedisClient
	queueKey    string
	batchSize   int
	flushPeriod time.Duration
	stopChan    chan struct{}
	wg          sync.WaitGroup
}

func NewTimelineService(db *gorm.DB, rdb *infra.RedisClient) *TimelineService {
	s := &TimelineService{
		db:          db,
		redis:       rdb,
		queueKey:    "proofrail:batch:timeline",
		batchSize:   200,
		flushPeriod: 2 * time.Second,
		stopChan:    make(chan struct{}),
	}

	// Start background batch flusher if Redis is available
	if rdb != nil && rdb.IsAvailable() {
		s.startBatchFlusher()
	}

	return s
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

	// Invalidate transaction timeline cache
	if s.redis != nil && s.redis.IsAvailable() {
		_ = s.redis.Del(context.Background(), "proofrail:timeline:"+transactionID)

		// Fast Write-Behind buffer via Redis FIFO Queue
		eventBytes, err := json.Marshal(event)
		if err == nil {
			if err := s.redis.LPush(context.Background(), s.queueKey, string(eventBytes)); err == nil {
				return nil
			}
		}
	}

	// Fallback to synchronous direct database write
	return s.db.Create(event).Error
}

func (s *TimelineService) GetEventsByTransaction(transactionID string) ([]models.TimelineEvent, error) {
	cacheKey := "proofrail:timeline:" + transactionID

	// 1. Try L1 Cache Read
	if s.redis != nil && s.redis.IsAvailable() {
		var cached []models.TimelineEvent
		if err := s.redis.GetJSON(context.Background(), cacheKey, &cached); err == nil && len(cached) > 0 {
			return cached, nil
		}
	}

	// 2. Query Relational Database
	var events []models.TimelineEvent
	err := s.db.Where("transaction_id = ?", transactionID).Order("created_at asc").Find(&events).Error
	if err != nil {
		return nil, err
	}

	// 3. Cache-Aside store with 30s TTL
	if s.redis != nil && s.redis.IsAvailable() && len(events) > 0 {
		_ = s.redis.Set(context.Background(), cacheKey, events, 30*time.Second)
	}

	return events, nil
}

func (s *TimelineService) startBatchFlusher() {
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		ticker := time.NewTicker(s.flushPeriod)
		defer ticker.Stop()

		for {
			select {
			case <-s.stopChan:
				s.flushBatch()
				return
			case <-ticker.C:
				s.flushBatch()
			}
		}
	}()
}

func (s *TimelineService) flushBatch() {
	if s.redis == nil || !s.redis.IsAvailable() {
		return
	}

	ctx := context.Background()
	qLen, err := s.redis.LLen(ctx, s.queueKey)
	if err != nil || qLen == 0 {
		return
	}

	batchCount := int(qLen)
	if batchCount > s.batchSize {
		batchCount = s.batchSize
	}

	var batch []models.TimelineEvent
	for i := 0; i < batchCount; i++ {
		raw, err := s.redis.RPop(ctx, s.queueKey)
		if err != nil {
			break
		}
		var item models.TimelineEvent
		if err := json.Unmarshal([]byte(raw), &item); err == nil {
			batch = append(batch, item)
		}
	}

	if len(batch) > 0 {
		// Single bulk SQL INSERT statement
		if err := s.db.CreateInBatches(batch, len(batch)).Error; err != nil {
			log.Printf("[Redis Batcher Error] Failed to bulk insert %d timeline events: %v\n", len(batch), err)
		} else {
			log.Printf("[Redis Batcher] Flushed %d batched timeline events into MySQL\n", len(batch))
		}
	}
}

func (s *TimelineService) Close() {
	close(s.stopChan)
	s.wg.Wait()
}
