import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { DashboardMetrics } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  DollarSign, 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertTriangle, 
  FileCheck2, 
  ShieldAlert,
  ArrowRight,
  Plus,
  Clock,
  ShieldCheck,
  RefreshCw,
  Activity
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isScanningAll, setIsScanningAll] = useState(false);

  const loadData = async () => {
    try {
      const data = await api.getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleScanAllHealth = async () => {
    setIsScanningAll(true);
    try {
      const res = await api.scanAllHealth();
      await loadData();
      alert(`Portfolio health scan complete! ${res.scanned_count || 'All'} transactions re-evaluated.`);
    } catch (err: any) {
      alert(err.message || 'Failed to scan transactions');
    } finally {
      setIsScanningAll(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const volume = metrics?.total_volume || 0;
  const totalTx = metrics?.total_transactions || 0;
  const paidTx = metrics?.paid_transactions || 0;
  const pendingAgreements = metrics?.pending_agreements || 0;
  const openDisputes = metrics?.open_disputes || 0;
  const portfolioHealth = metrics?.portfolio_health_score ?? 88;
  const highRiskCount = metrics?.high_risk_count ?? 1;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Merchant Overview</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status of transaction promises, PayPal captures, and pre-dispute health.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/transactions/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Transaction</span>
          </button>
        </div>
      </div>

      {/* SECTION 2 USP: PORTFOLIO HEALTH CHECK (CLEAN FINTECH DESIGN) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Pre-Dispute Health Monitor</span>
              </span>
              <span className="text-xs text-slate-500 font-medium">Automated Evidence Verification</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Portfolio Health Score: <span className="text-emerald-700 font-tabular font-extrabold">{portfolioHealth}/100</span>
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Continuously verifies delivery proof, customer sign-off tokens, and PayPal capture records across all active transactions before disputes happen.
            </p>
            {highRiskCount > 0 ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span><strong>{highRiskCount} open transaction{highRiskCount > 1 ? 's require' : ' requires'} attention</strong> — missing critical delivery proof or customer acceptance.</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All transactions meet PayPal Seller Protection evidentiary requirements.</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={handleScanAllHealth}
              disabled={isScanningAll}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isScanningAll ? 'animate-spin' : ''}`} />
              <span>{isScanningAll ? 'Re-scanning Records...' : 'Re-scan All Transactions'}</span>
            </button>
            <button
              onClick={() => navigate('/transactions')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <span>View Data Grid</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Captured Volume"
          value={`$${volume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Processed via PayPal Sandbox"
          icon={DollarSign}
          badge="Sandbox"
          badgeVariant="info"
        />
        <MetricCard
          title="Active Transactions"
          value={totalTx}
          subtitle={`${paidTx} successfully paid`}
          icon={ArrowLeftRight}
          badge={`${paidTx} Paid`}
          badgeVariant="success"
        />
        <MetricCard
          title="Pending Approval"
          value={pendingAgreements}
          subtitle="Customer review required"
          icon={Clock}
          badge={pendingAgreements > 0 ? 'Action Needed' : 'Clean'}
          badgeVariant={pendingAgreements > 0 ? 'warning' : 'neutral'}
        />
        <MetricCard
          title="Active Disputes"
          value={openDisputes}
          subtitle="Requiring evidence dossier"
          icon={ShieldAlert}
          badge={openDisputes > 0 ? 'Urgent' : 'None'}
          badgeVariant={openDisputes > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Needs Attention / Demo Notice */}
      {openDisputes > 0 && (
        <div className="p-4 rounded-xl bg-red-50/80 border border-red-200 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-900">Active Dispute Under Review</h4>
              <p className="text-xs text-red-700 mt-0.5">
                A customer dispute has been recorded. Compile your source-grounded evidence report before the PayPal response deadline.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/disputes')}
            className="text-xs font-semibold text-red-800 hover:text-red-900 underline shrink-0"
          >
            Open Workspace →
          </button>
        </div>
      )}

      {/* Recent Transactions List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Recent Transactions</h3>
            <p className="text-xs text-slate-500 mt-0.5">Track deliverables, customer approval, and payment capture.</p>
          </div>
          <button
            onClick={() => navigate('/transactions')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All Data Grid</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {metrics?.recent_transactions && metrics.recent_transactions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {metrics.recent_transactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => navigate(`/transactions/${tx.id}`)}
                className="p-4 sm:px-6 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-slate-900">{tx.transaction_code}</span>
                    <StatusBadge status={tx.status} size="sm" />
                  </div>
                  <h4 className="text-sm font-medium text-slate-800">{tx.title}</h4>
                  <p className="text-xs text-slate-500">
                    Customer: <span className="text-slate-700 font-medium">{tx.customer_name}</span> ({tx.customer_email})
                  </p>
                </div>

                <div className="sm:text-right flex sm:flex-col justify-between items-center sm:items-end gap-1">
                  <span className="text-base font-bold text-slate-900 font-tabular">
                    ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {tx.currency}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <ArrowLeftRight className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No transactions created yet.</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Start by creating your first promise-to-proof record.</p>
            <button
              onClick={() => navigate('/transactions/new')}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Create First Transaction
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

