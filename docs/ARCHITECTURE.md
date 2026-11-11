# ProofRail AI — Technical Architecture Specification

> **A Judge-Focused Deep Dive into the Distributed Architecture, Data Lifecycles, Event Pipelines, and Trust Boundaries of ProofRail AI.**

---

## 1. Executive Architectural Overview

ProofRail AI is designed as a **trust layer between business promises and digital payment flows**. In the payment dispute ecosystem, merchants face asymmetric risk: PayPal disputes require strict documentary evidence (contracts, customer acceptance, capture IDs, delivery proof, domain verification) under tight response windows (often 10–20 days).

ProofRail AI replaces post-dispute panic with **continuous evidentiary defense**:
1. **Pre-Dispute Defensibility:** Continuous health auditing and gap analysis *before* work is delivered or disputes arise.
2. **Strict Financial Separation:** AI never moves money or sets financial terms. All amounts, currencies, and capture references originate exclusively from human-approved database records.
3. **High-Throughput Distributed Processing:** Nginx edge load balancing, stateless Go API gateways, Apache Kafka event streaming, Redis L1 caching, and Redis-to-MySQL write-behind batching with zero-downtime graceful fallback.

---

## 2. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Ingress["Ingress & Edge Layer"]
        Merchant["Merchant Browser (React 19 SPA)"]
        Customer["Client Approval Portal (External)"]
        PPWebhook["PayPal Webhook Notifications"]
        Nginx["Nginx Reverse Proxy & Load Balancer<br/>• Upstream: least_conn<br/>• Leaky Bucket Rate Limiting<br/>• SSL Termination & Caching"]
    end

    subgraph Gateways["Stateless Go API Gateway Fleet (Port 8080)"]
        API1["Go API Pod 1 (Gin Web Engine)"]
        API2["Go API Pod 2 (Gin Web Engine)"]
    end

    subgraph SecurityBoundary["Financial & Policy Guard Middleware"]
        MoneyGuard["RejectMoneyFieldsInBody Middleware<br/>• Blocks amount, currency, total in JSON<br/>• Enforces DB as single source of truth"]
        AuthGuard["JWT Authentication & RBAC Guard"]
    end

    subgraph MessagingBroker["Distributed Event Streaming & Caching"]
        Redis["Redis 7 (In-Memory Engine)<br/>• L1 Cache-Aside for Queries<br/>• Distributed Lock (SETNX)<br/>• Write-Behind Batch Queue"]
        Kafka["Apache Kafka 3.7 (KRaft Engine)<br/>• Topic: paypal.dispute.webhooks<br/>• Topic: evidence.vault.ingest<br/>• Topic: dossier.generation.requests"]
    end

    subgraph ProcessingWorkers["Asynchronous Worker Fleet"]
        BatchWorker["Redis Write-Behind Batch Worker<br/>• Flushes 200 items / 2s"]
        WebhookWorker["Kafka Dispute Event Consumer"]
        AIWorker["Gemini AI Dossier Compiler"]
    end

    subgraph Persistence["Storage & External Systems"]
        MySQL[("MySQL 8.0 Primary<br/>• ACID Relational Transactions<br/>• Agreements, Payments, Disputes")]
        EvidenceVault[("Evidence Storage<br/>• Local Volume / S3<br/>• SHA-256 Digest Verification")]
        PayPalAPI["PayPal Sandbox REST API<br/>• /v2/checkout/orders<br/>• /v1/customer/disputes<br/>• /provide-evidence"]
        GeminiAPI["Google Gemini AI Platform<br/>• Structured JSON Output<br/>• Multi-Model Fallback Cascade"]
    end

    Merchant -->|HTTPS / REST| Nginx
    Customer -->|HTTPS Public Portal| Nginx
    PPWebhook -->|HMAC Webhooks| Nginx

    Nginx -->|Least-Conn Routing| API1
    Nginx -->|Least-Conn Routing| API2

    API1 & API2 --> AuthGuard
    API1 & API2 --> MoneyGuard

    MoneyGuard -->|Read/Write Operations| Redis
    MoneyGuard -->|Stream Webhook Events| Kafka
    MoneyGuard -->|Transactional DB Reads| MySQL

    Kafka -->|Stream Consumption| WebhookWorker
    Kafka -->|Dossier Requests| AIWorker
    Redis -->|Drain Buffer Queue| BatchWorker

    BatchWorker -->|Bulk INSERT In Batches| MySQL
    WebhookWorker -->|Sync Dispute Status| MySQL
    AIWorker -->|Structured Extraction & Rebuttal| GeminiAPI
    API1 & API2 -->|Orders & Dispute Queries| PayPalAPI
    API1 & API2 -->|Store Uploaded Proof| EvidenceVault
