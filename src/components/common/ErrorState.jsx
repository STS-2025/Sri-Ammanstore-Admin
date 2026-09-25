import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const ErrorState = ({
  title = 'Failed to load operational data',
  message = 'An unexpected error occurred while communicating with Firestore or external services.',
  onRetry,
  compact = false
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-2xl border border-rose-200 bg-rose-50/50 ${compact ? 'p-6' : 'p-10'}`}
    >
      <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3 shadow-sm">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-rose-950 mb-1">{title}</h4>
      <p className="text-xs text-rose-700/80 max-w-sm mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-300 rounded-lg hover:bg-rose-50 active:bg-rose-100 transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
};
