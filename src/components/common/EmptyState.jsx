import React from 'react';
import { PackageOpen } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = PackageOpen,
  title = 'No records found',
  description = 'There are no active records matching your current operational filter or view.',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 ${compact ? 'p-8' : 'p-12'}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 shadow-sm border border-emerald-100">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1.5">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="btn-primary text-xs"
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="btn-secondary text-xs"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
