import React from 'react';
import {
  LayoutDashboard,
  FilePlus,
  History,
  Terminal,
  Settings,
  User,
  LogOut,
  Sparkles,
  Shield,
  Activity
} from 'lucide-react';
import { UserSession } from '../types';

export type NavPage = 'dashboard' | 'new-analysis' | 'history' | 'python-suite' | 'settings' | 'profile';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  user: UserSession;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  user,
  onLogout
}) => {
  const navItems: { id: NavPage; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      id: 'new-analysis',
      label: 'New Analysis',
      icon: <FilePlus className="w-4 h-4" />,
      badge: 'RAG'
    },
    {
      id: 'history',
      label: 'Analysis History',
      icon: <History className="w-4 h-4" />
    },
    {
      id: 'python-suite',
      label: 'Python & EC2 Suite',
      icon: <Terminal className="w-4 h-4" />,
      badge: '20 Tests'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />
    },
    {
      id: 'profile',
      label: 'User Profile',
      icon: <User className="w-4 h-4" />
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-20">
      {/* Top Header */}
      <div>
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center shadow-md shadow-indigo-500/20 text-lg">
            🔍
          </div>
          <div>
            <div className="font-bold text-sm text-white tracking-tight flex items-center gap-1.5">
              Impact Analyzer
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono font-medium">
                v1.0
              </span>
            </div>
            <div className="text-[11px] text-slate-400">Gemini 3.8 Flash &bull; RAG</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map(item => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${
                      isActive ? 'bg-indigo-700/80 text-indigo-100' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Profile & Status */}
      <div className="p-3 border-t border-slate-800/80 space-y-3">
        {/* System Health Indicator */}
        <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-2.5 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-slate-300">Inference Engine</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/50">
            ONLINE
          </span>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-850 border border-slate-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName} className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                {user.displayName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user.displayName}</div>
              <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Logout"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
