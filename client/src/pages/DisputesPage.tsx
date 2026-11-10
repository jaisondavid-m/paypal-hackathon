import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Dispute, PayPalDisputeItem } from '../types';
import { 
  ShieldAlert, 
  AlertTriangle, 
  ArrowRight, 
  Eye, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink,
  ShieldCheck,
  Scale
} from 'lucide-react';

export const DisputesPage: React.FC = () => {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [paypalDisputes, setPaypalDisputes] = useState<PayPalDisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [paypalApiStatus, setPaypalApiStatus] = useState<'CONNECTED' | 'ERROR' | 'CHECKING'>('CHECKING');
  const [apiErrorMessage, setApiErrorMessage] = useState('');

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch ProofRail local/seeded disputes
      const data = await api.getDisputes();
      setDisputes(data || []);

      // 2. Query real PayPal sandbox disputes API
      try {
        const ppRes = await api.getPayPalDisputes();
        if (ppRes && ppRes.items) {
          setPaypalDisputes(ppRes.items);
        } else {
          setPaypalDisputes([]);
        }
        setPaypalApiStatus('CONNECTED');
      } catch (ppErr: any) {
        console.warn('PayPal Sandbox Disputes query:', ppErr);
        setPaypalApiStatus('ERROR');
        setApiErrorMessage(ppErr.message || 'PayPal API connection error');
      }
    } catch (err) {
      console.error('Failed to load disputes', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dispute Workspace</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time PayPal sandbox dispute management, evidentiary mapping, and AI-grounded rebuttal compilation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs shadow-xs">
            <span className={`w-2 h-2 rounded-full ${paypalApiStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : paypalApiStatus === 'ERROR' ? 'bg-red-500' : 'bg-amber-500'}`} />
            <span className="font-semibold text-slate-700">
              {paypalApiStatus === 'CONNECTED' ? 'PayPal Sandbox Live (200 OK)' : paypalApiStatus === 'ERROR' ? 'PayPal API Error' : 'Checking Sandbox...'}
            </span>
          </div>

          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
            title="Refresh disputes from PayPal Sandbox"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Real PayPal Sandbox Active Disputes Panel */}
      {paypalDisputes.length > 0 && (
        <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-blue-200/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
              <h2 className="text-sm font-bold text-blue-900">
                Active PayPal Sandbox Gateway Disputes ({paypalDisputes.length})
              </h2>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-600 text-white">
              REST API v1/customer/disputes
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {paypalDisputes.map((item) => (
              <div key={item.dispute_id} className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{item.dispute_id}</span>
                    <span className="px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 text-[10px]">
                      {item.status}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-800 mt-1">{item.reason.replace(/_/g, ' ')}</h4>
                  <p className="text-[11px] text-slate-500">Created: {new Date(item.create_time).toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Disputed Amount</span>
                    <strong className="text-sm text-slate-900 font-tabular font-bold">
                      ${item.dispute_amount.value} {item.dispute_amount.currency_code}
                    </strong>
                  </div>
                  <button
                    onClick={() => navigate(`/disputes/${item.dispute_id}`)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span>Manage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Dispute Workspace List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Transaction Dispute Dossiers
          </h2>
          <span className="text-xs text-slate-500">
            {disputes.length} Registered Case{disputes.length === 1 ? '' : 's'}
          </span>
        </div>

        {disputes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {disputes.map((d) => (
              <div
                key={d.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {d.transaction?.transaction_code || 'PR-2026'}
                    </span>

                    {/* Prominent Label as per Specification */}
                    {d.source_type === 'SIMULATED' ? (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 uppercase tracking-wide">
                        SIMULATED DISPUTE — NOT A REAL PAYPAL DISPUTE
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        LIVE PAYPAL DISPUTE
                      </span>
                    )}

                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {d.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-800">
                    {d.reason.replace(/_/g, ' ')}
                  </h3>

                  <p className="text-xs text-slate-500">
                    Customer: <span className="font-semibold text-slate-700">{d.transaction?.customer_name}</span> ({d.transaction?.customer_email}) • Response Due: {d.response_due_at ? new Date(d.response_due_at).toLocaleDateString() : 'In 10 days'}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block uppercase font-medium">Disputed Amount</span>
                    <span className="text-lg font-bold text-slate-900 font-tabular">
                      ${d.disputed_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {d.currency}
                    </span>
                  </div>

                  <button
                    onClick={() => navigate(`/disputes/${d.id}`)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Open Workspace</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Active Disputes</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All your transaction records are currently clean. You can simulate a dispute on any transaction from its detail page to demonstrate the evidence dossier compiler!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
