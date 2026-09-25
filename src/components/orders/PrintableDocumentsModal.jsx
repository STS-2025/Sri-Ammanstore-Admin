import React, { useState } from 'react';
import {
  Printer,
  FileText,
  Tag,
  Truck,
  DollarSign,
  X,
  Barcode as BarcodeIcon,
  Store,
  CheckCircle2
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export const PrintableDocumentsModal = ({
  isOpen,
  onClose,
  order,
  orders = [], // For delivery manifest & COD sheet
  initialDocType = 'invoice' // 'invoice' | 'store_invoice' | 'parcel_label' | 'manifest' | 'cod_sheet'
}) => {
  const [docType, setDocType] = useState(initialDocType);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const activeOrder = order || orders[0] || {};
  const manifestOrders = orders.length > 0 ? orders : order ? [order] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden">
        {/* Document Switcher Toolbar (Hidden during print) */}
        <div className="print:hidden flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'invoice', label: 'Customer Tax Invoice', icon: FileText },
              { id: 'store_invoice', label: 'Store Picking Slip', icon: Store },
              { id: 'parcel_label', label: 'Parcel Shipping Label', icon: Tag },
              { id: 'manifest', label: 'Delivery Manifest', icon: Truck },
              { id: 'cod_sheet', label: 'COD Cash Sheet', icon: DollarSign }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = docType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setDocType(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print Document</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white font-sans text-slate-900 print:p-0 print:overflow-visible">
          {/* 1. CUSTOMER TAX INVOICE */}
          {docType === 'invoice' && (
            <div className="max-w-2xl mx-auto border border-slate-200 p-6 rounded-xl space-y-6 print:border-none print:p-0">
              {/* Invoice Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Store className="w-6 h-6 text-emerald-800" />
                    <h2 className="text-xl font-bold font-sans tracking-tight text-slate-900">
                      SRI AMMAN STORE
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    142, Cross Cut Road, Gandhipuram, Coimbatore - 641012<br />
                    Phone: +91 98401 22334 • support@sriammanstore.com<br />
                    <strong>GSTIN: 33AAAAA0000A1Z5</strong> (Tamil Nadu)
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 block mb-1">
                    TAX INVOICE
                  </span>
                  <div className="font-mono text-sm font-bold text-slate-900">
                    #{activeOrder.orderNumber}
                  </div>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    {formatDateTime(activeOrder.createdAt)}
                  </span>
                </div>
              </div>

              {/* Bill To / Ship To */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    Delivered To
                  </span>
                  <p className="font-bold text-slate-900">{activeOrder.customerName}</p>
                  <p className="text-slate-600 font-mono">{activeOrder.customerPhone}</p>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    {activeOrder.deliveryAddress?.addressLine},<br />
                    {activeOrder.deliveryAddress?.landmark}, {activeOrder.deliveryAddress?.locality}<br />
                    PIN: {activeOrder.deliveryAddress?.pincode}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    Payment & Slot Details
                  </span>
                  <p className="font-semibold text-slate-800">
                    Payment: <strong className="uppercase font-mono">{activeOrder.paymentMethod}</strong> ({activeOrder.paymentStatus})
                  </p>
                  <p className="text-slate-500 font-mono">Slot: {activeOrder.deliverySlot}</p>
                  <p className="text-slate-500 font-mono">Priority: {activeOrder.priority}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Item Description</th>
                    <th className="py-2 px-2">Pack</th>
                    <th className="py-2 px-2 text-right">Price</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(activeOrder.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-2 font-medium text-slate-900">
                        {item.productName}
                        {item.tamilName && <span className="block text-[10px] text-slate-400 font-sans">{item.tamilName}</span>}
                      </td>
                      <td className="py-2 px-2 font-mono text-slate-500">{item.variantName}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-2 px-2 text-center font-mono font-bold">{item.quantity}</td>
                      <td className="py-2 px-2 text-right font-mono font-semibold">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end text-xs">
                <div className="w-64 space-y-1.5 pt-2 border-t border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCurrency(activeOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST (5% Approx):</span>
                    <span className="font-mono">{formatCurrency(activeOrder.gstAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Charge:</span>
                    <span className="font-mono text-emerald-700">
                      {activeOrder.deliveryFee === 0 ? 'FREE' : formatCurrency(activeOrder.deliveryFee)}
                    </span>
                  </div>
                  {activeOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount / Coins:</span>
                      <span className="font-mono">-{formatCurrency(activeOrder.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 pt-2 border-t text-sm font-sans">
                    <span>Total Amount Payable:</span>
                    <span className="text-emerald-800">{formatCurrency(activeOrder.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Notice */}
              <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 space-y-0.5">
                <p>Thank you for shopping at Sri Amman Store! Traditional Quality & Purity Guaranteed.</p>
                <p>Goods once sold can be returned within 24 hours of delivery in unopened condition.</p>
              </div>
            </div>
          )}

          {/* 2. STORE PICKING SLIP */}
          {docType === 'store_invoice' && (
            <div className="max-w-2xl mx-auto border border-slate-200 p-6 rounded-xl space-y-4 print:border-none print:p-0">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-bold">WAREHOUSE PICKING & FULFILLMENT SLIP</h3>
                  <span className="text-xs font-mono text-slate-500">Order #{activeOrder.orderNumber} • {activeOrder.deliverySlot}</span>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="font-bold text-emerald-800">Priority: {activeOrder.priority}</span>
                  <div className="text-slate-400">Total: {activeOrder.itemsCount} Items</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                <div>Customer: <strong>{activeOrder.customerName}</strong> ({activeOrder.deliveryAddress?.locality})</div>
                <div>Packing Instructions: <em>{activeOrder.packingNotes || 'Standard safe grocery bagging.'}</em></div>
              </div>

              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-100 font-semibold text-[10px] uppercase">
                    <th className="py-2 px-2">Verify</th>
                    <th className="py-2 px-2">SKU & Barcode</th>
                    <th className="py-2 px-2">Product Name</th>
                    <th className="py-2 px-2">Pack</th>
                    <th className="py-2 px-2 text-center">Req Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(activeOrder.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-2">
                        <div className="w-4 h-4 border-2 border-slate-400 rounded" />
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-600">
                        {item.sku}<br />
                        <span className="text-[10px] text-slate-400">{item.barcode}</span>
                      </td>
                      <td className="py-2.5 px-2 font-bold text-slate-900">
                        {item.productName}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-600">{item.variantName}</td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-sm text-emerald-800">
                        {item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-4 border-t flex justify-between text-xs text-slate-500 font-mono">
                <div>Picker Signature: __________________</div>
                <div>Checker Signature: __________________</div>
              </div>
            </div>
          )}

          {/* 3. PARCEL SHIPPING LABEL (4x6 Thermal Label Format) */}
          {docType === 'parcel_label' && (
            <div className="max-w-md mx-auto border-2 border-slate-900 p-5 rounded-2xl space-y-4 print:border-2 print:border-black">
              {/* Store & Hub */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-slate-900" />
                  <span className="font-extrabold text-sm tracking-tight">SRI AMMAN STORE</span>
                </div>
                <span className="font-mono text-xs font-bold uppercase bg-slate-900 text-white px-2 py-0.5 rounded">
                  HUB: CBE CENTRAL
                </span>
              </div>

              {/* Order ID & Barcode Simulation */}
              <div className="text-center py-2 border-b-2 border-slate-900 space-y-1">
                <div className="font-mono text-2xl font-black tracking-wider">{activeOrder.orderNumber}</div>
                <div className="flex items-center justify-center gap-1 font-mono text-xs text-slate-600">
                  <BarcodeIcon className="w-8 h-8" />
                  <span>* {activeOrder.orderNumber} *</span>
                </div>
              </div>

              {/* Delivery Address Block */}
              <div className="space-y-1 text-xs">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Deliver To:</span>
                <div className="text-sm font-black text-slate-900">{activeOrder.customerName}</div>
                <div className="font-mono font-bold text-slate-900">{activeOrder.customerPhone}</div>
                <p className="text-slate-800 leading-snug font-medium pt-1">
                  {activeOrder.deliveryAddress?.addressLine},<br />
                  Landmark: {activeOrder.deliveryAddress?.landmark}<br />
                  Locality: <strong>{activeOrder.deliveryAddress?.locality}</strong>, PIN: <strong>{activeOrder.deliveryAddress?.pincode}</strong>
                </p>
              </div>

              {/* COD / PREPAID Banner */}
              <div className="border-t-2 border-b-2 border-slate-900 py-3 text-center">
                {activeOrder.paymentMethod === 'COD' ? (
                  <div className="bg-amber-100 p-2 rounded-lg border border-amber-300">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
                      COLLECT CASH ON DELIVERY (COD)
                    </span>
                    <span className="text-2xl font-black font-sans text-slate-900">
                      {formatCurrency(activeOrder.totalAmount)}
                    </span>
                  </div>
                ) : (
                  <div className="bg-emerald-100 p-2 rounded-lg border border-emerald-300">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 block">
                      PREPAID ORDER — DO NOT COLLECT CASH
                    </span>
                    <span className="text-base font-bold font-sans text-emerald-900">
                      PAID VIA {activeOrder.paymentMethod}
                    </span>
                  </div>
                )}
              </div>

              {/* Rider & Item Count */}
              <div className="flex items-center justify-between text-xs font-mono font-bold pt-1">
                <span>Items: {activeOrder.itemsCount} pkgs</span>
                <span>Rider: {activeOrder.assignedAgentName || 'Unassigned'}</span>
              </div>
            </div>
          )}

          {/* 4. DELIVERY MANIFEST & 5. COD SHEET */}
          {(docType === 'manifest' || docType === 'cod_sheet') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-bold font-sans">
                    {docType === 'manifest' ? 'DELIVERY BATCH MANIFEST' : 'CASH-ON-DELIVERY (COD) COLLECTION SHEET'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Sri Amman Store • Fleet Dispatch Hub • Date: {new Date().toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="text-right text-xs font-mono">
                  <span>Total Stops: <strong>{manifestOrders.length}</strong></span>
                </div>
              </div>

              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 uppercase text-[10px] font-semibold text-slate-600">
                    <th className="py-2 px-2">Seq</th>
                    <th className="py-2 px-2">Order ID</th>
                    <th className="py-2 px-2">Customer & Locality</th>
                    <th className="py-2 px-2">Phone</th>
                    <th className="py-2 px-2">Payment</th>
                    <th className="py-2 px-2 text-right">Collect (₹)</th>
                    <th className="py-2 px-2 text-center">Customer Sign</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {manifestOrders.map((ord, idx) => (
                    <tr key={ord.id}>
                      <td className="py-2 px-2 font-mono font-bold">{idx + 1}</td>
                      <td className="py-2 px-2 font-mono font-bold text-slate-900">{ord.orderNumber}</td>
                      <td className="py-2 px-2">
                        <strong>{ord.customerName}</strong>
                        <span className="block text-[10px] text-slate-500">{ord.deliveryAddress?.locality}</span>
                      </td>
                      <td className="py-2 px-2 font-mono">{ord.customerPhone}</td>
                      <td className="py-2 px-2 font-mono uppercase">{ord.paymentMethod}</td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-sm">
                        {ord.paymentMethod === 'COD' ? formatCurrency(ord.totalAmount) : '₹0.00 (PAID)'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-[10px] text-slate-400">
                        _______________
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-6 border-t flex items-center justify-between text-xs font-mono text-slate-600">
                <div>Fleet Rider Signature: _________________</div>
                <div>Cashier / Accounts Handover: _________________</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
