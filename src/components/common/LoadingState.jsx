import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState = ({ message = 'Loading grocery data...', height = 'h-64' }) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 w-full ${height}`}>
      <div className="relative">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
      <p className="text-xs font-medium text-slate-500 animate-pulse">{message}</p>
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, columns = 5 }) => {
  return (
    <div className="w-full space-y-3 p-4 animate-pulse">
      <div className="h-9 bg-slate-200/70 rounded-lg w-full mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2.5 border-b border-slate-100">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className={`h-4 bg-slate-200/60 rounded ${j === 0 ? 'w-24' : j === 1 ? 'w-48 flex-1' : 'w-20'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
