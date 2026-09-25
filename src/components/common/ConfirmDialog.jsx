import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertOctagon, HelpCircle, X, ShieldAlert } from 'lucide-react';

export const ConfirmDialog = ({
  isOpen,
  title = 'Confirm Operational Action',
  message = 'Are you sure you want to proceed with this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning', // 'warning' | 'danger' | 'primary'
  isHighRisk = false,
  requireReason = false,
  reasonPlaceholder = 'Please explain the business justification for this audit-logged change...',
  requireTypedWord = null, // e.g. "CONFIRM" or "DELETE"
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  const [reason, setReason] = useState('');
  const [typedInput, setTypedInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setTypedInput('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if ((isHighRisk || requireReason) && !reason.trim()) {
      setError('A business reason is mandatory for high-risk / financial audit tracking.');
      return;
    }
    if (requireTypedWord && typedInput.trim() !== requireTypedWord) {
      setError(`You must type "${requireTypedWord}" to verify this action.`);
      return;
    }
    onConfirm({ reason: reason.trim() });
  };

  const variantStyles = {
    danger: {
      icon: AlertOctagon,
      iconBg: 'bg-rose-100 text-rose-600',
      btnConfirm: 'btn-danger'
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-100 text-amber-600',
      btnConfirm: 'btn-primary bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
    },
    primary: {
      icon: HelpCircle,
      iconBg: 'bg-emerald-100 text-emerald-700',
      btnConfirm: 'btn-primary'
    }
  }[variant] || variantStyles.warning;

  const IconComponent = variantStyles.icon;
  const isConfirmDisabled =
    isLoading ||
    ((isHighRisk || requireReason) && !reason.trim()) ||
    (requireTypedWord && typedInput.trim() !== requireTypedWord);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${variantStyles.iconBg}`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              {isHighRisk && (
                <span className="inline-flex items-center gap-1 mt-0.5 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  <ShieldAlert className="w-3 h-3" />
                  High-Risk Financial / Governance Action
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>

          {(isHighRisk || requireReason) && (
            <div>
              <label className="input-label">
                Operational Justification / Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError('');
                }}
                rows={3}
                placeholder={reasonPlaceholder}
                className="input-text resize-none text-xs"
                disabled={isLoading}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This statement will be permanently recorded in the immutable Firestore Activity Log.
              </p>
            </div>
          )}

          {requireTypedWord && (
            <div>
              <label className="input-label">
                Type <span className="font-mono text-rose-600 font-bold">{requireTypedWord}</span> to confirm
              </label>
              <input
                type="text"
                value={typedInput}
                onChange={(e) => {
                  setTypedInput(e.target.value);
                  if (error) setError('');
                }}
                placeholder={requireTypedWord}
                className="input-text font-mono text-xs uppercase"
                disabled={isLoading}
              />
            </div>
          )}

          {error && <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">{error}</div>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="btn-secondary text-xs"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={`${variantStyles.btnConfirm} text-xs`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
