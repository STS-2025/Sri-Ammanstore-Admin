import { collection, doc, getDocs, getDoc, setDoc, updateDoc, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { COLLECTIONS } from './collections';
import { INITIAL_ORDERS, INITIAL_RETURNS } from '../data/customerAndOrderSeedData';
import { logActivity } from './auditLogger';

const ORDERS_STORAGE_KEY = 'grocery_admin_orders_v3';
const RETURNS_STORAGE_KEY = 'grocery_admin_returns_v3';

export const normalizeOrder = (data) => {
  if (!data) return data;

  const orderNumber = data.orderNumber || data.orderId || data.id || 'ORD-000000';

  const customerName = (
    data.customerName ||
    data.userProfile?.fullName ||
    data.userProfile?.name ||
    data.address?.fullName ||
    data.address?.name ||
    data.address?.recipientName ||
    'Customer'
  );

  const customerPhone = (
    data.customerPhone ||
    data.verifiedPhoneNumber ||
    data.userProfile?.number ||
    data.userProfile?.phone ||
    data.address?.mobile ||
    data.address?.phone ||
    data.address?.mobileNumber ||
    ''
  );

  const rawAddr = data.deliveryAddress || data.address || {};
  const deliveryAddress = {
    addressLine: rawAddr.addressLine || [rawAddr.flatNo, rawAddr.street, rawAddr.addressLine1, rawAddr.addressLine2].filter(Boolean).join(', ') || rawAddr.address || 'Standard Delivery Address',
    landmark: rawAddr.landmark || '',
    locality: rawAddr.locality || rawAddr.city || rawAddr.district || 'Tuticorin',
    pincode: rawAddr.pincode || rawAddr.zipCode || rawAddr.pinCode || '628002'
  };

  const rawItems = data.items || data.cartItems || [];
  const items = rawItems.map((item, idx) => {
    const productName = item.productName || item.name || item.title || 'Grocery Item';
    const variantName = item.variantName || item.packSize || item.weight || item.unit || '';
    const unitPrice = Number(item.unitPrice || item.price || item.sellingPrice || 0);
    const quantity = Number(item.quantity || item.qty || 1);
    const totalPrice = Number(item.totalPrice || (unitPrice * quantity) || 0);
    const pickStatus = item.pickStatus || 'pending';
    const sku = item.sku || `SKU-${idx + 1}`;

    return {
      ...item,
      id: item.id || `item-${idx}`,
      productName,
      variantName,
      unitPrice,
      quantity,
      totalPrice,
      pickStatus,
      sku
    };
  });

  const itemsCount = typeof data.itemsCount !== 'undefined' ? data.itemsCount : items.length;

  const subtotal = Number(data.subtotal || 0);
  const deliveryFee = Number(data.deliveryFee || data.deliveryCharge || 0);
  const totalAmount = Number(typeof data.totalAmount !== 'undefined' ? data.totalAmount : (typeof data.total !== 'undefined' ? data.total : (subtotal + deliveryFee)));
  const paymentMethod = (data.paymentMethod || 'COD').toUpperCase();
  const paymentStatus = data.paymentStatus || 'pending';
  const status = data.status || 'Pending';

  const deliverySlot = data.deliverySlot || (data.deliveryMethod === 'express' ? 'Express 60 min' : 'Standard 24 hrs');
  const distanceKm = data.distanceKm || '2.5';
  const createdAt = typeof data.createdAt?.toDate === 'function'
    ? data.createdAt.toDate().toISOString()
    : data.createdAt instanceof Date
      ? data.createdAt.toISOString()
      : data.createdAt;

  return {
    ...data,
    createdAt,
    orderNumber,
    customerName,
    customerPhone,
    deliveryAddress,
    items,
    itemsCount,
    subtotal,
    deliveryFee,
    totalAmount,
    total: totalAmount,
    paymentMethod,
    paymentStatus,
    status,
    deliverySlot,
    distanceKm
  };
};

const getStoredOrders = () => {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeOrder) : [];
  } catch (e) {
    return [];
  }
};

const saveStoredOrders = (orders) => {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error('Failed to store orders locally', e);
  }
};

