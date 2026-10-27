import React from 'react';
import { X, Printer, Download, Store, Barcode as BarcodeIcon, ShieldCheck } from 'lucide-react';

export const CustomerBarcodeCardModal = ({ isOpen, onClose, customer }) => {
  if (!isOpen || !customer) return null;

  const customerId = customer.customerId || customer.id || 'CUS-000000';
  const customerName = customer.name || 'Customer';
  const customerMobile = customer.mobile || customer.phone || '';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md overflow-hidden bg-white border rounded-2xl shadow-modal border-slate-200">
        {/* Modal Toolbar (Hidden during printing) */}
        <div className="flex items-center justify-between px-6 py-4 text-white border-b print:hidden border-slate-200 bg-slate-900">
          <div className="flex items-center gap-2">
            <BarcodeIcon className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Customer Barcode Card</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Card</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barcode Visual Printable Card */}
        <div className="flex justify-center p-8 bg-slate-50 print:p-0 print:bg-white">
          <div className="p-6 space-y-4 text-center bg-white border-2 shadow-xl w-80 border-slate-800 rounded-2xl print:shadow-none print:border-2">
            {/* Store Branding */}
            <div className="flex items-center justify-center gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center justify-center text-xs font-bold text-white rounded-lg shadow-xs w-7 h-7 bg-emerald-700">
                SA
              </div>
              <div className="text-left">
                <span className="block text-xs font-black leading-none tracking-tight text-slate-900">
                  SRI AMMAN STORE
                </span>
                <span className="text-[9px] uppercase font-bold text-emerald-700 tracking-wider block mt-0.5">
                  Privilege Customer Card
                </span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="space-y-1">
              {customer.photoUrl ? (
                <img
                  src={customer.photoUrl}
                  alt={customerName}
                  className="object-cover w-16 h-16 mx-auto border-2 rounded-full shadow-sm border-emerald-500"
                />
              ) : (
                <div className="flex items-center justify-center mx-auto text-base font-extrabold border rounded-full w-14 h-14 bg-slate-100 border-slate-200 text-slate-500">
                  {customerName.charAt(0)}
                </div>
              )}
              <h3 className="pt-1 text-sm font-black text-slate-900">{customerName}</h3>
              <p className="font-mono text-xs font-semibold text-slate-500">{customerMobile}</p>
            </div>

            {/* Simulated Clean Barcode Render */}
            <div className="p-4 space-y-1 border bg-slate-50 rounded-xl border-slate-200">
              <div className="flex items-center justify-center h-16 px-2 py-1 space-x-1 overflow-hidden bg-white border rounded border-slate-300">
                {/* SVG/CSS Clean Barcode Lines representing the Customer ID */}
                <div className="w-full h-full flex items-center justify-center gap-0.5">
                  {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 3, 2, 4, 1, 2].map((w, idx) => (
                    <div
                      key={idx}
                      style={{ width: `${w * 2}px` }}
                      className={`h-12 ${idx % 2 === 0 ? 'bg-slate-950' : 'bg-transparent'}`}
                    />
                  ))}
                </div>
              </div>
              <span className="block font-mono text-xs font-bold tracking-widest text-slate-900">
                {customerId}
              </span>
            </div>

            <div className="text-[9px] text-slate-400 font-semibold tracking-tight uppercase pt-1 border-t border-slate-100">
              Present at checkout counter for instant identification & credit billing
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
