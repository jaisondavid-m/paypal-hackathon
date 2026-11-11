package config

import (
	"os"
	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	DBDriver           string
	DBDSN              string
	JWTSecret          string
	PayPalBaseURL      string
	PayPalClientID     string
	PayPalClientSecret string
	PayPalWebhookID    string
	LLMAPIKey          string
	LLMModel           string
	StorageDir         string
	AppURL             string
	RedisURL           string
	KafkaBrokers       string
}

func Load() *Config {
	_ = godotenv.Load(".env", "../.env", "server/.env")

	port := getEnv("PORT", "8080")
	dbDriver := getEnv("DB_DRIVER", "sqlite")
	dbDSN := getEnv("DB_DSN", "proofrail.db")
	jwtSecret := getEnv("JWT_SECRET", "proofrail-super-secret-jwt-key-2026-hackathon-token")
	paypalBaseURL := getEnv("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com")
	paypalClientID := getEnv("PAYPAL_CLIENT_ID", "")
	paypalClientSecret := getEnv("PAYPAL_CLIENT_SECRET", "")
	paypalWebhookID := getEnv("PAYPAL_WEBHOOK_ID", "")
	llmAPIKey := getEnv("LLM_API_KEY", "")
	llmModel := getEnv("LLM_MODEL", "gemini-3.5-flash")
	storageDir := getEnv("STORAGE_DIR", "./uploads")
	appURL := getEnv("APP_URL", "http://localhost:5173")
	redisURL := getEnv("REDIS_URL", "redis://localhost:6379")
	kafkaBrokers := getEnv("KAFKA_BROKERS", "localhost:9092")

	return &Config{
		Port:               port,
		DBDriver:           dbDriver,
		DBDSN:              dbDSN,
		JWTSecret:          jwtSecret,
		PayPalBaseURL:      paypalBaseURL,
		PayPalClientID:     paypalClientID,
		PayPalClientSecret: paypalClientSecret,
		PayPalWebhookID:    paypalWebhookID,
		LLMAPIKey:          llmAPIKey,
		LLMModel:           llmModel,
		StorageDir:         storageDir,
		AppURL:             appURL,
		RedisURL:           redisURL,
		KafkaBrokers:       kafkaBrokers,
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

