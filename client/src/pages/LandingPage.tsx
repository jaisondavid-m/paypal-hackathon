import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  ArrowRight, 
  FileText, 
  CreditCard, 
  FolderArchive, 
  CheckCircle2, 
  Lock,
  Search,
  Scale
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { seedDemoLogin } = useAuth();
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleLaunchDemo = async () => {
    setIsDemoLoading(true);
    try {
      const txId = await seedDemoLogin();
      navigate(`/transactions/${txId}`);
    } catch (err) {
      navigate('/login');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#172033] flex flex-col selection:bg-blue-100">
      {/* Navigation */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-xs">
              P
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-slate-900">ProofRail</span>
              <span className="text-[10px] font-bold text-blue-600 uppercase px-1.5 py-0.5 bg-blue-50 rounded">AI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLaunchDemo}
              disabled={isDemoLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isDemoLoading ? 'Seeding...' : 'Judge Mode (Instant Demo)'}</span>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors shadow-xs"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-full text-xs font-semibold mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>PayPal Sandbox Integration • Promise-to-Proof</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
          Every payment has a story. <br className="hidden sm:inline" />
          <span className="text-blue-600">Keep the proof.</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          ProofRail connects customer agreements, PayPal payments, delivery records, and evidence into one organized transaction history.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleLaunchDemo}
            disabled={isDemoLoading}
            className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            <span>{isDemoLoading ? 'Initializing Judge Scenario...' : 'Judge Mode (Instant 60s Demo)'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
          >
            <span>Create your first transaction</span>
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          No credit card required • Tested with PayPal Sandbox API
        </p>
      </section>

      {/* Interactive UI Preview Mockup */}
      <section className="px-6 max-w-5xl mx-auto w-full mb-24">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-slate-500 ml-2 font-mono">ProofRail AI • Transaction PR-2026-9021</span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              PayPal Paid & Delivered
            </span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">1. Promise Extracted</span>
              <h4 className="text-sm font-bold text-slate-800 mt-1">Website Development ($2,000)</h4>
              <p className="text-xs text-slate-600 mt-2">AI extracted deliverables, 20-day deadline, and revision terms with 92/100 readiness score.</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">2. PayPal Captured</span>
              <h4 className="text-sm font-bold text-slate-800 mt-1">Capture ID: 7E298134UP</h4>
              <p className="text-xs text-slate-600 mt-2">Customer Alex Morgan approved agreement v1 and completed Sandbox checkout.</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">3. Verifiable Proof</span>
              <h4 className="text-sm font-bold text-slate-800 mt-1">Evidence SHA-256 Vault</h4>
              <p className="text-xs text-slate-600 mt-2">Production deployment URL & full page responsive screenshot permanently anchored.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Promise-to-Proof Workflow */}
      <section className="py-16 px-6 bg-white border-y border-slate-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">The Solution</h2>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">How ProofRail AI Works</h3>
            <p className="text-slate-600 text-sm mt-2">
              Most dispute tools begin after a chargeback occurs. ProofRail starts before payment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base mb-4 border border-blue-100">
                1
              </div>
              <h4 className="text-lg font-bold text-slate-900">Agree on the work</h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Paste client briefs or emails. AI extracts deliverables, deadlines, and pricing into a structured agreement with deterministic readiness scoring.
              </p>
            </div>

            <div className="flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base mb-4 border border-blue-100">
                2
              </div>
              <h4 className="text-lg font-bold text-slate-900">Record payment & delivery</h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Client approves terms via tokenized portal. PayPal Sandbox handles server-side capture. Upload screenshots and staging URLs with SHA-256 hashes.
              </p>
            </div>

            <div className="flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base mb-4 border border-blue-100">
                3
              </div>
              <h4 className="text-lg font-bold text-slate-900">Prepare evidence when needed</h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Gap analysis spots missing proof before issues arise. If a dispute happens, generate a source-grounded evidence dossier for export or print.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Security Architecture */}
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Security & Integrity</h2>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Built for Trust and Compliance</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-left">
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <Lock className="w-5 h-5 text-blue-600 mb-2" />
            <h5 className="font-semibold text-sm text-slate-900">Server-Authoritative</h5>
            <p className="text-xs text-slate-500 mt-1">Payment prices are strictly verified against approved agreements, never client state.</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <ShieldCheck className="w-5 h-5 text-emerald-600 mb-2" />
            <h5 className="font-semibold text-sm text-slate-900">SHA-256 Hashing</h5>
            <p className="text-xs text-slate-500 mt-1">Evidence attachments are cryptographically hashed to detect post-upload tampering.</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <Search className="w-5 h-5 text-indigo-600 mb-2" />
            <h5 className="font-semibold text-sm text-slate-900">Source Grounding</h5>
            <p className="text-xs text-slate-500 mt-1">AI dispute reports link every claim to a verified database record or capture ID.</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <Scale className="w-5 h-5 text-amber-600 mb-2" />
            <h5 className="font-semibold text-sm text-slate-900">Clear Attribution</h5>
            <p className="text-xs text-slate-500 mt-1">Simulated disputes are visibly labeled as demo fallback. No fake PayPal records.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 ProofRail AI • Built for the PayPal AI Hackathon</p>
          <div className="flex items-center gap-6">
            <span>PayPal Sandbox Integration</span>
            <span>MIT License</span>
            <span>Privacy & Evidence Security</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