```

---

## 3. Core Component Responsibilities

### 3.1 Edge Layer (Nginx)
* **Configuration:** [`nginx/nginx.conf`](file:///e:/Projects/paypal-hackathon/nginx/nginx.conf)
* **Least-Connection Balancing:** Distributes requests dynamically between `server-1` and `server-2` based on active socket connections.
* **Leaky Bucket Rate Limiting:**
  * `zone=api_general_limit:10m rate=100r/m` (burst=20 nodelay) protects core API routes.
  * `zone=webhook_limit:10m rate=30r/s` (burst=50 nodelay) buffers PayPal webhook bursts.
* **Keep-Alive Pooling:** Reuses persistent HTTP/1.1 connections upstream to backend pods, cutting TCP handshake latency to zero for high-frequency traffic.

### 3.2 Stateless Go API Gateways
* **Configuration:** Built on Gin and Go 1.24+ ([`server/cmd/server/main.go`](file:///e:/Projects/paypal-hackathon/server/cmd/server/main.go)).
* **Stateless Token Authentication:** Uses HMAC-SHA256 JWTs with expiration claims.
* **Zero-Downtime Fallback Architecture:** If Redis or Kafka are unreachable or not yet booted, the gateway automatically falls back to direct synchronous database processing without service interruption.

### 3.3 Security & Financial Guard Middleware
* **Source:** [`server/internal/middleware/guard.go`](file:///e:/Projects/paypal-hackathon/server/internal/middleware/guard.go)
* **Rule:** "AI recommends, backend validates, merchant approves — AI never moves money."
* **Enforcement:** `RejectMoneyFieldsInBody()` inspects all incoming request bodies to payment-related endpoints. If any payload attempts to pass `amount`, `currency`, `currency_code`, `total`, or `value`, the middleware immediately returns `400 Bad Request (SECURITY_POLICY_VIOLATION)`.
* **Single Source of Truth:** All monetary values for PayPal order creation originate strictly from the immutable database row of the customer-approved agreement.

### 3.4 Apache Kafka Event Streaming
* **Source:** [`server/internal/infra/kafka.go`](file:///e:/Projects/paypal-hackathon/server/internal/infra/kafka.go)
* **Engine:** KRaft mode (no ZooKeeper dependency).
* **Topic `paypal.dispute.webhooks`:** Partitioned by `dispute_id` ensuring in-order processing per dispute.
* **Fast Acknowledgement:** Webhook ingress acknowledges PayPal in `< 5ms`, offloading payload verification and dispute record updating to background consumers.

### 3.5 Redis 7 Caching & Write-Behind Batching
* **Source:** [`server/internal/infra/redis.go`](file:///e:/Projects/paypal-hackathon/server/internal/infra/redis.go)
* **Cache-Aside Reads:** Frequently accessed entities (disputes, transactions, agreements) are cached with 30s–60s TTLs.
* **Write-Behind Batching:** High-frequency timeline audit events are buffered in Redis FIFO queues (`LPUSH proofrail:batch:timeline`) and bulk-inserted into MySQL every 2 seconds or 200 items via `db.CreateInBatches()`.
* **Atomic Idempotency:** Webhook IDs are stored via `SETNX proofrail:webhook:{id} 1 EX 86400` to prevent duplicate processing during network retries.

---

## 4. End-to-End Transaction & Evidence Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Merchant as Merchant
    actor Customer as Client / Buyer
    participant API as Go API Gateway
    participant Guard as Money Guard
    participant AI as Gemini AI Engine
    participant DB as MySQL Database
    participant Redis as Redis Cache
    participant PP as PayPal Sandbox API

    Note over Merchant,API: Phase 1: Structured Deal Framing
    Merchant->>API: POST /api/ai/extract-agreement (Raw conversation/brief)
    API->>AI: Extract Deliverables, Milestones, Scope & Ambiguities
    AI-->>API: Structured Agreement JSON
    API-->>Merchant: Review & Refine Terms ($2,000.00 USD, 14 days)
    Merchant->>API: POST /api/transactions/:id/agreements (Save V1)
    API->>DB: Persist Agreement (DRAFT)

    Note over Merchant,Customer: Phase 2: Client Mutual Assent
    Merchant->>API: POST /api/transactions/:id/agreements/approval-link
    API->>DB: Store CustomerApproval (Token Hash, Status: PENDING)
    API-->>Merchant: Shareable Public Approval URL
    Customer->>API: GET /api/public/agreements/:token
    API->>DB: Verify Token Hash & Return Terms
    API-->>Customer: Display Clean Acceptance Portal
    Customer->>API: POST /api/public/agreements/:token/approve
    API->>DB: Set Status = APPROVED, Record Customer Notes & Timestamp

    Note over Merchant,PP: Phase 3: PayPal Order & Capture
    Merchant->>API: POST /api/transactions/:id/paypal/order
    API->>Guard: Inspect Request Body
    Guard-->>API: PASS (No injected money fields)
    API->>DB: Query Approved Agreement Amount ($2,000.00 USD)
    API->>PP: POST /v2/checkout/orders (intent: CAPTURE, amount: $2,000.00)
    PP-->>API: Return Order ID & Approval Link
    API->>DB: Store Payment (Status: CREATED)
    Merchant->>Customer: Complete PayPal Checkout
    Customer->>PP: Authorize & Approve Payment
    Merchant->>API: POST /api/paypal/orders/:orderId/capture
    API->>PP: POST /v2/checkout/orders/:orderId/capture
    PP-->>API: 201 Created (Capture ID: 3C84518428581024K)
    API->>DB: Update Payment (Status: CAPTURED)
    API->>Redis: Invalidate Transaction Cache

    Note over Merchant,DB: Phase 4: Delivery Evidence Vaulting
    Merchant->>API: POST /api/transactions/:id/evidence/upload (Screenshot/Zip)
    API->>API: Calculate SHA-256 Checksum
    API->>DB: Persist Evidence Item (SHA-256 Hash, File Size, Mime)
    API->>Redis: Enqueue Timeline Event (LPUSH)
```

