import { collection, doc, getDocs, getDoc, setDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { COLLECTIONS } from './collections';
import { INITIAL_DELIVERY_AGENTS, INITIAL_DELIVERY_BATCHES } from '../data/deliveryAndMarketingSeedData';
import { logActivity } from './auditLogger';

const AGENTS_STORAGE_KEY = 'grocery_admin_delivery_agents_v4';
const BATCHES_STORAGE_KEY = 'grocery_admin_delivery_batches_v4';
const COD_STORAGE_KEY = 'grocery_admin_cod_collections_v4';

const getStoredAgents = () => {
  try {
    const raw = localStorage.getItem(AGENTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(INITIAL_DELIVERY_AGENTS));
      return INITIAL_DELIVERY_AGENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_DELIVERY_AGENTS;
  }
};

const saveStoredAgents = (agents) => {
  try {
    localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
  } catch (e) {
    console.error('Error storing agents locally', e);
  }
};

const getStoredBatches = () => {
  try {
    const raw = localStorage.getItem(BATCHES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(BATCHES_STORAGE_KEY, JSON.stringify(INITIAL_DELIVERY_BATCHES));
      return INITIAL_DELIVERY_BATCHES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_DELIVERY_BATCHES;
  }
};

const saveStoredBatches = (batches) => {
  try {
    localStorage.setItem(BATCHES_STORAGE_KEY, JSON.stringify(batches));
  } catch (e) {
    console.error('Error storing batches locally', e);
  }
};

/**
 * Fetch all delivery agents
 */
export const getAllDeliveryAgents = async () => {
  if (!isFirebaseConfigured) {
    return getStoredAgents();
  }

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.DELIVERY_AGENTS));
    if (snap.empty) {
      const local = getStoredAgents();
      for (const ag of local) {
        await setDoc(doc(db, COLLECTIONS.DELIVERY_AGENTS, ag.id), {
          ...ag,
          createdAt: serverTimestamp()
        });
      }
      return local;
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Firestore agents fetch failed, falling back to local storage:', err);
    return getStoredAgents();
  }
};

/**
 * Save / Add new delivery agent
 */
export const createDeliveryAgent = async (agentData, user) => {
  const newAgent = {
    ...agentData,
    id: agentData.id || `agent-${Date.now().toString().slice(-4)}`,
    status: agentData.status || 'available',
    assignedOrdersCount: 0,
    completedToday: 0,
    failedToday: 0,
    codCollectedToday: 0,
    codDepositedToday: 0,
    rating: 5.0,
    currentBatchId: null,
    createdAt: new Date().toISOString()
  };

  const agents = getStoredAgents();
  agents.unshift(newAgent);
  saveStoredAgents(agents);

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.DELIVERY_AGENTS, newAgent.id), {
        ...newAgent,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Firestore agent create failed, saved locally:', err);
    }
  }

  await logActivity(
    user || { id: 'admin', name: 'Delivery Manager' },
    'delivery.agent_create',
    COLLECTIONS.DELIVERY_AGENTS,
    newAgent.id,
    `Added delivery fleet agent ${newAgent.name} (${newAgent.vehicleNumber})`,
    { agent: newAgent }
  );

  return newAgent;
};

/**
 * Ensures newly registered or logged in delivery agents are synced into the fleet roster
 */
export const ensureDeliveryAgentRegistered = async (user) => {
  if (!user || user.role !== 'delivery_agent') return;
  const agents = getStoredAgents();
  const agentId = user.uid || user.id || `agent-${(user.email || 'rider').replace(/[^a-zA-Z0-9]/g, '')}`;
  const userEmail = (user.email || '').trim().toLowerCase();

  const existingIndex = agents.findIndex(a => 
    a.id === agentId || 
    (a.email && userEmail && a.email.trim().toLowerCase() === userEmail)
  );

  if (existingIndex >= 0) {
    agents[existingIndex] = {
      ...agents[existingIndex],
      id: agentId,
      name: user.displayName || user.name || agents[existingIndex].name,
      email: user.email || agents[existingIndex].email,
      phone: user.phone || agents[existingIndex].phone,
      vehicleNumber: user.vehicleNumber || agents[existingIndex].vehicleNumber
    };
    saveStoredAgents(agents);
    return agents[existingIndex];
  } else {
    const newAgent = {
      id: agentId,
      name: user.displayName || user.name || 'New Delivery Agent',
      email: user.email || '',
      phone: user.phone || '+91 98401 22334',
      status: 'available',
      vehicleType: user.vehicleType || 'two_wheeler',
      vehicleNumber: user.vehicleNumber || ('TN 37 CB ' + Math.floor(1000 + Math.random() * 9000)),
      zone: user.zone || 'Coimbatore Hub',
      assignedOrdersCount: 0,
      completedToday: 0,
      failedToday: 0,
      codCollectedToday: 0,
      codDepositedToday: 0,
      rating: 5.0,
      currentBatchId: null,
      createdAt: new Date().toISOString()
    };
    agents.unshift(newAgent);
    saveStoredAgents(agents);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, COLLECTIONS.DELIVERY_AGENTS, newAgent.id), {
          ...newAgent,
          createdAt: serverTimestamp()
        });
      } catch (e) {
        console.warn('Firestore auto agent sync failed:', e);
      }
    }
    return newAgent;
  }
};

