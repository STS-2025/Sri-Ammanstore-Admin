import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-modal text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4 border border-slate-200">
          <FileQuestion className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1">Page Not Found (404)</h2>
        <p className="text-xs text-slate-500 mb-6">
          The requested administrative module or URL does not exist in the Sri Amman Store management system.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
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
