import React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  Flame,
  Clock,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  ShieldCheck,
  Search
} from 'lucide-react';
import { HistoryEntry, ImpactReport } from '../types';

interface DashboardViewProps {
  history: HistoryEntry[];
  onStartNewAnalysis: () => void;
  onViewReport: (report: ImpactReport) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  history,
  onStartNewAnalysis,
  onViewReport
}) => {
  const totalAnalyses = history.length;
  const highImpactCount = history.filter(h => h.overall_impact === 'HIGH').length;
  const mediumImpactCount = history.filter(h => h.overall_impact === 'MEDIUM').length;
  const lowImpactCount = history.filter(h => h.overall_impact === 'LOW').length;
  const lastAnalysis = history[0] ? history[0].timestamp.split(' ')[0] : 'None yet';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Code Change Impact Analyzer
            <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-medium">
              RAG + Gemini 3.8 Flash
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Understand what your code changes may affect before deployment.
          </p>
        </div>

        <button
          onClick={onStartNewAnalysis}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-150 cursor-pointer active:scale-95"
        >
          <FileCode className="w-4 h-4" />
          <span>New Analysis</span>
          <ArrowRight className="w-4 h-4 ml-0.5" />
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Analyses</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{totalAnalyses}</div>
          <div className="text-[11px] text-slate-500 mt-1">Evaluated pull requests</div>
        </div>

        {/* High */}
        <div className="bg-slate-900 border border-red-900/30 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-rose-500" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-rose-300">High Impact</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold text-rose-400">{highImpactCount}</div>
          <div className="text-[11px] text-rose-300/70 mt-1">Breaking changes detected</div>
        </div>

        {/* Medium */}
        <div className="bg-slate-900 border border-amber-900/30 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-400" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-300">Medium Impact</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">{mediumImpactCount}</div>
          <div className="text-[11px] text-amber-300/70 mt-1">Secondary callers & tests</div>
        </div>

        {/* Low */}
        <div className="bg-slate-900 border border-emerald-900/30 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-300">Low Impact</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">{lowImpactCount}</div>
          <div className="text-[11px] text-emerald-300/70 mt-1">Safe non-breaking logic</div>
        </div>

        {/* Last Analysis */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Last Analysis</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-slate-200 truncate mt-1">{lastAnalysis}</div>
          <div className="text-[11px] text-slate-500 mt-1">Timestamp recorded</div>
        </div>
      </div>

      {/* Architecture Highlights & Quick Launch */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              Advanced Generative AI Pipeline
            </h2>
            <span className="text-xs text-indigo-300 bg-indigo-950/70 border border-indigo-800/60 px-2.5 py-1 rounded-md font-mono">
              gemini-3.8-flash
            </span>
          </div>

          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            The system chunks repository code at AST symbol boundaries, builds high-dimensional semantic embeddings,
            and queries the FAISS vector index using the Git diff. Gemini 3.8 Flash performs structured impact analysis
            with strict grounding validation to eliminate false positives.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs">
            <div className="space-y-1">
              <div className="text-slate-500 uppercase tracking-wider font-mono text-[10px]">Vector Search</div>
              <div className="font-semibold text-slate-200">FAISS IndexFlatIP</div>
            </div>
            <div className="space-y-1">
              <div className="text-slate-500 uppercase tracking-wider font-mono text-[10px]">AST Parsing</div>
              <div className="font-semibold text-slate-200">Multi-Lang Symbols</div>
            </div>
            <div className="space-y-1">
              <div className="text-slate-500 uppercase tracking-wider font-mono text-[10px]">Verification</div>
              <div className="font-semibold text-emerald-400">Zero Hallucinations</div>
            </div>
          </div>
        </div>

        {/* Quick Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white mb-2">Analyze a Pull Request</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Upload your zipped repository and Git diff file to compute downstream blast-radius in seconds.
            </p>
          </div>

          <div className="space-y-2 mt-4">
            <button
              onClick={onStartNewAnalysis}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Upload Codebase & Diff</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-center text-slate-500">
              Pre-loaded samples available inside for testing
            </p>
          </div>
        </div>
      </div>

      {/* Recent Analyses List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Recent Impact Analyses</h2>
          <span className="text-xs text-slate-500">{history.length} analyses archived</span>
        </div>

        {history.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-500 space-y-3">
            <FileCode className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm">No analyses performed yet. Click below to run your first blast radius check!</p>
            <button
              onClick={onStartNewAnalysis}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors cursor-pointer"
            >
              Start Analysis
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 5).map(item => (
              <div
                key={item.id}
                className="bg-slate-900 hover:bg-slate-850/80 border border-slate-800 rounded-xl p-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-indigo-400 bg-indigo-950/70 border border-indigo-800/50 px-2 py-0.5 rounded">
                      {item.id}
                    </span>
                    <span className="font-medium text-sm text-white truncate">{item.repo_name}</span>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        item.overall_impact === 'HIGH'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                          : item.overall_impact === 'MEDIUM'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      }`}
                    >
                      ● {item.overall_impact} IMPACT
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">{item.summary}</p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs text-slate-500">{item.timestamp}</span>
                  <button
                    onClick={() => onViewReport(item.report)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>View Report</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
