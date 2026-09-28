import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Store, Lock, Mail, ArrowRight, Shield, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { DEMO_USERS } from '../../firebase/authService';
import { ROLE_DEFINITIONS } from '../../utils/roles';
import { useNotification } from '../../context/NotificationContext';

export const LoginPage = () => {
  const [email, setEmail] = useState('owner@sriammanstore.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isFirebaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotification();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      notify.success('Welcome Back', 'Successfully authenticated into Sri Amman Store Admin.');
      
      const roleDef = ROLE_DEFINITIONS[user.role];
      const defaultPath = roleDef?.defaultRoute || '/dashboard';
      const targetPath = (location.state?.from?.pathname && location.state.from.pathname !== '/dashboard')
        ? location.state.from.pathname
        : defaultPath;

      navigate(targetPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDemoUser = (user) => {
    setEmail(user.email);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-800 text-white shadow-xl shadow-emerald-950/50 mb-4 border border-emerald-400/20">
          <Store className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight font-sans">
          Sri Amman Store
        </h2>
        <p className="mt-1 text-xs text-emerald-400 font-mono tracking-wider uppercase">
          Grocery Retail Operations System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-modal rounded-3xl border border-slate-100">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="input-label" htmlFor="email">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@sriammanstore.com"
                  className="input-text pl-9 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="input-label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-text pl-9 pr-10 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary text-xs py-2.5 mt-2 flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? 'Verifying Credentials...' : 'Sign In to Operations Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Role Fillers (Development & Reviewer Convenience) */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
              Quick Staff Login Credentials
            </span>
            <div className="grid grid-cols-2 gap-2 text-left">
              {Object.values(DEMO_USERS).map((user) => (
                <button
                  key={user.uid}
                  type="button"
                  onClick={() => handleSelectDemoUser(user)}
                  className={`p-2 rounded-xl border text-left text-xs transition-colors hover:border-emerald-500 hover:bg-emerald-50/50 ${
                    email === user.email
                      ? 'border-emerald-600 bg-emerald-50 font-semibold'
                      : 'border-slate-200 bg-slate-50/50 text-slate-700'
                  }`}
                >
                  <div className="truncate font-semibold">{ROLE_DEFINITIONS[user.role]?.name || user.role}</div>
                  <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Protected under Sri Amman Store Retail Security Guidelines & Firebase IAM.
        </p>
      </div>
    </div>
  );
};
