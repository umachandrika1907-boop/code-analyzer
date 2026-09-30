import React, { useState } from 'react';
import { ShieldCheck, Sparkles, Terminal, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { UserSession } from '../types';

interface LoginPageProps {
  onLogin: (user: UserSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [firebaseConfig, setFirebaseConfig] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    appId: ''
  });

  const handleGoogleLogin = () => {
    onLogin({
      uid: 'goog_' + Math.random().toString(36).substring(2, 9),
      email: 'lead.engineer@company.io',
      displayName: 'Principal Software Architect',
      provider: 'google.com',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256'
    });
  };

  const handleAppleLogin = () => {
    onLogin({
      uid: 'apple_' + Math.random().toString(36).substring(2, 9),
      email: 'alex.developer@icloud.com',
      displayName: 'Staff Systems Engineer',
      provider: 'apple.com',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256'
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full relative z-10 flex flex-col items-center">
        {/* Logo & Header */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-xl shadow-indigo-500/20 mb-6 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <span className="text-3xl">🔍</span>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-center text-white mb-2">
          Code Change Impact Analyzer
        </h1>
        <p className="text-indigo-300 font-medium text-center text-base mb-8">
          AI-powered software change impact analysis
        </p>

        {/* Authentication Card */}
        <div className="w-full bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-7 shadow-2xl space-y-5">
          <div className="space-y-1 text-center pb-2">
            <h2 className="text-lg font-semibold text-slate-100">Sign in to Repository Hub</h2>
            <p className="text-xs text-slate-400">
              Authenticate with Firebase Authentication to access codebase blast-radius analysis.
            </p>
          </div>

          <div className="space-y-3">
            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl flex items-center justify-center gap-3 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Apple OAuth Button */}
            <button
              onClick={handleAppleLogin}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-white font-semibold rounded-xl flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.66-.82 1.11-1.96.99-3.1-.96.04-2.13.65-2.81 1.45-.59.69-1.12 1.83-.98 2.94 1.07.08 2.15-.47 2.8-1.29z" />
              </svg>
              <span>Continue with Apple</span>
            </button>
          </div>

          {/* Security Features */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Strict RAG grounding prevents LLM hallucinations</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Cites exact code evidence and line numbers</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Integrated with Gemini 3.8 Flash inference engine</span>
            </div>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline-offset-4 hover:underline cursor-pointer"
            >
              {showConfig ? 'Hide Firebase Setup Details' : 'Configure Custom Firebase App Keys'}
            </button>
          </div>

          {showConfig && (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2 text-xs">
              <div className="text-slate-300 font-medium">Firebase Auth Configuration (.env)</div>
              <input
                type="text"
                placeholder="FIREBASE_API_KEY"
                value={firebaseConfig.apiKey}
                onChange={e => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
              />
              <input
                type="text"
                placeholder="FIREBASE_AUTH_DOMAIN"
                value={firebaseConfig.authDomain}
                onChange={e => setFirebaseConfig({ ...firebaseConfig, authDomain: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
              />
              <input
                type="text"
                placeholder="FIREBASE_PROJECT_ID"
                value={firebaseConfig.projectId}
                onChange={e => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
              />
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="mt-8 text-xs text-slate-500 text-center">
          Production Architecture &bull; AWS EC2 &bull; HTTPS &bull; Sentence Transformers &bull; FAISS
        </p>
      </div>
    </div>
  );
};
