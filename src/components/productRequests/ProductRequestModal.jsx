import React, { useState, useEffect } from 'react';
import { X, HeartHandshake, PackagePlus, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProductRequestModal = ({ isOpen, onClose, onUpdateStatus, request = null }) => {
  const navigate = useNavigate();

  const [status, setStatus] = useState('new');
  const [notes, setNotes] = useState('');
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    if (request) {
      setStatus(request.status || 'new');
      setNotes(request.notes || '');
      setNotified(false);
    }
  }, [request, isOpen]);

  if (!isOpen || !request) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onUpdateStatus(request.id, { status, notes });
    onClose();
  };

  const handleConvertToCatalogProduct = () => {
    // Navigate to products catalog page with state pre-filling product name and category
    onUpdateStatus(request.id, { status: 'added', notes: `${notes ? notes + ' | ' : ''}Converted to catalog product` });
    onClose();
    navigate('/products', {
      state: {
        prefillProductName: request.productName,
        prefillBrand: request.brand,
        prefillCategory: request.category
      }
    });
  };

  const handleNotifyRequesters = () => {
    setNotified(true);
    setTimeout(() => {
      alert(`Automated WhatsApp & SMS stock arrival notifications dispatched to ${request.requesters?.length || request.requestedByCount || 1} interested customer(s)!`);
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Review Customer Product Wishlist</h3>
              <p className="text-xs text-slate-400">{request.productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Product Overview Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 text-sm">{request.productName}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {request.requestedByCount} Requesters
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-200">
              <div>
                <span className="text-slate-400">Brand:</span> <strong className="text-slate-700">{request.brand || 'Local Brand'}</strong>
              </div>
              <div>
                <span className="text-slate-400">Category:</span> <strong className="text-slate-700">{request.category || 'Grocery'}</strong>
              </div>
              <div>
                <span className="text-slate-400">Last Requested:</span> <strong className="text-slate-700">{new Date(request.lastRequestedAt).toLocaleDateString()}</strong>
              </div>
            </div>
          </div>

          {/* Requesters Log */}
          {request.requesters && request.requesters.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Customers Awaiting Arrival ({request.requesters.length})
              </label>
              <div className="max-h-28 overflow-y-auto space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {request.requesters.map((req, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{req.name}</span>
                    <span className="text-slate-500 font-mono text-[11px]">{req.phone}</span>
                    <span className="text-slate-400 text-[10px]">{req.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Procurement & Catalog Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
            >
              <option value="new">🆕 New Customer Request</option>
              <option value="under_review">🔍 Under Review with Suppliers</option>
              <option value="added">✅ Added to Sri Amman Catalog</option>
              <option value="not_available">❌ Currently Unavailable from Manufacturer</option>
              <option value="rejected">⛔ Rejected / Discontinued Item</option>
            </select>
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Procurement Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sourced supplier contact from Town Hall market."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Quick Action Buttons */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleConvertToCatalogProduct}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              Convert to Catalog Product
            </button>

            <button
              type="button"
              onClick={handleNotifyRequesters}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Bell className="w-3.5 h-3.5" />
              Notify Customers
            </button>
          </div>

          {/* Footer Save */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              Update Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
