package infra

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"strings"
	"time"

	"github.com/segmentio/kafka-go"
)

type KafkaProducer struct {
	writer    *kafka.Writer
	brokers   []string
	available bool
}

func NewKafkaProducer(brokerList string) *KafkaProducer {
	if brokerList == "" {
		log.Println("[Kafka] No KAFKA_BROKERS configured; running in synchronous in-process mode")
		return &KafkaProducer{available: false}
	}

	brokers := strings.Split(brokerList, ",")
	for i := range brokers {
		brokers[i] = strings.TrimSpace(brokers[i])
	}

	// Dial test to verify broker reachability
	dialer := &kafka.Dialer{
		Timeout:   2 * time.Second,
		DualStack: true,
	}

	conn, err := dialer.DialContext(context.Background(), "tcp", brokers[0])
	if err != nil {
		log.Printf("[Kafka] Broker %s unreachable: %v. Running in synchronous fallback mode\n", brokers[0], err)
		return &KafkaProducer{brokers: brokers, available: false}
	}
	_ = conn.Close()

	writer := &kafka.Writer{
		Addr:         kafka.TCP(brokers...),
		Balancer:     &kafka.LeastBytes{},
		BatchSize:    100,
		BatchTimeout: 10 * time.Millisecond,
		WriteTimeout: 2 * time.Second,
		Async:        false,
	}

	log.Printf("[Kafka] Successfully connected to Kafka cluster at %v (Async Event Streaming active)\n", brokers)
	return &KafkaProducer{
		writer:    writer,
		brokers:   brokers,
		available: true,
	}
}

func (k *KafkaProducer) IsAvailable() bool {
	return k != nil && k.available && k.writer != nil
}

func (k *KafkaProducer) Publish(ctx context.Context, topic, key string, payload interface{}) error {
	if !k.IsAvailable() {
		return errors.New("kafka producer unavailable")
	}

	var data []byte
	switch v := payload.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		b, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		data = b
	}

	msg := kafka.Message{
		Topic: topic,
		Key:   []byte(key),
		Value: data,
		Time:  time.Now(),
	}

	return k.writer.WriteMessages(ctx, msg)
}

func (k *KafkaProducer) Close() error {
	if k.writer != nil {
		return k.writer.Close()
	}
	return nil
}

// StartConsumer starts a background consumer group loop for a given topic.
func StartConsumer(ctx context.Context, brokers []string, topic, groupID string, handler func(msg kafka.Message) error) {
	if len(brokers) == 0 {
		return
	}

	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        brokers,
		GroupID:        groupID,
		Topic:          topic,
		MinBytes:       10e3, // 10KB
		MaxBytes:       10e6, // 10MB
		CommitInterval: time.Second,
		StartOffset:    kafka.LastOffset,
	})

	go func() {
		defer reader.Close()
		log.Printf("[Kafka Consumer] Listening on topic: %s (Group: %s)\n", topic, groupID)
		for {
			select {
			case <-ctx.Done():
				log.Printf("[Kafka Consumer] Shutting down listener for %s\n", topic)
				return
			default:
				msg, err := reader.ReadMessage(ctx)
				if err != nil {
					if errors.Is(err, context.Canceled) {
						return
					}
					time.Sleep(1 * time.Second)
					continue
				}

				if err := handler(msg); err != nil {
					log.Printf("[Kafka Consumer Error] Topic %s: %v\n", topic, err)
				}
			}
		}
	}()
}

