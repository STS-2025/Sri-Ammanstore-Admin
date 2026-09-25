import React from 'react';
import { AlertTriangle, AlertOctagon, CheckCircle2, Clock } from 'lucide-react';

export const StockBadge = ({ quantity = 0, safetyStock = 10, condition, showCount = true }) => {
  let computedCondition = condition;

  if (!computedCondition) {
    if (quantity <= 0) {
      computedCondition = 'out_of_stock';
    } else if (quantity <= safetyStock) {
      computedCondition = 'low_stock';
    } else {
      computedCondition = 'in_stock';
    }
  }

  const configs = {
    in_stock: {
      label: 'In Stock',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2
    },
    low_stock: {
      label: 'Low Stock',
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: AlertTriangle
    },
    out_of_stock: {
      label: 'Out of Stock',
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: AlertOctagon
    },
    expiring_soon: {
      label: 'Expiring Soon',
      bg: 'bg-orange-50 text-orange-700 border-orange-200',
      icon: Clock
    },
    overstocked: {
      label: 'Overstocked',
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: CheckCircle2
    }
  };

  const current = configs[computedCondition] || configs.in_stock;
  const IconComponent = current.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.bg}`}
    >
      <IconComponent className="w-3.5 h-3.5 shrink-0" />
      <span>{current.label}</span>
      {showCount && <span className="font-mono font-medium opacity-80">({quantity})</span>}
    </span>
  );
};
