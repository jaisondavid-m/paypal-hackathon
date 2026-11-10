import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Settings as SettingsIcon, 
  CreditCard, 
  Sliders, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your PayPal Sandbox integration and AI model configuration.
        </p>
      </div>

      {/* Account Profile Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Merchant Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-1">Full Name</span>
            <strong className="text-slate-900 text-sm">{user?.name || 'Merchant'}</strong>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Account Email</span>
            <strong className="text-slate-900 text-sm">{user?.email}</strong>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Business Identity</span>
            <strong className="text-slate-900 text-sm">{user?.business_name || 'Individual Freelancer'}</strong>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Environment</span>
            <span className="inline-block px-2 py-0.5 rounded font-bold text-blue-700 bg-blue-50 border border-blue-200">
              PayPal Sandbox Connected
            </span>
          </div>
        </div>
      </div>

      {/* PayPal Sandbox Status Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">PayPal REST API Credentials</h3>
          </div>
          <a
            href="https://developer.paypal.com/dashboard/applications/sandbox"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>PayPal Developer Portal</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Credentials are securely managed on the backend via environment variables (<code className="bg-slate-100 px-1 py-0.5 rounded">.env</code>). ProofRail never exposes client secrets or tokens to the browser.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 block font-medium">Gateway Endpoint</span>
            <span className="font-mono text-slate-800">https://api-m.sandbox.paypal.com</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 block font-medium">Webhook Status</span>
            <span className="font-semibold text-emerald-700">Idempotency & Verification Enabled</span>
          </div>
        </div>
      </div>

      {/* Analysis & Verification Engine */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Sliders className="w-5 h-5 text-slate-700" />
          <h3 className="text-sm font-bold text-slate-900">Analysis & Verification Engine</h3>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          ProofRail features dual-mode AI architecture: When <code className="bg-slate-100 px-1 py-0.5 rounded">LLM_API_KEY</code> is present, it invokes Gemini structured JSON extraction. If no key is set, it executes a deterministic rule parser to ensure uninterrupted demo capability.
        </p>

        <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900">
          <strong>Rule Grounding Assurance:</strong> AI never decides payment amounts or creates binding contracts autonomously. Backend validation enforces all business rules, and merchants explicitly review all consequential actions.
        </div>
      </div>
    </div>
  );
};

