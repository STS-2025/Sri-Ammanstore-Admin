import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';

export const FilterBar = ({
  tabs = [],
  activeTab,
  onTabChange,
  filters = null,
  onResetFilters,
  hasActiveFilters = false
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-white border-b border-slate-100">
      {/* Tab Pills */}
      {tabs.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                      isActive ? 'bg-emerald-950 text-emerald-100' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Custom Filter Controls / Reset */}
      <div className="flex items-center gap-2">
        {filters}

        {hasActiveFilters && onResetFilters && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
};
