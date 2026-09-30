import React from 'react';
import { History, FileText, ArrowRight, Calendar, Search, Filter } from 'lucide-react';
import { HistoryEntry, ImpactReport } from '../types';

interface HistoryViewProps {
  history: HistoryEntry[];
  onOpenReport: (report: ImpactReport) => void;
  onNewAnalysis: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onOpenReport,
  onNewAnalysis
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedFilter, setSelectedFilter] = React.useState<string>('ALL');

  const filteredHistory = history.filter(h => {
    const matchesSearch =
      h.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.repo_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.summary.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = selectedFilter === 'ALL' || h.overall_impact === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <span>Analysis History</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse and inspect previously computed blast-radius reports.
          </p>
        </div>

        <button
          onClick={onNewAnalysis}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
        >
          New Analysis
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, repository, or summary..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto text-xs">
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
            <button
              key={f}
              onClick={() => setSelectedFilter(f)}
              className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-medium transition-colors cursor-pointer ${
                selectedFilter === f
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f === 'ALL' ? 'All Severities' : `${f} Impact`}
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      {filteredHistory.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 space-y-2">
          <FileText className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-sm">No analysis reports match your filter criteria.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-mono text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Analysis ID</th>
                <th className="py-3.5 px-4">Repository</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Changed Files</th>
                <th className="py-3.5 px-4">Impact Level</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredHistory.map(item => (
                <tr key={item.id} className="hover:bg-slate-850/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-indigo-400 font-semibold">{item.id}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{item.repo_name}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-xs">{item.summary}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{item.timestamp}</td>
                  <td className="py-3.5 px-4 font-mono">{item.changed_count} files</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        item.overall_impact === 'HIGH'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                          : item.overall_impact === 'MEDIUM'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      }`}
                    >
                      ● {item.overall_impact}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onOpenReport(item.report)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Re-open</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
