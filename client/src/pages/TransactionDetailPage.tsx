import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Transaction, Agreement, Evidence, Payment, TimelineEvent, EvidenceGapAnalysis, TransactionHealthCheckResult, HealthGapItem } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { ScoreIndicator } from '../components/common/ScoreIndicator';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { 
  FileText, 
  CreditCard, 
  FolderArchive, 
  Clock, 
  ShieldAlert, 
  ExternalLink, 
  Copy, 
  Check, 
  Upload, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertTriangle,
  FileCheck2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Download,
  Search,
  RefreshCw,
  Activity
} from 'lucide-react';

try {
  ModuleRegistry.registerModules([AllCommunityModule]);
} catch (e) {}

export const TransactionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tx, setTx] = useState<Transaction | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'agreement' | 'payment' | 'evidence' | 'timeline'>('overview');
  const [loading, setLoading] = useState(true);

  // Approval Link state
  const [approvalLink, setApprovalLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Payment state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Evidence state
  const [isUploading, setIsUploading] = useState(false);
  const [showURLModal, setShowURLModal] = useState(false);
  const [urlType, setUrlType] = useState('DEPLOYMENT_URL');
  const [urlValue, setUrlValue] = useState('');
  const [urlDesc, setUrlDesc] = useState('');
  const [evidenceQuickFilter, setEvidenceQuickFilter] = useState('');
  const [timelineQuickFilter, setTimelineQuickFilter] = useState('');

  // Pre-Dispute Health Check state
  const [isScanningHealth, setIsScanningHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<TransactionHealthCheckResult | null>(null);

  // Refs for AG Grid & file input
  const evidenceGridRef = useRef<any>(null);
  const timelineGridRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gap analysis state
  const [gapAnalysis, setGapAnalysis] = useState<EvidenceGapAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadTransaction = async () => {
    if (!id) return;
    try {
      const data = await api.getTransaction(id);
      setTx(data);
      if (data.health_report_json) {
        try {
          const parsed = JSON.parse(data.health_report_json);
          setHealthResult(parsed);
        } catch (e) {
          console.warn('Failed to parse health_report_json', e);
        }
      }
      const ev = await api.getEvidence(id);
      setEvidenceList(ev || []);
      const tl = await api.getTimeline(id);
      setTimeline(tl || []);
    } catch (err) {
      console.error('Failed to load transaction', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransaction();
  }, [id]);

  // Run Pre-Dispute Health Check (USP)
  const handleRunHealthCheck = async () => {
    if (!id) return;
    setIsScanningHealth(true);
    try {
      const res = await api.runHealthCheck(id);
      setHealthResult(res);
      await loadTransaction();
    } catch (err: any) {
      alert(err.message || 'Health check failed');
    } finally {
      setIsScanningHealth(false);
    }
  };

  // Deep-link "Fix This Gap" button handler
  const handleFixGap = (deepLinkField?: string) => {
    switch (deepLinkField) {
      case 'CUSTOMER_APPROVAL':
        setActiveTab('agreement');
        break;
      case 'PAYPAL_CHECKOUT':
        setActiveTab('payment');
        break;
      case 'DEPLOYMENT_URL':
        setActiveTab('evidence');
        setUrlType('DEPLOYMENT_URL');
        setShowURLModal(true);
        break;
      case 'CUSTOMER_ACKNOWLEDGEMENT':
        setActiveTab('evidence');
        setUrlType('CUSTOMER_ACKNOWLEDGEMENT');
        setShowURLModal(true);
        break;
      case 'DELIVERY_SCREENSHOT':
      default:
        setActiveTab('evidence');
        setTimeout(() => {
          fileInputRef.current?.click();
        }, 150);
        break;
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    alert('SHA-256 hash copied to clipboard');
  };

  // AG Grid Column Definitions for Evidence Vault
  const evidenceColDefs = useMemo<ColDef<Evidence>[]>(() => [
    {
      field: 'evidence_type',
      headerName: 'Type',
      width: 180,
      filter: 'agTextColumnFilter',
      sortable: true,
      cellRenderer: (params: any) => (
        <span className="font-semibold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
          {params.value}
        </span>
      ),
    },
    {
      headerName: 'File Name / Link',
      flex: 2,
      minWidth: 220,
      filter: 'agTextColumnFilter',
      sortable: true,
      cellRenderer: (params: any) => {
        const ev = params.data;
        if (!ev) return null;
        if (ev.external_url) {
          return (
            <a
              href={ev.external_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 truncate"
            >
              <span>{ev.external_url}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          );
        }
        return (
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-xs font-semibold text-slate-800 truncate">{ev.file_name || 'Attached Asset'}</span>
            {ev.storage_path && (
              <a href={`/${ev.storage_path}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800">
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        );
      },
    },
    {
      field: 'created_at',
      headerName: 'Uploaded At',
      width: 170,
      filter: 'agDateColumnFilter',
      sortable: true,
      valueFormatter: (params: any) => (params.value ? new Date(params.value).toLocaleString() : 'N/A'),
    },
    {
      field: 'sha256_hash',
      headerName: 'SHA-256 Hash',
      width: 200,
      filter: 'agTextColumnFilter',
      sortable: false,
      cellRenderer: (params: any) => {
        const hash = params.value || '';
        if (!hash) return <span className="text-slate-400 text-xs">N/A</span>;
        return (
          <div className="flex items-center gap-1.5 h-full">
            <span className="font-mono text-[11px] text-slate-600 truncate max-w-[120px]">
              {hash.slice(0, 14)}...
            </span>
            <button
              onClick={() => copyHash(hash)}
              title="Copy full SHA-256"
              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        );
      },
    },
    {
      field: 'uploaded_by',
      headerName: 'Uploaded By',
      width: 170,
      filter: 'agTextColumnFilter',
      sortable: true,
      valueGetter: (params: any) => {
        const val = params.data?.uploaded_by;
        if (!val) return user?.name ? `Merchant (${user.name})` : 'Merchant';
        // If it's a UUID or matches tx.user_id, display the human-readable merchant name
        if (val === tx?.user_id || val.length > 20) {
          const name = user?.name || 'Merchant';
          return `Merchant (${name})`;
        }
        if (tx && (val === tx.customer_email || val === tx.customer_name)) {
          return `Customer (${tx.customer_name})`;
        }
        return val;
      },
      cellRenderer: (params: any) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          <span>{params.value}</span>
        </span>
      ),
    },
  ], [tx, user]);

  // AG Grid Column Definitions for Audit Log / Timeline
  const timelineColDefs = useMemo<ColDef<TimelineEvent>[]>(() => [
    {
      field: 'created_at',
      headerName: 'Timestamp',
      width: 180,
      filter: 'agDateColumnFilter',
      sortable: true,
      valueFormatter: (params: any) => (params.value ? new Date(params.value).toLocaleString() : ''),
    },
    {
      field: 'actor_type',
      headerName: 'Actor',
      width: 130,
      filter: 'agTextColumnFilter',
      sortable: true,
      cellRenderer: (params: any) => {
        const actor = params.value || 'SYSTEM';
        const isAI = actor === 'AI';
        const isBuyer = actor === 'CUSTOMER';
        const isPayPal = actor === 'PAYPAL';
        return (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
            isAI ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
            isBuyer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            isPayPal ? 'bg-blue-50 text-blue-700 border border-blue-200' :
            'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            {actor}
          </span>
        );
      },
    },
    {
      field: 'title',
      headerName: 'Action / Event',
      flex: 1.5,
      minWidth: 200,
      filter: 'agTextColumnFilter',
      sortable: true,
      cellRenderer: (params: any) => (
        <div className="py-1">
          <p className="font-semibold text-xs text-slate-900 leading-tight">{params.data?.title}</p>
          <p className="text-[11px] text-slate-500 truncate">{params.data?.description}</p>
        </div>
      ),
    },
    {
      field: 'metadata_json',
      headerName: 'Metadata',
      flex: 2,
      minWidth: 260,
      filter: 'agTextColumnFilter',
      sortable: false,
      valueGetter: (params: any) => {
        const raw = params.data?.metadata_json;
        if (!raw || raw === '{}') return '—';
        try {
          const parsed = JSON.parse(raw);
          return Object.entries(parsed)
            .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
            .join(' • ');
        } catch {
          return raw;
        }
      },
      cellRenderer: (params: any) => {
        const raw = params.data?.metadata_json;
        if (!raw || raw === '{}') return <span className="text-slate-400 text-xs">—</span>;

        let parsed: Record<string, any> | null = null;
        try {
          parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
          return <span className="text-xs text-slate-600 truncate">{String(raw)}</span>;
        }

        if (!parsed || Object.keys(parsed).length === 0) {
          return <span className="text-slate-400 text-xs">—</span>;
        }

        const entries = Object.entries(parsed);
        return (
          <div className="flex flex-wrap items-center gap-1.5 py-1">
            {entries.map(([key, val]) => {
              const label = key.replace(/_/g, ' ');
              let formattedVal = String(val);

              // Date formatting for timestamps
              if (key.includes('_at') || key.includes('timestamp') || key.includes('time')) {
                try {
                  const d = new Date(val);
                  if (!isNaN(d.getTime())) {
                    formattedVal = d.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                  }
                } catch {}
              }

              if (key === 'version') {
                return (
                  <span
                    key={key}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    Version {val}
                  </span>
                );
              }

              if (key === 'health_score') {
                return (
                  <span
                    key={key}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    Health: {val}/100
                  </span>
                );
              }

              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 border border-slate-200"
                >
                  <span className="text-slate-500 capitalize">{label}:</span>
                  <span className="font-semibold text-slate-800">{formattedVal}</span>
                </span>
              );
            })}
          </div>
        );
      },
    },
  ], []);

  const handleExportEvidenceCSV = () => {
    if (evidenceGridRef.current?.api) {
      evidenceGridRef.current.api.exportDataAsCsv({
        fileName: `proofrail-evidence-${tx?.transaction_code || 'export'}.csv`,
      });
    }
  };

  // Generate Customer Approval Link
  const handleGenerateApprovalLink = async () => {
    if (!id) return;
    setIsGeneratingLink(true);
    try {
      const res = await api.generateApprovalLink(id);
      setApprovalLink(res.public_url);
    } catch (err: any) {
      alert(err.message || 'Failed to generate approval link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // PayPal Sandbox Order Creation & Capture
  const handlePayPalCheckout = async () => {
    if (!id || !tx) return;
    setIsProcessingPayment(true);
    try {
      // 1. Server-side Order Creation with database amount
      const orderRes = await api.createPayPalOrder(id);
      const orderId = orderRes.order_id;

      // 2. Server-side Capture
      await api.capturePayPalOrder(orderId);

      // Reload
      await loadTransaction();
      setActiveTab('payment');
    } catch (err: any) {
      alert(err.message || 'PayPal transaction failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Add External URL Evidence
  const handleAddURLSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !urlValue.trim()) return;
    try {
      await api.addURLEvidence(id, {
        evidence_type: urlType,
        external_url: urlValue,
        description: urlDesc || 'External delivery verification',
      });
      setShowURLModal(false);
      setUrlValue('');
      setUrlDesc('');
      await loadTransaction();
    } catch (err: any) {
      alert(err.message || 'Failed to attach URL');
    }
  };

  // Upload Evidence File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('evidence_type', 'DELIVERY_SCREENSHOT');
      formData.append('description', `Uploaded proof: ${file.name}`);

      await api.uploadFileEvidence(id, formData);
      await loadTransaction();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // AI Evidence Gap Analysis
  const handleRunGapAnalysis = async () => {
    if (!id) return;
    setIsAnalyzing(true);
    try {
      const res = await api.analyzeEvidenceGaps(id);
      setGapAnalysis(res);
      await loadTransaction();
    } catch (err: any) {
      alert(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Open Dispute
  const handleOpenDispute = async () => {
    if (!id) return;
    const confirm = window.confirm(
      'Open a dispute workspace for this transaction? This will file a clearly labelled DEMO SIMULATION dispute for hackathon presentation.'
    );
    if (!confirm) return;

    try {
      const disp = await api.createDispute(id, {
        reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
        source_type: 'SIMULATED',
      });
      navigate(`/disputes/${disp.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to open dispute');
    }
  };

  if (loading || !tx) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  const latestAgreement = tx.agreements && tx.agreements.length > 0 ? tx.agreements[0] : null;
  const deliverables: string[] = latestAgreement?.deliverables_json
    ? JSON.parse(latestAgreement.deliverables_json)
    : [];
  const latestPayment = tx.payments && tx.payments.length > 0 ? tx.payments[0] : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Context */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
              {tx.transaction_code}
            </span>
            <StatusBadge status={tx.status} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-2">{tx.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Customer: <strong className="text-slate-800">{tx.customer_name}</strong> ({tx.customer_email}) • Created {new Date(tx.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right mr-2 hidden sm:block">
            <span className="text-xs text-slate-400 font-medium uppercase block">Total Value</span>
            <span className="text-xl font-extrabold text-slate-900 font-tabular">
              ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {tx.currency}
            </span>
          </div>
          {tx.status !== 'DISPUTED' ? (
            <button
              onClick={handleOpenDispute}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Simulate Dispute</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/disputes')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Open Dispute Report</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 2: USP — PRE-DISPUTE HEALTH CHECK BANNER */}
      {(() => {
        const currentHealthScore = healthResult?.health_score ?? (tx.health_score ?? (tx.status === 'PAID' ? 94 : 35));
        const currentRiskLevel = healthResult?.risk_level ?? (tx.health_risk_level ?? (currentHealthScore >= 80 ? 'LOW' : currentHealthScore >= 50 ? 'MEDIUM' : 'HIGH'));
        const currentGaps = healthResult?.top_gaps || (currentHealthScore < 80 ? [
          {
            gap: "Live Deployment or Staging URL Missing",
            why_it_matters: "PayPal requires verifiable digital delivery domain or production access endpoint.",
            suggested_action: "Link live production URL or GitHub release repository tag in Evidence Vault.",
            deep_link_field: "DEPLOYMENT_URL"
          },
          {
            gap: "Visual Delivery Screenshots Missing",
            why_it_matters: "Visual UI captures prove deliverable functionality and completion.",
            suggested_action: "Upload full-page screenshots showing deliverables in action.",
            deep_link_field: "DELIVERY_SCREENSHOT"
          }
        ] : []);

        const bannerStyles =
          currentRiskLevel === 'LOW'
            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
            : currentRiskLevel === 'MEDIUM'
            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
            : 'bg-red-50/90 border-red-300 text-red-950';

        const iconBg =
          currentRiskLevel === 'LOW'
            ? 'bg-emerald-600 text-white'
            : currentRiskLevel === 'MEDIUM'
            ? 'bg-amber-600 text-white'
            : 'bg-red-600 text-white';

        const dividerBorder =
          currentRiskLevel === 'LOW'
            ? 'border-emerald-200'
            : currentRiskLevel === 'MEDIUM'
            ? 'border-amber-200'
            : 'border-red-200';

        return (
          <div className={`p-5 rounded-2xl border shadow-xs transition-all ${bannerStyles}`}>
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 mb-4 ${dividerBorder}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${iconBg}`}>
                  {currentRiskLevel === 'LOW' ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : currentRiskLevel === 'MEDIUM' ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <ShieldAlert className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/80 border text-slate-800">
                      Pre-Dispute Health Check
                    </span>
                    <span className="font-bold text-xs">
                      Score: <strong className="font-tabular">{currentHealthScore}/100</strong> • {currentRiskLevel} RISK
                    </span>
                  </div>
                  <h2 className="text-lg font-black tracking-tight mt-0.5">
                    {currentRiskLevel === 'LOW'
                      ? 'Dispute-ready'
                      : currentRiskLevel === 'MEDIUM'
                      ? `At risk — ${currentGaps.length} gaps`
                      : 'High risk — missing critical proof'}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunHealthCheck}
                  disabled={isScanningHealth}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isScanningHealth ? 'animate-spin' : ''}`} />
                  <span>{isScanningHealth ? 'Evaluating Evidence...' : 'Re-scan Health'}</span>
                </button>
              </div>
            </div>

            {/* Gaps List & Fix This Gap Buttons */}
            {currentGaps.length > 0 ? (
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider block opacity-85">
                  Evidentiary Remediation Actions ({currentGaps.length}):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentGaps.map((g, idx) => (
                    <div key={idx} className="bg-white/95 p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{g.gap}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{g.why_it_matters}</p>
                        <p className="text-[11px] font-semibold text-blue-700">Action: {g.suggested_action}</p>
                      </div>
                      <button
                        onClick={() => handleFixGap(g.deep_link_field)}
                        className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                      >
                        <span>Fix This Gap</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>All critical evidentiary pillars satisfied. Agreement, PayPal capture, delivery domain, and UI proof are logged.</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 flex gap-6 text-xs font-medium">
        {[
          { id: 'overview', label: 'Overview', icon: FileText },
          { id: 'agreement', label: 'Agreement & Approval', icon: FileCheck2 },
          { id: 'payment', label: 'PayPal Payment', icon: CreditCard },
          { id: 'evidence', label: 'Evidence Vault', icon: FolderArchive },
          { id: 'timeline', label: 'Event Timeline', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 inline-flex items-center gap-2 border-b-2 transition-colors ${
                active
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">Original Requirement Promise</h3>
              <p className="text-xs text-slate-700 leading-relaxed font-mono bg-slate-50 p-4 rounded-xl border border-slate-100">
                "{tx.original_request || 'No raw customer requirements text stored.'}"
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">Deliverables Checklist</h3>
              <div className="space-y-2">
                {deliverables.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-800 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Agreement Readiness Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Contract Readiness</h3>
              <ScoreIndicator
                score={latestAgreement?.readiness_score || 0}
                label="Agreement Completeness"
              />
              <p className="text-xs text-slate-500">
                Deterministic readiness rules verify terms, deadlines, and responsibilities before customer approval.
              </p>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Next Action</h3>
              {tx.status === 'AGREEMENT_PENDING' || tx.status === 'DRAFT' ? (
                <button
                  onClick={() => setActiveTab('agreement')}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Send for Customer Approval</span>
                </button>
              ) : tx.status === 'APPROVED' ? (
                <button
                  onClick={() => setActiveTab('payment')}
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Execute PayPal Capture</span>
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('evidence')}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Delivery Evidence</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Agreement & Approval */}
      {activeTab === 'agreement' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {latestAgreement?.title || 'Contract Agreement'} (Version {latestAgreement?.version || 1})
                </h3>
                <span className="text-xs text-slate-500">
                  Status: <strong className="text-slate-700">{latestAgreement?.status || 'PENDING'}</strong>
                </span>
              </div>
              <button
                onClick={handleGenerateApprovalLink}
                disabled={isGeneratingLink}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>{isGeneratingLink ? 'Generating Link...' : 'Generate Customer Approval Link'}</span>
              </button>
            </div>

            {/* Public Approval Link Alert if generated */}
            {approvalLink && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-2">
                <span className="font-semibold block text-blue-950">Customer Approval Link (Tokenized & Expiring):</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={approvalLink}
                    className="flex-1 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-mono text-slate-800"
                  />
                  <button
                    onClick={() => copyToClipboard(approvalLink)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold flex items-center gap-1 shrink-0"
                  >
                    {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{linkCopied ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <a
                    href={approvalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-white text-blue-700 border border-blue-300 rounded-lg font-semibold flex items-center gap-1 shrink-0 hover:bg-blue-50"
                  >
                    <span>Open as Customer</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-medium text-slate-500 uppercase">Revision Policy</span>
                <p className="text-xs font-semibold text-slate-800 mt-1">{latestAgreement?.revision_policy || 'Standard'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-medium text-slate-500 uppercase">Refund Terms</span>
                <p className="text-xs font-semibold text-slate-800 mt-1">{latestAgreement?.refund_terms || 'Non-refundable once milestone accepted'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: PayPal Payment */}
      {activeTab === 'payment' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">PayPal Sandbox Integration</h3>
                <p className="text-xs text-slate-500 mt-0.5">Server-side order creation and capture using official PayPal REST API v2.</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Sandbox Environment
              </span>
            </div>

            {latestPayment && latestPayment.payment_status === 'CAPTURED' ? (
              <div className="p-5 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Payment Captured Successfully</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700 pt-1">
                  <div>
                    <span className="text-slate-500 block">PayPal Capture ID</span>
                    <strong className="font-mono text-slate-900">{latestPayment.paypal_capture_id}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Amount Captured</span>
                    <strong className="font-tabular text-slate-900">${latestPayment.amount} {latestPayment.currency}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Captured Timestamp</span>
                    <strong className="text-slate-900">{new Date(latestPayment.created_at).toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-4">
                <div className="max-w-md mx-auto">
                  <CreditCard className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">Ready for PayPal Sandbox Payment</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    The payment amount is strictly derived from the approved database agreement ($
                    {tx.amount} {tx.currency}). Click below to trigger the backend order creation and capture.
                  </p>
                </div>
                <button
                  onClick={handlePayPalCheckout}
                  disabled={isProcessingPayment}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isProcessingPayment ? 'Processing Sandbox Capture...' : `Pay $${tx.amount} with PayPal Sandbox`}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Evidence Vault */}
      {activeTab === 'evidence' && (
        <div className="space-y-6">
          {/* Header & Upload Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-slate-900">Evidence Vault</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every attached document, screenshot, and deployment link is cryptographically hashed with SHA-256.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRunGapAnalysis}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Activity className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isAnalyzing ? 'Analyzing...' : 'Run Gap Analysis'}</span>
              </button>

              <button
                onClick={() => setShowURLModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Attach Link</span>
              </button>

              <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Evidence Gap Analysis Box (if run) */}
          {gapAnalysis && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <span>Evidence Completeness & Dispute Defensibility Audit</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evaluates deliverable fulfillment against cryptographic evidence and PayPal Seller Protection criteria.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {gapAnalysis.seller_protection_status?.eligible && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Seller Protection Qualified</span>
                    </span>
                  )}
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                    Defensibility: {gapAnalysis.status}
                  </span>
                </div>
              </div>

              {/* Defensibility Index Breakdown */}
              {gapAnalysis.defensibility_index && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Dispute Defensibility Index: {gapAnalysis.defensibility_index.overall_score}/100 ({gapAnalysis.defensibility_index.level})
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      {gapAnalysis.defensibility_index.summary}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Agreement Clarity</span>
                      <strong className="text-slate-800 text-sm">{gapAnalysis.defensibility_index.agreement_clarity}/25</strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Customer Binding</span>
                      <strong className="text-slate-800 text-sm">{gapAnalysis.defensibility_index.customer_binding}/25</strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Delivery Verification</span>
                      <strong className="text-slate-800 text-sm">{gapAnalysis.defensibility_index.delivery_verification}/30</strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Acknowledgment</span>
                      <strong className="text-slate-800 text-sm">{gapAnalysis.defensibility_index.acknowledgment_weight}/20</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Deliverable-to-Evidence Matrix Table */}
              {gapAnalysis.deliverable_matrix && gapAnalysis.deliverable_matrix.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Deliverable-by-Deliverable Proof Matrix
                  </h5>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="p-3 w-1/3">Agreed Deliverable</th>
                          <th className="p-3 w-28">Status</th>
                          <th className="p-3 w-24">Proof</th>
                          <th className="p-3">Defensibility Analysis & Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {gapAnalysis.deliverable_matrix.map((item, i) => (
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
                            <td className="p-3 text-[11px] space-y-1">
                              <p className="text-slate-700 leading-normal">{item.defensibility_analysis}</p>
                              {item.status !== 'PROVEN' && (
                                <p className="text-indigo-600 font-medium">Action: {item.remedial_action}</p>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recommendations and Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <span className="font-semibold text-emerald-800 block mb-1">Supported Deliverables:</span>
                  <p className="text-slate-700">{gapAnalysis.supported_deliverables} of {gapAnalysis.total_deliverables} verified.</p>
                </div>
                <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-100">
                  <span className="font-semibold text-amber-800 block mb-1">Actionable Recommendations:</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-amber-900">
                    {gapAnalysis.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 italic">{gapAnalysis.disclaimer}</p>
            </div>
          )}

          {/* Evidence Grid with AG Grid Community */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Cryptographic Evidence Vault (AG Grid Community)
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 font-tabular">
                  {evidenceList.length} Items
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    value={evidenceQuickFilter}
                    onChange={(e) => setEvidenceQuickFilter(e.target.value)}
                    placeholder="Quick filter evidence..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 sm:w-56"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                </div>

                <button
                  onClick={handleExportEvidenceCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {evidenceList.length > 0 ? (
              <div className="ag-theme-alpine w-full h-[380px]">
                <AgGridReact
                  ref={evidenceGridRef}
                  rowData={evidenceList}
                  columnDefs={evidenceColDefs}
                  pagination={true}
                  paginationPageSize={8}
                  quickFilterText={evidenceQuickFilter}
                  rowHeight={52}
                  headerHeight={40}
                  animateRows={true}
                />
              </div>
            ) : (
              <div className="p-12 text-center">
                <FolderArchive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No evidence items attached yet.</p>
                <p className="text-xs text-slate-400 mt-1">Upload deployment screenshots or link the live preview URL.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Event Timeline & Audit Log with AG Grid */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Audit Trail & System Logs (AG Grid Community)
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold font-tabular">
                  {timeline.length} Events
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={timelineQuickFilter}
                  onChange={(e) => setTimelineQuickFilter(e.target.value)}
                  placeholder="Quick filter audit log..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 sm:w-56"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              </div>
            </div>

            <div className="ag-theme-alpine w-full h-[380px]">
              <AgGridReact
                ref={timelineGridRef}
                rowData={timeline}
                columnDefs={timelineColDefs}
                pagination={true}
                paginationPageSize={8}
                quickFilterText={timelineQuickFilter}
                rowHeight={56}
                headerHeight={40}
                animateRows={true}
              />
            </div>
          </div>

          {/* Chronological Visual Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Visual Chronological Sequence
            </h4>
            <div className="space-y-6 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {timeline.map((ev) => (
                <div key={ev.id} className="relative flex items-start gap-4">
                  <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white absolute -left-[22px] top-1 shadow-xs" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{ev.title}</span>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase px-1.5 bg-slate-100 rounded">
                        {ev.actor_type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{ev.description}</p>
                    <span className="text-[11px] text-slate-400 block pt-0.5">
                      {new Date(ev.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal for Attaching External URL */}
      {showURLModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Attach Delivery Proof URL</h3>
            <form onSubmit={handleAddURLSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Evidence Type</label>
                <select
                  value={urlType}
                  onChange={(e) => setUrlType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="DEPLOYMENT_URL">Production / Staging Deployment URL</option>
                  <option value="DELIVERY_FILE">Repository / Asset Folder Link</option>
                  <option value="CUSTOMER_ACKNOWLEDGEMENT">Customer Message / Acknowledgement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">URL (http/https)</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/project-preview"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Live preview of 5-page responsive site"
                  value={urlDesc}
                  onChange={(e) => setUrlDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowURLModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Attach Evidence URL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

