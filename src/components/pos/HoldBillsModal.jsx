import React from 'react';
import { X, Clock, Play, Trash2, ShoppingCart, User } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export const HoldBillsModal = ({ isOpen, onClose, heldBills = [], onRetrieveBill, onDeleteBill }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Parked / Held Bills</h2>
              <p className="text-xs text-slate-300">Resume paused billing sessions for waiting customers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {heldBills.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">No held bills found in memory.</p>
              <p className="text-[11px] text-slate-400 mt-1">You can park active billing sessions anytime using the "Hold Bill" button.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {heldBills.map((bill) => (
                <div
                  key={bill.holdId}
                  className="p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-400 transition-all flex items-center justify-between shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                        {bill.holdId}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {bill.customer ? bill.customer.name : 'Walk-in Customer'}
                      </span>
                      {bill.customer?.customerId && (
                        <span className="text-[11px] font-mono font-semibold text-slate-400">
                          ({bill.customer.customerId})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold">
                      <span>Items: <strong>{bill.items?.length || 0}</strong></span>
                      <span>Total: <strong className="text-emerald-700 font-mono">{formatCurrency(bill.totalAmount || 0)}</strong></span>
                      <span className="text-[10px] font-mono text-slate-400">{formatDateTime(bill.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRetrieveBill(bill)}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Resume Bill</span>
                    </button>
                    <button
                      onClick={() => onDeleteBill(bill.holdId)}
                      className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Discard Held Bill"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
