package infra

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisClient struct {
	client    *redis.Client
	available bool
}

func NewRedisClient(rawURL string) *RedisClient {
	if rawURL == "" {
		log.Println("[Redis] No REDIS_URL configured; running in direct fallback mode")
		return &RedisClient{available: false}
	}

	opt, err := redis.ParseURL(rawURL)
	if err != nil {
		log.Printf("[Redis] Failed to parse REDIS_URL (%s): %v. Running in direct fallback mode\n", rawURL, err)
		return &RedisClient{available: false}
	}

	opt.DialTimeout = 2 * time.Second
	opt.ReadTimeout = 2 * time.Second
	opt.WriteTimeout = 2 * time.Second

	rdb := redis.NewClient(opt)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("[Redis] Unable to connect to Redis at %s: %v. Running in direct DB fallback mode\n", rawURL, err)
		return &RedisClient{client: rdb, available: false}
	}

	log.Printf("[Redis] Successfully connected to Redis at %s (Caching & Batch Updates active)\n", rawURL)
	return &RedisClient{client: rdb, available: true}
}

func (r *RedisClient) IsAvailable() bool {
	return r != nil && r.available && r.client != nil
}

// Get fetches a string from cache. Returns empty string and redis.Nil on cache miss.
func (r *RedisClient) Get(ctx context.Context, key string) (string, error) {
	if !r.IsAvailable() {
		return "", redis.Nil
	}
	return r.client.Get(ctx, key).Result()
}

// GetJSON unmarshals a cached JSON payload directly into dest.
func (r *RedisClient) GetJSON(ctx context.Context, key string, dest interface{}) error {
	val, err := r.Get(ctx, key)
	if err != nil {
		return err
	}
	return json.Unmarshal([]byte(val), dest)
}

// Set stores a value with TTL.
func (r *RedisClient) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	if !r.IsAvailable() {
		return nil
	}
	var valToStore interface{} = value
	switch v := value.(type) {
	case string, []byte, int, int64, float64, bool:
		valToStore = v
	default:
		bytes, err := json.Marshal(value)
		if err != nil {
			return err
		}
		valToStore = string(bytes)
	}
	return r.client.Set(ctx, key, valToStore, expiration).Err()
}

// Del deletes one or more keys (useful for cache invalidation).
func (r *RedisClient) Del(ctx context.Context, keys ...string) error {
	if !r.IsAvailable() || len(keys) == 0 {
		return nil
	}
	return r.client.Del(ctx, keys...).Err()
}

// SetNX provides an atomic distributed lock or idempotency check.
func (r *RedisClient) SetNX(ctx context.Context, key string, value interface{}, expiration time.Duration) (bool, error) {
	if !r.IsAvailable() {
		return true, nil // Fallback allows execution if Redis is offline
	}
	return r.client.SetNX(ctx, key, value, expiration).Result()
}

// LPush enqueues items into a list (write-behind batch buffer).
func (r *RedisClient) LPush(ctx context.Context, key string, values ...interface{}) error {
	if !r.IsAvailable() {
		return nil
	}
	return r.client.LPush(ctx, key, values...).Err()
}

// RPop pulls a single item from the tail of a list.
func (r *RedisClient) RPop(ctx context.Context, key string) (string, error) {
	if !r.IsAvailable() {
		return "", redis.Nil
	}
	return r.client.RPop(ctx, key).Result()
}

// LLen gets current queue length.
func (r *RedisClient) LLen(ctx context.Context, key string) (int64, error) {
	if !r.IsAvailable() {
		return 0, nil
	}
	return r.client.LLen(ctx, key).Result()
}

