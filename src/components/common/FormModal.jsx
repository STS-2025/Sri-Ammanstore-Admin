import React from 'react';
import { X } from 'lucide-react';

export const FormModal = ({
  isOpen,
  title,
  subtitle,
  children,
  onClose,
  onSubmit,
  submitLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  maxWidth = 'max-w-2xl',
  showFooter = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full ${maxWidth} max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150`}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-white">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 break-words">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
          {children}
        </div>

        {/* Modal Footer */}
        {showFooter && (
          <div className="flex flex-wrap items-center justify-end gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary text-xs"
            >
              {cancelLabel}
            </button>
            {onSubmit && (
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting}
                className="btn-primary text-xs"
              >
                {isSubmitting ? 'Saving...' : submitLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