const getStoredReturns = () => {
  try {
    const raw = localStorage.getItem(RETURNS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

const saveStoredReturns = (ret) => {
  try {
    localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(ret));
  } catch (e) {
    console.error('Failed to store returns locally', e);
  }
};

/**
 * Fetch all grocery orders
 */
export const getAllOrders = async ({ manualOnly = false } = {}) => {
  if (!isFirebaseConfigured) {
    const stored = getStoredOrders();
    return manualOnly ? stored.filter((order) => order.orderSource === 'manual') : stored;
  }

  try {
    const ordersRef = collection(db, COLLECTIONS.ORDERS);
    const orderQuery = manualOnly ? query(ordersRef, where('orderSource', '==', 'manual')) : ordersRef;
    const snap = await getDocs(orderQuery);
    if (snap.empty) return [];
    const list = [];
    snap.forEach((d) => list.push(normalizeOrder({ id: d.id, ...d.data() })));
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (e) {
    const stored = getStoredOrders();
    return manualOnly ? stored.filter((order) => order.orderSource === 'manual') : stored;
  }
};

/**
 * Fetch order by ID
 */
export const getOrderById = async (id) => {
  const orders = await getAllOrders();
  return orders.find((o) => o.id === id || o.orderNumber === id) || null;
};

/**
 * Transition Order Status and record immutable Timeline & History
 */
export const updateOrderStatus = async (orderId, newStatus, reason = '', user) => {
  const orders = await getAllOrders();
  const index = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId || o.orderId === orderId);
  if (index === -1) throw new Error(`Order ${orderId} not found`);

  const order = { ...orders[index] };
  const targetDocId = order.id || orderId;
  const oldStatus = order.status;

  const STATUS_LABELS = {
    confirmed: 'Order Confirmed by Store',
    picking: 'Picking In Progress',
    packed: 'Order Packed & Label Printed',
    ready: 'Ready at Dispatch Bay',
    out_for_delivery: 'Out for Delivery with Fleet Rider',
    delivered: 'Delivered to Customer Doorstep',
    cancelled: 'Order Cancelled',
    returned: 'Order Returned'
  };

  const timelineEntry = {
    status: newStatus,
    label: STATUS_LABELS[newStatus] || `Status updated to ${newStatus}`,
    timestamp: new Date().toISOString(),
    actor: user?.displayName || user?.email || 'Operations Staff',
    ...(reason ? { reason } : {})
  };

  order.status = newStatus;
  order.timeline = [...(order.timeline || []), timelineEntry];

  if (newStatus === 'packed') {
    order.packedAt = new Date().toISOString();
    order.packedBy = user?.displayName || user?.email || 'Packing Staff';
    delete order.deliveryAgentId;
    delete order.deliveryAgentName;
    order.items = (order.items || []).map((item) => ({ ...item, pickStatus: 'packed' }));
  }

  if (newStatus === 'delivered') {
    order.deliveredAt = new Date().toISOString();
    if (order.paymentMethod === 'COD') {
      order.paymentStatus = 'paid';
      order.codCollected = order.totalAmount;
    }
  }

  // Firestore update
  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.ORDERS, targetDocId), {
        ...order,
        status: newStatus,
        timeline: order.timeline,
        updatedAt: serverTimestamp()
      }, { merge: true });

      await addDoc(collection(db, COLLECTIONS.ORDER_STATUS_HISTORY), {
        orderId: targetDocId,
        oldStatus,
        newStatus,
        reason,
        actor: timelineEntry.actor,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error('[Firestore] Order status write failed:', e);
      throw e;
    }
  }

  // Update the local cache only after the remote write succeeds.
  const stored = getStoredOrders();
  const sIdx = stored.findIndex((o) => o.id === targetDocId || o.orderNumber === order.orderNumber);
  if (sIdx !== -1) { stored[sIdx] = order; } else { stored.unshift(order); }
  saveStoredOrders(stored);

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: `ORDER_STATUS_${newStatus.toUpperCase()}`,
    module: 'Orders',
    targetId: targetDocId,
    targetType: 'order',
    previousState: { status: oldStatus },
    newState: { status: newStatus },
    reason: reason || `Transitioned order to ${newStatus}`
  });

  return order;
};

