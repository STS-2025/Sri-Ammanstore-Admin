import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PackagePlus,
  Scan,
  ShoppingCart,
  Boxes,
  Percent,
  Image,
  Bell,
  Clock
} from 'lucide-react';

export const DashboardQuickActions = ({ onOpenBarcodeScanner, onAddProduct }) => {
  const navigate = useNavigate();

  const ACTIONS = [
    {
      label: 'Add Product',
      icon: PackagePlus,
      color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
      onClick: onAddProduct ? onAddProduct : () => navigate('/products')
    },
    {
      label: 'Scan Product',
      icon: Scan,
      color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
      onClick: onOpenBarcodeScanner
    },
    {
      label: 'Add Stock Intake',
      icon: Boxes,
      color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200',
      onClick: () => navigate('/inventory')
    },
    {
      label: 'View Pending Orders',
      icon: Clock,
      color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
      onClick: () => navigate('/orders')
    },
    {
      label: 'Create Promo Code',
      icon: Percent,
      color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200',
      onClick: () => navigate('/promotions')
    },
    {
      label: 'Add App Banner',
      icon: Image,
      color: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border-cyan-200',
      onClick: () => navigate('/marketing')
    },
    {
      label: 'Send Notification',
      icon: Bell,
      color: 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200',
      onClick: () => navigate('/marketing')
    },
    {
      label: 'Create Manual Order',
      icon: ShoppingCart,
      color: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200',
      onClick: () => navigate('/orders')
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-subtle space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Fast Operational Shortcuts
        </span>
        <span className="text-[11px] text-slate-400">1-Click Dispatch & Stock Intake</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {ACTIONS.map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={action.onClick}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-150 ${action.color} group`}
            >
              <Icon className="w-5 h-5 mb-1.5 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold leading-tight">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
