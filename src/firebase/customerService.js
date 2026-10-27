import {
  collection,
  doc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  limit,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
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
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
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
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
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
    if (snap.empty) return [];
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (e) {
    return getStoredCustomers();
  }
};

/** Fetch customer accounts created through the online store. */
export const getAllOnlineCustomers = async () => {
  if (!isFirebaseConfigured) return [];
  const snap = await getDocs(collection(db, COLLECTIONS.ONLINE_CUSTOMERS));
  return snap.docs.map((customerDoc) => ({ id: customerDoc.id, ...customerDoc.data() }));
};

/**
 * Fetch customer by ID
 */
export const getCustomerById = async (id) => {
  const custs = await getAllCustomers();
  return custs.find((c) => c.id === id) || null;
};

export const updateCustomerProfile = async (customerId, updates, user, collectionName = COLLECTIONS.CUSTOMERS) => {
  const customers = collectionName === COLLECTIONS.CUSTOMERS ? getStoredCustomers() : await getAllOnlineCustomers();
  const index = customers.findIndex((customer) => customer.id === customerId);
  const existingCustomer = index >= 0 ? customers[index] : {};
  const updatedCustomer = { ...existingCustomer, ...updates, updatedAt: new Date().toISOString() };

  if (isFirebaseConfigured) {
    await updateDoc(doc(db, collectionName, customerId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } else if (index < 0) {
    throw new Error('Customer not found');
  }

  if (index >= 0) {
    customers[index] = updatedCustomer;
  } else {
    customers.push({ id: customerId, ...updatedCustomer });
  }
  if (collectionName === COLLECTIONS.CUSTOMERS) saveStoredCustomers(customers);

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'UPDATE_CUSTOMER_PROFILE',
    module: 'Customers',
    targetId: customerId,
    targetType: 'customer',
    newState: updates,
    reason: 'Updated customer profile from Manual Customers'
  });

  return updatedCustomer;
};

export const deleteCustomerProfile = async (customerId, user, collectionName = COLLECTIONS.CUSTOMERS) => {
  const customers = collectionName === COLLECTIONS.CUSTOMERS ? getStoredCustomers() : await getAllOnlineCustomers();
  const customer = customers.find((entry) => entry.id === customerId);
  if (!customer && !isFirebaseConfigured) {
    throw new Error('Customer not found');
  }

  if (isFirebaseConfigured) {
    await deleteDoc(doc(db, collectionName, customerId));
  }

  if (collectionName === COLLECTIONS.CUSTOMERS) saveStoredCustomers(customers.filter((entry) => entry.id !== customerId));

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'DELETE_CUSTOMER',
    module: 'Customers',
    targetId: customerId,
    targetType: 'customer',
    previousState: customer || { id: customerId },
    reason: 'Deleted customer profile from Manual Customers'
  });
};

/**
 * Block / Unblock customer with High-Risk Audit Logging
 */
