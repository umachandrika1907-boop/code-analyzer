import React, { useState, useEffect } from 'react';
import { Settings, Shield, Cpu, Key, Database, Globe, CheckCircle2, AlertCircle } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealthStatus(data))
      .catch(() => setHealthStatus({ status: 'offline', geminiConfigured: false }));
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <span>System Settings & Configuration</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Inspect model endpoints, vector embedding configurations, and authentication credentials.
        </p>
      </div>

      {/* Model & GenAI settings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            Gemini GenAI Engine
          </h2>
          {healthStatus?.geminiConfigured ? (
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> KEY ATTACHED
            </span>
          ) : (
            <span className="text-xs font-mono text-amber-400 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> SECRETS PANEL READY
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Active Reasoning Model</label>
            <input
              type="text"
              readOnly
              value="gemini-3.8-flash"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-slate-200"
            />
          </div>
          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Embeddings Model</label>
            <input
              type="text"
              readOnly
              value="all-MiniLM-L6-v2 (Sentence-Transformers / 384-dim)"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-slate-200"
            />
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          The API key is accessed securely on the server-side via <code className="text-slate-300">process.env.GEMINI_API_KEY</code> and is never exposed to client browser bundles.
        </p>
      </div>

      {/* Firebase Authentication Configuration */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          Firebase Authentication
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Auth Domain</label>
            <input
              type="text"
              readOnly
              value="code-impact-analyzer.firebaseapp.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-slate-300"
            />
          </div>
          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Project ID</label>
            <input
              type="text"
              readOnly
              value="code-impact-prod"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-slate-300"
            />
          </div>
        </div>

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300">OAuth Providers Configured:</div>
          <div>&bull; Google OAuth 2.0 (Client ID configured via Firebase Console)</div>
          <div>&bull; Sign in with Apple (Service ID and private keys configured in Apple Developer Portal)</div>
        </div>
      </div>

      {/* RAG & Vector Store Parameters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          RAG & Retrieval Parameters
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-slate-500 font-medium">Top-K Chunks</div>
            <div className="text-lg font-bold text-white mt-1">15 chunks</div>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-slate-500 font-medium">Max Chunk Window</div>
            <div className="text-lg font-bold text-white mt-1">70 lines</div>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-slate-500 font-medium">Index Metric</div>
            <div className="text-lg font-bold text-white mt-1">Cosine (IndexFlatIP)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
