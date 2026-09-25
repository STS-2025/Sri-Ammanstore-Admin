import React from 'react';
import { Check, Clock, PackageCheck, Truck, Home, XCircle } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

export const ORDER_STAGES = [
  { key: 'placed', label: 'Order Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: Check },
  { key: 'packed', label: 'Packed & Picked', icon: PackageCheck },
  { key: 'dispatched', label: 'Dispatched', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Home }
];

export const OrderTimeline = ({ currentStatus = 'placed', history = [] }) => {
  const isCancelled = currentStatus === 'cancelled';

  const statusIndexMap = {
    placed: 0,
    pending: 0,
    confirmed: 1,
    packing: 1,
    packed: 2,
    dispatched: 3,
    out_for_delivery: 3,
    delivered: 4
  };

  const activeIndex = statusIndexMap[currentStatus] ?? 0;

  if (isCancelled) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800">
        <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
        <div>
          <h5 className="text-xs font-bold uppercase tracking-wider">Order Cancelled</h5>
          <p className="text-xs text-rose-700/80">
            This grocery order has been cancelled and any inventory reservations released.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Connector Line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200 -z-0" />
        <div
          className="absolute top-4 left-0 h-0.5 bg-emerald-600 transition-all duration-500 -z-0"
          style={{ width: `${(activeIndex / (ORDER_STAGES.length - 1)) * 100}%` }}
        />

        {ORDER_STAGES.map((stage, idx) => {
          const isDone = idx <= activeIndex;
          const isCurrent = idx === activeIndex;
          const Icon = stage.icon;
          const historyEntry = history.find((h) => h.status === stage.key);

          return (
            <div key={stage.key} className="flex flex-col items-center relative z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isDone
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'bg-white border-slate-300 text-slate-400'
                } ${isCurrent ? 'ring-4 ring-emerald-100 ring-offset-1' : ''}`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`text-[11px] font-semibold mt-2 whitespace-nowrap ${
                  isDone ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                {stage.label}
              </span>
              {historyEntry?.timestamp && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatDateTime(historyEntry.timestamp)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