/**
 * Update delivery agent profile
 */
export const updateDeliveryAgent = async (agentId, updates, user) => {
  const agents = getStoredAgents();
  const index = agents.findIndex(a => a.id === agentId);
  if (index === -1) throw new Error('Delivery agent not found');

  const updated = { ...agents[index], ...updates, updatedAt: new Date().toISOString() };
  agents[index] = updated;
  saveStoredAgents(agents);

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, COLLECTIONS.DELIVERY_AGENTS, agentId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Firestore agent update failed:', err);
    }
  }

  await logActivity(
    user || { id: 'admin', name: 'Delivery Manager' },
    'delivery.agent_update',
    COLLECTIONS.DELIVERY_AGENTS,
    agentId,
    `Updated agent ${updated.name} profile / vehicle details`,
    { updates }
  );

  return updated;
};

/**
 * Update agent status (available / on_delivery / off_duty)
 */
export const setAgentDutyStatus = async (agentId, status, user) => {
  return updateDeliveryAgent(agentId, { status }, user);
};

/**
 * Fetch all delivery batches
 */
export const getAllDeliveryBatches = async () => {
  if (!isFirebaseConfigured) {
    return getStoredBatches();
  }

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.DELIVERY_BATCHES));
    if (snap.empty) {
      const local = getStoredBatches();
      for (const b of local) {
        await setDoc(doc(db, COLLECTIONS.DELIVERY_BATCHES, b.id), {
          ...b,
          createdAt: serverTimestamp()
        });
      }
      return local;
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Firestore batches fetch failed, falling back to local storage:', err);
    return getStoredBatches();
  }
};

/**
 * Capacity validation check for batches
 * Standard capacity rules:
 * - Max orders per batch: 20
 * - Min orders per batch: 1 (recommended 5-20)
 * - Max weight: 50.0 kg for 2-wheelers, 150 kg for cargo autos
 */
