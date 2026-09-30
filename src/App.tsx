import React, { useState, useEffect } from 'react';
import { UserSession, HistoryEntry, ImpactReport } from './types';
import { LoginPage } from './components/LoginPage';
import { Sidebar, NavPage } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { NewAnalysisView } from './components/NewAnalysisView';
import { ReportView } from './components/ReportView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { PythonSuiteView } from './components/PythonSuiteView';
import { UserProfileModal } from './components/UserProfileModal';
import { INITIAL_PRECOMPUTED_REPORTS } from './utils/sampleData';

export default function App() {
  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('impact_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');
  const [currentReport, setCurrentReport] = useState<ImpactReport | null>(null);

  // Initialize history with initial precomputed entries
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem('impact_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    const sampleRep = INITIAL_PRECOMPUTED_REPORTS['diff-breaking-signature'];
    return [
      {
        id: sampleRep.id,
        repo_name: sampleRep.repository_name,
        timestamp: sampleRep.analyzed_at,
        changed_count: sampleRep.metrics.changed_files,
        affected_count: sampleRep.metrics.affected_files,
        overall_impact: 'HIGH',
        status: 'COMPLETED',
        summary: sampleRep.summary,
        report: sampleRep
      }
    ];
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('impact_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('impact_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('impact_history', JSON.stringify(history));
  }, [history]);

  const handleLogin = (newUser: UserSession) => {
    setUser(newUser);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentReport(null);
  };

  const handleAnalysisCompleted = (report: ImpactReport) => {
    setCurrentReport(report);
    const overallImpact =
      report.metrics.high > 0 ? 'HIGH' : report.metrics.medium > 0 ? 'MEDIUM' : 'LOW';

    const newHistoryEntry: HistoryEntry = {
      id: report.id,
      repo_name: report.repository_name,
      timestamp: report.analyzed_at,
      changed_count: report.metrics.changed_files,
      affected_count: report.metrics.affected_files,
      overall_impact: overallImpact,
      status: 'COMPLETED',
      summary: report.summary,
      report
    };

    setHistory(prev => [newHistoryEntry, ...prev.filter(h => h.id !== report.id)]);
  };

  const handleOpenHistoricalReport = (report: ImpactReport) => {
    setCurrentReport(report);
    setCurrentPage('new-analysis');
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={page => {
          setCurrentPage(page);
          if (page !== 'new-analysis') {
            setCurrentReport(null);
          }
        }}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-screen">
        {currentPage === 'dashboard' && (
          <DashboardView
            history={history}
            onStartNewAnalysis={() => {
              setCurrentReport(null);
              setCurrentPage('new-analysis');
            }}
            onViewReport={report => {
              setCurrentReport(report);
              setCurrentPage('new-analysis');
            }}
          />
        )}

        {currentPage === 'new-analysis' && (
          <>
            {currentReport ? (
              <ReportView
                report={currentReport}
                onBackToNewAnalysis={() => setCurrentReport(null)}
              />
            ) : (
              <NewAnalysisView onAnalysisCompleted={handleAnalysisCompleted} />
            )}
          </>
        )}

        {currentPage === 'history' && (
          <HistoryView
            history={history}
            onOpenReport={handleOpenHistoricalReport}
            onNewAnalysis={() => {
              setCurrentReport(null);
              setCurrentPage('new-analysis');
            }}
          />
        )}

        {currentPage === 'python-suite' && <PythonSuiteView />}

        {currentPage === 'settings' && <SettingsView />}

        {currentPage === 'profile' && <UserProfileModal user={user} />}
      </main>
    </div>
  );
}
