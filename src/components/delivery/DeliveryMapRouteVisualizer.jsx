import React from 'react';
import { Store, Navigation, MapPin, Clock, ArrowRight, User, CheckCircle2, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';

export const DeliveryMapRouteVisualizer = ({ batch, onReorderStops }) => {
  if (!batch || !batch.stops || batch.stops.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">No Active Route Selected</p>
        <p className="text-xs text-slate-400 mt-1">Select or create a delivery batch to inspect route sequence and delivery waypoints.</p>
      </div>
    );
  }

  const handleMoveStop = (idx, direction) => {
    if (!onReorderStops) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= batch.stops.length) return;
    const updated = [...batch.stops];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    onReorderStops(batch.id, updated);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      {/* Visualizer Header */}
      <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
              {batch.status}
            </span>
            <h3 className="text-base font-bold">{batch.batchNumber}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Zone: <span className="text-slate-200 font-medium">{batch.clusterLocality}</span> • Rider: <span className="text-emerald-400 font-semibold">{batch.agentName}</span>
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span>Est. ~{batch.estimatedDistanceKm || 8.5} km</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>ETA ~{batch.estimatedMinutes || 45} mins</span>
          </div>
        </div>
      </div>

      {/* Map Integration Boundary & Waypoints Banner */}
      <div className="bg-slate-800/90 px-6 py-2.5 border-b border-slate-700 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Interactive Waypoint Sequencing • Modular Map Provider Ready</span>
        </div>
        <span className="text-[11px] text-slate-400">
          Store Hub ➔ {batch.stops.map((_, i) => `Stop ${i+1}`).join(' ➔ ')}
        </span>
      </div>

      {/* Visual Route Flow Canvas */}
      <div className="p-6">
        <div className="space-y-4">
          {/* Origin: Central Hub */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-sm shadow-md border border-slate-700">
                <Store className="w-5 h-5" />
              </div>
              <div className="w-0.5 h-12 bg-slate-300 my-1" />
            </div>

            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Store Dispatch Origin
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  Origin Hub
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800 mt-1">Sri Amman Store — Gandhipuram Main Central Hub</p>
              <p className="text-xs text-slate-500">142, Cross Cut Road, Gandhipuram, Coimbatore - 641012</p>
            </div>
          </div>

          {/* Sequential Stops */}
          {batch.stops.map((stop, idx) => {
            const isLast = idx === batch.stops.length - 1;
            const isDelivered = stop.status === 'delivered';
            const isFailed = stop.status === 'failed';
            const isReached = stop.status === 'reached';

            let statusBadge = (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                Pending
              </span>
            );
            if (isDelivered) {
              statusBadge = (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1 uppercase">
                  <CheckCircle2 className="w-3 h-3" /> Delivered
                </span>
              );
            } else if (isFailed) {
              statusBadge = (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 flex items-center gap-1 uppercase">
                  <AlertCircle className="w-3 h-3" /> Failed
                </span>
              );
            } else if (isReached) {
              statusBadge = (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 uppercase animate-pulse">
                  Reached Location
                </span>
              );
            }

            return (
              <div key={stop.orderId || idx} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs border ${
                    isDelivered
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : isFailed
                      ? 'bg-rose-600 text-white border-rose-700'
                      : 'bg-white text-slate-800 border-slate-300'
                  }`}>
                    {idx + 1}
                  </div>
                  {!isLast && <div className="w-0.5 h-12 bg-slate-300 my-1" />}
                </div>

                <div className={`flex-1 border rounded-xl p-3.5 transition-all ${
                  isDelivered ? 'bg-emerald-50/40 border-emerald-200' : isFailed ? 'bg-rose-50/40 border-rose-200' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{stop.orderId}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-medium text-slate-600">Stop #{idx + 1}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        stop.paymentMethod === 'COD' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {stop.paymentMethod} {stop.paymentMethod === 'COD' ? `(₹${stop.codAmount})` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {statusBadge}
                      {/* Manual Reordering Controls */}
                      {onReorderStops && (
                        <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                          <button
                            type="button"
                            onClick={() => handleMoveStop(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStop(idx, 'down')}
                            disabled={isLast}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{stop.customerName}</p>
                      <p className="text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {stop.address} ({stop.locality})
                      </p>
                    </div>

                    <div className="text-right text-[11px] text-slate-500">
                      <span>Phone: <strong className="text-slate-700">{stop.phone}</strong></span>
                      {stop.deliveredAt && (
                        <p className="text-emerald-700 font-medium">
                          Delivered: {new Date(stop.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {stop.failureReason && (
                        <p className="text-rose-600 font-medium">
                          Reason: {stop.failureReason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
