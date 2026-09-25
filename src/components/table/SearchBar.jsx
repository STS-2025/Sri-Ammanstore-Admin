import React from 'react';
import { Search, X } from 'lucide-react';

export const SearchBar = ({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search by name, SKU, barcode, order ID...',
  className = '',
  autoFocus = false
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-lg shadow-subtle placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
      />
      {value && (
        <button
          onClick={onClear ? onClear : () => onChange('')}
          className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
