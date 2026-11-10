import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ExtractedAgreement } from '../types';
import { ScoreIndicator } from '../components/common/ScoreIndicator';
import { 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  FileText, 
  DollarSign, 
  Calendar,
  Layers,
  ShieldCheck
} from 'lucide-react';

export const CreateTransactionPage: React.FC = () => {
  const navigate = useNavigate();

  // Basic Information
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [rawText, setRawText] = useState('');

  // Extracted & Editable Structured Fields
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState('USD');
  const [deadlineDays, setDeadlineDays] = useState<number | ''>('');
  const [revisionPolicy, setRevisionPolicy] = useState('');
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [refundTerms, setRefundTerms] = useState('');
  const [missingInfo, setMissingInfo] = useState<string[]>([]);
  const [ambiguities, setAmbiguities] = useState<string[]>([]);
  const [riskRating, setRiskRating] = useState<'LOW' | 'MEDIUM' | 'HIGH' | null>(null);
  const [safeguards, setSafeguards] = useState<string[]>([]);

  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newDeliverable, setNewDeliverable] = useState('');

  // Calculate deterministic readiness score client-side for live feedback
  const calculateLiveScore = () => {
    let s = 0;
    if (deliverables.length > 0) s += 25;
    if (typeof amount === 'number' && amount > 0 && currency) s += 15;
    if (typeof deadlineDays === 'number' && deadlineDays > 0) s += 15;
    if (revisionPolicy) s += 10;
    if (refundTerms) s += 10;
    if (responsibilities.length > 0) s += 15;
    if (acceptanceCriteria) s += 10;
    return s;
  };

  const readinessScore = calculateLiveScore();

  // AI Extraction Trigger
  const handleExtractWithAI = async () => {
    if (!rawText.trim()) return;
    setIsExtracting(true);
    try {
      const data: ExtractedAgreement = await api.extractAgreement(rawText);
      if (data) {
        if (data.project_title) setProjectTitle(data.project_title);
        if (data.amount !== undefined) setAmount(data.amount);
        if (data.currency) setCurrency(data.currency);
        if (data.deadline_days !== undefined) setDeadlineDays(data.deadline_days);
        if (data.revision_policy) setRevisionPolicy(data.revision_policy);
        if (data.deliverables && data.deliverables.length > 0) setDeliverables(data.deliverables);
        if (data.responsibilities && data.responsibilities.length > 0) setResponsibilities(data.responsibilities);
        if (data.acceptance_criteria) setAcceptanceCriteria(data.acceptance_criteria);
        if (data.refund_terms) setRefundTerms(data.refund_terms);
        if (data.missing_information) setMissingInfo(data.missing_information);
        if (data.ambiguities) setAmbiguities(data.ambiguities);
        if (data.chargeback_risk_rating) setRiskRating(data.chargeback_risk_rating);
        if (data.dispute_prevention_safeguards) setSafeguards(data.dispute_prevention_safeguards);
      }
    } catch (err) {
      console.error('AI extraction error', err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddDeliverable = () => {
    if (newDeliverable.trim()) {
      setDeliverables([...deliverables, newDeliverable.trim()]);
      setNewDeliverable('');
    }
  };

  const handleRemoveDeliverable = (idx: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // 1. Create Transaction
      const tx = await api.createTransaction({
        customer_name: customerName,
        customer_email: customerEmail,
        title: projectTitle || 'Untitled Agreement',
        description: deliverables.length > 0 ? `Project scope: ${deliverables.join('; ')}` : (rawText.slice(0, 100) || 'Custom transaction'),
        original_request: rawText,
        amount: Number(amount) || 0,
        currency: currency,
        deadline_days: Number(deadlineDays) || 14,
      });

      // 2. Save Initial Agreement terms v1
      await api.saveAgreement(tx.id, {
        title: `${projectTitle || 'Project'} Agreement`,
        deliverables,
        scope: deliverables,
        amount: Number(amount) || 0,
        currency,
        deadline_days: Number(deadlineDays) || 14,
        revision_policy: revisionPolicy,
        responsibilities,
        acceptance_criteria: acceptanceCriteria,
        refund_terms: refundTerms,
        missing_info: missingInfo,
        ambiguities,
      });

      navigate(`/transactions/${tx.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create Transaction Record</h1>
        <p className="text-xs text-slate-500 mt-1">
          Paste client requirements to extract deliverables, verify readiness, and generate an approved agreement before payment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Customer & Raw Promise */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">1</span>
            <h3 className="text-sm font-semibold text-slate-900">Customer & Original Requirement</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Customer Full Name</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Customer Email</label>
              <input
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="e.g. alex.morgan@example.com"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700">
                Customer Brief, Email, or Chat Requirements
              </label>
              <button
                type="button"
                onClick={handleExtractWithAI}
                disabled={isExtracting || !rawText.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>{isExtracting ? 'Extracting Terms...' : 'Auto-Extract Terms'}</span>
              </button>
            </div>
            <textarea
              rows={4}
              required
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste email, WhatsApp, or brief describing scope, deliverables, price, and timeframe..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed font-mono"
            />
          </div>
        </div>

        {/* Step 2: Agreement Preflight Readiness */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">2</span>
              <h3 className="text-sm font-semibold text-slate-900">Agreement Preflight Readiness</h3>
            </div>
            <span className="text-xs text-slate-400">Deterministic Completeness Engine</span>
          </div>

          <ScoreIndicator score={readinessScore} label="Contract Readiness Score" />

          {/* Seller Protection Risk Evaluation */}
          {riskRating && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Seller Protection Risk Evaluation
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  riskRating === 'LOW' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  riskRating === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {riskRating} DISPUTE RISK
                </span>
              </div>

              {safeguards.length > 0 && (
                <div className="space-y-1.5 text-xs">
                  <span className="text-slate-600 font-semibold block text-[11px]">Recommended PayPal Safeguards:</span>
                  <ul className="space-y-1 text-slate-700">
                    {safeguards.map((sf, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                        <span>{sf}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {missingInfo.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Missing Terms Detected by Preflight:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-amber-800">
                {missingInfo.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Step 3: Editable Structured Terms */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">3</span>
            <h3 className="text-sm font-semibold text-slate-900">Merchant-Reviewed Agreement Terms</h3>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Project Agreement Title</label>
            <input
              type="text"
              required
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="e.g. Business Website Development"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Total Amount ($)</label>
              <input
                type="number"
                required
                min={1}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-tabular font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Deadline (Days)</label>
              <input
                type="number"
                required
                min={1}
                value={deadlineDays}
                onChange={(e) => setDeadlineDays(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 14)}
                placeholder="e.g. 20"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-tabular"
              />
            </div>
          </div>

          {/* Deliverables Checklist */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Deliverables</label>
            <div className="space-y-2 mb-2">
              {deliverables.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-1">
                  No deliverables added yet. Use "Extract with AI" above or add items manually below.
                </p>
              ) : (
                deliverables.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <span className="font-medium text-slate-800">{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeliverable(idx)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add deliverable..."
                value={newDeliverable}
                onChange={(e) => setNewDeliverable(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDeliverable();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddDeliverable}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                + Add
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Revision Policy</label>
            <input
              type="text"
              value={revisionPolicy}
              onChange={(e) => setRevisionPolicy(e.target.value)}
              placeholder="e.g. Two rounds of design and content revisions included."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Refund & Cancellation Terms</label>
            <input
              type="text"
              value={refundTerms}
              onChange={(e) => setRefundTerms(e.target.value)}
              placeholder="e.g. Milestone payments are non-refundable once approved and deployed."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/transactions')}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Saving...' : 'Review & Create Agreement'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

