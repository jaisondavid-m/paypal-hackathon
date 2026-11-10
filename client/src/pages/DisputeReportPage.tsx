import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { GroundedDisputeReport } from '../types';
import { 
  Printer, 
  ArrowLeft, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Copy,
  Check,
  Scale,
  Shield,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';

export const DisputeReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<GroundedDisputeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedResponse, setCopiedResponse] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const res = await api.getDisputeReport(id);
        setReport(res.grounded_packet);
      } catch (err) {
        console.error('Failed to load report', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopySubmission = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2500);
  };

  if (loading || !report) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4" />
        <div className="h-96 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  const rebuttal = report.ai_rebuttal;
  const sellerProt = report.seller_protection_status;
  const deliverableBreakdown = report.deliverable_proof_breakdown;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 print:p-0 print:max-w-none">
      {/* Top Action Bar (hidden in print) */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(`/disputes/${id}`)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dispute</span>
        </button>

        <div className="flex items-center gap-3">
          {rebuttal?.resolution_center_submission_text && (
            <button
              onClick={() => handleCopySubmission(rebuttal.resolution_center_submission_text)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              {copiedResponse ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedResponse ? 'Copied Resolution Text!' : 'Copy PayPal Response'}</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      {/* Official Evidence Dossier Document */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-12 space-y-8 print:border-none print:shadow-none print:p-0">
        
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl text-slate-900">ProofRail AI</span>
              <span className="text-[10px] font-bold text-blue-700 uppercase px-2 py-0.5 bg-blue-50 rounded border border-blue-200">
                Dispute Defense Dossier
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Source-Grounded Adjudication Package • Reference: <strong className="font-mono text-slate-800">{report.report_id}</strong>
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-500 space-y-0.5">
            <div>Generated: <span className="text-slate-800 font-semibold">{new Date(report.generated_at).toLocaleString()}</span></div>
            <div>Transaction: <span className="font-mono text-slate-800 font-bold">{report.transaction_code}</span></div>
          </div>
        </div>

        {/* EXECUTIVE DISPUTE REBUTTAL CARD */}
        {rebuttal && (
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 tracking-wide">
                  Executive Dispute Rebuttal & Policy Defense
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Grounding: 100% Cryptographic Ledger
              </span>
            </div>

            <p className="text-sm font-medium text-slate-800 leading-relaxed">
              {rebuttal.executive_summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-900 font-bold block text-[11px] uppercase tracking-wide">
                  Dispute Reason Counter-Defense
                </span>
                <p className="text-slate-700 leading-normal text-xs">
                  {rebuttal.dispute_reason_rebuttal}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-blue-900 font-bold block text-[11px] uppercase tracking-wide">
                  PayPal Seller Protection Policy Grounds
                </span>
                <p className="text-slate-700 leading-normal text-xs">
                  {rebuttal.paypal_policy_justification}
                </p>
              </div>
            </div>

            {/* Quick 1-Click Copy Box for PayPal Resolution Center */}
            <div className="mt-3 p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs text-blue-900">
                <strong className="text-blue-950 font-bold">Ready for PayPal Resolution Center:</strong> Formatted evidence narrative under 2,000 characters.
              </div>
              <button
                onClick={() => handleCopySubmission(rebuttal.resolution_center_submission_text)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors shadow-xs"
              >
                {copiedResponse ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedResponse ? 'Copied to Clipboard!' : 'Copy Submission Text'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Section 1: Overview & Parties */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Parties & Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Merchant</span>
              <strong className="text-slate-900 text-sm">{report.merchant_name}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Customer</span>
              <strong className="text-slate-900 text-sm">{report.customer_name}</strong> ({report.customer_email})
            </div>
          </div>
        </div>

        {/* Section 2: Original Customer Requirement */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Original Customer Promise</h2>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs font-mono text-slate-800 leading-relaxed">
            "{report.original_promise || 'No customer brief text recorded.'}"
          </div>
        </div>

        {/* Section 3: Deliverable Proof Breakdown Matrix (High Value AI Feature) */}
        {deliverableBreakdown && deliverableBreakdown.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                3. Deliverable-to-Evidence Verification Matrix
              </h2>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Adjudicator Verification Grid
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="p-3 w-1/3">Contract Deliverable</th>
                    <th className="p-3 w-28">Status</th>
                    <th className="p-3 w-24">Proof</th>
                    <th className="p-3">Adjudicator Evidentiary Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deliverableBreakdown.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-900">{item.deliverable}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded ${
                          item.status === 'PROVEN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          item.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {item.status === 'PROVEN' && <CheckCircle2 className="w-3 h-3" />}
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700">
                        {item.proof_strength}%
                      </td>
                      <td className="p-3 text-slate-600 text-[11px] leading-relaxed">
                        {item.defensibility_analysis}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 4: PayPal Seller Protection Compliance */}
        {sellerProt && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              4. PayPal Seller Protection Compliance Audit
            </h2>
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <strong className="text-xs font-bold text-emerald-900">
                  Eligibility Status: {sellerProt.eligible ? 'QUALIFIED FOR SELLER PROTECTION' : 'UNDER REVIEW'}
                </strong>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                {sellerProt.protection_clause}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                {sellerProt.criteria_met.map((cm, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{cm}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Grounded Agreement & Scope */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">5. Agreed Scope & Deliverables</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              {report.agreement_summary.status}
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed p-4 bg-slate-50 rounded-xl border border-slate-100">
            {report.agreement_summary.details}
          </p>
        </div>

        {/* Section 6: Customer Approval Verification */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">6. Customer Approval Action</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              {report.customer_approval.status}
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed p-4 bg-slate-50 rounded-xl border border-slate-100">
            {report.customer_approval.details}
          </p>
        </div>

        {/* Section 7: PayPal Payment Verification */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">7. PayPal Payment Verification</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              {report.payment_verification.status}
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed p-4 bg-slate-50 rounded-xl border border-slate-100">
            {report.payment_verification.details}
          </p>
        </div>

        {/* Section 8: Delivery Evidence & Hashes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">8. Digital Delivery Proof</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              {report.delivery_proof.status}
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed p-4 bg-slate-50 rounded-xl border border-slate-100">
            {report.delivery_proof.details}
          </p>
        </div>

        {/* Section 9: Grounded Evidence Citations Table */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">9. Source-Grounded Evidence Citations</h2>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="p-3">Source Type</th>
                  <th className="p-3">Citation Reference ID</th>
                  <th className="p-3">Verified Statement</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.evidence_citations.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-800">{c.source_type}</td>
                    <td className="p-3 font-mono text-slate-500 text-[11px]">{c.source_id}</td>
                    <td className="p-3 text-slate-700">{c.claim}</td>
                    <td className="p-3">
                      <span className="font-bold text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 10: Chronological Timeline */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">10. Chronological Audit Trail</h2>
          <div className="space-y-2 text-xs">
            {report.timeline_grounded.map((ev, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-400 text-[11px]">{ev.date}</span>
                  <span className="font-semibold text-slate-800">{ev.title}</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {ev.actor}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 11: Unrecorded / Missing Information */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">11. Unrecorded Information (Strict Grounding)</h2>
          {report.unrecorded_information && report.unrecorded_information.length > 0 ? (
            <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
              {report.unrecorded_information.map((item, i) => (
                <li key={i}>{item} — <strong className="text-slate-500">Not recorded.</strong></li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">All expected evidence categories were recorded.</p>
          )}
        </div>

        {/* Section 12: Legal & Operational Disclaimer */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">Merchant Review & Submission Notice:</p>
          <p>
            This AI-assisted report is a factual compilation of stored database records. Generating this document does not automatically submit evidence to PayPal. Submitting evidence requires separate merchant authorization in the PayPal Resolution Center. ProofRail does not guarantee dispute outcomes or legal enforceability.
          </p>
        </div>

        {/* Section 13: Merchant Signature */}
        <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs">
          <div>
            <p className="font-semibold text-slate-800">Merchant Signature / Reviewer:</p>
            <div className="mt-4 border-b border-slate-300 w-48 h-6" />
            <p className="mt-1 text-slate-500">{report.merchant_name}</p>
          </div>
          <div className="text-right text-slate-400 text-[11px]">
            ProofRail AI Document Verification ID: {report.report_id}
          </div>
        </div>
      </div>
    </div>
  );
};