export const setCustomerStatus = async (customerId, newStatus, reason, user, collectionName = COLLECTIONS.CUSTOMERS) => {
  const custs = collectionName === COLLECTIONS.CUSTOMERS ? getStoredCustomers() : await getAllOnlineCustomers();
  const index = custs.findIndex((c) => c.id === customerId);
  if (index === -1) throw new Error('Customer not found');

  const oldStatus = custs[index].status;
  custs[index].status = newStatus;
  if (collectionName === COLLECTIONS.CUSTOMERS) saveStoredCustomers(custs);

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, collectionName, customerId), {
        status: newStatus,
        statusReason: reason || '',
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('[Firestore] Customer status update failed:', e);
      throw e;
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
export const adjustSmartCoins = async ({ customerId, deltaCoins, reason, user, collectionName = COLLECTIONS.CUSTOMERS }) => {
  if (!reason || !reason.trim()) {
    throw new Error('Mandatory business reason required for Smart Coin modification.');
  }

  const custs = collectionName === COLLECTIONS.CUSTOMERS ? getStoredCustomers() : await getAllOnlineCustomers();
  const index = custs.findIndex((c) => c.id === customerId);
  if (index === -1) throw new Error('Customer not found');

  const customer = custs[index];
  const oldBalance = Number(customer.smartCoins || 0);
  const newBalance = Math.max(0, oldBalance + Number(deltaCoins));

  customer.smartCoins = newBalance;
  if (collectionName === COLLECTIONS.CUSTOMERS) saveStoredCustomers(custs);

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
      await updateDoc(doc(db, collectionName, customerId), {
        smartCoins: newBalance
      });
      await addDoc(collection(db, COLLECTIONS.SMART_COIN_TRANSACTIONS), {
        ...newLog,
        serverTimestamp: serverTimestamp()
      });
    } catch (e) {
      console.error('[Firestore] Smart coin write failed:', e);
      throw e;
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
export const getBirthdayCustomers = async (collectionName = COLLECTIONS.CUSTOMERS) => {
  const custs = collectionName === COLLECTIONS.ONLINE_CUSTOMERS ? await getAllOnlineCustomers() : await getAllCustomers();
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
export const updateCustomerNotes = async (customerId, notes, user, collectionName = COLLECTIONS.CUSTOMERS) => {
  const custs = collectionName === COLLECTIONS.CUSTOMERS ? getStoredCustomers() : await getAllOnlineCustomers();
  const index = custs.findIndex((c) => c.id === customerId);
  if (index === -1) throw new Error('Customer not found');

  custs[index].notes = notes;
  if (collectionName === COLLECTIONS.CUSTOMERS) saveStoredCustomers(custs);

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, collectionName, customerId), {
        notes,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('[Firestore] Customer notes update failed:', e);
      throw e;
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

const CUSTOMER_SETTINGS_STORAGE_KEY = 'grocery_admin_customer_settings_v1';
const LEDGER_STORAGE_KEY = 'grocery_admin_customer_ledger_v1';

export const DEFAULT_CUSTOMER_SETTINGS = {
  prefix: 'CUS',
  separator: '-',
  startingNumber: 1,
  numberLength: 6,
  barcodeFormat: 'CODE128'
};

/**
 * Get Customer ID Configuration
 */
export const getCustomerSettings = () => {
  try {
    const raw = localStorage.getItem(CUSTOMER_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CUSTOMER_SETTINGS };
    return { ...DEFAULT_CUSTOMER_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_CUSTOMER_SETTINGS };
  }
};

/**
 * Save Customer ID Configuration
 */
export const saveCustomerSettings = async (settings, user) => {
  const merged = { ...DEFAULT_CUSTOMER_SETTINGS, ...settings };
  localStorage.setItem(CUSTOMER_SETTINGS_STORAGE_KEY, JSON.stringify(merged));

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.BUSINESS_SETTINGS, 'customerConfig'), {
        ...merged,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('[Firestore] Save customer settings failed:', e);
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'UPDATE_CUSTOMER_SETTINGS',
    module: 'Settings',
    newState: merged,
    reason: 'Updated Customer ID format and configuration parameters'
  });

  return merged;
};

/**
 * Generate Next Unique Customer ID (Firebase Transaction / Local safe)
 */
export const generateNextCustomerId = async () => {
  const cfg = getCustomerSettings();
  const custs = await getAllCustomers();

  let maxSeq = Number(cfg.startingNumber) - 1;
  const prefixPattern = new RegExp(`^${cfg.prefix}${cfg.separator === '/' ? '\\/' : cfg.separator === '_' ? '_' : '-'}(\\d+)$`, 'i');

  custs.forEach((c) => {
    const match = (c.customerId || c.id || '').match(prefixPattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const paddedNum = String(nextSeq).padStart(Number(cfg.numberLength), '0');
  return `${cfg.prefix}${cfg.separator}${paddedNum}`;
};

/**
 * Check for existing customer duplicate by mobile or email
 */
export const checkDuplicateCustomer = async ({ mobile, email }) => {
  const custs = await getAllCustomers();
  if (mobile && mobile.trim()) {
    const cleanMob = mobile.replace(/\D/g, '');
    const foundMob = custs.find((c) => (c.mobile || c.phone || '').replace(/\D/g, '').endsWith(cleanMob.slice(-10)));
    if (foundMob) return { isDuplicate: true, field: 'mobile', customer: foundMob };
  }
  if (email && email.trim()) {
    const foundEmail = custs.find((c) => (c.email || '').toLowerCase() === email.trim().toLowerCase());
    if (foundEmail) return { isDuplicate: true, field: 'email', customer: foundEmail };
  }
  return { isDuplicate: false };
};

/**
 * Create a new Customer with auto-generated ID, Barcode & Ledger
 */
export const createNewCustomer = async (customerData, user) => {
  const dupCheck = await checkDuplicateCustomer({ mobile: customerData.mobile, email: customerData.email });
  if (dupCheck.isDuplicate) {
    throw new Error(`Customer with mobile/email already exists (${dupCheck.customer.customerId || dupCheck.customer.id} - ${dupCheck.customer.name})`);
  }

  const generatedId = customerData.customerId || (await generateNextCustomerId());
  const docId = `cust-${Date.now().toString(36)}`;

  const newCust = {
    id: docId,
    customerId: generatedId,
    name: customerData.name || 'Walk-in Customer',
    mobile: customerData.mobile || '',
    phone: customerData.mobile || '',
    email: customerData.email || '',
    photoUrl: customerData.photoUrl || '',
    dob: customerData.dob || '',
    gender: customerData.gender || '',
    address: {
      addressLine1: customerData.addressLine1 || '',
      addressLine2: customerData.addressLine2 || '',
      area: customerData.area || '',
      city: customerData.city || 'Coimbatore',
      district: customerData.district || 'Coimbatore',
      state: customerData.state || 'Tamil Nadu',
      pincode: customerData.pincode || '641012',
      landmark: customerData.landmark || ''
    },
    status: 'Active',
    creditEnabled: customerData.creditEnabled ?? true,
    creditLimit: customerData.creditEnabled === false
      ? 0
      : Number(customerData.creditLimit ?? 5000),
    currentBalance: 0,
    advanceBalance: 0,
    smartCoins: 0,
    totalSpending: 0,
    totalOrders: 0,
    registrationDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: user?.displayName || user?.email || 'POS Staff'
  };

  const custs = getStoredCustomers();
  custs.unshift(newCust);
  saveStoredCustomers(custs);

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.CUSTOMERS, docId), {
        ...newCust,
        serverTimestamp: serverTimestamp()
      });
    } catch (e) {
      console.error('[Firestore] Create customer failed:', e);
      throw e;
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'CREATE_CUSTOMER',
    module: 'Customers',
    targetId: generatedId,
    targetType: 'customer',
    newState: newCust,
    reason: `Registered new billing customer ${newCust.name} (${generatedId})`
  });

  return newCust;
};

/**
 * Get Customer Financial Ledger
 */
export const getCustomerLedger = async (customerId = null) => {
  try {
    const raw = localStorage.getItem(LEDGER_STORAGE_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    if (customerId) {
      return logs.filter((l) => l.customerId === customerId || l.customerDocId === customerId);
    }
    return logs;
  } catch (e) {
    return [];
  }
};

/**
 * Record Customer Financial Ledger Transaction (Credit Sale, Payment, Refund)
 */
export const recordCustomerLedgerTransaction = async ({
  customerId, // Customer ID string like CUS-000001 or doc id
  type, // 'CREDIT_SALE' | 'PAYMENT' | 'REFUND' | 'ADJUSTMENT'
  debit = 0,
  credit = 0,
  advanceCredit = 0,
  referenceId = '',
  paymentMethod = 'CASH',
  reason = '',
  user
}) => {
  if (!customerId || typeof customerId !== 'string') {
    throw new Error('A valid customer ID is required for ledger transactions.');
  }

  const custs = getStoredCustomers();
  let customerIndex = custs.findIndex(
    (customer) =>
      customer.customerId === customerId || customer.id === customerId
  );
  let cust = customerIndex === -1 ? null : custs[customerIndex];
  let customerRef = null;

  if (isFirebaseConfigured) {
    customerRef = doc(db, COLLECTIONS.CUSTOMERS, customerId);
    let customerSnapshot = await getDoc(customerRef);

    if (!customerSnapshot.exists()) {
      const customerQuery = await getDocs(
        query(
          collection(db, COLLECTIONS.CUSTOMERS),
          where('customerId', '==', customerId),
          limit(1)
        )
      );
      if (!customerQuery.empty) {
        customerSnapshot = customerQuery.docs[0];
        customerRef = customerSnapshot.ref;
      }
    }

    if (!customerSnapshot.exists()) {
      throw new Error(`Customer ${customerId} not found`);
    }

    cust = { id: customerSnapshot.id, ...customerSnapshot.data() };
    customerIndex = custs.findIndex(
      (customer) =>
        customer.customerId === cust.customerId || customer.id === cust.id
    );
  }

  if (!cust) throw new Error(`Customer ${customerId} not found`);

  const debitAmt = Number(debit || 0);
  const creditAmt = Number(credit || 0);
  const advanceCreditAmt = Number(advanceCredit || 0);
  const txId = `tx-${Date.now().toString(36)}`;
  let ledgerDoc;
  let updatedCustomer;

  if (isFirebaseConfigured && customerRef) {
    const ledgerRef = doc(collection(db, COLLECTIONS.CUSTOMER_LEDGER), txId);
    await runTransaction(db, async (transaction) => {
      const customerSnapshot = await transaction.get(customerRef);
      if (!customerSnapshot.exists()) {
        throw new Error(`Customer ${customerId} not found`);
      }

      const currentCustomer = {
        id: customerSnapshot.id,
        ...customerSnapshot.data()
      };
      const previousBalance = Number(
        currentCustomer.currentBalance ||
          currentCustomer.outstandingBalance ||
          0
      );
      const newBalance = previousBalance + debitAmt - creditAmt;
      const previousAdvanceBalance = Number(currentCustomer.advanceBalance || 0);
      const newAdvanceBalance = previousAdvanceBalance + advanceCreditAmt;
      updatedCustomer = {
        ...currentCustomer,
        currentBalance: newBalance,
        outstandingBalance: newBalance,
        advanceBalance: newAdvanceBalance
      };
      ledgerDoc = {
        id: txId,
        transactionId: txId,
        customerId: currentCustomer.customerId || currentCustomer.id,
        customerDocId: currentCustomer.id,
        customerName: currentCustomer.name,
        type,
        debit: debitAmt,
        credit: creditAmt,
        previousBalance,
        newBalance,
        advanceCredit: advanceCreditAmt,
        previousAdvanceBalance,
        newAdvanceBalance,
        referenceId,
        paymentMethod,
        reason: reason || `${type} transaction`,
        createdBy: user?.displayName || user?.email || 'Billing Staff',
        createdAt: new Date().toISOString()
      };

      transaction.update(customerRef, {
        currentBalance: newBalance,
        outstandingBalance: newBalance,
        advanceBalance: newAdvanceBalance,
        updatedAt: serverTimestamp()
      });
      transaction.set(ledgerRef, {
        ...ledgerDoc,
        serverTimestamp: serverTimestamp()
      });
    });
  } else {
    const previousBalance = Number(
      cust.currentBalance || cust.outstandingBalance || 0
    );
    const newBalance = previousBalance + debitAmt - creditAmt;
    const previousAdvanceBalance = Number(cust.advanceBalance || 0);
    const newAdvanceBalance = previousAdvanceBalance + advanceCreditAmt;
    updatedCustomer = {
      ...cust,
      currentBalance: newBalance,
      outstandingBalance: newBalance,
      advanceBalance: newAdvanceBalance
    };
    ledgerDoc = {
      id: txId,
      transactionId: txId,
      customerId: cust.customerId || cust.id,
      customerDocId: cust.id,
      customerName: cust.name,
      type,
      debit: debitAmt,
      credit: creditAmt,
      previousBalance,
      newBalance,
      advanceCredit: advanceCreditAmt,
      previousAdvanceBalance,
      newAdvanceBalance,
      referenceId,
      paymentMethod,
      reason: reason || `${type} transaction`,
      createdBy: user?.displayName || user?.email || 'Billing Staff',
      createdAt: new Date().toISOString()
    };
  }

  if (customerIndex === -1) {
    custs.unshift(updatedCustomer);
  } else {
    custs[customerIndex] = updatedCustomer;
  }
  saveStoredCustomers(custs);

  try {
    const raw = localStorage.getItem(LEDGER_STORAGE_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    logs.unshift(ledgerDoc);
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to update local ledger', err);
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: `LEDGER_${type}`,
    module: 'Customer Ledger',
    targetId: updatedCustomer.customerId || updatedCustomer.id,
    targetType: 'ledger',
    previousState: { balance: ledgerDoc.previousBalance },
    newState: {
      balance: ledgerDoc.newBalance,
      debit: debitAmt,
      credit: creditAmt,
      advanceBalance: ledgerDoc.newAdvanceBalance,
      advanceCredit: advanceCreditAmt
    },
    reason: reason || `${type} recorded for ${updatedCustomer.name}`
  });

  return { customer: updatedCustomer, ledger: ledgerDoc };
};