export const updateManualOrderPaymentStatus = async (orderId, paymentStatus, user) => {
  const normalizedStatus = String(paymentStatus || '').toLowerCase();
  if (!['paid', 'unpaid'].includes(normalizedStatus)) {
    throw new Error('Manual order payment status must be paid or unpaid.');
  }

  const orders = await getAllOrders({ manualOnly: true });
  const order = orders.find(
    (item) =>
      item.orderSource === 'manual' &&
      (item.id === orderId || item.orderNumber === orderId || item.orderId === orderId)
  );
  if (!order) throw new Error(`Manual order ${orderId} not found`);

  const targetDocId = order.id || orderId;
  const totalAmount = Number(order.totalAmount ?? order.total ?? 0);
  const updatedOrder = {
    ...order,
    paymentStatus: normalizedStatus,
    amountPaid: normalizedStatus === 'paid' ? totalAmount : 0,
    balanceDue: normalizedStatus === 'paid' ? 0 : totalAmount,
    updatedAt: new Date().toISOString()
  };

  if (isFirebaseConfigured) {
    await setDoc(
      doc(db, COLLECTIONS.ORDERS, targetDocId),
      {
        paymentStatus: updatedOrder.paymentStatus,
        amountPaid: updatedOrder.amountPaid,
        balanceDue: updatedOrder.balanceDue,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  const stored = getStoredOrders();
  const storedIndex = stored.findIndex(
    (item) => item.id === targetDocId || item.orderNumber === order.orderNumber
  );
  if (storedIndex !== -1) {
    stored[storedIndex] = updatedOrder;
    saveStoredOrders(stored);
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: `MANUAL_ORDER_PAYMENT_${normalizedStatus.toUpperCase()}`,
    module: 'Manual Orders',
    targetId: targetDocId,
    targetType: 'order',
    previousState: { paymentStatus: order.paymentStatus },
    newState: { paymentStatus: normalizedStatus },
    reason: `Manual order payment marked ${normalizedStatus}`
  });

  return updatedOrder;
};

/**
 * Update single item pick status in packing workstation
 */
export const updateItemPickStatus = async (orderId, itemId, newPickStatus, user) => {
  const orders = await getAllOrders();
  const index = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId || o.orderId === orderId);
  if (index === -1) throw new Error(`Order ${orderId} not found`);

  const order = { ...orders[index] };
  const targetDocId = order.id || orderId;

  const rawItems = Array.isArray(order.items) && order.items.length > 0 ? order.items : (Array.isArray(order.cartItems) ? order.cartItems : []);
  const items = rawItems.map((i, idx) => ({
    ...i,
    id: i.id || `item-${idx}`,
    productName: i.productName || i.name || 'Grocery Item',
    variantName: i.variantName || i.packSize || '',
    unitPrice: Number(i.unitPrice || i.price || 0),
    quantity: Number(i.quantity || i.qty || 1),
    totalPrice: Number(i.totalPrice || (i.price || 0) * (i.quantity || 1)),
    pickStatus: i.pickStatus || 'pending',
    sku: i.sku || `SKU-${idx + 1}`,
    barcode: i.barcode || ''
  }));

  let itemIndex = items.findIndex((i, idx) => i.id === itemId || i.sku === itemId || `item-${idx}` === itemId || String(idx) === String(itemId) || i.productName === itemId);
  if (itemIndex === -1 && items.length > 0) {
    itemIndex = 0; // Fallback to first item if single item order
  }

  if (itemIndex === -1) throw new Error('Item not found in order');

  items[itemIndex] = {
    ...items[itemIndex],
    pickStatus: newPickStatus
  };

  order.items = items;

  // If all items are packed, advance order status to 'packed'
  const allPacked = items.every((i) => i.pickStatus === 'packed' || i.pickStatus === 'replaced');
  if (allPacked && order.status !== 'packed' && order.status !== 'out_for_delivery' && order.status !== 'delivered' && order.status !== 'cancelled') {
    order.status = 'packed';
    order.packedAt = new Date().toISOString();
    order.packedBy = user?.displayName || user?.email || 'Packing Staff';
    order.timeline = order.timeline || [];
    order.timeline.push({
      status: 'packed',
      label: 'All Items Picked & Verified',
      timestamp: new Date().toISOString(),
      actor: user?.displayName || user?.email || 'Packing Staff'
    });
  }

  // Update LocalStorage
  const stored = getStoredOrders();
  const sIdx = stored.findIndex((o) => o.id === targetDocId || o.orderNumber === order.orderNumber);
  if (sIdx !== -1) { stored[sIdx] = order; } else { stored.unshift(order); }
  saveStoredOrders(stored);

  // Update Firestore
  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.ORDERS, targetDocId), {
        ...order,
        items,
        status: order.status,
        packedAt: order.packedAt || null,
        packedBy: order.packedBy || null,
        timeline: order.timeline || [],
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('[Firestore] updateItemPickStatus setDoc failed:', e);
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: `ORDER_ITEM_PICK_${newPickStatus.toUpperCase()}`,
    module: 'Orders',
    targetId: `${targetDocId}/${itemId}`,
    targetType: 'order_item',
    reason: `Marked item pickStatus as ${newPickStatus}`
  });

  return order;
};

