import React from 'react';
import { ShoppingBag, Clock, Phone, MapPin, User, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { StatusBadge } from './StatusBadge';

export const OrderCard = ({ order, onViewDetails, onUpdateStatus }) => {
  const {
    id = 'ORD-00000',
    customerName = 'Valued Customer',
    customerPhone = '9876543210',
    itemCount = 0,
    totalAmount = 0,
    paymentMethod = 'COD',
    paymentStatus = 'pending',
    status = 'pending',
    deliveryAddress = 'Coimbatore, Tamil Nadu',
    createdAt = new Date(),
    isUrgent = false
  } = order || {};

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle hover:shadow-card transition-all p-5 flex flex-col justify-between">
      <div>
        {/* Top Meta */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-900 tracking-tight">
                #{id}
              </span>
              {isUrgent && (
                <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
                  Express Delivery
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDateTime(createdAt)}</span>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Customer Info */}
        <div className="p-3 bg-slate-50/80 rounded-xl space-y-1.5 mb-4 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <User className="w-3.5 h-3.5 text-emerald-700" />
            <span>{customerName}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 font-mono">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{customerPhone}</span>
          </div>
          <div className="flex items-start gap-2 text-slate-500 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="truncate">{deliveryAddress}</span>
          </div>
        </div>
      </div>

      {/* Bottom Financials & Action */}
      <div>
        <div className="flex items-center justify-between py-2 border-t border-slate-100 text-xs mb-3">
          <span className="text-slate-500">
            <ShoppingBag className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
            {itemCount} {itemCount === 1 ? 'Grocery Item' : 'Grocery Items'}
          </span>
          <div className="text-right">
            <span className="text-sm font-bold text-slate-900 font-sans block">
              {formatCurrency(totalAmount)}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {paymentMethod} • {paymentStatus}
            </span>
          </div>
        </div>

        <button
          onClick={() => onViewDetails && onViewDetails(order)}
          className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-1 group"
        >
          <span>Manage Order</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
