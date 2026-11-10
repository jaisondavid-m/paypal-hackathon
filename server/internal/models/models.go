package models

import (
	"time"
)

// User represents a merchant
type User struct {
	ID           string    `gorm:"primaryKey;size:36" json:"id"`
	Name         string    `gorm:"size:255;not null" json:"name"`
	Email        string    `gorm:"size:255;not null;uniqueIndex" json:"email"`
	PasswordHash string    `gorm:"size:255;not null" json:"-"`
	BusinessName string    `gorm:"size:255" json:"business_name"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// TransactionStatus constants
const (
	StatusDraft            = "DRAFT"
	StatusAgreementPending = "AGREEMENT_PENDING"
	StatusApproved         = "APPROVED"
	StatusPaymentPending   = "PAYMENT_PENDING"
	StatusPaid             = "PAID"
	StatusInProgress       = "IN_PROGRESS"
	StatusDelivered        = "DELIVERED"
	StatusCompleted        = "COMPLETED"
	StatusDisputed         = "DISPUTED"
	StatusCancelled        = "CANCELLED"
)

// Transaction represents a merchant-customer deal
type Transaction struct {
	ID              string     `gorm:"primaryKey;size:36" json:"id"`
	UserID          string     `gorm:"size:36;not null;index" json:"user_id"`
	TransactionCode string     `gorm:"size:64;not null;uniqueIndex" json:"transaction_code"`
	CustomerName    string     `gorm:"size:255;not null" json:"customer_name"`
	CustomerEmail   string     `gorm:"size:255;not null" json:"customer_email"`
	Title           string     `gorm:"size:255;not null" json:"title"`
	Description     string     `gorm:"type:text" json:"description"`
	OriginalRequest string     `gorm:"type:text" json:"original_request"`
	Amount          float64    `gorm:"type:decimal(12,2);not null" json:"amount"`
	Currency        string     `gorm:"size:10;not null;default:'USD'" json:"currency"`
	Status          string     `gorm:"size:50;not null;default:'DRAFT';index" json:"status"`
	DeadlineDays     int        `json:"deadline_days"`
	HealthScore      int        `gorm:"default:0" json:"health_score"`
	HealthRiskLevel  string     `gorm:"size:20;default:'MEDIUM'" json:"health_risk_level"`
	HealthReportJSON string     `gorm:"type:text" json:"health_report_json"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	// Associations
	User        *User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Agreements  []Agreement  `gorm:"foreignKey:TransactionID" json:"agreements,omitempty"`
	Evidence    []Evidence   `gorm:"foreignKey:TransactionID" json:"evidence,omitempty"`
	Payments    []Payment    `gorm:"foreignKey:TransactionID" json:"payments,omitempty"`
	Disputes    []Dispute    `gorm:"foreignKey:TransactionID" json:"disputes,omitempty"`
}

