import React, { useEffect, useRef, useState } from 'react';
import { X, Printer, CheckCircle2, Store, FileText, Download } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_DEFINITIONS } from '../../utils/roles';

export const PosReceiptModal = ({ isOpen, onClose, order, onNewBilling, nextActionLabel = '+ Start Next Billing' }) => {
  const { userRole } = useAuth();
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [printChoice, setPrintChoice] = useState('no');
  const printYesButtonRef = useRef(null);
  const printNoButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen && order) {
      setShowPrintPrompt(true);
      setPrintChoice('no');
    }
  }, [isOpen, order]);

  const handlePrint = () => {
    setShowPrintPrompt(false);
    window.print();
  };

  const handleSkipPrint = () => {
    setShowPrintPrompt(false);
    onClose();
    onNewBilling?.();
  };

  useEffect(() => {
    if (!showPrintPrompt) return undefined;

    const focusDefaultChoice = window.requestAnimationFrame(() => {
      printNoButtonRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(focusDefaultChoice);
  }, [showPrintPrompt]);

  useEffect(() => {
    if (!showPrintPrompt) return undefined;

    /*const handlePrintPromptKeyDown = (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const nextChoice = event.key === 'ArrowLeft' ? 'no' : 'yes';
        setPrintChoice(nextChoice);
        if (nextChoice === 'yes') printYesButtonRef.current?.focus();
        else printNoButtonRef.current?.focus();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (printChoice === 'yes') handlePrint();
        else handleSkipPrint();
      }
    };*/
    
    const handlePrintPromptKeyDown = (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setPrintChoice('yes');
        printYesButtonRef.current?.focus();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setPrintChoice('no');
        printNoButtonRef.current?.focus();
      } else if (event.key === 'Enter') {
        event.preventDefault();

        if (printChoice === 'yes') {
          handlePrint();
        } else {
          handleSkipPrint();
        }
      }
    };


    window.addEventListener('keydown', handlePrintPromptKeyDown);
    return () => {
      window.removeEventListener('keydown', handlePrintPromptKeyDown);
    };
  }, [showPrintPrompt, printChoice]);

  if (!isOpen || !order) return null;

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
  const balanceDue = isManualOrder
    ? Math.max(0, Math.round((totalAmount - amountPaid) * 100) / 100)
    : Math.max(0, Number(order.balanceDue ?? 0));
  const cashierRole = userRole || order.createdByStaffRole || order.createdByRole || order.staffRole || order.userRole || 'Cashier';
  const cashierRoleName = ROLE_DEFINITIONS[cashierRole]?.name || String(cashierRole).replace(/[_-]+/g, ' ');

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pos-receipt-print-root bg-slate-900/60 backdrop-blur-sm animate-in fade-in print:static print:block print:p-0 print:m-0 print:bg-white print:overflow-visible">
        <style>{`
          @page {
            size: 80mm 280mm;
            margin: 0;
          }

          @media print {
            html,
            body,
            #root {
              width: 80mm !important;
              min-width: 80mm !important;
              height: auto !important;
              min-height: 0 !important;
              display: block !important;
              position: static !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
            }

            #root {
              align-items: flex-start !important;
              justify-content: flex-start !important;
            }

            .pos-receipt-print-root {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              right: auto !important;
              bottom: auto !important;
              transform: none !important;
              display: block !important;
              width: 80mm !important;
              max-width: 80mm !important;
              min-height: 0 !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
            }

            .pos-receipt-print-shell,
            .pos-receipt-print-body {
              width: 80mm !important;
              max-width: 80mm !important;
              min-height: 0 !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              display: block !important;
            }

            .pos-receipt-print-content {
              width: 80mm !important;
              max-width: 80mm !important;
              margin: 0 !important;
              padding:0 !important;
              box-sizing: border-box !important;
            }
          }
        `}</style>
        <div className="pos-receipt-print-shell w-full max-w-lg max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden print:block print:max-w-none print:max-h-none print:rounded-none print:border-0 print:shadow-none print:overflow-visible">
        {/* Header Toolbar (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 text-white border-b print:hidden border-slate-200 bg-slate-900">
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
        <div className="flex items-center justify-between p-3 border-b print:hidden bg-emerald-50 border-emerald-200">
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

          {showPrintPrompt && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b print:hidden bg-amber-50 border-amber-200">
              <span className="text-xs font-bold text-amber-900">Do you want to print the receipt?</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  ref={printYesButtonRef}
                  onFocus={() => setPrintChoice('yes')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                    printChoice === 'yes'
                      ? 'bg-emerald-700 text-white ring-2 ring-emerald-300'
                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  }`}
                >
                  Yes, Print
                </button>
                <button
                  type="button"
                  onClick={handleSkipPrint}
                  ref={printNoButtonRef}
                  autoFocus
                  onFocus={() => setPrintChoice('no')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${
                    printChoice === 'no'
                      ? 'bg-slate-700 text-white border-slate-700 ring-2 ring-slate-300'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  No, Skip
                </button>
              </div>
            </div>
          )}

        {/* Printable Thermal Receipt Canvas */}
          <div className="flex justify-center flex-1 p-6 overflow-y-auto pos-receipt-print-body bg-slate-100 print:block print:flex-none print:p-0 print:overflow-visible print:bg-white">
            <div className="p-5 space-y-4 font-mono text-xs bg-white border shadow-lg pos-receipt-print-content w-80 border-slate-300 rounded-xl text-slate-900 print:w-full print:rounded-none print:shadow-none print:border-0 print:p-0">
            {/* Header */}
              <div className="pb-1 space-y-1 text-center border-b-2 border-black print:border-black">
              <h1 className="font-sans text-sm font-black tracking-tight uppercase">SRI AMMAN STORE</h1>
              <p className="text-[10px] leading-tight text-slate-600">
                142, Cross Cut Road, Gandhipuram<br />
                Coimbatore - 641012 • Ph: +91 98401 22334<br />
                {!isManualOrder && <strong>GSTIN: 33AAAAA0000A1Z5</strong>}
              </p>
              <div className="pt-1 text-[10px] uppercase font-bold text-slate-900">
                COUNTER POS CASH MEMO
              </div>
            </div>

            {/* Bill Details */}
              <div className="text-[11px] space-y-0.5 border-b-2 border-black pb-1 print:border-black">
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
                {(order.createdByStaffName || cashierRole) && (
                <div className="flex justify-between">
                  <span>Cashier:</span>
                    <span>{cashierRoleName}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
              <table className="w-full text-[11px] border-b-2 border-black pb-2 text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-black font-bold uppercase text-[9px] print:border-black">
                  <th className="py-1">Item</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Price</th>
                  <th className="py-1 text-right">Amt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1 pr-1 font-sans leading-tight">
                      <div className="font-bold">{item.productName || item.name}</div>
                      {item.variantName && <div className="text-[9px] text-slate-500">{item.variantName}</div>}
                    </td>
                    <td className="py-1 font-bold text-center align-top">{item.quantity || item.qty}</td>
                    <td className="py-1 text-right align-top">{formatCurrency(item.unitPrice || item.price)}</td>
                    <td className="py-1 font-bold text-right align-top">{formatCurrency(item.totalPrice || ((item.unitPrice || item.price) * (item.quantity || 1)))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary Breakdown */}
              <div className="text-[11px] space-y-1 border-b-2 border-black pb-2 font-semibold print:border-black">
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
                <div className="flex justify-between pt-1 text-sm font-black border-t-2 border-black print:border-black">
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
                <div className="flex justify-between font-bold text-amber-800">
                  <span>Balance Outstanding:</span>
                  <span>{formatCurrency(balanceDue)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
              <div className="text-center text-[10px] text-slate-500 space-y-1 pt-2 border-t-2 border-dashed border-black print:border-black">
              <p className="font-bold text-slate-900">Thank you for shopping at Sri Amman Store!</p>
              <p className="font-bold text-slate-600">Please visit again • Fresh & Authentic Groceries</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
