import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_DEFINITIONS } from '../../utils/roles';

export const UnauthorizedPage = () => {
  const { userRole, logout } = useAuth();
  const navigate = useNavigate();

  const roleDef = ROLE_DEFINITIONS[userRole] || { name: 'Current Role' };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-modal text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1">
          Access Restricted (403)
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Your current assigned role (
          <strong className="text-slate-800">{roleDef.name}</strong>) does not have authorization
          to access this operational module or perform this action.
        </p>

        <div className="p-3 bg-slate-50 rounded-xl text-left border border-slate-100 text-xs text-slate-600 mb-6 space-y-1">
          <div className="font-semibold text-slate-800">Security Policy:</div>
          <p className="text-[11px] text-slate-500">
            Administrative, catalog pricing, and financial controls are strictly limited by
            role privileges under Sri Amman Store governance rules.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to Main Dashboard</span>
          </button>

          <button
            onClick={() => navigate(-1)}
            className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
};
