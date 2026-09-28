import React, { useState, useMemo } from 'react';
import { X, Package, Truck, ArrowUpDown, ChevronUp, ChevronDown, CheckCircle, AlertTriangle, MapPin, Scale, Clock } from 'lucide-react';
import { validateBatchCapacity } from '../../firebase/deliveryService';

export const DeliveryBatchModal = ({ isOpen, onClose, onSave, availableOrders = [], agents = [], batches = [] }) => {
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [clusterLocality, setClusterLocality] = useState('RS Puram & Central Coimbatore');
  const [maxOrdersCapacity, setMaxOrdersCapacity] = useState(20);
  const [maxWeightCapacityKg, setMaxWeightCapacityKg] = useState(50);
  const [orderedStops, setOrderedStops] = useState([]);

  // Collect all order IDs that have already been assigned to any active/existing batch
  const alreadyAssignedOrderIds = useMemo(() => {
    const ids = new Set();
    (batches || []).forEach(b => {
      (b.orderIds || []).forEach(id => ids.add(id));
      (b.stops || []).forEach(s => ids.add(s.orderId));
    });
    return ids;
  }, [batches]);

  // Filter available orders (status 'packed' or 'confirmed' AND not already assigned to any batch or rider)
  const dispatchableOrders = useMemo(() => {
    return availableOrders.filter(o => {
      const isPackedOrConfirmed = o.status === 'packed' || o.status === 'confirmed';
      const isAlreadyAssigned = 
        alreadyAssignedOrderIds.has(o.id) || 
        alreadyAssignedOrderIds.has(o.orderNumber) ||
        o.status === 'out_for_delivery' ||
        o.status === 'delivered' ||
        o.status === 'cancelled';
      return isPackedOrConfirmed && !isAlreadyAssigned;
    });
  }, [availableOrders, alreadyAssignedOrderIds]);

  // Selected orders list
  const selectedOrders = useMemo(() => {
    return dispatchableOrders.filter(o => selectedOrderIds.includes(o.id));
  }, [dispatchableOrders, selectedOrderIds]);

  // Sync orderedStops with selectedOrders when selections change
  const handleToggleOrder = (order) => {
    let nextIds;
    if (selectedOrderIds.includes(order.id)) {
      nextIds = selectedOrderIds.filter(id => id !== order.id);
      setOrderedStops(prev => prev.filter(s => s.orderId !== order.id));
    } else {
      nextIds = [...selectedOrderIds, order.id];
      const newStop = {
        orderId: order.id,
        customerName: order.customerName,
        phone: order.customerPhone || order.shippingAddress?.phone || '+91 98401 22334',
        address: order.shippingAddress?.street || order.shippingAddress || 'Tatabad, Coimbatore',
        locality: order.shippingAddress?.area || 'Tatabad',
        paymentMethod: order.paymentMethod || 'COD',
        codAmount: order.paymentMethod === 'COD' ? Number(order.totalAmount || 0) : 0,
        weightKg: order.totalWeightKg || 3.5,
        status: 'pending'
      };
      setOrderedStops(prev => [...prev, newStop]);
    }
    setSelectedOrderIds(nextIds);
  };

  // Reorder stops (Move up/down)
  const moveStop = (index, direction) => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= orderedStops.length) return;
    const updated = [...orderedStops];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setOrderedStops(updated);
  };

  // Calculate batch metrics & capacity checks
  const capacityCheck = useMemo(() => {
    const totalOrders = orderedStops.length;
    const totalWeight = orderedStops.reduce((sum, s) => sum + (s.weightKg || 3.5), 0);
    const totalCod = orderedStops.reduce((sum, s) => sum + (s.codAmount || 0), 0);
    // Estimated route: ~2.5km per stop + 12 mins per stop
    const estimatedDistanceKm = Number((totalOrders * 2.2 + 2.5).toFixed(1));
    const estimatedMinutes = totalOrders * 12 + 10;

    const errors = [];
    if (totalOrders > maxOrdersCapacity) {
      errors.push(`Selected count (${totalOrders}) exceeds limit of ${maxOrdersCapacity} orders.`);
    }
    if (totalWeight > maxWeightCapacityKg) {
      errors.push(`Total weight (${totalWeight.toFixed(1)} kg) exceeds capacity limit of ${maxWeightCapacityKg} kg.`);
    }

    return {
      totalOrders,
      totalWeight: Number(totalWeight.toFixed(1)),
      totalCod: Number(totalCod.toFixed(2)),
      estimatedDistanceKm,
      estimatedMinutes,
      errors,
      isValid: errors.length === 0 && totalOrders > 0
    };
  }, [orderedStops, maxOrdersCapacity, maxWeightCapacityKg]);

  const assignedAgent = agents.find(a => a.id === assignedAgentId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!capacityCheck.isValid) return;
    if (!assignedAgentId) {
      alert('Please select an available delivery fleet rider for this batch.');
      return;
    }

    const batchPayload = {
      agentId: assignedAgentId,
      agentName: assignedAgent ? assignedAgent.name : 'Unassigned Rider',
      agentEmail: assignedAgent ? (assignedAgent.email || '') : '',
      status: 'assigned',
      orderIds: orderedStops.map(s => s.orderId),
      totalOrders: capacityCheck.totalOrders,
      totalWeightKg: capacityCheck.totalWeight,
      maxWeightCapacityKg,
      totalCodExpected: capacityCheck.totalCod,
      totalCodCollected: 0,
      clusterLocality,
      estimatedDistanceKm: capacityCheck.estimatedDistanceKm,
      estimatedMinutes: capacityCheck.estimatedMinutes,
      stops: orderedStops
    };

    onSave(batchPayload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Create Delivery Dispatch Batch</h3>
              <p className="text-xs text-slate-400">Cluster 5–20 orders, enforce capacity & sequence delivery stops</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Capacity Config Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Cluster Locality / Zone
              </label>
              <input
                type="text"
                value={clusterLocality}
                onChange={(e) => setClusterLocality(e.target.value)}
                placeholder="e.g. RS Puram, Tatabad & Gandhipuram"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Assign Fleet Rider *
              </label>
              <select
                value={assignedAgentId}
                onChange={(e) => setAssignedAgentId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none bg-white font-medium"
              >
                <option value="">-- Choose Available Rider --</option>
                {agents.map(ag => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} ({ag.vehicleNumber}) — {ag.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Max Orders Allowed
              </label>
              <select
                value={maxOrdersCapacity}
                onChange={(e) => setMaxOrdersCapacity(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value={5}>Heavy Orders: Max 5</option>
                <option value={10}>Standard: Max 10</option>
                <option value={15}>Express Run: Max 15</option>
                <option value={20}>Light / Small Orders: Max 20</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Max Vehicle Weight
              </label>
              <select
                value={maxWeightCapacityKg}
                onChange={(e) => setMaxWeightCapacityKg(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value={30}>30 kg (Electric Bike)</option>
                <option value={50}>50 kg (Scooter with Box)</option>
                <option value={80}>80 kg (Heavy Motorcycle)</option>
                <option value={150}>150 kg (Cargo Auto 3-Wheeler)</option>
              </select>
            </div>
          </div>

          {/* Realtime Metrics Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">Selected Orders</span>
              <p className="text-xl font-bold text-emerald-950 mt-0.5">
                {capacityCheck.totalOrders} <span className="text-xs font-normal text-emerald-700">/ {maxOrdersCapacity}</span>
              </p>
            </div>

            <div className={`rounded-xl p-3 border ${capacityCheck.totalWeight > maxWeightCapacityKg ? 'bg-rose-50 border-rose-200' : 'bg-blue-50 border-blue-200'}`}>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">Total Weight</span>
              <p className={`text-xl font-bold mt-0.5 ${capacityCheck.totalWeight > maxWeightCapacityKg ? 'text-rose-700' : 'text-blue-950'}`}>
                {capacityCheck.totalWeight} <span className="text-xs font-normal">kg</span>
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">Total COD Cash</span>
              <p className="text-xl font-bold text-amber-950 mt-0.5">₹{capacityCheck.totalCod.toLocaleString('en-IN')}</p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-purple-800 uppercase tracking-wide">Est. Distance</span>
              <p className="text-xl font-bold text-purple-950 mt-0.5">{capacityCheck.estimatedDistanceKm} <span className="text-xs font-normal">km</span></p>
            </div>

            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-cyan-800 uppercase tracking-wide">Promised Route ETA</span>
              <p className="text-xl font-bold text-cyan-950 mt-0.5">~{capacityCheck.estimatedMinutes} <span className="text-xs font-normal">mins</span></p>
            </div>
          </div>

          {/* Validation Warnings */}
          {capacityCheck.errors.length > 0 && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-900">Capacity Violation Detected:</p>
                <ul className="text-xs text-rose-700 list-disc list-inside mt-0.5">
                  {capacityCheck.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Two-Column Workstation: Select Orders (Left) vs Sequenced Stops (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Dispatchable Orders */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col h-[340px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Available Orders ({dispatchableOrders.length})
                </span>
                <span className="text-xs text-slate-500">Click to select (5–20 recommended)</span>
              </div>

              <div className="overflow-y-auto space-y-2 pt-3 flex-1 pr-1">
                {dispatchableOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10">No packed orders currently awaiting dispatch.</p>
                ) : (
                  dispatchableOrders.map(order => {
                    const isSelected = selectedOrderIds.includes(order.id);
                    return (
                      <div
                        key={order.id}
                        onClick={() => handleToggleOrder(order)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 pointer-events-none"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{order.id}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${order.paymentMethod === 'COD' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                {order.paymentMethod} (₹{order.totalAmount})
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium">{order.customerName}</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                              {order.shippingAddress?.area || order.shippingAddress || 'Tatabad'}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                          ~{order.totalWeightKg || 3.5} kg
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Sequenced Route Stops */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col h-[340px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Delivery Route Stops ({orderedStops.length})
                </span>
                <span className="text-xs text-slate-500">Reorder stops manually</span>
              </div>

              {/* Fixed Store Origin Node */}
              <div className="pt-2">
                <div className="px-3 py-2 bg-slate-900 text-white rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-900 font-bold flex items-center justify-center text-[10px]">
                      H
                    </span>
                    <span className="font-semibold">Sri Amman Store Hub (Gandhipuram)</span>
                  </div>
                  <span className="text-slate-400 text-[10px]">Dispatch Origin</span>
                </div>
              </div>

              {/* Reorderable Stops List */}
              <div className="overflow-y-auto space-y-2 pt-2 flex-1 pr-1">
                {orderedStops.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">Select orders from the left to build the delivery run.</p>
                ) : (
                  orderedStops.map((stop, index) => (
                    <div
                      key={stop.orderId}
                      className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{stop.orderId}</span>
                            <span className="text-[10px] text-slate-500">({stop.paymentMethod})</span>
                          </div>
                          <p className="text-xs font-medium text-slate-700">{stop.customerName}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[190px]">{stop.locality}</p>
                        </div>
                      </div>

                      {/* Manual Move Up / Down Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveStop(index, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 transition-colors"
                          title="Move earlier in route"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStop(index, 'down')}
                          disabled={index === orderedStops.length - 1}
                          className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 transition-colors"
                          title="Move later in route"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600">
            Route Sequencing: <span className="font-semibold text-slate-800">Store Hub ➔ {orderedStops.map((_, i) => `Stop ${i+1}`).join(' ➔ ') || 'No stops'}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!capacityCheck.isValid || !assignedAgentId}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Dispatch Delivery Batch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
