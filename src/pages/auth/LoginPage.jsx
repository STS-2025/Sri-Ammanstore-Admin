import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Store, Lock, Mail, ArrowRight, Shield, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLES, ROLE_DEFINITIONS } from '../../utils/roles';
import { useNotification } from '../../context/NotificationContext';
import { ensureDeliveryAgentRegistered } from '../../firebase/deliveryService';

export const LoginPage = () => {
  const [selectedRole, setSelectedRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const notify = useNotification();

  // Sign In submit (Staff Login)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(email, password, selectedRole);
      
      // The role comes only from the authenticated user's Firestore profile.
      const activeUserRole = user.role;
      const roleDef = ROLE_DEFINITIONS[activeUserRole];

      // 4. If logged in user is a delivery agent, sync into Admin Dispatch Fleet roster
      if (activeUserRole === ROLES.DELIVERY_AGENT) {
        await ensureDeliveryAgentRegistered({
          uid: user.uid || `ag-${Date.now()}`,
          displayName: user.displayName || user.name || 'Delivery Rider',
          email: user.email,
          phone: user.phone || '+91 98401 22334',
          role: activeUserRole
        });
      }

      notify.success(
        'Welcome Back', 
        `Signed in successfully as ${roleDef?.name || 'Staff Member'}.`
      );

      // 5. Navigate strictly to role's authorized default home screen
      const targetPath = roleDef?.defaultRoute || '/dashboard';
      navigate(targetPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="bg-white py-8 px-6 sm:px-8 shadow-modal rounded-3xl border border-slate-100 space-y-6">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            <div>
              <label className="input-label" htmlFor="login-role">
                Select Operational Role
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 text-emerald-600 absolute left-3 top-3 pointer-events-none" />
                <select
                  id="login-role"
                  required
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="input-text pl-9 text-xs"
                >
                  <option value="" disabled>Select your assigned role</option>
                  {Object.values(ROLE_DEFINITIONS).map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
              <span>{isSubmitting ? 'Verifying Role & Credentials...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Protected under Sri Amman Store Retail Security Guidelines & Firebase IAM.
        </p>
      </div>
    </div>
  );
};