/**
 * Unavailable Product Workflow:
 * Options: Replace with another variant, Partial fulfillment, Cancel item, or Refund.
 */
export const handleUnavailableProduct = async ({
  orderId,
  itemId,
  action,
  replacementVariant = null,
  partialQty = 0,
  reason = '',
  user
}) => {
  const orders = await getAllOrders();
  const index = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId || o.orderId === orderId);
  if (index === -1) throw new Error(`Order ${orderId} not found`);

  const order = { ...orders[index] };
  const targetDocId = order.id || orderId;

  const rawItems = Array.isArray(order.items) && order.items.length > 0 ? order.items : (Array.isArray(order.cartItems) ? order.cartItems : []);
  const items = rawItems.map((i, idx) => ({
    ...i,
    id: i.id || `item-${idx}`,
    productName: i.productName || i.name || 'Grocery Item',
    variantName: i.variantName || i.packSize || '',
    unitPrice: Number(i.unitPrice || i.price || 0),
    quantity: Number(i.quantity || i.qty || 1),
    totalPrice: Number(i.totalPrice || (i.price || 0) * (i.quantity || 1)),
    pickStatus: i.pickStatus || 'pending',
    sku: i.sku || `SKU-${idx + 1}`,
    barcode: i.barcode || ''
  }));

  let itemIndex = items.findIndex((i, idx) => i.id === itemId || i.sku === itemId || `item-${idx}` === itemId || String(idx) === String(itemId));
  if (itemIndex === -1 && items.length > 0) itemIndex = 0;
  if (itemIndex === -1) throw new Error('Item not found in order');

  const targetItem = items[itemIndex];
  const oldItemTotal = targetItem.totalPrice;

  order.timeline = order.timeline || [];

  if (action === 'replace' && replacementVariant) {
    targetItem.productName = replacementVariant.productName;
    targetItem.variantName = replacementVariant.variantName;
    targetItem.sku = replacementVariant.sku;
    targetItem.barcode = replacementVariant.barcode;
    targetItem.unitPrice = replacementVariant.sellingPrice;
    targetItem.totalPrice = replacementVariant.sellingPrice * targetItem.quantity;
    targetItem.pickStatus = 'replaced';
    targetItem.replacementNote = `Replaced with ${replacementVariant.productName} (${replacementVariant.variantName})`;

    order.timeline.push({
      status: 'item_replaced',
      label: `Item Replaced: ${targetItem.productName}`,
      timestamp: new Date().toISOString(),
      actor: user?.displayName || user?.email || 'Packing Staff',
      reason
    });
  } else if (action === 'cancel_item') {
    targetItem.pickStatus = 'unavailable';
    targetItem.totalPrice = 0;
    targetItem.cancellationReason = reason || 'Out of stock during warehouse picking';

    order.timeline.push({
      status: 'item_cancelled',
      label: `Item Cancelled: ${targetItem.productName} (${targetItem.variantName})`,
      timestamp: new Date().toISOString(),
      actor: user?.displayName || user?.email || 'Packing Staff',
      reason
    });
  } else if (action === 'partial_fulfill') {
    targetItem.quantity = Math.max(1, Number(partialQty));
    targetItem.totalPrice = targetItem.unitPrice * targetItem.quantity;
    targetItem.pickStatus = 'picked';
    targetItem.partialNote = `Partially packed: ${partialQty} units`;

    order.timeline.push({
      status: 'item_partial',
      label: `Partially Packed: ${targetItem.productName} (${partialQty} units)`,
      timestamp: new Date().toISOString(),
      actor: user?.displayName || user?.email || 'Packing Staff',
      reason
    });
  }

  order.items = items;
  const newSubtotal = items.reduce((acc, i) => acc + (i.pickStatus !== 'unavailable' ? i.totalPrice : 0), 0);
  order.subtotal = newSubtotal;
  order.gstAmount = Math.round(newSubtotal * 0.05);
  order.totalAmount = Math.max(0, newSubtotal + order.gstAmount + (order.deliveryFee || 0) - (order.discountAmount || 0));

  // Local Storage update
  const stored = getStoredOrders();
  const sIdx = stored.findIndex((o) => o.id === targetDocId || o.orderNumber === order.orderNumber);
  if (sIdx !== -1) { stored[sIdx] = order; } else { stored.unshift(order); }
  saveStoredOrders(stored);

  // Firestore update
  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.ORDERS, targetDocId), {
        ...order,
        items,
        subtotal: order.subtotal,
        gstAmount: order.gstAmount,
        totalAmount: order.totalAmount,
        timeline: order.timeline,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('[Firestore] handleUnavailableProduct setDoc failed:', e);
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: `UNAVAILABLE_ITEM_${action.toUpperCase()}`,
    module: 'Orders',
    targetId: `${targetDocId}/${itemId}`,
    targetType: 'order_item',
    previousState: { itemTotal: oldItemTotal },
    newState: { action, newTotal: order.totalAmount },
    reason: reason || `Processed unavailable item workflow: ${action}`
  });

  return order;
};