export const validateBatchCapacity = (orders, agentVehicle = 'two_wheeler', customMaxOrders = 20, customMaxWeight = 50) => {
  const totalOrders = orders.length;
  const totalWeight = orders.reduce((sum, ord) => sum + (ord.totalWeightKg || (ord.itemCount || 3) * 1.5), 0);
  const totalCod = orders.reduce((sum, ord) => ord.paymentMethod === 'COD' ? sum + Number(ord.totalAmount || 0) : sum, 0);

  const errors = [];
  if (totalOrders > customMaxOrders) {
    errors.push(`Order count (${totalOrders}) exceeds vehicle maximum limit of ${customMaxOrders} orders.`);
  }
  if (totalWeight > customMaxWeight) {
    errors.push(`Total load weight (${totalWeight.toFixed(1)} kg) exceeds capacity of ${customMaxWeight} kg.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    totalOrders,
    totalWeight: Number(totalWeight.toFixed(2)),
    totalCod: Number(totalCod.toFixed(2))
  };
};

/**
 * Create a new delivery batch
 */
export const createDeliveryBatch = async (batchData, user) => {
  const newBatch = {
    ...batchData,
    id: batchData.id || `batch-cbe-${Date.now().toString().slice(-4)}`,
    batchNumber: batchData.batchNumber || `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
    status: batchData.status || 'assigned', // 'draft' | 'assigned' | 'in_transit' | 'completed'
    createdAt: new Date().toISOString(),
    stops: batchData.stops.map((stop, idx) => ({
      ...stop,
      sequenceNumber: idx + 1,
      status: stop.status || 'pending',
      otpVerified: stop.otpVerified || false,
      deliveredAt: stop.deliveredAt || null
    }))
  };

  const batches = getStoredBatches();
  batches.unshift(newBatch);
  saveStoredBatches(batches);

  // If assigned to agent, update agent's active load
  if (newBatch.agentId || newBatch.agentEmail || newBatch.agentName) {
    const agents = getStoredAgents();
    const userEmail = (newBatch.agentEmail || '').trim().toLowerCase();
    const userName = (newBatch.agentName || '').trim().toLowerCase();

    const agIndex = agents.findIndex(a => 
      (newBatch.agentId && a.id === newBatch.agentId) ||
      (a.email && userEmail && a.email.trim().toLowerCase() === userEmail) ||
      (a.name && userName && userName !== 'unassigned rider' && a.name.trim().toLowerCase() === userName)
    );
    if (agIndex !== -1) {
      agents[agIndex].status = 'on_delivery';
      agents[agIndex].currentBatchId = newBatch.id;
      agents[agIndex].assignedOrdersCount = (agents[agIndex].assignedOrdersCount || 0) + newBatch.totalOrders;
      saveStoredAgents(agents);
    }
  }

  // Update order status in order storage so assigned orders are marked out_for_delivery and omitted from future batch creation
  try {
    const rawOrders = localStorage.getItem('grocery_admin_orders_v3');
    if (rawOrders) {
      const ordersList = JSON.parse(rawOrders);
      let updated = false;
      const targetIds = new Set(newBatch.stops.map(s => s.orderId));
      ordersList.forEach(o => {
        if (targetIds.has(o.id) || targetIds.has(o.orderNumber)) {
          o.status = 'out_for_delivery';
          o.deliveryAgentId = newBatch.agentId;
          o.deliveryAgentName = newBatch.agentName;
          updated = true;
        }
      });
      if (updated) {
        localStorage.setItem('grocery_admin_orders_v3', JSON.stringify(ordersList));
      }
    }
  } catch (e) {
    console.error('Error updating order statuses for batch creation:', e);
  }

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.DELIVERY_BATCHES, newBatch.id), {
        ...newBatch,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Firestore batch create failed, saved locally:', err);
    }
  }

  await logActivity(
    user || { id: 'admin', name: 'Delivery Manager' },
    'delivery.batch_create',
    COLLECTIONS.DELIVERY_BATCHES,
    newBatch.id,
    `Created dispatch batch ${newBatch.batchNumber} with ${newBatch.totalOrders} orders for agent ${newBatch.agentName || 'Unassigned'}`,
    { batch: newBatch }
  );

  return newBatch;
};

/**
 * Manually reorder stops in a batch
 */
export const reorderBatchStops = async (batchId, newOrderedStops, user) => {
  const batches = getStoredBatches();
  const idx = batches.findIndex(b => b.id === batchId);
  if (idx === -1) throw new Error('Batch not found');

  const updatedStops = newOrderedStops.map((stop, i) => ({
    ...stop,
    sequenceNumber: i + 1
  }));

  batches[idx].stops = updatedStops;
  batches[idx].updatedAt = new Date().toISOString();
  saveStoredBatches(batches);

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, COLLECTIONS.DELIVERY_BATCHES, batchId), {
        stops: updatedStops,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Firestore stops reorder failed:', err);
    }
  }

  await logActivity(
    user || { id: 'admin', name: 'Delivery Manager' },
    'delivery.route_reorder',
    COLLECTIONS.DELIVERY_BATCHES,
    batchId,
    `Reordered delivery stops sequence for batch ${batches[idx].batchNumber}`
  );

  return batches[idx];
};

/**
 * Delivery Agent Action: Update stop status (reached, delivered, failed)
 */
