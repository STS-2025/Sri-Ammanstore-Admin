import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, Package, MapPin, IndianRupee, CheckCircle2, AlertTriangle, 
  Plus, Smartphone, Users, RefreshCw, Eye, ArrowRight, ShieldCheck,
  Search, Filter
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../utils/roles';
import { 
  getAllDeliveryAgents, 
  getAllDeliveryBatches, 
  createDeliveryAgent, 
  updateDeliveryAgent,
  setAgentDutyStatus,
  createDeliveryBatch, 
  reorderBatchStops, 
  updateStopDeliveryStatus,
  reconcileAgentCodDeposit,
  getCodReconciliationHistory
} from '../../firebase/deliveryService';
import { getAllOrders } from '../../firebase/orderService';
import { DeliveryAgentModal } from '../../components/delivery/DeliveryAgentModal';
import { DeliveryBatchModal } from '../../components/delivery/DeliveryBatchModal';
import { DeliveryMapRouteVisualizer } from '../../components/delivery/DeliveryMapRouteVisualizer';
import { DeliveryAgentMobileView } from '../../components/delivery/DeliveryAgentMobileView';
import { CodReconciliationModal } from '../../components/delivery/CodReconciliationModal';

export const DeliveryPage = () => {
  const { currentUser, userRole } = useAuth();

  const [agents, setAgents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [codHistory, setCodHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active view tab in dashboard: 'batches' | 'agents' | 'routes' | 'cod'
  const [activeTab, setActiveTab] = useState('batches');

  // Modals state
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [selectedAgentForEdit, setSelectedAgentForEdit] = useState(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isCodModalOpen, setIsCodModalOpen] = useState(false);
  const [agentForCodSettlement, setAgentForCodSettlement] = useState(null);

  // Simulation mode for testing rider screen
  const [isSimulatingRider, setIsSimulatingRider] = useState(false);
  const [simulatedAgentId, setSimulatedAgentId] = useState('');

  // Selected batch for Route Visualizer tab
  const [selectedBatchId, setSelectedBatchId] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedAgents, fetchedBatches, fetchedOrders] = await Promise.all([
        getAllDeliveryAgents(),
        getAllDeliveryBatches(),
        getAllOrders()
      ]);
      setAgents(fetchedAgents);
      setBatches(fetchedBatches);
      setOrders(fetchedOrders);
      setCodHistory(getCodReconciliationHistory());
      if (fetchedBatches.length > 0 && !selectedBatchId) {
        setSelectedBatchId(fetchedBatches[0].id);
      }
      if (fetchedAgents.length > 0 && !simulatedAgentId) {
        setSimulatedAgentId(fetchedAgents[0].id);
      }
    } catch (err) {
      console.error('Error loading delivery fleet data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Delivery Dashboard KPIs
  const kpis = useMemo(() => {
    const activeAgents = agents.filter(a => a.status === 'on_delivery').length;
    const availableAgents = agents.filter(a => a.status === 'available').length;
    const completedToday = agents.reduce((sum, a) => sum + (a.completedToday || 0), 0);
    const failedToday = agents.reduce((sum, a) => sum + (a.failedToday || 0), 0);
    const totalCodCollected = agents.reduce((sum, a) => sum + (a.codCollectedToday || 0), 0);
    const totalCodDeposited = agents.reduce((sum, a) => sum + (a.codDepositedToday || 0), 0);
    const codPending = Math.max(0, totalCodCollected - totalCodDeposited);

    return {
      activeAgents,
      availableAgents,
      completedToday,
      failedToday,
      totalCodCollected,
      totalCodDeposited,
      codPending
    };
  }, [agents]);

  // Handlers
  const handleSaveAgent = async (formData) => {
    try {
      if (selectedAgentForEdit) {
        await updateDeliveryAgent(selectedAgentForEdit.id, formData, currentUser);
      } else {
        await createDeliveryAgent(formData, currentUser);
      }
      setIsAgentModalOpen(false);
      setSelectedAgentForEdit(null);
      await loadData();
    } catch (err) {
      alert(`Error saving rider: ${err.message}`);
    }
  };

  const handleCreateBatch = async (batchPayload) => {
    try {
      const created = await createDeliveryBatch(batchPayload, currentUser);
      setIsBatchModalOpen(false);
      setSelectedBatchId(created.id);
      setActiveTab('routes');
      await loadData();
    } catch (err) {
      alert(`Error creating batch: ${err.message}`);
    }
  };

  const handleReorderStops = async (batchId, reorderedStops) => {
    try {
      await reorderBatchStops(batchId, reorderedStops, currentUser);
      await loadData();
    } catch (err) {
      alert(`Error reordering stops: ${err.message}`);
    }
  };

  const handleUpdateStopStatus = async (batchId, orderId, statusPayload) => {
    try {
      await updateStopDeliveryStatus(batchId, orderId, statusPayload, currentUser);
      await loadData();
    } catch (err) {
      alert(`Error updating stop: ${err.message}`);
    }
  };

  const handleReconcileCod = async (agentId, amount, mode, note) => {
    try {
      await reconcileAgentCodDeposit(agentId, amount, mode, note, currentUser);
      await loadData();
    } catch (err) {
      alert(`Error reconciling COD: ${err.message}`);
    }
  };

  // If user role is specifically 'delivery_agent', or if simulate mode is active, render dedicated mobile view!
  const isAgentRole = userRole === ROLES.DELIVERY_AGENT;
  if (isAgentRole || isSimulatingRider) {
    const activeAgent = isAgentRole 
      ? (agents.find(a => a.id === currentUser?.id) || agents[0])
      : agents.find(a => a.id === simulatedAgentId) || agents[0];

    const riderBatch = batches.find(b => b.agentId === activeAgent?.id && b.status !== 'completed') || batches[0];

    return (
      <div className="py-4">
        {/* Simulation Notice if triggered from Admin */}
        {isSimulatingRider && (
          <div className="max-w-md mx-auto mb-3 bg-amber-500 text-slate-900 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-between shadow-md">
            <span>🛵 Rider Experience Simulator Active</span>
            <div className="flex items-center gap-2">
              <select
                value={simulatedAgentId}
                onChange={(e) => setSimulatedAgentId(e.target.value)}
                className="bg-white text-slate-800 text-[11px] py-1 px-2 rounded font-semibold border-none outline-none"
              >
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <button
                onClick={() => setIsSimulatingRider(false)}
                className="bg-slate-900 text-white px-2 py-1 rounded text-[11px]"
              >
                Exit
              </button>
            </div>
          </div>
        )}

        <DeliveryAgentMobileView
          agent={activeAgent}
          activeBatch={riderBatch}
          onUpdateStopStatus={handleUpdateStopStatus}
          onCloseSimulation={isSimulatingRider ? () => setIsSimulatingRider(false) : null}
        />
      </div>
    );
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId) || batches[0];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Delivery Fleet & Route Dispatch</h1>
          <p className="text-sm text-slate-500">
            Real-time Coimbatore fleet tracking, capacity-checked dispatch batches, and COD cash reconciliation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Simulate Rider View Trigger */}
          <button
            type="button"
            onClick={() => setIsSimulatingRider(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            Simulate Rider View
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedAgentForEdit(null);
              setIsAgentModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-slate-600" />
            Add Rider
          </button>

          <button
            type="button"
            onClick={() => setIsBatchModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Package className="w-4 h-4" />
            Create Dispatch Batch
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Active Fleet</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{agents.length} <span className="text-xs font-normal text-slate-400">riders</span></p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Available</span>
          <p className="text-xl font-bold text-emerald-600 mt-1">{kpis.availableAgents} <span className="text-xs font-normal text-slate-400">at hub</span></p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">On Delivery</span>
          <p className="text-xl font-bold text-blue-600 mt-1">{kpis.activeAgents} <span className="text-xs font-normal text-slate-400">in transit</span></p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Delivered Today</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">{kpis.completedToday} <span className="text-xs font-normal text-slate-400">orders</span></p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wide">Failed Today</span>
          <p className="text-xl font-bold text-rose-600 mt-1">{kpis.failedToday} <span className="text-xs font-normal text-slate-400">orders</span></p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">COD Pending</span>
          <p className="text-xl font-bold text-amber-600 mt-1">₹{kpis.codPending.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">COD Deposited</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">₹{kpis.totalCodDeposited.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('batches')}
            className={`pb-3 px-4 text-xs font-bold transition-all relative ${
              activeTab === 'batches'
                ? 'text-emerald-700 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Dispatch Batches ({batches.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agents')}
            className={`pb-3 px-4 text-xs font-bold transition-all relative ${
              activeTab === 'agents'
                ? 'text-emerald-700 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Fleet Riders ({agents.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('routes')}
            className={`pb-3 px-4 text-xs font-bold transition-all relative ${
              activeTab === 'routes'
                ? 'text-emerald-700 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Route Sequencing Visualizer
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cod')}
            className={`pb-3 px-4 text-xs font-bold transition-all relative ${
              activeTab === 'cod'
                ? 'text-emerald-700 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            COD Accounts Settlement
          </button>
        </div>

        <button
          onClick={loadData}
          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 mb-1"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: Dispatch Batches */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map(batch => {
              const delivered = batch.stops.filter(s => s.status === 'delivered').length;
              const failed = batch.stops.filter(s => s.status === 'failed').length;
              const progressPct = Math.round(((delivered + failed) / (batch.stops.length || 1)) * 100);

              return (
                <div
                  key={batch.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{batch.batchNumber}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        batch.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : batch.status === 'in_transit'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {batch.status}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-600 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {batch.clusterLocality}
                    </p>

                    <div className="mt-3 bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rider Assigned:</span>
                        <span className="font-semibold text-slate-800">{batch.agentName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Stops / Orders:</span>
                        <span className="font-semibold text-slate-800">{batch.totalOrders} stops ({batch.totalWeightKg} kg)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">COD Cash Expected:</span>
                        <span className="font-semibold text-amber-900">₹{batch.totalCodExpected}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Est. Distance & Time:</span>
                        <span className="font-semibold text-slate-800">~{batch.estimatedDistanceKm} km ({batch.estimatedMinutes}m)</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>Fulfillment Progress</span>
                        <span className="font-bold text-slate-700">{delivered} / {batch.stops.length} delivered</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Created: {new Date(batch.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBatchId(batch.id);
                        setActiveTab('routes');
                      }}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      View Route Visualizer <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Fleet Agents */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(ag => {
              const pendingCod = Math.max(0, (ag.codCollectedToday || 0) - (ag.codDepositedToday || 0));

              return (
                <div key={ag.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={ag.photo}
                          alt={ag.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{ag.name}</h4>
                          {ag.tamilName && <p className="text-xs text-slate-500 font-medium">{ag.tamilName}</p>}
                          <p className="text-xs text-emerald-600 font-semibold">{ag.mobile}</p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        ag.status === 'available'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ag.status === 'on_delivery'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {ag.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="mt-3 bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vehicle:</span>
                        <span className="font-semibold text-slate-800">{ag.vehicle}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Plate Number:</span>
                        <span className="font-bold text-slate-900">{ag.vehicleNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">DL License:</span>
                        <span className="text-slate-700 font-mono text-[11px]">{ag.licenseNumber || 'Verified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Hub Location:</span>
                        <span className="text-slate-700">{ag.activeLocation}</span>
                      </div>
                    </div>

                    {/* Daily Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                      <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-emerald-800 font-semibold uppercase">Delivered</span>
                        <p className="text-sm font-bold text-emerald-900 mt-0.5">{ag.completedToday || 0}</p>
                      </div>
                      <div className="p-2 bg-rose-50 rounded-lg border border-rose-100">
                        <span className="text-[10px] text-rose-800 font-semibold uppercase">Failed</span>
                        <p className="text-sm font-bold text-rose-900 mt-0.5">{ag.failedToday || 0}</p>
                      </div>
                      <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                        <span className="text-[10px] text-amber-800 font-semibold uppercase">Pending COD</span>
                        <p className="text-sm font-bold text-amber-900 mt-0.5">₹{pendingCod}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAgentForEdit(ag);
                        setIsAgentModalOpen(true);
                      }}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Edit Profile
                    </button>

                    {pendingCod > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAgentForCodSettlement(ag);
                          setIsCodModalOpen(true);
                        }}
                        className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <IndianRupee className="w-3.5 h-3.5" />
                        Reconcile ₹{pendingCod}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Route Sequencing Visualizer */}
      {activeTab === 'routes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Select Batch Route:</span>
              <select
                value={selectedBatchId || ''}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.batchNumber} — {b.clusterLocality} ({b.agentName})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs text-slate-500">
              {selectedBatch?.stops?.length || 0} stops sequenced
            </span>
          </div>

          <DeliveryMapRouteVisualizer
            batch={selectedBatch}
            onReorderStops={handleReorderStops}
          />
        </div>
      )}

      {/* TAB 4: COD Settlement */}
      {activeTab === 'cod' && (
        <div className="space-y-6">
          {/* Active Riders Settlement Grid */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1">Riders Daily Cash Settlement Status</h3>
            <p className="text-xs text-slate-500 mb-4">Accounts team must verify physical cash or store UPI receipts before closing daily balances.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Rider Name</th>
                    <th className="py-2.5 px-3">Vehicle</th>
                    <th className="py-2.5 px-3">COD Collected Today</th>
                    <th className="py-2.5 px-3">COD Deposited</th>
                    <th className="py-2.5 px-3">Pending Cash Balance</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agents.map(ag => {
                    const pending = Math.max(0, (ag.codCollectedToday || 0) - (ag.codDepositedToday || 0));
                    return (
                      <tr key={ag.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{ag.name}</p>
                          <p className="text-[11px] text-slate-400">{ag.mobile}</p>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700">{ag.vehicleNumber}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">₹{ag.codCollectedToday || 0}</td>
                        <td className="py-3 px-3 font-semibold text-emerald-700">₹{ag.codDepositedToday || 0}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${pending > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}>
                            ₹{pending}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            disabled={pending <= 0}
                            onClick={() => {
                              setAgentForCodSettlement(ag);
                              setIsCodModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-xs transition-colors"
                          >
                            Reconcile Deposit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Ledger of Settlements */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1">Settlement Audit Log</h3>
            <p className="text-xs text-slate-500 mb-4">Historical record of accounts verifications and cashier receipts.</p>

            {codHistory.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No settlement transactions logged yet today.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {codHistory.map(rec => (
                  <div key={rec.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{rec.agentName}</span>
                      <p className="text-[11px] text-slate-500">Method: {rec.paymentMode} • Reconciled By: {rec.reconciledBy}</p>
                      {rec.referenceNote && <p className="text-[11px] text-slate-400 italic">"{rec.referenceNote}"</p>}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-700 text-sm">₹{rec.amount}</span>
                      <p className="text-[10px] text-slate-400">{new Date(rec.reconciledAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <DeliveryAgentModal
        isOpen={isAgentModalOpen}
        onClose={() => {
          setIsAgentModalOpen(false);
          setSelectedAgentForEdit(null);
        }}
        onSave={handleSaveAgent}
        agent={selectedAgentForEdit}
      />

      <DeliveryBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onSave={handleCreateBatch}
        availableOrders={orders}
        agents={agents}
      />

      <CodReconciliationModal
        isOpen={isCodModalOpen}
        onClose={() => {
          setIsCodModalOpen(false);
          setAgentForCodSettlement(null);
        }}
        onReconcile={handleReconcileCod}
        agent={agentForCodSettlement}
      />
    </div>
  );
};
