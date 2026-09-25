import React, { useState } from 'react';
import {
  ShoppingCart,
  User,
  Phone,
  MapPin,
  Clock,
  Printer,
  Truck,
  CheckCircle2,
  XCircle,
  PackageCheck,
  AlertTriangle,
  RotateCcw,
  IndianRupee,
  Calendar,
  X
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { OrderTimeline } from '../common/OrderTimeline';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { updateOrderStatus } from '../../firebase/orderService';
import { useNotification } from '../../context/NotificationContext';
import { usePermissions } from '../../hooks/usePermissions';

export const OrderDetailModal = ({
  isOpen,
  onClose,
  order,
  onOrderUpdated,
  onOpenPrint
}) => {
  const [statusReason, setStatusReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const notify = useNotification();
  const { currentUser, can } = usePermissions();

  if (!isOpen || !order) return null;

  const handleAdvanceStatus = async (nextStatus) => {
    setIsUpdating(true);
    try {
      const updated = await updateOrderStatus(order.id, nextStatus, statusReason, currentUser);
      notify.success('Order Status Advanced', `Order is now marked as "${nextStatus}".`);
      setStatusReason('');
      if (onOrderUpdated) onOrderUpdated(updated);
    } catch (err) {
      notify.error('Status Update Failed', err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-mono text-slate-900">
                  {order.orderNumber}
                </h3>
                <StatusBadge status={order.status} />
                {order.priority === 'Express' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                    Express Dispatch
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Placed at {formatDateTime(order.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPrint && (
              <button
                onClick={() => onOpenPrint(order)}
                className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Docs</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scroll Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Order Lifecycle Visual Timeline (Section 9) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
              Order Lifecycle Stage Progression
            </span>
            <OrderTimeline currentStatus={order.status} history={order.timeline || []} />
          </div>

          {/* Grid: Customer Info & Payment Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Customer & Address */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-subtle text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 border-b pb-2">
                <User className="w-4 h-4 text-emerald-700" />
                <span>Customer & Delivery Destination</span>
              </div>

              <div>
                <p className="font-bold text-slate-900 text-sm">{order.customerName}</p>
                {order.customerTamil && (
                  <p className="text-slate-500 font-sans">{order.customerTamil}</p>
                )}
                <div className="flex items-center gap-2 text-slate-600 font-mono mt-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{order.customerPhone}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-600 pt-1 border-t border-slate-100">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {order.deliveryAddress?.addressLine},<br />
                  Landmark: {order.deliveryAddress?.landmark}<br />
                  Locality: <strong>{order.deliveryAddress?.locality}</strong> (PIN: {order.deliveryAddress?.pincode})
                </p>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg text-slate-500 font-mono text-[11px] flex justify-between">
                <span>Slot: {order.deliverySlot}</span>
                <span>Distance: ~{order.distanceKm} km</span>
              </div>
            </div>

            {/* Financial Summary & Payment */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-subtle text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 border-b pb-2">
                <IndianRupee className="w-4 h-4 text-emerald-700" />
                <span>Payment & Commercial Breakdown</span>
              </div>

              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Grocery Subtotal:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST Taxes:</span>
                  <span>{formatCurrency(order.gstAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charge:</span>
                  <span className="text-emerald-700">{order.deliveryFee === 0 ? 'FREE' : formatCurrency(order.deliveryFee)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount / Coins:</span>
                    <span>-{formatCurrency(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-2 border-t text-sm font-sans">
                  <span>Grand Total:</span>
                  <span className="text-emerald-800">{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] flex items-center justify-between">
                <span className="font-semibold text-slate-700">Payment: {order.paymentMethod}</span>
                <span className={`font-bold uppercase ${order.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {order.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Order Items ({order.items?.length || 0})
            </span>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-subtle">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3">SKU & Barcode</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-center">Pick Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(order.items || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.variantName}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {item.sku}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">{formatCurrency(item.totalPrice)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            item.pickStatus === 'packed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.pickStatus === 'picked'
                              ? 'bg-indigo-100 text-indigo-800'
                              : item.pickStatus === 'replaced'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.pickStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Operational Status Advance Actions */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Operational Status Transitions
            </span>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {order.status === 'confirmed' && (
                <button
                  disabled={isUpdating}
                  onClick={() => handleAdvanceStatus('picking')}
                  className="btn-primary"
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>Start Picking Workstation</span>
                </button>
              )}

              {order.status === 'picking' && (
                <button
                  disabled={isUpdating}
                  onClick={() => handleAdvanceStatus('packed')}
                  className="btn-primary"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark All Items Packed & Bagged</span>
                </button>
              )}

              {order.status === 'packed' && (
                <button
                  disabled={isUpdating}
                  onClick={() => handleAdvanceStatus('ready')}
                  className="btn-primary"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Move to Dispatch Bay</span>
                </button>
              )}

              {order.status === 'ready' && (
                <button
                  disabled={isUpdating}
                  onClick={() => handleAdvanceStatus('out_for_delivery')}
                  className="btn-primary"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Dispatch Out for Delivery</span>
                </button>
              )}

              {order.status === 'out_for_delivery' && (
                <button
                  disabled={isUpdating}
                  onClick={() => handleAdvanceStatus('delivered')}
                  className="btn-primary"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Doorstep Delivered</span>
                </button>
              )}

              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                <button
                  disabled={isUpdating}
                  onClick={() => handleAdvanceStatus('cancelled')}
                  className="btn-outline-danger"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel Order</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
