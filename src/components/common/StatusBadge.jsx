import React from 'react';

const STATUS_CONFIGS = {
  // Order & General Statuses
  pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  packing: { label: 'Packing', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  packed: { label: 'Packed', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  dispatched: { label: 'Dispatched', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' },
  out_for_delivery: { label: 'Out for Delivery', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  returned: { label: 'Returned', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },

  // Payment Statuses
  paid: { label: 'Paid', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  cod: { label: 'Cash on Delivery', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  refunded: { label: 'Refunded', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-500' },
  failed: { label: 'Payment Failed', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },

  // Operational / Account Statuses
  active: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  inactive: { label: 'Inactive', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  blocked: { label: 'Blocked', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' }
};

export const StatusBadge = ({ status = 'pending', label, size = 'sm', pulse = false }) => {
  const normalizedKey = String(status).toLowerCase().replace(/\s+/g, '_');
  const config = STATUS_CONFIGS[normalizedKey] || {
    label: status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400'
  };

  const displayText = label || config.label;

  const sizeStyles = {
    xs: 'text-[11px] px-2 py-0.5',
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1'
  }[size] || 'text-xs px-2.5 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeStyles}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.dot} ${pulse ? 'animate-ping' : ''}`}
      />
      {displayText}
    </span>
  );
};
