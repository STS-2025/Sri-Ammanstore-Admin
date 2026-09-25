import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { COLLECTIONS } from './collections';
import { INITIAL_REQUESTED_PRODUCTS } from '../data/deliveryAndMarketingSeedData';
import { logActivity } from './auditLogger';

const REQUESTS_KEY = 'grocery_admin_product_requests_v4';

const getStoredRequests = () => {
  try {
    const raw = localStorage.getItem(REQUESTS_KEY);
    if (!raw) {
      localStorage.setItem(REQUESTS_KEY, JSON.stringify(INITIAL_REQUESTED_PRODUCTS));
      return INITIAL_REQUESTED_PRODUCTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_REQUESTED_PRODUCTS;
  }
};

const saveStoredRequests = (reqs) => {
  try {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(reqs));
  } catch (e) {
    console.error('Error saving product requests locally', e);
  }
};

/**
 * Fetch all customer requested products
 */
export const getAllProductRequests = async () => {
  if (!isFirebaseConfigured) {
    return getStoredRequests();
  }

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.PRODUCT_REQUESTS));
    if (snap.empty) {
      const local = getStoredRequests();
      for (const r of local) {
        await setDoc(doc(db, COLLECTIONS.PRODUCT_REQUESTS, r.id), { ...r, createdAt: serverTimestamp() });
      }
      return local;
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Firestore product requests fetch failed:', err);
    return getStoredRequests();
  }
};

/**
 * Update request status (new, under_review, added, not_available, rejected)
 */
export const updateProductRequestStatus = async (requestId, { status, notes }, user) => {
  const reqs = getStoredRequests();
  const idx = reqs.findIndex(r => r.id === requestId);
  if (idx === -1) throw new Error('Product request not found');

  const updated = {
    ...reqs[idx],
    status,
    notes: notes !== undefined ? notes : reqs[idx].notes,
    updatedAt: new Date().toISOString()
  };

  reqs[idx] = updated;
  saveStoredRequests(reqs);

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, COLLECTIONS.PRODUCT_REQUESTS, requestId), {
        status,
        notes: updated.notes,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('Firestore request update failed:', e);
    }
  }

  await logActivity(
    user || { id: 'admin', name: 'Inventory Manager' },
    'product_requests.manage',
    COLLECTIONS.PRODUCT_REQUESTS,
    requestId,
    `Updated status of wishlist request "${updated.productName}" to ${status.toUpperCase()}`,
    { status, notes }
  );

  return updated;
};

/**
 * Create a new customer product request
 */
export const createProductRequest = async (requestData, user) => {
  const reqs = getStoredRequests();

  // Duplicate grouping check by product name (case-insensitive)
  const existingIndex = reqs.findIndex(
    r => r.productName.trim().toLowerCase() === requestData.productName.trim().toLowerCase()
  );

  if (existingIndex !== -1) {
    // Increment count & append requester
    const existing = reqs[existingIndex];
    existing.requestedByCount = (existing.requestedByCount || 1) + 1;
    existing.lastRequestedAt = new Date().toISOString();
    if (requestData.customerName) {
      existing.requesters = existing.requesters || [];
      existing.requesters.unshift({
        name: requestData.customerName,
        phone: requestData.customerPhone || '',
        date: new Date().toISOString().slice(0, 10)
      });
    }
    saveStoredRequests(reqs);
    return existing;
  }

  const newReq = {
    ...requestData,
    id: requestData.id || `req-${Date.now().toString().slice(-4)}`,
    requestedByCount: 1,
    lastRequestedAt: new Date().toISOString(),
    status: 'new',
    requesters: requestData.customerName
      ? [{ name: requestData.customerName, phone: requestData.customerPhone || '', date: new Date().toISOString().slice(0, 10) }]
      : []
  };

  reqs.unshift(newReq);
  saveStoredRequests(reqs);

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.PRODUCT_REQUESTS, newReq.id), { ...newReq, createdAt: serverTimestamp() });
    } catch (e) {
      console.warn('Firestore request create failed:', e);
    }
  }

  return newReq;
};
