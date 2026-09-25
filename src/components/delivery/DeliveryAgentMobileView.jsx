import React, { useState } from 'react';
import { 
  Truck, Phone, Navigation, CheckCircle2, XCircle, AlertTriangle, 
  Camera, KeyRound, IndianRupee, MapPin, Clock, ArrowLeft, RefreshCw,
  FileCheck, ThumbsUp, ShieldCheck
} from 'lucide-react';

export const DeliveryAgentMobileView = ({ 
  agent, 
  activeBatch, 
  onUpdateStopStatus, 
  onCloseSimulation = null 
}) => {
  const [selectedStopForAction, setSelectedStopForAction] = useState(null);
  const [actionType, setActionType] = useState(null); // 'deliver' | 'fail'
  
  // Deliver form state
  const [otpCode, setOtpCode] = useState('');
  const [codAmountCollected, setCodAmountCollected] = useState('');
  const [proofPhotoUrl, setProofPhotoUrl] = useState('');
  const [signatureCaptured, setSignatureCaptured] = useState(false);

  // Failure form state
  const [failureReason, setFailureReason] = useState('Customer unavailable');
  const [failureNotes, setFailureNotes] = useState('');

  if (!agent) {
    return (
      <div className="p-8 text-center text-slate-500">
        No active delivery agent profile found.
      </div>
    );
  }

  const stops = activeBatch?.stops || [];
  const pendingCount = stops.filter(s => s.status === 'pending' || s.status === 'reached').length;
  const deliveredCount = stops.filter(s => s.status === 'delivered').length;
  const failedCount = stops.filter(s => s.status === 'failed').length;
  const totalCodPending = stops
    .filter(s => s.status !== 'delivered' && s.paymentMethod === 'COD')
    .reduce((sum, s) => sum + (s.codAmount || 0), 0);

  const handleOpenDeliverModal = (stop) => {
    setSelectedStopForAction(stop);
    setActionType('deliver');
    setOtpCode('');
    setCodAmountCollected(stop.paymentMethod === 'COD' ? stop.codAmount : '');
    setProofPhotoUrl('https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=400&q=80');
    setSignatureCaptured(false);
  };

  const handleOpenFailModal = (stop) => {
    setSelectedStopForAction(stop);
    setActionType('fail');
    setFailureReason('Customer unavailable');
    setFailureNotes('');
  };

  const handleMarkReached = (stop) => {
    if (!activeBatch) return;
    onUpdateStopStatus(activeBatch.id, stop.orderId, {
      status: 'reached'
    });
  };

  const handleConfirmDeliver = () => {
    if (!selectedStopForAction || !activeBatch) return;
    onUpdateStopStatus(activeBatch.id, selectedStopForAction.orderId, {
      status: 'delivered',
      otpCode: otpCode || 'VERIFIED-OTP',
      proofPhotoUrl,
      codCollectedAmount: selectedStopForAction.paymentMethod === 'COD' ? Number(codAmountCollected || selectedStopForAction.codAmount) : 0
    });
    setSelectedStopForAction(null);
    setActionType(null);
  };

  const handleConfirmFail = () => {
    if (!selectedStopForAction || !activeBatch) return;
    if (!failureReason) {
      alert('Please select a failure reason.');
      return;
    }
    onUpdateStopStatus(activeBatch.id, selectedStopForAction.orderId, {
      status: 'failed',
      failureReason,
      failureNotes
    });
    setSelectedStopForAction(null);
    setActionType(null);
  };

  return (
    <div className="max-w-md mx-auto bg-slate-100 min-h-screen pb-16 shadow-2xl border-x border-slate-200">
      {/* Top Mobile Bar */}
      <div className="bg-slate-900 text-white p-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onCloseSimulation && (
              <button
                onClick={onCloseSimulation}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                title="Exit Simulation"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-sm">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">{agent.name}</h2>
              <p className="text-[11px] text-emerald-400 font-medium">
                {agent.vehicleNumber} • {agent.status === 'on_delivery' ? 'On Delivery' : 'Available'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Rider Portal
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Coimbatore Hub</p>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800 text-center">
          <div className="bg-slate-800/80 p-2 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase">Assigned</span>
            <p className="text-base font-bold text-white">{stops.length}</p>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-xl">
            <span className="text-[10px] text-amber-400 uppercase">Pending</span>
            <p className="text-base font-bold text-amber-400">{pendingCount}</p>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-xl">
            <span className="text-[10px] text-emerald-400 uppercase">Delivered</span>
            <p className="text-base font-bold text-emerald-400">{deliveredCount}</p>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-xl">
            <span className="text-[10px] text-cyan-400 uppercase">COD Due</span>
            <p className="text-sm font-bold text-cyan-300">₹{totalCodPending}</p>
          </div>
        </div>
      </div>

      {/* Batch Header */}
      {activeBatch ? (
        <div className="p-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs mb-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Current Run</span>
                <h3 className="text-xs font-bold text-slate-900">{activeBatch.batchNumber}</h3>
                <p className="text-[11px] text-slate-500">{activeBatch.clusterLocality}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {activeBatch.status.toUpperCase()}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">Est. {activeBatch.estimatedMinutes} mins</p>
              </div>
            </div>
          </div>

          {/* Sequential Order Cards */}
          <div className="space-y-3">
            {stops.map((stop, index) => {
              const isDelivered = stop.status === 'delivered';
              const isFailed = stop.status === 'failed';
              const isReached = stop.status === 'reached';

              return (
                <div
                  key={stop.orderId}
                  className={`bg-white rounded-2xl border p-4 shadow-xs transition-all ${
                    isDelivered
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isFailed
                      ? 'border-rose-200 bg-rose-50/20'
                      : isReached
                      ? 'border-cyan-400 ring-2 ring-cyan-200'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Stop Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        isDelivered
                          ? 'bg-emerald-600 text-white'
                          : isFailed
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-900 text-white'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-900">{stop.orderId}</span>
                        <p className="text-sm font-bold text-slate-800">{stop.customerName}</p>
                      </div>
                    </div>

                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      stop.paymentMethod === 'COD' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                    }`}>
                      {stop.paymentMethod} {stop.paymentMethod === 'COD' ? `₹${stop.codAmount}` : 'PAID'}
                    </span>
                  </div>

                  {/* Address */}
                  <div className="mt-2.5 text-xs text-slate-600 flex items-start gap-1.5 bg-slate-50 p-2.5 rounded-xl">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-800">{stop.address}</p>
                      <p className="text-[11px] text-slate-500">{stop.locality}, Coimbatore</p>
                    </div>
                  </div>

                  {/* Status Banner if Finalized */}
                  {isDelivered && (
                    <div className="mt-3 p-2.5 bg-emerald-100/70 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        Handover Completed
                      </span>
                      <span className="text-[11px] text-emerald-700">
                        {new Date(stop.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {isFailed && (
                    <div className="mt-3 p-2.5 bg-rose-100/70 border border-rose-300 rounded-xl text-xs text-rose-900 font-medium">
                      <div className="flex items-center gap-1.5 font-bold">
                        <XCircle className="w-4 h-4 text-rose-700" />
                        Delivery Failed
                      </div>
                      <p className="text-[11px] text-rose-700 mt-0.5">Reason: {stop.failureReason}</p>
                    </div>
                  )}

                  {/* Action Buttons for Pending / Reached */}
                  {!isDelivered && !isFailed && (
                    <div className="mt-3 space-y-2">
                      {/* Navigation & Call Row */}
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={`tel:${stop.phone}`}
                          className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors"
                        >
                          <Phone className="w-4 h-4 text-emerald-600" />
                          Call Customer
                        </a>

                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address + ', ' + stop.locality + ', Coimbatore')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs transition-colors"
                        >
                          <Navigation className="w-4 h-4 text-blue-600" />
                          GPS Directions
                        </a>
                      </div>

                      {/* Primary Execution Buttons: Large & Easy to Tap */}
                      {!isReached ? (
                        <button
                          type="button"
                          onClick={() => handleMarkReached(stop)}
                          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                        >
                          <MapPin className="w-4 h-4 text-cyan-400" />
                          Mark Reached Location
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDeliverModal(stop)}
                            className="py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Deliver Order
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenFailModal(stop)}
                            className="py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            Mark Failed
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white m-4 rounded-2xl border border-slate-200">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">No Batches Assigned</h3>
          <p className="text-xs text-slate-500 mt-1">You are currently available at the hub. The dispatch manager will assign your next grocery route shortly.</p>
        </div>
      )}

      {/* Deliver Order Modal */}
      {actionType === 'deliver' && selectedStopForAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden p-5 shadow-2xl animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Confirm Delivery Handover</h4>
                <p className="text-xs text-slate-500">{selectedStopForAction.orderId} • {selectedStopForAction.customerName}</p>
              </div>
              <button onClick={() => setActionType(null)} className="text-slate-400 p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              {/* COD Collection Check */}
              {selectedStopForAction.paymentMethod === 'COD' ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                    Collect Cash on Delivery (₹) *
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 absolute left-3 top-2.5 text-amber-700" />
                    <input
                      type="number"
                      value={codAmountCollected}
                      onChange={(e) => setCodAmountCollected(e.target.value)}
                      placeholder="e.g. 540"
                      className="w-full pl-9 pr-3 py-2 text-base font-bold text-slate-900 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1">Expected bill amount: ₹{selectedStopForAction.codAmount}</p>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                  ✓ Prepaid Order (UPI/Card). No cash to collect.
                </div>
              )}

              {/* Customer OTP */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Customer 4-Digit Delivery OTP
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter customer OTP (e.g. 4092)"
                    className="w-full pl-9 pr-3 py-2 text-sm font-semibold tracking-wider border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Proof of Delivery / Signature Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-700">Doorstep Handover Verified</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSignatureCaptured(!signatureCaptured)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${
                    signatureCaptured
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  {signatureCaptured ? '✓ Verified' : 'Tap to Verify'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmDeliver}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Complete Handover
            </button>
          </div>
        </div>
      )}

      {/* Report Delivery Failure Modal */}
      {actionType === 'fail' && selectedStopForAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden p-5 shadow-2xl animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Report Delivery Failure</h4>
                <p className="text-xs text-slate-500">{selectedStopForAction.orderId} • {selectedStopForAction.customerName}</p>
              </div>
              <button onClick={() => setActionType(null)} className="text-slate-400 p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for Failure *
                </label>
                <select
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none bg-white font-medium"
                >
                  <option value="Customer unavailable">Customer unavailable / Phone not reachable</option>
                  <option value="Wrong address">Wrong or incomplete address</option>
                  <option value="Customer refused">Customer refused order / Cancelled at door</option>
                  <option value="Payment issue">Payment issue (COD cash unavailable / UPI failed)</option>
                  <option value="Product issue">Product package damaged / Leaked in transit</option>
                  <option value="Delivery location inaccessible">Delivery location inaccessible / Road blocked</option>
                  <option value="Other">Other reason (describe below)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rider Field Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={failureNotes}
                  onChange={(e) => setFailureNotes(e.target.value)}
                  placeholder="e.g. Called customer 3 times, gate locked."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmFail}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-5 h-5" />
              Confirm Delivery Failure
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