export const updateStopDeliveryStatus = async (batchId, orderId, { status, failureReason, failureNotes, otpCode, proofPhotoUrl, codCollectedAmount }, user) => {
  const batches = getStoredBatches();
  const bIndex = batches.findIndex(b => b.id === batchId);
  if (bIndex === -1) throw new Error('Batch not found');

  const batch = batches[bIndex];
  const stopIndex = batch.stops.findIndex(s => s.orderId === orderId);
  if (stopIndex === -1) throw new Error('Order stop not found in this batch');

  const stop = batch.stops[stopIndex];
  stop.status = status; // 'pending' | 'reached' | 'delivered' | 'failed'

  if (status === 'delivered') {
    stop.deliveredAt = new Date().toISOString();
    stop.otpVerified = true;
    stop.proofPhotoUrl = proofPhotoUrl || null;
    stop.failureReason = null;
    if (stop.paymentMethod === 'COD') {
      stop.codAmountCollected = codCollectedAmount !== undefined ? codCollectedAmount : stop.codAmount;
      batch.totalCodCollected = (batch.totalCodCollected || 0) + (stop.codAmountCollected || 0);
    }
  } else if (status === 'failed') {
    stop.failedAt = new Date().toISOString();
    stop.failureReason = failureReason || 'Customer unavailable';
    stop.failureNotes = failureNotes || '';
  }

  // Check if all stops in batch are finalized
  const pendingStops = batch.stops.filter(s => s.status === 'pending' || s.status === 'reached');
  if (pendingStops.length === 0) {
    batch.status = 'completed';
    batch.completedAt = new Date().toISOString();
  } else {
    batch.status = 'in_transit';
  }

  batches[bIndex] = batch;
  saveStoredBatches(batches);

  // Update Agent daily counters
  if (batch.agentId) {
    const agents = getStoredAgents();
    const agIndex = agents.findIndex(a => a.id === batch.agentId);
    if (agIndex !== -1) {
      if (status === 'delivered') {
        agents[agIndex].completedToday += 1;
        if (stop.paymentMethod === 'COD') {
          agents[agIndex].codCollectedToday += Number(stop.codAmountCollected || stop.codAmount || 0);
        }
      } else if (status === 'failed') {
        agents[agIndex].failedToday += 1;
      }

      if (batch.status === 'completed') {
        agents[agIndex].status = 'available';
        agents[agIndex].currentBatchId = null;
        agents[agIndex].assignedOrdersCount = Math.max(0, agents[agIndex].assignedOrdersCount - batch.totalOrders);
      }
      saveStoredAgents(agents);
    }
  }

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, COLLECTIONS.DELIVERY_BATCHES, batchId), {
        stops: batch.stops,
        status: batch.status,
        totalCodCollected: batch.totalCodCollected || 0,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Firestore stop status update failed:', err);
    }
  }

  await logActivity(
    user || { id: 'rider', name: 'Delivery Rider' },
    status === 'delivered' ? 'delivery.order_delivered' : 'delivery.order_failed',
    COLLECTIONS.DELIVERY_BATCHES,
    batchId,
    `Order ${orderId} marked as ${status.toUpperCase()}${status === 'failed' ? ` (Reason: ${failureReason})` : ''}`,
    { orderId, status, failureReason, failureNotes }
  );

  return batch;
};

/**
 * Accounts Staff: Reconcile COD cash deposit from delivery agent
 */
export const reconcileAgentCodDeposit = async (agentId, depositAmount, paymentMode = 'Cash', referenceNote = '', user) => {
  const agents = getStoredAgents();
  const agIndex = agents.findIndex(a => a.id === agentId);
  if (agIndex === -1) throw new Error('Agent not found');

  const agent = agents[agIndex];
  const pendingBefore = Math.max(0, (agent.codCollectedToday || 0) - (agent.codDepositedToday || 0));

  agent.codDepositedToday = (agent.codDepositedToday || 0) + Number(depositAmount);
  saveStoredAgents(agents);

  const reconciliationRecord = {
    id: `cod-rec-${Date.now().toString().slice(-4)}`,
    agentId,
    agentName: agent.name,
    amount: Number(depositAmount),
    paymentMode,
    referenceNote,
    reconciledBy: user?.name || 'Accounts Staff',
    reconciledAt: new Date().toISOString(),
    status: 'settled'
  };

  try {
    const rawRecs = localStorage.getItem(COD_STORAGE_KEY) || '[]';
    const recs = JSON.parse(rawRecs);
    recs.unshift(reconciliationRecord);
    localStorage.setItem(COD_STORAGE_KEY, JSON.stringify(recs));
  } catch (e) {
    console.error('Error saving COD record locally', e);
  }

  if (isFirebaseConfigured) {
    try {
      await addDoc(collection(db, COLLECTIONS.COD_COLLECTIONS), {
        ...reconciliationRecord,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, COLLECTIONS.DELIVERY_AGENTS, agentId), {
        codDepositedToday: agent.codDepositedToday,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Firestore COD reconcile failed:', err);
    }
  }

  await logActivity(
    user || { id: 'accounts', name: 'Accounts Staff' },
    'financials.cod_settlement',
    COLLECTIONS.COD_COLLECTIONS,
    reconciliationRecord.id,
    `Settled ₹${depositAmount} COD cash collected by ${agent.name}. Remaining pending: ₹${Math.max(0, agent.codCollectedToday - agent.codDepositedToday)}`,
    { agentId, depositAmount, paymentMode, referenceNote }
  );

  return { agent, record: reconciliationRecord };
};

export const getCodReconciliationHistory = () => {
  try {
    const raw = localStorage.getItem(COD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};
