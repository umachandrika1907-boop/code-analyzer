import React, { useState } from 'react';
import {
  Download,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCode,
  Globe,
  TestTube,
  BookOpen,
  ShieldAlert,
  ListChecks,
  Copy,
  Check,
  ArrowLeft,
  Share2
} from 'lucide-react';
import { ImpactReport, AffectedComponent } from '../types';

interface ReportViewProps {
  report: ImpactReport;
  onBackToNewAnalysis: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ report, onBackToNewAnalysis }) => {
  const [activeTab, setActiveTab] = useState<'components' | 'apis' | 'tests' | 'docs' | 'risks' | 'diff'>('components');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [completedValidationSteps, setCompletedValidationSteps] = useState<Record<number, boolean>>({});

  const toggleExpand = (key: string) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const highComps = report.affected_components.filter(c => c.impact_level === 'HIGH');
  const medComps = report.affected_components.filter(c => c.impact_level === 'MEDIUM');
  const lowComps = report.affected_components.filter(c => c.impact_level === 'LOW');

  const generateMarkdownReport = (): string => {
    const lines: string[] = [
      '# 📊 Code Change Impact Analysis Report',
      `**Analysis ID:** \`${report.id}\`  `,
      `**Repository:** \`${report.repository_name}\`  `,
      `**Analyzed At:** ${report.analyzed_at}  `,
      `**Model:** \`${report.model_used}\`\n`,
      '## Executive Summary',
      `${report.summary}\n`,
      '## Blast-Radius Metrics',
      `| Metric | Count |`,
      `| :--- | :--- |`,
      `| Changed Files | **${report.metrics.changed_files}** |`,
      `| Affected Repository Files | **${report.metrics.affected_files}** |`,
      `| 🔴 High Impact Components | **${report.metrics.high}** |`,
      `| 🟠 Medium Impact Components | **${report.metrics.medium}** |`,
      `| 🟢 Low Impact Components | **${report.metrics.low}** |\n`,
      '## 🔴 High Impact Components',
      '| File | Component | Reason |',
      '| :--- | :--- | :--- |'
    ];

    highComps.forEach(c => {
      lines.push(`| \`${c.file}\` | \`${c.component}\` | ${c.reason} |`);
    });

    lines.push('\n### Evidence Details');
    highComps.forEach(c => {
      lines.push(`#### \`${c.file}\` :: \`${c.component}\` (Lines ${c.line_range || 'N/A'})`);
      lines.push(`**Reason:** ${c.reason}\n`);
      lines.push('```code\n' + c.evidence + '\n```\n');
    });

    if (report.api_impact.length > 0) {
      lines.push('## 🌐 API Impact');
      report.api_impact.forEach(a => {
        lines.push(`- **${a.method || 'API'} \`${a.endpoint}\`** [${a.impact_level || 'HIGH'}]: ${a.reason}`);
      });
      lines.push('');
    }

    if (report.test_impact.length > 0) {
      lines.push('## 🧪 Test Suite Impact');
      report.test_impact.forEach(t => {
        lines.push(`- **\`${t.test_file}\`** (${t.test_name}): ${t.reason} (*Action: ${t.action_required || 'Verify test'}*)`);
      });
      lines.push('');
    }

    if (report.documentation_impact.length > 0) {
      lines.push('## 📚 Documentation Impact');
      report.documentation_impact.forEach(d => {
        lines.push(`- **\`${d.doc_file}\`** (Section: *${d.section}*): ${d.reason}`);
      });
      lines.push('');
    }

    if (report.recommended_validation.length > 0) {
      lines.push('## ✅ Recommended Validation Checklist');
      report.recommended_validation.forEach((v, idx) => {
        lines.push(`${idx + 1}. [ ] ${v}`);
      });
    }

    return lines.join('\n');
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownReport();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `impact-report-${report.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `impact-report-${report.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyClipboard = (text: string, format: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <button
          onClick={onBackToNewAnalysis}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Analysis Setup</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleCopyClipboard(generateMarkdownReport(), 'markdown')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {copiedFormat === 'markdown' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedFormat === 'markdown' ? 'Copied MD' : 'Copy MD'}</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download MD</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON</span>
          </button>
        </div>
      </div>

      {/* Report Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs text-indigo-400 bg-indigo-950/70 border border-indigo-800/60 px-2 py-0.5 rounded font-semibold">
                {report.id}
              </span>
              <span className="text-xs text-slate-400">Analysis Completed</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">Impact Analysis Report</h1>
            <div className="text-xs text-slate-400 mt-0.5">
              Repository: <b className="text-slate-200">{report.repository_name}</b> &bull; Evaluated on {report.analyzed_at}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
              Model: {report.model_used}
            </span>
          </div>
        </div>

        {/* Executive Summary Callout */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 text-sm leading-relaxed">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-1">
            Executive Summary
          </div>
          {report.summary}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Changed Files</div>
            <div className="text-2xl font-extrabold text-white mt-0.5">{report.metrics.changed_files}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Affected Files</div>
            <div className="text-2xl font-extrabold text-indigo-400 mt-0.5">{report.metrics.affected_files}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-red-900/30 text-center">
            <div className="text-[11px] uppercase tracking-wider text-rose-400 font-semibold">High Impact</div>
            <div className="text-2xl font-extrabold text-rose-400 mt-0.5">{report.metrics.high}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-amber-900/30 text-center">
            <div className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold">Medium Impact</div>
            <div className="text-2xl font-extrabold text-amber-400 mt-0.5">{report.metrics.medium}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-emerald-900/30 text-center">
            <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">Low Impact</div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-0.5">{report.metrics.low}</div>
          </div>
        </div>
      </div>

      {/* Tabs for Navigation */}
      <div className="flex border-b border-slate-800 text-sm font-medium gap-1 overflow-x-auto pb-1">
        {[
          { id: 'components', label: `Affected Components (${report.affected_components.length})`, icon: <FileCode className="w-4 h-4" /> },
          { id: 'apis', label: `API Impact (${report.api_impact.length})`, icon: <Globe className="w-4 h-4" /> },
          { id: 'tests', label: `Test Impact (${report.test_impact.length})`, icon: <TestTube className="w-4 h-4" /> },
          { id: 'docs', label: `Documentation (${report.documentation_impact.length})`, icon: <BookOpen className="w-4 h-4" /> },
          { id: 'risks', label: `Risks & Validation (${report.risks.length})`, icon: <ShieldAlert className="w-4 h-4" /> },
          { id: 'diff', label: 'View Diff', icon: <FileCode className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-slate-800 text-white font-semibold border-b-2 border-indigo-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: AFFECTED COMPONENTS (HIGH, MEDIUM, LOW) */}
      {activeTab === 'components' && (
        <div className="space-y-8">
          {/* HIGH IMPACT */}
          {highComps.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <h2 className="text-base font-bold text-rose-400 tracking-tight">
                  🔴 High Impact Components ({highComps.length})
                </h2>
                <span className="text-xs text-slate-400">Direct breaking changes or critical callers</span>
              </div>

              {/* High Impact Table */}
              <div className="overflow-hidden rounded-xl border border-rose-900/40 bg-slate-900 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-rose-900/30 uppercase tracking-wider font-mono text-[10px]">
                    <tr>
                      <th className="py-3 px-4">File</th>
                      <th className="py-3 px-4">Component</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4 text-right">Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {highComps.map((comp, idx) => {
                      const key = `high_${idx}`;
                      const isExpanded = Boolean(expandedItems[key]);
                      return (
                        <React.Fragment key={idx}>
                          <tr className="hover:bg-slate-850/60 transition-colors">
                            <td className="py-3 px-4 font-mono text-indigo-300">{comp.file}</td>
                            <td className="py-3 px-4 font-semibold text-white">
                              {comp.component}
                              <span className="block text-[10px] text-slate-500 font-mono font-normal">
                                {comp.component_type}
                              </span>
                            </td>
                            <td className="py-3 px-4 leading-relaxed">{comp.reason}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => toggleExpand(key)}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-950/90 border-t border-slate-800/50">
                              <td colSpan={4} className="p-4 space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span>Evidence Snippet &bull; <b>Lines {comp.line_range || 'N/A'}</b></span>
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Grounded in repository
                                  </span>
                                </div>
                                <pre className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                                  {comp.evidence}
                                </pre>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MEDIUM IMPACT */}
          {medComps.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h2 className="text-base font-bold text-amber-400 tracking-tight">
                  🟠 Medium Impact Components ({medComps.length})
                </h2>
                <span className="text-xs text-slate-400">Secondary callers, test updates, or internal dependencies</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {medComps.map((comp, idx) => {
                  const key = `med_${idx}`;
                  const isExpanded = Boolean(expandedItems[key]);
                  return (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-indigo-300 truncate">{comp.file}</span>
                        <span className="text-[10px] font-mono uppercase bg-amber-950/80 text-amber-400 border border-amber-800/60 px-1.5 py-0.5 rounded">
                          {comp.component_type}
                        </span>
                      </div>
                      <div className="font-semibold text-sm text-white">{comp.component}</div>
                      <p className="text-xs text-slate-400 leading-relaxed">{comp.reason}</p>

                      <div className="pt-2 border-t border-slate-800/80">
                        <button
                          onClick={() => toggleExpand(key)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Code Evidence' : 'Show Code Evidence'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {isExpanded && (
                          <pre className="mt-2 bg-slate-950 border border-slate-800 rounded p-2.5 text-[11px] font-mono text-slate-300 overflow-x-auto">
                            {comp.evidence}
                          </pre>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LOW IMPACT */}
          {lowComps.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h2 className="text-base font-bold text-emerald-400 tracking-tight">
                  🟢 Low Impact Components ({lowComps.length})
                </h2>
                <span className="text-xs text-slate-400">Documentation references, non-breaking parameters, comments</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 divide-y divide-slate-800">
                {lowComps.map((comp, idx) => (
                  <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <span className="font-mono text-slate-300 font-semibold">{comp.file}</span>
                      <span className="text-slate-500 font-mono"> &bull; {comp.component}</span>
                      <p className="text-slate-400 text-[11px] mt-0.5">{comp.reason}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0 uppercase">LOW RISK</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: API IMPACT */}
      {activeTab === 'apis' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-400">
            Identifies public HTTP endpoints, RPC methods, and API controllers impacted by the change.
          </div>
          {report.api_impact.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
              No public or internal API endpoints affected.
            </div>
          ) : (
            <div className="space-y-3">
              {report.api_impact.map((api, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-4">
                  <span className="px-2.5 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded font-mono text-xs font-bold shrink-0">
                    {api.method || 'POST'}
                  </span>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-white font-mono">{api.endpoint}</div>
                    <p className="text-xs text-slate-300">{api.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TEST IMPACT */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-400">
            Identifies test suites and integration tests covering the modified functions that need re-verification.
          </div>
          {report.test_impact.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
              No existing test suites flagged for modifications.
            </div>
          ) : (
            <div className="space-y-3">
              {report.test_impact.map((test, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-indigo-300">{test.test_file}</span>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                      RERUN NEEDED
                    </span>
                  </div>
                  <div className="font-semibold text-sm text-white font-mono">{test.test_name}</div>
                  <p className="text-xs text-slate-300">{test.reason}</p>
                  {test.action_required && (
                    <div className="text-[11px] text-amber-300/80 bg-amber-950/30 p-2 rounded border border-amber-900/40">
                      Action Required: <b>{test.action_required}</b>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DOCUMENTATION IMPACT */}
      {activeTab === 'docs' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-400">
            Flags documentation pages, README sections, and markdown guides that describe changed behavior.
          </div>
          {report.documentation_impact.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
              No documentation files desynchronized.
            </div>
          ) : (
            <div className="space-y-3">
              {report.documentation_impact.map((doc, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                  <div className="font-mono text-xs text-indigo-300">{doc.doc_file}</div>
                  <div className="text-sm font-semibold text-white">{doc.section}</div>
                  <p className="text-xs text-slate-400">{doc.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: RISKS & VALIDATION CHECKLIST */}
      {activeTab === 'risks' && (
        <div className="space-y-6">
          {/* Risks */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Identified Potential Risks & Mitigations
            </h3>
            {report.risks.length === 0 ? (
              <p className="text-xs text-slate-500">No elevated risks identified.</p>
            ) : (
              <div className="space-y-3">
                {report.risks.map((r, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-900 border border-amber-900/40 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300 text-sm">{r.risk}</span>
                      <span className="text-[10px] font-mono uppercase bg-amber-950 text-amber-400 px-2 py-0.5 rounded border border-amber-800/60 font-semibold">
                        {r.severity}
                      </span>
                    </div>
                    <div className="text-slate-300">
                      <b>Mitigation Strategy:</b> {r.mitigation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Validation Checklist */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-emerald-400" />
              Recommended Validation Checklist
            </h3>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              {report.recommended_validation.map((step, idx) => {
                const isChecked = Boolean(completedValidationSteps[idx]);
                return (
                  <label
                    key={idx}
                    onClick={() =>
                      setCompletedValidationSteps(prev => ({ ...prev, [idx]: !prev[idx] }))
                    }
                    className="flex items-start gap-3 text-xs text-slate-300 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      className="mt-0.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span className={isChecked ? 'line-through text-slate-500' : ''}>{step}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: RAW DIFF */}
      {activeTab === 'diff' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-400">Original Git diff analyzed:</div>
          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
            {report.raw_diff || 'No raw diff saved.'}
          </pre>
        </div>
      )}
    </div>
  );
};
