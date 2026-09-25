import { collection, doc, getDocs, getDoc, setDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { COLLECTIONS } from './collections';
import { INITIAL_CUSTOMERS, INITIAL_SMART_COIN_LOGS } from '../data/customerAndOrderSeedData';
import { logActivity } from './auditLogger';

const CUSTOMERS_STORAGE_KEY = 'grocery_admin_customers_v3';
const COINS_STORAGE_KEY = 'grocery_admin_smart_coins_v3';

const getStoredCustomers = () => {
  try {
    const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(INITIAL_CUSTOMERS));
      return INITIAL_CUSTOMERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_CUSTOMERS;
  }
};

const saveStoredCustomers = (custs) => {
  try {
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(custs));
  } catch (e) {
    console.error('Error storing customers locally', e);
  }
};

const getStoredCoinLogs = () => {
  try {
    const raw = localStorage.getItem(COINS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(INITIAL_SMART_COIN_LOGS));
      return INITIAL_SMART_COIN_LOGS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_SMART_COIN_LOGS;
  }
};

const saveStoredCoinLogs = (logs) => {
  try {
    localStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Error storing coin logs locally', e);
  }
};

/**
 * Fetch all customers
 */
export const getAllCustomers = async () => {
  if (!isFirebaseConfigured) {
    return getStoredCustomers();
  }

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.CUSTOMERS));
    if (snap.empty) return getStoredCustomers();
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (e) {
    return getStoredCustomers();
  }
};

/**
 * Fetch customer by ID
 */
export const getCustomerById = async (id) => {
  const custs = await getAllCustomers();
  return custs.find((c) => c.id === id) || null;
};

/**
 * Block / Unblock customer with High-Risk Audit Logging
 */
export const setCustomerStatus = async (customerId, newStatus, reason, user) => {
  const custs = getStoredCustomers();
  const index = custs.findIndex((c) => c.id === customerId);
  if (index === -1) throw new Error('Customer not found');

  const oldStatus = custs[index].status;
  custs[index].status = newStatus;
  saveStoredCustomers(custs);

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, COLLECTIONS.CUSTOMERS, customerId), {
        status: newStatus,
        statusReason: reason || '',
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('[Firestore] Customer status update failed:', e);
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: `CUSTOMER_STATUS_${newStatus.toUpperCase()}`,
    module: 'Customers',
    targetId: customerId,
    targetType: 'customer',
    previousState: { status: oldStatus },
    newState: { status: newStatus },
    reason: reason || `Updated customer account status to ${newStatus}`
  });

  return custs[index];
};

/**
 * Modify Customer Smart Coins Balance (Mandatory Reason Required!)
 */
export const adjustSmartCoins = async ({ customerId, deltaCoins, reason, user }) => {
  if (!reason || !reason.trim()) {
    throw new Error('Mandatory business reason required for Smart Coin modification.');
  }

  const custs = getStoredCustomers();
  const index = custs.findIndex((c) => c.id === customerId);
  if (index === -1) throw new Error('Customer not found');

  const customer = custs[index];
  const oldBalance = Number(customer.smartCoins || 0);
  const newBalance = Math.max(0, oldBalance + Number(deltaCoins));

  customer.smartCoins = newBalance;
  saveStoredCustomers(custs);

  // Write to Smart Coin Transaction Ledger
  const newLog = {
    id: `sct-${Date.now().toString(36)}`,
    customerId,
    customerName: customer.name,
    deltaCoins: Number(deltaCoins),
    balanceAfter: newBalance,
    type: Number(deltaCoins) > 0 ? 'CREDIT' : 'DEBIT',
    reason: reason.trim(),
    staffName: user?.displayName || user?.email || 'Operations Admin',
    timestamp: new Date().toISOString()
  };

  const coinLogs = getStoredCoinLogs();
  coinLogs.unshift(newLog);
  saveStoredCoinLogs(coinLogs);

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, COLLECTIONS.CUSTOMERS, customerId), {
        smartCoins: newBalance
      });
      await addDoc(collection(db, COLLECTIONS.SMART_COIN_TRANSACTIONS), {
        ...newLog,
        serverTimestamp: serverTimestamp()
      });
    } catch (e) {
      console.error('[Firestore] Smart coin write failed:', e);
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'MODIFY_SMART_COINS',
    module: 'Smart Coins',
    targetId: customerId,
    targetType: 'customer_coins',
    previousState: { balance: oldBalance },
    newState: { balance: newBalance, delta: deltaCoins },
    reason
  });

  return { customer, log: newLog };
};

/**
 * Get Smart Coin Transaction Ledger for a customer or storewide
 */
export const getSmartCoinTransactions = async (customerId = null) => {
  const logs = getStoredCoinLogs();
  if (customerId) {
    return logs.filter((l) => l.customerId === customerId);
  }
  return logs;
};

/**
 * Identify Birthday Customers: Today, This Week, This Month
 */
export const getBirthdayCustomers = async () => {
  const custs = await getAllCustomers();
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentDay = today.getDate();

  const todayList = [];
  const thisWeekList = [];
  const thisMonthList = [];

  custs.forEach((c) => {
    if (!c.dob) return;
    const dob = new Date(c.dob);
    if (isNaN(dob.getTime())) return;

    const bMonth = dob.getMonth() + 1;
    const bDay = dob.getDate();

    if (bMonth === currentMonth) {
      thisMonthList.push(c);

      if (bDay === currentDay) {
        todayList.push(c);
      }

      const diffDays = bDay - currentDay;
      if (diffDays >= 0 && diffDays <= 7) {
        thisWeekList.push(c);
      }
    }
  });

  return { todayList, thisWeekList, thisMonthList };
};

/**
 * Customer Analytics & Segmentation
 */
export const getCustomerAnalytics = async () => {
  const custs = await getAllCustomers();

  const top100 = [...custs].sort((a, b) => (b.totalSpending || 0) - (a.totalSpending || 0)).slice(0, 100);
  const frequent = [...custs].sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0)).slice(0, 50);
  const newCustomers = [...custs].sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate)).slice(0, 20);
  const blocked = custs.filter((c) => c.status === 'Blocked');
  const highCancellation = custs.filter((c) => (c.cancelledOrders || 0) >= 2);
  const vipCustomers = custs.filter((c) => c.status === 'VIP');

  return {
    totalCustomers: custs.length,
    top100,
    frequent,
    newCustomers,
    blocked,
    highCancellation,
    vipCustomers
  };
};

/**
 * Update Support Team Notes for a customer
 */
export const updateCustomerNotes = async (customerId, notes, user) => {
  const custs = getStoredCustomers();
  const index = custs.findIndex((c) => c.id === customerId);
  if (index === -1) throw new Error('Customer not found');

  custs[index].notes = notes;
  saveStoredCustomers(custs);

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, COLLECTIONS.CUSTOMERS, customerId), {
        notes,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('[Firestore] Customer notes update failed:', e);
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'UPDATE_CUSTOMER_NOTES',
    module: 'Customers',
    targetId: customerId,
    targetType: 'customer',
    newState: { notes },
    reason: 'Updated support team notes'
  });

  return custs[index];
};