// Agreement represents a versioned contract/terms
type Agreement struct {
	ID                   string    `gorm:"primaryKey;size:36" json:"id"`
	TransactionID        string    `gorm:"size:36;not null;index" json:"transaction_id"`
	Version              int       `gorm:"not null" json:"version"`
	Title                string    `gorm:"size:255;not null" json:"title"`
	DeliverablesJSON     string    `gorm:"type:text" json:"deliverables_json"`
	ScopeJSON            string    `gorm:"type:text" json:"scope_json"`
	Amount               float64   `gorm:"type:decimal(12,2);not null" json:"amount"`
	Currency             string    `gorm:"size:10;not null" json:"currency"`
	DeadlineDays         int       `json:"deadline_days"`
	RevisionPolicy       string    `gorm:"type:text" json:"revision_policy"`
	ResponsibilitiesJSON string    `gorm:"type:text" json:"responsibilities_json"`
	AcceptanceCriteria   string    `gorm:"type:text" json:"acceptance_criteria"`
	RefundTerms          string    `gorm:"type:text" json:"refund_terms"`
	ReadinessScore       int       `json:"readiness_score"`
	MissingInfoJSON      string    `gorm:"type:text" json:"missing_info_json"`
	AmbiguitiesJSON      string    `gorm:"type:text" json:"ambiguities_json"`
	Status               string    `gorm:"size:50;default:'DRAFT'" json:"status"` // DRAFT, PENDING_APPROVAL, APPROVED, SUPERSEDED
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

// CustomerApproval represents a customer approval event
type CustomerApproval struct {
	ID               string     `gorm:"primaryKey;size:36" json:"id"`
	TransactionID    string     `gorm:"size:36;not null;index" json:"transaction_id"`
	AgreementID      string     `gorm:"size:36;not null;index" json:"agreement_id"`
	AgreementVersion int        `json:"agreement_version"`
	TokenHash        string     `gorm:"size:128;not null;index" json:"-"`
	RawToken         string     `gorm:"-" json:"token,omitempty"`
	CustomerEmail    string     `gorm:"size:255;not null" json:"customer_email"`
	ApprovalStatus   string     `gorm:"size:50;default:'PENDING'" json:"approval_status"` // PENDING, APPROVED, REJECTED, EXPIRED
	CustomerNotes    string     `gorm:"type:text" json:"customer_notes"`
	ApprovedAt       *time.Time `json:"approved_at"`
	ExpiresAt        time.Time  `json:"expires_at"`
	CreatedAt        time.Time  `json:"created_at"`
}

// Payment represents PayPal order and capture records
type Payment struct {
	ID              string    `gorm:"primaryKey;size:36" json:"id"`
	TransactionID   string    `gorm:"size:36;not null;index" json:"transaction_id"`
	Provider        string    `gorm:"size:50;default:'PAYPAL'" json:"provider"`
	PayPalOrderID   string    `gorm:"size:128;index" json:"paypal_order_id"`
	PayPalCaptureID string    `gorm:"size:128;index" json:"paypal_capture_id"`
	Amount          float64   `gorm:"type:decimal(12,2);not null" json:"amount"`
	Currency        string    `gorm:"size:10;not null" json:"currency"`
	PaymentStatus   string    `gorm:"size:50;not null" json:"payment_status"` // CREATED, CAPTURED, REFUNDED, FAILED
	RawDetailsJSON  string    `gorm:"type:text" json:"raw_details_json"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Evidence types
const (
	EvidenceAgreement              = "AGREEMENT"
	EvidencePaymentRecord          = "PAYMENT_RECORD"
	EvidenceDeliveryScreenshot     = "DELIVERY_SCREENSHOT"
	EvidenceDeliveryFile           = "DELIVERY_FILE"
	EvidenceDeploymentURL          = "DEPLOYMENT_URL"
	EvidenceCustomerMessage        = "CUSTOMER_MESSAGE"
	EvidenceCustomerAcknowledgment = "CUSTOMER_ACKNOWLEDGEMENT"
	EvidenceOther                  = "OTHER"
)

// Evidence represents items in the Evidence Vault
type Evidence struct {
	ID            string    `gorm:"primaryKey;size:36" json:"id"`
	TransactionID string    `gorm:"size:36;not null;index" json:"transaction_id"`
	EvidenceType  string    `gorm:"size:50;not null" json:"evidence_type"`
	FileName      string    `gorm:"size:255" json:"file_name"`
	StoragePath   string    `gorm:"size:500" json:"storage_path"`
	ExternalURL   string    `gorm:"size:1000" json:"external_url"`
	Description   string    `gorm:"type:text" json:"description"`
	SHA256Hash    string    `gorm:"size:64" json:"sha256_hash"`
	FileSize      int64     `json:"file_size"`
	MimeType      string    `gorm:"size:100" json:"mime_type"`
	UploadedBy    string    `gorm:"size:255" json:"uploaded_by"`
	CreatedAt     time.Time `json:"created_at"`
}

// TimelineEvent records the audit timeline of transaction events
type TimelineEvent struct {
	ID            string    `gorm:"primaryKey;size:36" json:"id"`
	TransactionID string    `gorm:"size:36;not null;index" json:"transaction_id"`
	EventType     string    `gorm:"size:100;not null" json:"event_type"`
	ActorType     string    `gorm:"size:50;not null" json:"actor_type"` // MERCHANT, CUSTOMER, PAYPAL, SYSTEM, AI
	ActorID       string    `gorm:"size:255" json:"actor_id"`
	Title         string    `gorm:"size:255;not null" json:"title"`
	Description   string    `gorm:"type:text" json:"description"`
	MetadataJSON  string    `gorm:"type:text" json:"metadata_json"`
	CreatedAt     time.Time `json:"created_at"`
}

// Dispute represents a dispute workspace entry
type Dispute struct {
	ID              string     `gorm:"primaryKey;size:36" json:"id"`
	TransactionID   string     `gorm:"size:36;not null;index" json:"transaction_id"`
	PayPalDisputeID string     `gorm:"size:128" json:"paypal_dispute_id"`
	SourceType      string     `gorm:"size:50;not null;default:'SIMULATED'" json:"source_type"` // PAYPAL or SIMULATED
	Reason          string     `gorm:"size:255;not null" json:"reason"`                         // MERCHANDISE_OR_SERVICE_NOT_RECEIVED, NOT_AS_DESCRIBED, UNAUTHORIZED
	Status          string     `gorm:"size:50;not null;default:'OPEN'" json:"status"`           // OPEN, UNDER_REVIEW, RESOLVED_MERCHANT, RESOLVED_BUYER
	DisputedAmount           float64    `gorm:"type:decimal(12,2);not null" json:"disputed_amount"`
	Currency                 string     `gorm:"size:10;not null" json:"currency"`
	DisputeLifeCycleStage    string     `gorm:"size:50" json:"dispute_life_cycle_stage"`
	EvidenceRequirementsJSON string     `gorm:"type:text" json:"evidence_requirements_json"`
	ResponseDueAt            *time.Time `json:"response_due_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	Transaction *Transaction    `gorm:"foreignKey:TransactionID" json:"transaction,omitempty"`
	Reports     []EvidenceReport `gorm:"foreignKey:DisputeID" json:"reports,omitempty"`
}

// EvidenceReport represents the source-grounded dispute packet
type EvidenceReport struct {
	ID            string    `gorm:"primaryKey;size:36" json:"id"`
	TransactionID string    `gorm:"size:36;not null;index" json:"transaction_id"`
	DisputeID     string    `gorm:"size:36;not null;index" json:"dispute_id"`
	Title         string    `gorm:"size:255;not null" json:"title"`
	Summary       string    `gorm:"type:text" json:"summary"`
	ReportJSON    string    `gorm:"type:text;not null" json:"report_json"`
	Status        string    `gorm:"size:50;default:'DRAFT'" json:"status"` // DRAFT, REVIEWED, EXPORTED
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// WebhookEvent stores incoming provider events for idempotency
type WebhookEvent struct {
	ID               string     `gorm:"primaryKey;size:36" json:"id"`
	Provider         string     `gorm:"size:50;not null;index" json:"provider"`
	ProviderEventID  string     `gorm:"size:255;not null;uniqueIndex" json:"provider_event_id"`
	EventType        string     `gorm:"size:100;not null" json:"event_type"`
	ProcessingStatus string     `gorm:"size:50;not null;default:'RECEIVED'" json:"processing_status"` // RECEIVED, PROCESSED, FAILED
	PayloadJSON      string     `gorm:"type:text" json:"payload_json"`
	ReceivedAt       time.Time  `json:"received_at"`
	ProcessedAt      *time.Time `json:"processed_at"`
}

// AuditLog represents general security and mutation logs
type AuditLog struct {
	ID            string    `gorm:"primaryKey;size:36" json:"id"`
	TransactionID string    `gorm:"size:36;index" json:"transaction_id"`
	ActorType     string    `gorm:"size:50;not null" json:"actor_type"`
	ActorID       string    `gorm:"size:255" json:"actor_id"`
	Action        string    `gorm:"size:100;not null" json:"action"`
	MetadataJSON  string    `gorm:"type:text" json:"metadata_json"`
	CreatedAt     time.Time `json:"created_at"`
}

