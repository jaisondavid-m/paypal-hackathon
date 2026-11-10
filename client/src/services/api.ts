const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = 'ERROR', status = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('proofrail_token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText || 'Request failed';
    const errorCode = data?.error?.code || 'HTTP_ERROR';
    throw new ApiError(errorMsg, errorCode, response.status);
  }

  return data?.data !== undefined ? data.data : data;
}

export const api = {
  // Auth
  register: (body: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request<any>('/auth/me'),

  // Dashboard
  getDashboardMetrics: () => request<any>('/dashboard/metrics'),

  // Transactions
  getTransactions: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    const query = q.toString() ? `?${q.toString()}` : '';
    return request<any>(`/transactions${query}`);
  },
  getTransaction: (id: string) => request<any>(`/transactions/${id}`),
  createTransaction: (body: any) => request<any>('/transactions', { method: 'POST', body: JSON.stringify(body) }),
  updateTransaction: (id: string, body: any) => request<any>(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // AI & Agreements
  extractAgreement: (rawText: string) => request<any>('/ai/extract-agreement', { method: 'POST', body: JSON.stringify({ raw_text: rawText }) }),
  saveAgreement: (txId: string, body: any) => request<any>(`/transactions/${txId}/agreements`, { method: 'POST', body: JSON.stringify(body) }),
  generateApprovalLink: (txId: string) => request<any>(`/transactions/${txId}/agreements/approval-link`, { method: 'POST' }),
  
  // Public Customer Portal
  getPublicAgreement: (token: string) => request<any>(`/public/agreements/${token}`),
  approvePublicAgreement: (token: string, notes?: string) => request<any>(`/public/agreements/${token}/approve`, {
    method: 'POST',
    body: JSON.stringify({ customer_notes: notes || '' }),
  }),

  // PayPal Sandbox
  createPayPalOrder: (txId: string) => request<any>(`/transactions/${txId}/paypal/order`, { method: 'POST' }),
  capturePayPalOrder: (orderId: string) => request<any>(`/paypal/orders/${orderId}/capture`, { method: 'POST' }),

  // Evidence
  addURLEvidence: (txId: string, body: { evidence_type: string; external_url: string; description: string }) =>
    request<any>(`/transactions/${txId}/evidence/url`, { method: 'POST', body: JSON.stringify(body) }),
  uploadFileEvidence: (txId: string, formData: FormData) =>
    request<any>(`/transactions/${txId}/evidence/upload`, { method: 'POST', body: formData }),
  getEvidence: (txId: string) => request<any>(`/transactions/${txId}/evidence`),
  deleteEvidence: (id: string) => request<any>(`/evidence/${id}`, { method: 'DELETE' }),
  analyzeEvidenceGaps: (txId: string) => request<any>(`/transactions/${txId}/evidence/analyze`, { method: 'POST' }),
  getTimeline: (txId: string) => request<any>(`/transactions/${txId}/timeline`),

  // Disputes
  getDisputes: () => request<any>('/disputes'),
  createDispute: (txId: string, body: { reason: string; source_type?: string; disputed_amount?: number }) =>
    request<any>(`/transactions/${txId}/disputes`, { method: 'POST', body: JSON.stringify(body) }),
  getDispute: (id: string) => request<any>(`/disputes/${id}`),
  generateDisputeReport: (id: string) => request<any>(`/disputes/${id}/report`, { method: 'POST' }),
  getDisputeReport: (id: string) => request<any>(`/disputes/${id}/report`),

  // Real PayPal Disputes API
  getPayPalDisputes: () => request<any>('/paypal/disputes'),
  getPayPalDispute: (id: string) => request<any>(`/paypal/disputes/${id}`),
  providePayPalDisputeEvidence: (id: string, body: { evidence_type: string; notes: string; evidence_ids?: string[] }) =>
    request<any>(`/paypal/disputes/${id}/provide-evidence`, { method: 'POST', body: JSON.stringify(body) }),

  // Pre-Dispute Health Check (Unique Selling Point)
  runHealthCheck: (txId: string) => request<any>(`/transactions/${txId}/health-check`, { method: 'POST' }),
  scanAllHealth: () => request<any>('/health-check/scan-all', { method: 'POST' }),

  // Demo Seeder
  seedDemo: () => request<any>('/demo/seed', { method: 'POST' }),
};