/**
 * Returns & Refunds Management
 */
export const getAllReturns = async () => {
  return getStoredReturns();
};

export const processRefund = async ({ returnId, orderId, refundAmount, refundMethod, reason, user }) => {
  if (!reason || !reason.trim()) {
    throw new Error('Mandatory audit reason required for financial refund approval.');
  }

  const returns = getStoredReturns();
  const ret = returns.find((r) => r.id === returnId);
  if (ret) {
    ret.status = 'refunded';
    ret.refundedAt = new Date().toISOString();
    ret.refundMethod = refundMethod;
    saveStoredReturns(returns);
  }

  // Update order status if applicable
  const orders = getStoredOrders();
  const order = orders.find((o) => o.id === orderId);
  if (order) {
    order.status = 'refunded';
    order.paymentStatus = 'refunded';
    order.timeline.push({
      status: 'refunded',
      label: `Refund of ${refundAmount} Processed via ${refundMethod}`,
      timestamp: new Date().toISOString(),
      actor: user?.displayName || 'Accounts Staff',
      reason
    });
    saveStoredOrders(orders);
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'PROCESS_FINANCIAL_REFUND',
    module: 'Financials & Refunds',
    targetId: returnId || orderId,
    targetType: 'refund',
    reason,
    metadata: { refundAmount, refundMethod, orderId }
  });

  return { success: true, refundAmount };
};

/**
 * Create a new Packed Demo Order for testing Delivery Manager dispatch workflow
 */
