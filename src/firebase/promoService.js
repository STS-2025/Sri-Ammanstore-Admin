import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { COLLECTIONS } from './collections';
import { INITIAL_PROMO_CODES } from '../data/deliveryAndMarketingSeedData';
import { logActivity } from './auditLogger';

const PROMOS_KEY = 'grocery_admin_promo_codes_v4';

const getStoredPromos = () => {
  try {
    const raw = localStorage.getItem(PROMOS_KEY);
    if (!raw) {
      localStorage.setItem(PROMOS_KEY, JSON.stringify(INITIAL_PROMO_CODES));
      return INITIAL_PROMO_CODES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_PROMO_CODES;
  }
};

const saveStoredPromos = (promos) => {
  try {
    localStorage.setItem(PROMOS_KEY, JSON.stringify(promos));
  } catch (e) {
    console.error('Error saving promos locally', e);
  }
};

/**
 * Fetch all promo codes
 */
export const getAllPromoCodes = async () => {
  if (!isFirebaseConfigured) {
    return getStoredPromos();
  }

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.PROMO_CODES));
    if (snap.empty) {
      const local = getStoredPromos();
      for (const p of local) {
        await setDoc(doc(db, COLLECTIONS.PROMO_CODES, p.id), { ...p, createdAt: serverTimestamp() });
      }
      return local;
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Firestore promos fetch failed:', err);
    return getStoredPromos();
  }
};

/**
 * Create a new promo code
 */
export const createPromoCode = async (promoData, user) => {
  const newPromo = {
    ...promoData,
    id: promoData.id || `promo-${Date.now().toString().slice(-4)}`,
    code: (promoData.code || '').trim().toUpperCase(),
    timesUsed: 0,
    salesGenerated: 0,
    totalDiscountGiven: 0,
    status: promoData.status || 'active',
    createdAt: new Date().toISOString()
  };

  const promos = getStoredPromos();
  if (promos.some(p => p.code.toLowerCase() === newPromo.code.toLowerCase())) {
    throw new Error(`Promo code "${newPromo.code}" already exists.`);
  }

  promos.unshift(newPromo);
  saveStoredPromos(promos);

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.PROMO_CODES, newPromo.id), { ...newPromo, createdAt: serverTimestamp() });
    } catch (e) {
      console.warn('Firestore promo create failed:', e);
    }
  }

  await logActivity(
    user || { id: 'marketing', name: 'Marketing Staff' },
    'marketing.promos',
    COLLECTIONS.PROMO_CODES,
    newPromo.id,
    `Created discount coupon ${newPromo.code} (${newPromo.type}: ${newPromo.value})`,
    { promo: newPromo }
  );

  return newPromo;
};

/**
 * Update an existing promo code
 */
export const updatePromoCode = async (promoId, updates, user) => {
  const promos = getStoredPromos();
  const idx = promos.findIndex(p => p.id === promoId);
  if (idx === -1) throw new Error('Promo code not found');

  const updated = {
    ...promos[idx],
    ...updates,
    code: updates.code ? updates.code.trim().toUpperCase() : promos[idx].code,
    updatedAt: new Date().toISOString()
  };

  promos[idx] = updated;
  saveStoredPromos(promos);

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, COLLECTIONS.PROMO_CODES, promoId), { ...updates, updatedAt: serverTimestamp() });
    } catch (e) {
      console.warn('Firestore promo update failed:', e);
    }
  }

  await logActivity(
    user || { id: 'marketing', name: 'Marketing Staff' },
    'marketing.promos',
    COLLECTIONS.PROMO_CODES,
    promoId,
    `Updated promo code ${updated.code} configuration`,
    { updates }
  );

  return updated;
};

/**
 * Delete a promo code
 */
export const deletePromoCode = async (promoId, user) => {
  const promos = getStoredPromos();
  const existing = promos.find(p => p.id === promoId);
  const filtered = promos.filter(p => p.id !== promoId);
  saveStoredPromos(filtered);

  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.PROMO_CODES, promoId));
    } catch (e) {
      console.warn('Firestore promo delete failed:', e);
    }
  }

  await logActivity(
    user || { id: 'marketing', name: 'Marketing Staff' },
    'marketing.promos',
    COLLECTIONS.PROMO_CODES,
    promoId,
    `Deleted discount code ${existing?.code || promoId}`
  );

  return true;
};

/**
 * Validate promo code against cart
 */
export const validatePromoCode = (code, cartAmount, customerOrderCount = 0) => {
  const promos = getStoredPromos();
  const promo = promos.find(p => p.code.toLowerCase() === code.trim().toLowerCase());

  if (!promo) {
    return { isValid: false, reason: 'Invalid promo code.' };
  }

  if (promo.status !== 'active') {
    return { isValid: false, reason: `Promo code is currently ${promo.status}.` };
  }

  const now = new Date();
  if (promo.startDate && new Date(promo.startDate) > now) {
    return { isValid: false, reason: 'Promo code offer has not started yet.' };
  }
  if (promo.endDate && new Date(promo.endDate) < now) {
    return { isValid: false, reason: 'Promo code has expired.' };
  }

  if (promo.totalUsageLimit && promo.timesUsed >= promo.totalUsageLimit) {
    return { isValid: false, reason: 'Promo code redemption limit reached.' };
  }

  if (promo.firstOrderOnly && customerOrderCount > 0) {
    return { isValid: false, reason: 'Valid for new customers on first order only.' };
  }

  if (promo.minOrderAmount && cartAmount < promo.minOrderAmount) {
    return { isValid: false, reason: `Minimum order amount of ₹${promo.minOrderAmount} required.` };
  }

  // Calculate discount
  let discountAmount = 0;
  if (promo.type === 'percentage') {
    discountAmount = (cartAmount * promo.value) / 100;
    if (promo.maxDiscount) {
      discountAmount = Math.min(discountAmount, promo.maxDiscount);
    }
  } else if (promo.type === 'fixed') {
    discountAmount = Math.min(promo.value, cartAmount);
  } else if (promo.type === 'free_delivery') {
    discountAmount = Math.min(promo.value || 40, cartAmount);
  }

  return {
    isValid: true,
    promo,
    discountAmount: Math.round(discountAmount)
  };
};

/**
 * Get aggregated Promo Analytics
 */
export const getPromoAnalytics = (promos = []) => {
  const list = promos.length > 0 ? promos : getStoredPromos();
  const totalCodes = list.length;
  const activeCodes = list.filter(p => p.status === 'active').length;
  const totalUsed = list.reduce((sum, p) => sum + (p.timesUsed || 0), 0);
  const totalSales = list.reduce((sum, p) => sum + (p.salesGenerated || 0), 0);
  const totalDiscount = list.reduce((sum, p) => sum + (p.totalDiscountGiven || 0), 0);
  const avgOrderValue = totalUsed > 0 ? Math.round(totalSales / totalUsed) : 0;
  const roi = totalDiscount > 0 ? ((totalSales - totalDiscount) / totalDiscount).toFixed(1) : 0;

  return {
    totalCodes,
    activeCodes,
    totalUsed,
    totalSales,
    totalDiscount,
    avgOrderValue,
    roi
  };
};
