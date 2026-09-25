import React, { useState } from 'react';
import { X, IndianRupee, ShieldCheck, User, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

export const CodReconciliationModal = ({ isOpen, onClose, onReconcile, agent }) => {
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [referenceNote, setReferenceNote] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !agent) return null;

  const pendingAmount = Math.max(0, (agent.codCollectedToday || 0) - (agent.codDepositedToday || 0));

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = Number(depositAmount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid deposit amount.');
      return;
    }
    if (amount > pendingAmount) {
      setError(`Deposit amount (₹${amount}) cannot exceed pending collection (₹${pendingAmount}).`);
      return;
    }

    onReconcile(agent.id, amount, paymentMode, referenceNote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">COD Cash Settlement</h3>
              <p className="text-xs text-slate-400">Accounts Staff End-of-Day Reconciliation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Agent Info Strip */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Fleet Rider:</span>
              <span className="font-bold text-slate-800">{agent.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Vehicle:</span>
              <span className="font-medium text-slate-700">{agent.vehicleNumber}</span>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-slate-200 pt-2">
              <span className="text-slate-500">Total COD Collected Today:</span>
              <span className="font-bold text-slate-900">₹{agent.codCollectedToday || 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Already Deposited:</span>
              <span className="font-bold text-emerald-700">₹{agent.codDepositedToday || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold border-t border-slate-200 pt-2 text-amber-900 bg-amber-50/60 -mx-3.5 -mb-3.5 p-3 rounded-b-xl">
              <span>Pending Handover Balance:</span>
              <span>₹{pendingAmount}</span>
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Cash Amount Deposited (₹) *
              </label>
              <button
                type="button"
                onClick={() => setDepositAmount(String(pendingAmount))}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
              >
                Deposit Full (₹{pendingAmount})
              </button>
            </div>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => {
                setDepositAmount(e.target.value);
                setError('');
              }}
              placeholder={`Max ₹${pendingAmount}`}
              className="w-full px-3.5 py-2 text-base font-bold text-slate-900 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Handover Method
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
              >
                <option value="Cash">Cash Physical Notes</option>
                <option value="Store UPI QR">Rider Transferred via Store UPI</option>
                <option value="Bank Deposit Slip">Bank Cash Deposit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Settlement Date
              </label>
              <input
                type="text"
                readOnly
                value={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-100 text-slate-600 font-medium cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Receipt / Register Notes (Optional)
            </label>
            <input
              type="text"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              placeholder="e.g. Verified by Store Cashier counter 1"
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pendingAmount <= 0}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Reconcile Settlement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
