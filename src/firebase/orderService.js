import { collection, doc, getDocs, getDoc, setDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { COLLECTIONS } from './collections';
import { INITIAL_ORDERS, INITIAL_RETURNS } from '../data/customerAndOrderSeedData';
import { logActivity } from './auditLogger';

const ORDERS_STORAGE_KEY = 'grocery_admin_orders_v3';
const RETURNS_STORAGE_KEY = 'grocery_admin_returns_v3';

const getStoredOrders = () => {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_ORDERS;
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
      localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(INITIAL_RETURNS));
      return INITIAL_RETURNS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_RETURNS;
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
export const getAllOrders = async () => {
  if (!isFirebaseConfigured) {
    return getStoredOrders();
  }

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.ORDERS));
    if (snap.empty) return getStoredOrders();
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (e) {
    return getStoredOrders();
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
  const orders = getStoredOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) throw new Error('Order not found');

  const order = orders[index];
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
    reason: reason || undefined
  };

  order.status = newStatus;
  order.timeline = [...(order.timeline || []), timelineEntry];

  if (newStatus === 'packed') {
    order.packedAt = new Date().toISOString();
    order.packedBy = user?.displayName || 'Packing Staff';
    delete order.deliveryAgentId;
    delete order.deliveryAgentName;
    // Mark all pending items as packed
    order.items = (order.items || []).map((item) => ({ ...item, pickStatus: 'packed' }));
  }

  if (newStatus === 'delivered') {
    order.deliveredAt = new Date().toISOString();
    if (order.paymentMethod === 'COD') {
      order.paymentStatus = 'paid';
      order.codCollected = order.totalAmount;
    }
  }

  saveStoredOrders(orders);

  // Firestore update
  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
        status: newStatus,
        timeline: order.timeline,
        updatedAt: serverTimestamp()
      });
      await addDoc(collection(db, COLLECTIONS.ORDER_STATUS_HISTORY), {
        orderId,
        oldStatus,
        newStatus,
        reason,
        actor: timelineEntry.actor,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error('[Firestore] Order status write failed:', e);
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: `ORDER_STATUS_${newStatus.toUpperCase()}`,
    module: 'Orders',
    targetId: orderId,
    targetType: 'order',
    previousState: { status: oldStatus },
    newState: { status: newStatus },
    reason: reason || `Transitioned order to ${newStatus}`
  });

  return order;
};

/**
 * Update single item pick status in packing workstation
 */
export const updateItemPickStatus = async (orderId, itemId, newPickStatus, user) => {
  const orders = getStoredOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found');

  const item = (order.items || []).find((i) => i.id === itemId);
  if (!item) throw new Error('Item not found in order');

  item.pickStatus = newPickStatus; // 'pending' | 'picked' | 'packed' | 'unavailable' | 'replaced'

  // If all items are packed, advance order status to 'packed' regardless of prior stage
  const allPacked = (order.items || []).every((i) => i.pickStatus === 'packed' || i.pickStatus === 'replaced');
  if (allPacked && order.status !== 'packed' && order.status !== 'out_for_delivery' && order.status !== 'delivered' && order.status !== 'cancelled') {
    order.status = 'packed';
    order.packedAt = new Date().toISOString();
    order.packedBy = user?.displayName || 'Packing Staff';
    order.timeline = order.timeline || [];
    order.timeline.push({
      status: 'packed',
      label: 'All Items Picked & Verified',
      timestamp: new Date().toISOString(),
      actor: user?.displayName || 'Packing Staff'
    });
  }

  saveStoredOrders(orders);
  return order;
};

/**
 * Unavailable Product Workflow:
 * Options: Replace with another variant, Partial fulfillment, Cancel item, or Refund.
 */
export const handleUnavailableProduct = async ({
  orderId,
  itemId,
  action, // 'replace' | 'cancel_item' | 'partial_fulfill'
  replacementVariant = null,
  partialQty = 0,
  reason = '',
  user
}) => {
  const orders = getStoredOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found');

  const itemIndex = (order.items || []).findIndex((i) => i.id === itemId);
  if (itemIndex === -1) throw new Error('Item not found');

  const targetItem = order.items[itemIndex];
  const oldItemTotal = targetItem.totalPrice;

  if (action === 'replace' && replacementVariant) {
    // Replace item with alternative variant/product
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
      actor: user?.displayName || 'Packing Staff',
      reason
    });
  } else if (action === 'cancel_item') {
    // Cancel specific unavailable item
    targetItem.pickStatus = 'unavailable';
    targetItem.totalPrice = 0;
    targetItem.cancellationReason = reason || 'Out of stock during warehouse picking';

    order.timeline.push({
      status: 'item_cancelled',
      label: `Item Cancelled: ${targetItem.productName} (${targetItem.variantName})`,
      timestamp: new Date().toISOString(),
      actor: user?.displayName || 'Packing Staff',
      reason
    });
  } else if (action === 'partial_fulfill') {
    // Pack only available partial quantity
    targetItem.quantity = Math.max(1, Number(partialQty));
    targetItem.totalPrice = targetItem.unitPrice * targetItem.quantity;
    targetItem.pickStatus = 'picked';
    targetItem.partialNote = `Partially packed: ${partialQty} units`;

    order.timeline.push({
      status: 'item_partial',
      label: `Partially Packed: ${targetItem.productName} (${partialQty} units)`,
      timestamp: new Date().toISOString(),
      actor: user?.displayName || 'Packing Staff',
      reason
    });
  }

  // Recalculate order subtotal and total
  const newSubtotal = order.items.reduce((acc, i) => acc + (i.pickStatus !== 'unavailable' ? i.totalPrice : 0), 0);
  order.subtotal = newSubtotal;
  order.gstAmount = Math.round(newSubtotal * 0.05);
  order.totalAmount = Math.max(0, newSubtotal + order.gstAmount + (order.deliveryFee || 0) - (order.discountAmount || 0));

  saveStoredOrders(orders);

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: `UNAVAILABLE_ITEM_${action.toUpperCase()}`,
    module: 'Orders',
    targetId: `${orderId}/${itemId}`,
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

