import React from 'react';
import { User, Shield, Key, Mail, Calendar, CheckCircle2 } from 'lucide-react';
import { UserSession } from '../types';

interface UserProfileModalProps {
  user: UserSession;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user }) => {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-400" />
          <span>User Profile</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your authenticated identity, authorization scope, and linked OAuth provider.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500/40" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-600/20 text-indigo-300 font-bold text-2xl flex items-center justify-center">
              {user.displayName.charAt(0)}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-white">{user.displayName}</h2>
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>{user.email}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Authenticated
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Provider: {user.provider}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 uppercase font-mono text-[10px]">User UID</span>
            <div className="font-mono text-slate-300 mt-1 truncate">{user.uid}</div>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 uppercase font-mono text-[10px]">Access Role</span>
            <div className="font-semibold text-indigo-300 mt-1">Repository Lead / Architect</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/30 text-xs text-indigo-200/90 leading-relaxed">
          🔒 <b>Enterprise Code Privacy:</b> Repository source code and diffs uploaded for impact analysis are processed ephemeral in RAM and embedded against the vector index. Code is never used for foundation model pre-training.
        </div>
      </div>
    </div>
  );
};
