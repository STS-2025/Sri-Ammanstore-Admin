import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Store, Lock, Mail, ArrowRight, Shield, AlertCircle, Eye, EyeOff,
  User, UserPlus, ChevronDown, CheckCircle2, Phone
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { DEMO_USERS } from '../../firebase/authService';
import { ROLES, ROLE_DEFINITIONS } from '../../utils/roles';
import { useNotification } from '../../context/NotificationContext';

export const LoginPage = () => {
  // Tab state: 'login' | 'signup'
  const [activeTab, setActiveTab] = useState('login');

  // Sign In state
  const [selectedRole, setSelectedRole] = useState(ROLES.SUPER_ADMIN);
  const [email, setEmail] = useState('owner@sriammanstore.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up / Registration state
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: ROLES.DELIVERY_AGENT,
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotification();

  // Handle Role selection change in Sign In dropdown
  const handleRoleChange = (roleKey) => {
    setSelectedRole(roleKey);
    const demoUser = DEMO_USERS[roleKey];
    if (demoUser) {
      setEmail(demoUser.email);
      setPassword('password123');
    }
  };

  const handleSelectDemoUser = (user) => {
    setSelectedRole(user.role);
    setEmail(user.email);
    setPassword('password123');
  };

  // Sign In submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Sync demo role preview if applicable
      if (selectedRole) {
        switchDemoRole(selectedRole);
      }

      const user = await login(email, password);
      const activeUserRole = selectedRole || user.role || ROLES.SUPER_ADMIN;
      const roleDef = ROLE_DEFINITIONS[activeUserRole];

      notify.success(
        'Welcome Back', 
        `Signed in successfully as ${roleDef?.name || 'Staff Member'}.`
      );

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

  // Sign Up / Staff Registration submit
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match. Please verify your password entry.');
      return;
    }

    setIsSubmitting(true);

    try {
      const assignedRole = signupForm.role;
      const newStaffUser = {
        uid: `staff-${Date.now()}`,
        email: signupForm.email,
        displayName: signupForm.name,
        role: assignedRole,
        phone: signupForm.phone || '+91 98765 00000',
        status: 'active'
      };

      // Register into local demo directory
      DEMO_USERS[assignedRole] = newStaffUser;

      // Switch active role to the newly registered role
      switchDemoRole(assignedRole);
      await login(signupForm.email, signupForm.password || 'password123');

      const roleDef = ROLE_DEFINITIONS[assignedRole];
      notify.success(
        'Registration Successful', 
        `New ${roleDef?.name || 'Staff'} account created for ${signupForm.name}.`
      );

      const targetPath = roleDef?.defaultRoute || '/dashboard';
      navigate(targetPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please check form fields.');
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
          
          {/* Tab Switcher: Sign In vs Staff Registration */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError('');
              }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Staff Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setError('');
              }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Staff Sign Up</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: STAFF SIGN IN FORM */}
          {activeTab === 'login' && (
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              {/* Role Selection Dropdown */}
              <div>
                <label className="input-label" htmlFor="role-select">
                  Select Operational Role
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-emerald-600 absolute left-3 top-3 pointer-events-none" />
                  <select
                    id="role-select"
                    value={selectedRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="input-text pl-9 pr-8 font-semibold text-slate-800 bg-slate-50/80 border-slate-300 focus:bg-white text-xs cursor-pointer appearance-none"
                  >
                    {Object.values(ROLE_DEFINITIONS).map((def) => (
                      <option key={def.id} value={def.id}>
                        {def.name} ({def.permissions.length} capabilities)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
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
                <span>{isSubmitting ? 'Verifying Credentials...' : `Sign In as ${ROLE_DEFINITIONS[selectedRole]?.name || 'Staff'}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB 2: STAFF SIGN UP / REGISTRATION FORM */}
          {activeTab === 'signup' && (
            <form className="space-y-4" onSubmit={handleSignupSubmit}>
              <div>
                <label className="input-label" htmlFor="signup-name">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="signup-name"
                    type="text"
                    required
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="input-text pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="input-label" htmlFor="signup-email">
                  Staff Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    placeholder="ramesh@sriammanstore.com"
                    className="input-text pl-9 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="input-label" htmlFor="signup-phone">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="signup-phone"
                    type="tel"
                    required
                    value={signupForm.phone}
                    onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="input-text pl-9 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Assigned Role Selection Dropdown */}
              <div>
                <label className="input-label" htmlFor="signup-role">
                  Choose Assigned Operational Role
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-indigo-600 absolute left-3 top-3 pointer-events-none" />
                  <select
                    id="signup-role"
                    value={signupForm.role}
                    onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value })}
                    className="input-text pl-9 pr-8 font-semibold text-slate-800 bg-slate-50/80 border-slate-300 focus:bg-white text-xs cursor-pointer appearance-none"
                  >
                    {Object.values(ROLE_DEFINITIONS).map((def) => (
                      <option key={def.id} value={def.id}>
                        {def.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="input-label" htmlFor="signup-password">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="signup-password"
                    type="password"
                    required
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="input-text pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="input-label" htmlFor="signup-confirm">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="signup-confirm"
                    type="password"
                    required
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    placeholder="••••••••••••"
                    className="input-text pl-9 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Registering Staff Account...' : `Register & Sign Up as ${ROLE_DEFINITIONS[signupForm.role]?.name}`}</span>
                <UserPlus className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Quick Staff Login Grid */}
          {activeTab === 'login' && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
                Quick Role Fillers
              </span>
              <div className="grid grid-cols-2 gap-2 text-left">
                {Object.values(DEMO_USERS).map((user) => (
                  <button
                    key={user.uid}
                    type="button"
                    onClick={() => handleSelectDemoUser(user)}
                    className={`p-2 rounded-xl border text-left text-xs transition-colors hover:border-emerald-500 hover:bg-emerald-50/50 ${
                      selectedRole === user.role
                        ? 'border-emerald-600 bg-emerald-50 font-semibold text-emerald-900'
                        : 'border-slate-200 bg-slate-50/50 text-slate-700'
                    }`}
                  >
                    <div className="truncate font-semibold">{ROLE_DEFINITIONS[user.role]?.name || user.role}</div>
                    <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Protected under Sri Amman Store Retail Security Guidelines & Firebase IAM.
        </p>
      </div>
    </div>
  );
};
