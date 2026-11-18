import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, ArrowDownLeft, ArrowUpRight, History, Plus, CheckCircle2, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { doc, getDoc } from 'firebase/firestore';
import { getCustomerLedger, recordCustomerLedgerTransaction } from '../../firebase/customerService';
import { getAllOrders, applyManualOrderPaymentAllocations } from '../../firebase/orderService';
import { db, isFirebaseConfigured } from '../../firebase/config';
import { COLLECTIONS } from '../../firebase/collections';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';

export const CustomerLedgerModal = ({ isOpen, onClose, customer, onBalanceUpdated }) => {
  const notify = useNotification();
  const { currentUser, userRole } = useAuth();

  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showReceivePayment, setShowReceivePayment] = useState(false);

  // Receive Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH | UPI | CARD
  const [paymentReason, setPaymentReason] = useState('Customer Counter Payment');
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [upiQrDataUrl, setUpiQrDataUrl] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  const customerId = customer?.customerId || customer?.id || '';
  const currentBalance = Number(customer?.currentBalance ?? customer?.outstandingBalance ?? 0);
  const currentAdvance = Number(customer?.advanceBalance || 0);

  const fetchLedger = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const data = await getCustomerLedger(customerId);
      setLedgerEntries(data);
    } catch (err) {
      console.error('Error fetching ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      fetchLedger();
      setShowReceivePayment(false);
      setPaymentAmount('');
    }
  }, [isOpen, customerId]);

  if (!isOpen || !customer) return null;

  const saveReceivedPayment = async (amount) => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      notify.error('Invalid Amount', 'Please enter a valid payment amount greater than zero.');
      return false;
    }
    if (amt > currentBalance) {
      notify.error('Amount Exceeds Balance', 'Payment amount cannot be greater than the customer outstanding balance.');
      return false;
    }

    try {
      setSavingPayment(true);
      const allManualOrders = await getAllOrders({ manualOnly: true });
      const customerOrderIds = new Set([customer?.customerId, customer?.id].filter(Boolean).map(String));
      const openBills = allManualOrders
        .filter((order) => customerOrderIds.has(String(order.customerId || order.customer?.customerId || order.customer?.id || '')))
        .map((order) => {
          const total = Number(order.totalAmount ?? order.total ?? 0);
          const paid = Number(order.amountPaid ?? 0);
          return { order, balanceDue: Number(order.balanceDue ?? Math.max(0, total - paid)) };
        })
        .filter(({ balanceDue }) => balanceDue > 0)
        .sort((first, second) => new Date(first.order.createdAt || 0) - new Date(second.order.createdAt || 0));

      let unallocatedAmount = amt;
      const allocations = [];
      for (const bill of openBills) {
        if (unallocatedAmount <= 0) break;
        const allocationAmount = Math.min(bill.balanceDue, unallocatedAmount);
        allocations.push({ orderId: bill.order.id || bill.order.orderNumber, amount: allocationAmount });
        unallocatedAmount = Math.round((unallocatedAmount - allocationAmount) * 100) / 100;
      }

      await applyManualOrderPaymentAllocations(allocations, currentUser || { role: userRole });
      const res = await recordCustomerLedgerTransaction({
        customerId,
        type: 'PAYMENT',
        credit: amt,
        debit: 0,
        referenceId: `PAY-${Date.now().toString(36).slice(-6).toUpperCase()}`,
        paymentMethod,
        reason: paymentReason,
        user: currentUser || { role: userRole }
      });

      notify.success('Payment Recorded', `Successfully received ${formatCurrency(amt)} via ${paymentMethod}! New balance: ${formatCurrency(res.customer.currentBalance)}`);
      setShowReceivePayment(false);
      setPaymentAmount('');
      setShowUpiQr(false);
      fetchLedger();
      if (onBalanceUpdated) {
        onBalanceUpdated(res.customer);
      }
      return true;
    } catch (err) {
      notify.error('Payment Error', err.message);
      return false;
    } finally {
      setSavingPayment(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0 || amt > currentBalance) {
      notify.error('Invalid Amount', amt > currentBalance
        ? 'Payment amount cannot be greater than the customer outstanding balance.'
        : 'Please enter a valid payment amount greater than zero.');
      return;
    }

    if (paymentMethod !== 'UPI') {
      await saveReceivedPayment(amt);
      return;
    }

    try {
      let settings = {};
      try {
        settings = JSON.parse(localStorage.getItem('grocery_admin_business_settings_v5') || '{}');
      } catch (_) {}
      if (isFirebaseConfigured) {
        const settingsSnapshot = await getDoc(doc(db, COLLECTIONS.BUSINESS_SETTINGS, 'businessSettings'));
        if (settingsSnapshot.exists()) {
          settings = { ...settings, ...settingsSnapshot.data() };
          localStorage.setItem('grocery_admin_business_settings_v5', JSON.stringify(settings));
        }
      }
      const savedUpiId = String(settings.upiId || '').trim();
      if (!savedUpiId) {
        notify.error('UPI ID Required', 'Add your UPI ID in Settings before receiving a UPI payment.');
        return;
      }
      const paymentUrl = `upi://pay?pa=${encodeURIComponent(savedUpiId)}&pn=${encodeURIComponent('Sri Amman Store')}&am=${amt.toFixed(2)}&cu=INR`;
      const qrDataUrl = await QRCode.toDataURL(paymentUrl, {
        width: 240,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      setUpiId(savedUpiId);
      setUpiQrDataUrl(qrDataUrl);
      setShowUpiQr(true);
    } catch (error) {
      notify.error('UPI QR Error', error.message || 'Could not generate the payment QR code.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Customer Financial Ledger</h2>
          <p className="text-xs text-slate-300">
            {customer.name} ({customer.customerId || customer.id}) • Mobile: {customer.mobile || customer.phone || 'N/A'} • Area: {customer.address?.area || customer.area || 'Not set'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Overview Banner */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Outstanding Credit Balance
            </span>
            <span className={`text-2xl font-black font-mono tracking-tight ${currentBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {formatCurrency(currentBalance)}
            </span>
          </div>
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Advance Amount
          </span>
          <span className="text-2xl font-black font-mono tracking-tight text-blue-600">
            {formatCurrency(currentAdvance)}
          </span>
        </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <div>
              <span className="text-slate-400 block text-[10px]">Credit Limit</span>
              <span className="font-mono font-bold text-slate-800">{formatCurrency(customer.creditLimit || 5000)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Available Credit</span>
              <span className="font-mono font-bold text-emerald-700">
                {formatCurrency(Math.max(0, (customer.creditLimit || 5000) - currentBalance))}
              </span>
            </div>
            <button
              onClick={() => setShowReceivePayment(!showReceivePayment)}
              className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 shadow-sm ml-2"
            >
              <DollarSign className="w-4 h-4" />
              <span>{showReceivePayment ? 'View History' : 'Receive Payment'}</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showReceivePayment ? (
            <form onSubmit={handleRecordPayment} className="max-w-md mx-auto space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Record Customer Credit Payment</span>
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current Outstanding Balance</label>
                <div className="text-lg font-mono font-bold text-amber-600">{formatCurrency(currentBalance)}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount paid"
                  min="1"
                  max={currentBalance > 0 ? currentBalance : undefined}
                  required
                  className="w-full text-sm font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {['CASH', 'UPI', 'CARD'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        paymentMethod === m
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Note / Reason</label>
                <input
                  type="text"
                  value={paymentReason}
                  onChange={(e) => setPaymentReason(e.target.value)}
                  placeholder="Counter payment reference"
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReceivePayment(false)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{paymentMethod === 'UPI' ? 'Show UPI QR' : 'Confirm & Save Payment'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {ledgerEntries.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">No ledger transactions found for this customer.</p>
                </div>
              ) : (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Transaction</th>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3 text-right">Debit (+)</th>
                      <th className="py-2.5 px-3 text-right">Credit (-)</th>
                      <th className="py-2.5 px-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {ledgerEntries.map((entry) => {
                      const isCreditSale = entry.type === 'CREDIT_SALE' || entry.debit > 0;
                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                            {formatDateTime(entry.createdAt)}
                          </td>
                          <td className="py-3 px-3 font-bold font-sans">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                              isCreditSale ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isCreditSale ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                              <span>{entry.type}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-700">{entry.referenceId || '-'}</td>
                          <td className="py-3 px-3 text-right font-bold text-amber-700">
                            {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-700">
                            {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(entry.newBalance)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
      {showUpiQr && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="received-upi-title" className="w-full max-w-sm overflow-hidden bg-white border shadow-2xl rounded-2xl border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 text-white bg-slate-900">
              <div>
                <h2 id="received-upi-title" className="text-sm font-extrabold">Receive UPI Payment</h2>
                <p className="mt-1 text-[11px] text-slate-300">Scan this QR code to pay</p>
              </div>
              <button type="button" onClick={() => setShowUpiQr(false)} className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white" aria-label="Close UPI QR popup">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-center">
              <p className="text-xl font-black text-emerald-800">{formatCurrency(Number(paymentAmount))}</p>
              <p className="font-mono text-xs text-slate-500">{upiId}</p>
              {upiQrDataUrl && <img src={upiQrDataUrl} alt={`UPI payment QR for ${formatCurrency(Number(paymentAmount))}`} className="w-56 h-56 p-2 mx-auto bg-white border rounded-xl border-slate-200" />}
              <p className="text-[11px] text-slate-500">After confirming the payment was received, save it to update the customer balance and bills.</p>
              <div className="flex justify-center gap-2 pt-1">
                <button type="button" disabled={savingPayment} onClick={() => setShowUpiQr(false)} className="btn-secondary text-xs py-2 px-4">Cancel</button>
                <button type="button" disabled={savingPayment} onClick={async () => { if (await saveReceivedPayment(Number(paymentAmount))) setShowUpiQr(false); }} className="btn-primary text-xs py-2 px-4 disabled:opacity-50">
                  {savingPayment ? 'Saving…' : 'Payment Received & Save'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
