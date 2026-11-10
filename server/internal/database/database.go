package database

import (
	"log"
	"os"
	"strings"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"proofrail-backend/internal/config"
	"proofrail-backend/internal/models"
)

var DB *gorm.DB

func InitDB(cfg *config.Config) *gorm.DB {
	var db *gorm.DB
	var err error

	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	}

	if cfg.DBDriver == "mysql" && cfg.DBDSN != "" {
		dsn := cfg.DBDSN
		if !strings.Contains(dsn, "parseTime=True") && !strings.Contains(dsn, "parseTime=true") {
			if strings.Contains(dsn, "?") {
				dsn += "&parseTime=True&loc=Local"
			} else {
				dsn += "?parseTime=True&loc=Local"
			}
		}
		log.Printf("[DB] Connecting to MySQL with DSN: %s", dsn)
		db, err = gorm.Open(mysql.Open(dsn), gormConfig)
		if err != nil {
			log.Printf("[DB] Warning: MySQL connection failed (%v). Falling back to SQLite proofrail.db", err)
			db, err = gorm.Open(sqlite.Open("proofrail.db"), gormConfig)
		}
	} else {
		log.Println("[DB] Initializing SQLite database (proofrail.db)...")
		db, err = gorm.Open(sqlite.Open(cfg.DBDSN), gormConfig)
	}

	if err != nil {
		log.Fatalf("[DB] Fatal: Failed to initialize database: %v", err)
	}

	// Auto-migrate tables
	log.Println("[DB] Running schema auto-migrations...")
	err = db.AutoMigrate(
		&models.User{},
		&models.Transaction{},
		&models.Agreement{},
		&models.CustomerApproval{},
		&models.Payment{},
		&models.Evidence{},
		&models.TimelineEvent{},
		&models.Dispute{},
		&models.EvidenceReport{},
		&models.WebhookEvent{},
		&models.AuditLog{},
	)
	if err != nil {
		log.Fatalf("[DB] Migration error: %v", err)
	}

	// Ensure upload storage directory exists
	if err := os.MkdirAll(cfg.StorageDir, 0755); err != nil {
		log.Printf("[Storage] Warning: Failed to create storage dir %s: %v", cfg.StorageDir, err)
	}

	// Ensure demo user identity is updated to Jaison Dev
	db.Model(&models.User{}).Where("email = ? AND name != ?", "demo@proofrail.ai", "Jaison Dev").Updates(map[string]interface{}{
		"name":          "Jaison Dev",
		"business_name": "Jaison Digital Studio",
	})

	// Seed comprehensive transaction lifecycle scenarios for judges
	SeedAllUsers(db)

	DB = db
	log.Println("[DB] Database initialized and migrated successfully.")
	return db
}

