import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/lib/supabase';
import { Bug, Mail, Lock, User as UserIcon, Shield } from 'lucide-react';

const ROLES: { value: Role; label: string; description: string }[] = [
  {
    value: 'reporter',
    label: 'Reporter',
    description: 'Submit and track bug reports',
  },
  {
    value: 'developer',
    label: 'Developer',
    description: 'Work on assigned bugs and update status',
  },
  {
    value: 'administrator',
    label: 'Administrator',
    description: 'Manage users and assign developers',
  },
];

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('reporter');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password, fullName, role);
      if (error) setError(error);
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 mb-4 shadow-lg shadow-sky-500/20">
            <Bug className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            BugSentry AI
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            AI-Powered Bug Detection & Incident Management
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Role
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        role === r.value
                          ? 'border-sky-500 bg-sky-500/10'
                          : 'border-white/10 bg-slate-900/50 hover:border-white/20'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                          role === r.value
                            ? 'bg-sky-500 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {r.label}
                        </div>
                        <div className="text-xs text-slate-400">
                          {r.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-medium rounded-xl shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          College Project · Software Engineering · 2026
        </p>
      </div>
    </div>
  );
}
