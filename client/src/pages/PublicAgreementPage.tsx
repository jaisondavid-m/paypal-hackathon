import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Agreement } from '../types';
import { CheckCircle2, ShieldCheck, Clock, FileCheck, Check, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export const PublicAgreementPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [approval, setApproval] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const data = await api.getPublicAgreement(token);
        setAgreement(data.agreement);
        setTransaction(data.transaction);
        setApproval(data.approval);
        if (data.approval.status === 'APPROVED') {
          setIsApproved(true);
        }
      } catch (err: any) {
        setError(err.message || 'Agreement link invalid or expired.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const handleApprove = async () => {
    if (!token) return;
    setIsApproving(true);
    try {
      await api.approvePublicAgreement(token, notes);
      setIsApproved(true);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setIsApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Verifying secure agreement token...</p>
        </div>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-md w-full text-center shadow-xs space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Link Invalid or Expired</h2>
          <p className="text-xs text-slate-500">{error || 'This approval link has expired or has already been superseded by a newer version.'}</p>
        </div>
      </div>
    );
  }

  const deliverables: string[] = agreement.deliverables_json
    ? JSON.parse(agreement.deliverables_json)
    : [];

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#172033] py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>ProofRail Secure Customer Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Review & Approve Agreement
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Please review the deliverables and terms proposed by <strong className="text-slate-800">{transaction.merchant_name}</strong> ({transaction.business_name || 'Merchant'}).
          </p>
        </div>

        {/* Agreement Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-mono font-bold text-slate-500 uppercase">{transaction.transaction_code}</span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">{agreement.title}</h2>
              <span className="text-xs text-slate-500">Agreement Version {agreement.version}</span>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 font-medium block">Total Payable</span>
              <span className="text-2xl font-black text-slate-900 font-tabular">
                ${agreement.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {agreement.currency}
              </span>
            </div>
          </div>

          {/* Deliverables */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Agreed Deliverables</h3>
            <div className="space-y-2">
              {deliverables.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Terms Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-semibold block uppercase text-[10px] mb-1">Timeframe</span>
              <p className="font-semibold text-slate-800">{agreement.deadline_days} Calendar Days</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-semibold block uppercase text-[10px] mb-1">Revision Scope</span>
              <p className="font-semibold text-slate-800">{agreement.revision_policy}</p>
            </div>
          </div>

          {/* Approval Action Form */}
          {isApproved ? (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h4 className="text-base font-bold text-emerald-900">Agreement Approved!</h4>
              <p className="text-xs text-emerald-800 max-w-sm mx-auto">
                Your acceptance of Agreement Version {agreement.version} has been cryptographically recorded. The merchant will now proceed with project execution.
              </p>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Optional Acceptance Notes / Comments
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Scope confirmed. Ready to proceed."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                By clicking <strong>Approve Agreement</strong>, you formally confirm that the deliverables and pricing match your project expectations.
              </div>

              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isApproving ? 'Recording Approval...' : 'Approve Agreement Version ' + agreement.version}</span>
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400">
          ProofRail AI • Transaction Evidence Preserved from Promise to Proof
        </p>
      </div>
    </div>
  );
};

