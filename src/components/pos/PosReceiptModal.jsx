import React, { useEffect } from 'react';
import { X, Printer, CheckCircle2, Store, FileText, Download } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export const PosReceiptModal = ({ isOpen, onClose, order, onNewBilling, nextActionLabel = '+ Start Next Billing', autoPrint = false }) => {
  useEffect(() => {
    if (!isOpen || !order || !autoPrint) return undefined;
    const printTimer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(printTimer);
  }, [isOpen, order, autoPrint]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const customerName = order.customerName || order.userProfile?.name || 'Walk-in Customer';
  const customerId = order.customerId || order.customer?.customerId || '';
  const isManualOrder = order.orderSource === 'manual';
  const items = order.items || [];
  const paymentMethod = (order.paymentMethod || 'CASH').toUpperCase();
  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discount || 0);
  const tax = Number(order.tax || 0);
  const totalAmount = Number(order.totalAmount || order.total || 0);
  const amountPaid = Number(order.amountPaid ?? totalAmount);
  const balanceDue = Number(order.balanceDue ?? 0);

  return (
    <div className="pos-receipt-print-root fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="pos-receipt-print-shell w-full max-w-lg max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Toolbar (Hidden on print) */}
        <div className="print:hidden px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Billing Completed</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print Thermal Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar (Hidden on print) */}
        <div className="print:hidden p-3 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-900">Invoice: #{order.orderNumber || order.id}</span>
          {onNewBilling && (
            <button
              onClick={() => {
                onClose();
                onNewBilling();
              }}
              className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              {nextActionLabel}
            </button>
          )}
        </div>

        {/* Printable Thermal Receipt Canvas */}
        <div className="pos-receipt-print-body flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center print:p-0 print:bg-white">
          <div className="pos-receipt-print-content w-80 bg-white border border-slate-300 p-5 rounded-xl shadow-lg font-mono text-xs text-slate-900 space-y-4 print:shadow-none print:border-none print:w-full">
            {/* Header */}
            <div className="text-center space-y-1 border-b border-slate-300 pb-3">
              <h1 className="text-sm font-black font-sans tracking-tight uppercase">SRI AMMAN STORE</h1>
              <p className="text-[10px] leading-tight text-slate-600">
                142, Cross Cut Road, Gandhipuram<br />
                Coimbatore - 641012 • Ph: +91 98401 22334<br />
                {!isManualOrder && <strong>GSTIN: 33AAAAA0000A1Z5</strong>}
              </p>
              <div className="pt-1 text-[10px] uppercase font-bold text-slate-500">
                COUNTER POS CASH MEMO
              </div>
            </div>

            {/* Bill Details */}
            <div className="text-[11px] space-y-0.5 border-b border-slate-200 pb-2">
              <div className="flex justify-between">
                <span>Bill No:</span>
                <strong className="font-bold">{order.orderNumber || order.id}</strong>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{formatDateTime(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <strong className="truncate max-w-[150px]">{customerName}</strong>
              </div>
              {customerId && (
                <div className="flex justify-between">
                  <span>Customer ID:</span>
                  <strong>{customerId}</strong>
                </div>
              )}
              {order.createdByStaffName && (
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{order.createdByStaffName}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <table className="w-full text-[11px] border-b border-slate-300 pb-2 text-left">
              <thead>
                <tr className="border-b border-slate-300 font-bold uppercase text-[9px]">
                  <th className="py-1">Item</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Price</th>
                  <th className="py-1 text-right">Amt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1 pr-1 leading-tight font-sans">
                      <div className="font-bold">{item.productName || item.name}</div>
                      {item.variantName && <div className="text-[9px] text-slate-500">{item.variantName}</div>}
                    </td>
                    <td className="py-1 text-center align-top font-bold">{item.quantity || item.qty}</td>
                    <td className="py-1 text-right align-top">{formatCurrency(item.unitPrice || item.price)}</td>
                    <td className="py-1 text-right align-top font-bold">{formatCurrency(item.totalPrice || ((item.unitPrice || item.price) * (item.quantity || 1)))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary Breakdown */}
            <div className="text-[11px] space-y-1 border-b border-slate-300 pb-2 font-semibold">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>Discount:</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              {!isManualOrder && tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>GST Tax:</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-300">
                <span>TOTAL AMOUNT:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <strong className="uppercase">{paymentMethod}</strong>
              </div>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <strong>{formatCurrency(amountPaid)}</strong>
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between text-amber-800 font-bold">
                  <span>Balance Outstanding:</span>
                  <span>{formatCurrency(balanceDue)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-500 space-y-1 pt-2 border-t border-dashed border-slate-300">
              <p className="font-bold text-slate-800">Thank you for shopping at Sri Amman Store!</p>
              <p>Please visit again • Fresh & Authentic Groceries</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