export const createDemoOrder = async (user) => {
  const orders = getStoredOrders();
  const nextNum = 9840 + orders.length + 1;
  const newOrderNumber = `ORD-${nextNum}`;
  const newId = `ord-demo-${Date.now()}`;

  const newOrder = {
    id: newId,
    orderNumber: newOrderNumber,
    customerName: 'Aravind Swamy',
    customerPhone: '+91 98765 43210',
    deliveryAddress: {
      locality: 'Gandhipuram',
      addressLine: 'Door 45, Cross Cut Road, Gandhipuram, Coimbatore - 641012'
    },
    deliverySlot: 'Morning (08:00 AM - 11:00 AM)',
    distanceKm: '3.5',
    priority: 'Normal',
    itemsCount: 2,
    status: 'packed',
    paymentMethod: 'COD',
    paymentStatus: 'pending',
    subtotal: 450,
    gstAmount: 23,
    deliveryFee: 30,
    discountAmount: 0,
    totalAmount: 503,
    createdAt: new Date().toISOString(),
    packedAt: new Date().toISOString(),
    packedBy: user?.displayName || 'Packing Staff',
    items: [
      {
        id: `item-${Date.now()}-1`,
        productName: 'Sri Amman Parboiled Rice',
        variantName: '5 kg',
        sku: 'RICE-PAR-05',
        quantity: 1,
        unitPrice: 350,
        totalPrice: 350,
        pickStatus: 'packed'
      },
      {
        id: `item-${Date.now()}-2`,
        productName: 'Aachi Turmeric Powder',
        variantName: '100g',
        sku: 'SPICE-TUR-100',
        quantity: 2,
        unitPrice: 50,
        totalPrice: 100,
        pickStatus: 'packed'
      }
    ],
    timeline: [
      {
        status: 'confirmed',
        label: 'Order Confirmed by Store',
        timestamp: new Date().toISOString(),
        actor: 'Customer Web App'
      },
      {
        status: 'packed',
        label: 'Order Packed & Label Printed',
        timestamp: new Date().toISOString(),
        actor: user?.displayName || 'Packing Staff'
      }
    ]
  };

  orders.unshift(newOrder);
  saveStoredOrders(orders);

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.ORDERS, newId), newOrder);
    } catch (e) {
      console.error('[Firestore] createDemoOrder setDoc error:', e);
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'CREATE_DEMO_PACKED_ORDER',
    module: 'Orders',
    targetId: newId,
    targetType: 'order',
    reason: 'Created demo packed order for delivery dispatch testing'
  });

  return newOrder;
};

/**
 * Delete a specific order
 */
export const deleteOrder = async (orderId, user) => {
  const orders = getStoredOrders();
  const existing = orders.find(o => o.id === orderId || o.orderNumber === orderId);
  const targetId = existing?.id || orderId;
  const filtered = orders.filter(o => o.id !== targetId && o.orderNumber !== orderId);
  saveStoredOrders(filtered);

  if (isFirebaseConfigured) {
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, COLLECTIONS.ORDERS, targetId));
    } catch (e) {
      console.warn('Firestore delete order failed:', e);
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'DELETE_ORDER',
    module: 'Orders',
    targetId,
    targetType: 'order',
    reason: `Deleted order ${existing?.orderNumber || orderId}`
  });

  return true;
};

/**
 * Reset order sequence counter to 0 for live launch
 */
export const resetOrderSequenceCounter = async () => {
  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'meta', 'orderSequence'), { current: 0 }, { merge: true });
      console.log('[Firestore] Reset order sequence counter to 0');
    } catch (e) {
      console.warn('[Firestore] Reset order sequence failed:', e);
    }
  }
};

/**
 * Clear all test orders and reset sequence counter to 0
 */
export const clearAllOrdersAndResetSequence = async (user) => {
  localStorage.removeItem(ORDERS_STORAGE_KEY);

  if (isFirebaseConfigured) {
    try {
      const { deleteDoc, doc, getDocs, collection, setDoc } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, COLLECTIONS.ORDERS));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, COLLECTIONS.ORDERS, d.id));
      }
      await setDoc(doc(db, 'meta', 'orderSequence'), { current: 0 }, { merge: true });
    } catch (e) {
      console.warn('[Firestore] Clear all orders and reset failed:', e);
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'CLEAR_ALL_TEST_ORDERS',
    module: 'Orders',
    reason: 'Cleared all test orders and reset order sequence counter to 0 for production launch'
  });

  return true;
};
// Delete a manual order from the source of truth first. A Firestore failure must
// not be swallowed, otherwise the order reappears after the next refresh.
export const deleteManualOrder = async (orderId, user) => {
  const orders = await getAllOrders({ manualOnly: true });
  const existing = orders.find((order) =>
    order.id === orderId || order.orderNumber === orderId || order.orderId === orderId
  );
  if (!existing) throw new Error(`Manual order ${orderId} not found.`);

  const targetId = existing.id || orderId;
  if (isFirebaseConfigured) {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, COLLECTIONS.ORDERS, targetId));
  }

  const storedOrders = getStoredOrders().filter((order) =>
    order.id !== targetId && order.orderNumber !== existing.orderNumber
  );
  saveStoredOrders(storedOrders);

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'DELETE_MANUAL_ORDER',
    module: 'Manual Orders',
    targetId,
    targetType: 'order',
    previousState: existing,
    reason: `Deleted manual order ${existing.orderNumber || targetId}`
  });
  return true;
};