---

## 5. Dispute Resolution & Dossier Flow

```mermaid
sequenceDiagram
    autonumber
    participant PP as PayPal Webhook
    participant Nginx as Nginx Proxy
    participant API as Go Gateway
    participant Redis as Redis L1
    participant Kafka as Kafka Broker
    participant Worker as Dispute Consumer
    participant DB as MySQL DB
    participant AI as Gemini AI Engine
    actor Merchant as Merchant

    PP->>Nginx: POST /api/webhooks/paypal (CUSTOMER.DISPUTE.CREATED)
    Nginx->>API: Route to Pod
    API->>Redis: SETNX proofrail:webhook:{id} 1 EX 86400
    alt Duplicate Webhook
        Redis-->>API: false
        API-->>PP: 200 OK (duplicate_ignored)
    else New Event
        Redis-->>API: true
        alt Kafka Available
            API->>Kafka: Publish("paypal.dispute.webhooks", disputeID, payload)
            API-->>PP: 200 OK (queued in < 5ms)
            Kafka->>Worker: Consume Event
        else Kafka Offline (Fallback)
            API->>API: Process in-process synchronously
        end
        Worker->>DB: Query Transaction & Payment Capture
        Worker->>DB: Create/Update Dispute Record (OPEN)
        Worker->>Redis: DEL proofrail:disputes:user:{id}
    end

    Merchant->>API: POST /api/disputes/:id/report (Request Defense Dossier)
    API->>DB: Query Transaction, Approved Agreement, Evidence Vault, Capture ID
    API->>AI: Generate 12-Section Source-Grounded Dispute Dossier
    AI->>AI: Cross-reference Deliverables with SHA-256 Evidence Hashes
    AI-->>API: Return Structured Markdown & JSON Rebuttal
    API->>DB: Save EvidenceReport (REVIEWED)
    API-->>Merchant: Display Formatted Dossier for Human Review

    Merchant->>API: POST /api/paypal/disputes/:id/provide-evidence (Approve & Submit)
    API->>PP: POST /v1/customer/disputes/{id}/provide-evidence (Multipart Evidence)
    PP-->>API: 200 OK (Evidence Submitted)
    API->>DB: Update Dispute Status (UNDER_REVIEW)
```

---

## 6. Trust Boundary & Financial Policy Isolation

```
       UNTRUSTED ENVIRONMENT (Browser, Client, LLM Prompts)
──────────────────────────────────────────────────────────────────────────
                                  │
                                  ▼
                    [ RejectMoneyFieldsInBody ]
                                  │
                  (Aborts if amount/currency in body)
                                  │
                                  ▼
──────────────────────────────────────────────────────────────────────────
             TRUSTED ENVIRONMENT (GORM Backend & MySQL Master)
                                  │
        ┌─────────────────────────┴─────────────────────────┐
        ▼                                                   ▼
[ Agreements Table ]                              [ Payments Table ]
• Human-approved amount                           • Tied to Agreement ID
• Immutable version record                        • PayPal Capture ID
• Customer token signature                        • Immutable currency
```

1. **No Client Pricing:** The client application never submits payment amounts to order creation endpoints.
2. **No LLM Financial Control:** AI provides suggestions during agreement drafting. Once saved, terms are locked by merchant approval and client token verification.
3. **Traceable Audit Chain:** Every status mutation generates a cryptographically hashed timeline entry linked to an actor (`MERCHANT`, `CUSTOMER`, `PAYPAL`, `AI`, or `SYSTEM`).

