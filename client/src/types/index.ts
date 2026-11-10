export interface User {
  id: string;
  name: string;
  email: string;
  business_name?: string;
  created_at: string;
}

export type TransactionStatus =
  | 'DRAFT'
  | 'AGREEMENT_PENDING'
  | 'APPROVED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'CANCELLED';

export interface Transaction {
  id: string;
  user_id: string;
  transaction_code: string;
  customer_name: string;
  customer_email: string;
  title: string;
  description: string;
  original_request: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  deadline_days: number;
  health_score?: number;
  health_risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
  health_report_json?: string;
  created_at: string;
  updated_at: string;
  agreements?: Agreement[];
  evidence?: Evidence[];
  payments?: Payment[];
  disputes?: Dispute[];
}

export interface Agreement {
  id: string;
  transaction_id: string;
  version: number;
  title: string;
  deliverables_json: string;
  scope_json?: string;
  amount: number;
  currency: string;
  deadline_days: number;
  revision_policy: string;
  responsibilities_json: string;
  acceptance_criteria: string;
  refund_terms: string;
  readiness_score: number;
  missing_info_json: string;
  ambiguities_json: string;
  status: string;
  created_at: string;
}

export interface CustomerApproval {
  id: string;
  transaction_id: string;
  agreement_id: string;
  agreement_version: number;
  customer_email: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  customer_notes?: string;
  approved_at?: string;
  expires_at: string;
}

export interface Payment {
  id: string;
  transaction_id: string;
  provider: string;
  paypal_order_id: string;
  paypal_capture_id: string;
  amount: number;
  currency: string;
  payment_status: 'CREATED' | 'CAPTURED' | 'REFUNDED' | 'FAILED';
  raw_details_json?: string;
  created_at: string;
}

export interface Evidence {
  id: string;
  transaction_id: string;
  evidence_type: string;
  file_name?: string;
  storage_path?: string;
  external_url?: string;
  description: string;
  sha256_hash: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by: string;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  transaction_id: string;
  event_type: string;
  actor_type: string;
  actor_id: string;
  title: string;
  description: string;
  metadata_json?: string;
  created_at: string;
}

export interface Dispute {
  id: string;
  transaction_id: string;
  paypal_dispute_id?: string;
  source_type: 'PAYPAL' | 'SIMULATED';
  reason: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_MERCHANT' | 'RESOLVED_BUYER';
  disputed_amount: number;
  currency: string;
  response_due_at?: string;
  created_at: string;
  transaction?: Transaction;
  reports?: EvidenceReport[];
}

export interface EvidenceReport {
  id: string;
  transaction_id: string;
  dispute_id: string;
  title: string;
  summary: string;
  report_json: string;
  status: 'DRAFT' | 'REVIEWED' | 'EXPORTED';
  created_at: string;
}

export interface DeliverableProofItem {
  deliverable: string;
  status: 'PROVEN' | 'PARTIAL' | 'UNPROVEN';
  proof_strength: number;
  matched_evidence_ids: string[];
  defensibility_analysis: string;
  remedial_action: string;
}

export interface DefensibilityIndex {
  overall_score: number;
  level: 'POOR' | 'MODERATE' | 'STRONG' | 'BULLETPROOF' | string;
  agreement_clarity: number;
  customer_binding: number;
  delivery_verification: number;
  acknowledgment_weight: number;
  summary: string;
}

export interface PayPalSellerProtectionInfo {
  eligible: boolean;
  criteria_met: string[];
  criteria_missing: string[];
  protection_clause: string;
}

export interface AIRebuttalStrategy {
  executive_summary: string;
  dispute_reason_rebuttal: string;
  paypal_policy_justification: string;
  timeline_corroboration: string;
  key_evidence_points: string[];
  resolution_center_submission_text: string;
}

export interface ExtractedAgreement {
  project_title: string;
  deliverables: string[];
  amount: number;
  currency: string;
  deadline_days: number;
  revision_policy: string;
  responsibilities: string[];
  acceptance_criteria: string;
  refund_terms: string;
  missing_information: string[];
  ambiguities: string[];
  chargeback_risk_rating?: 'LOW' | 'MEDIUM' | 'HIGH';
  dispute_prevention_safeguards?: string[];
}

export interface EvidenceGapAnalysis {
  completeness_score: number;
  status: 'POOR' | 'MODERATE' | 'STRONG' | 'EXCELLENT';
  total_deliverables: number;
  supported_deliverables: number;
  missing_deliverables: string[];
  available_evidence: Array<{
    id: string;
    type: string;
    description: string;
    source: string;
    hash?: string;
  }>;
  missing_evidence_types: string[];
  recommendations: string[];
  deliverable_matrix?: DeliverableProofItem[];
  defensibility_index?: DefensibilityIndex;
  seller_protection_status?: PayPalSellerProtectionInfo;
  disclaimer: string;
}

export interface GroundedDisputeReport {
  report_id: string;
  generated_at: string;
  transaction_code: string;
  customer_name: string;
  customer_email: string;
  merchant_name: string;
  original_promise: string;
  agreement_summary: {
    status: string;
    details: string;
    citations: Array<{
      source_type: string;
      source_id: string;
      claim: string;
      status: string;
    }>;
  };
  customer_approval: {
    status: string;
    details: string;
    citations: Array<{
      source_type: string;
      source_id: string;
      claim: string;
      status: string;
    }>;
  };
  payment_verification: {
    status: string;
    details: string;
    citations: Array<{
      source_type: string;
      source_id: string;
      claim: string;
      status: string;
    }>;
  };
  delivery_proof: {
    status: string;
    details: string;
    citations: Array<{
      source_type: string;
      source_id: string;
      claim: string;
      status: string;
    }>;
  };
  timeline_grounded: Array<{
    date: string;
    title: string;
    actor: string;
    citation_id: string;
  }>;
  evidence_citations: Array<{
    source_type: string;
    source_id: string;
    claim: string;
    status: string;
  }>;
  unrecorded_information: string[];
  next_recommended_steps: string[];
  ai_rebuttal?: AIRebuttalStrategy;
  deliverable_proof_breakdown?: DeliverableProofItem[];
  seller_protection_status?: PayPalSellerProtectionInfo;
}

export interface HealthGapItem {
  gap: string;
  why_it_matters: string;
  suggested_action: string;
  deep_link_field?: string;
}

export interface TransactionHealthCheckResult {
  health_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  top_gaps: HealthGapItem[];
  evidence_that_would_help: string[];
  summary?: string;
  scanned_at: string;
}

export interface PayPalDisputeItem {
  dispute_id: string;
  create_time: string;
  update_time: string;
  reason: string;
  status: string;
  dispute_state?: string;
  dispute_life_cycle_stage?: string;
  dispute_channel?: string;
  dispute_amount: {
    currency_code: string;
    value: string;
  };
  disputed_transactions?: Array<{
    buyer_transaction_id: string;
    seller_transaction_id: string;
    gross_amount: {
      currency_code: string;
      value: string;
    };
  }>;
  evidence_requirements?: Array<{
    evidence_type: string;
    notes?: string;
  }>;
  messages?: Array<{
    posted_by: string;
    time_posted: string;
    content: string;
  }>;
}

export interface DashboardMetrics {
  total_transactions: number;
  total_volume: number;
  paid_transactions: number;
  pending_agreements: number;
  evidence_gaps_count: number;
  open_disputes: number;
  portfolio_health_score?: number;
  high_risk_count?: number;
  recent_transactions: Transaction[];
}

