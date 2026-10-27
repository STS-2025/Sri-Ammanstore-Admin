import { collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { COLLECTIONS } from './collections';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES, INITIAL_STOCK_MOVEMENTS } from '../data/grocerySeedData';
import { INITIAL_CUSTOMERS, INITIAL_ORDERS, INITIAL_RETURNS, INITIAL_SMART_COIN_LOGS } from '../data/customerAndOrderSeedData';
import {
  INITIAL_DELIVERY_AGENTS,
  INITIAL_DELIVERY_BATCHES,
  INITIAL_BANNERS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_CAMPAIGNS,
  INITIAL_PROMO_CODES,
  INITIAL_REQUESTED_PRODUCTS
} from '../data/deliveryAndMarketingSeedData';

/**
 * Helper to get user local data from localStorage if available
 */
const getLocalStorageData = (key, fallbackData) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return fallbackData;
};

/**
 * Automatically seeds initial grocery dataset + user localStorage items into Firestore.
 * This transitions the application from local storage fallback to full live Firebase Firestore storage.
 */
export const seedFirestoreIfEmpty = async (force = false) => {
  if (!isFirebaseConfigured) {
    console.info('[Firestore Auto-Sync] Firebase not configured; skipping Firestore seed.');
    return { success: false, reason: 'Firebase not configured' };
  }

  try {
    const statusReport = {};

    const collectionsToSeed = [
      { name: COLLECTIONS.CATEGORIES, data: getLocalStorageData('grocery_admin_categories_v2', INITIAL_CATEGORIES) },
      { name: COLLECTIONS.PRODUCTS, data: getLocalStorageData('grocery_admin_products_v2', INITIAL_PRODUCTS) },
      { name: COLLECTIONS.CUSTOMERS, data: getLocalStorageData('grocery_admin_customers_v3', INITIAL_CUSTOMERS) },
      { name: COLLECTIONS.ORDERS, data: getLocalStorageData('grocery_admin_orders_v3', INITIAL_ORDERS) },
      { name: COLLECTIONS.RETURNS, data: getLocalStorageData('grocery_admin_returns_v3', INITIAL_RETURNS) },
      { name: COLLECTIONS.DELIVERY_AGENTS, data: getLocalStorageData('grocery_admin_delivery_agents_v3', INITIAL_DELIVERY_AGENTS) },
      { name: COLLECTIONS.DELIVERY_BATCHES, data: getLocalStorageData('grocery_admin_delivery_batches_v3', INITIAL_DELIVERY_BATCHES) },
      { name: COLLECTIONS.STOCK_MOVEMENTS, data: INITIAL_STOCK_MOVEMENTS },
      { name: COLLECTIONS.PROMO_CODES, data: getLocalStorageData('grocery_admin_promos_v2', INITIAL_PROMO_CODES) },
      { name: COLLECTIONS.BANNERS, data: getLocalStorageData('grocery_admin_banners_v2', INITIAL_BANNERS) },
      { name: COLLECTIONS.ANNOUNCEMENTS, data: INITIAL_ANNOUNCEMENTS },
      { name: COLLECTIONS.CAMPAIGNS, data: INITIAL_CAMPAIGNS },
      { name: COLLECTIONS.PRODUCT_REQUESTS, data: INITIAL_REQUESTED_PRODUCTS },
      { name: COLLECTIONS.SMART_COIN_TRANSACTIONS, data: INITIAL_SMART_COIN_LOGS }
    ];

    let totalUploaded = 0;

    for (const item of collectionsToSeed) {
      const snap = await getDocs(collection(db, item.name));
      if (snap.empty || force) {
        console.info(`[Firestore Seed] Seeding collection: ${item.name} (${item.data.length} records)...`);
        for (const record of item.data) {
          const docId = record.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
          await setDoc(doc(db, item.name, docId), record, { merge: true });
          totalUploaded++;
        }
        statusReport[item.name] = item.data.length;
      } else {
        statusReport[item.name] = `Skipped (${snap.size} existing docs)`;
      }
    }

    console.info(`[Firestore Seed] Completed seeding! Total documents uploaded: ${totalUploaded}`);
    return { success: true, totalUploaded, statusReport };
  } catch (error) {
    console.error('[Firestore Seed Error]:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clear all local storage data keys used by the application
 */
export const clearAllLocalStorageData = () => {
  const keysToClear = [
    'grocery_admin_products_v2',
    'grocery_admin_categories_v2',
    'grocery_admin_customers_v3',
    'grocery_admin_orders_v3',
    'grocery_admin_returns_v3',
    'grocery_admin_delivery_agents_v3',
    'grocery_admin_delivery_agents_v4',
    'grocery_admin_delivery_batches_v3',
    'grocery_admin_delivery_batches_v4',
    'grocery_admin_cod_collections_v4',
    'grocery_admin_promos_v2',
    'grocery_admin_promo_codes_v4',
    'grocery_admin_banners_v2',
    'grocery_admin_banners_v4',
    'grocery_admin_announcements_v4',
    'grocery_admin_campaigns_v4',
    'grocery_admin_templates_v4',
    'grocery_admin_product_requests_v4',
    'grocery_admin_smart_coins_v3',
    'grocery_admin_staff_list_v5',
    'grocery_admin_registered_users',
    'grocery_admin_audit_logs',
    'grocery_admin_stock_movements_v2',
    'grocery_admin_batches_v2'
  ];

  keysToClear.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch (e) {}
  });
  console.info('[Storage] All local storage keys cleared.');
};

/**
 * Wipes out all dummy data from Firebase Firestore collections and clears LocalStorage
 */
export const clearAllFirestoreData = async () => {
  clearAllLocalStorageData();

  if (!isFirebaseConfigured) {
    return { success: true, count: 0 };
  }

  const collectionsToClear = [
    COLLECTIONS.CATEGORIES,
    COLLECTIONS.PRODUCTS,
    COLLECTIONS.CUSTOMERS,
    COLLECTIONS.ORDERS,
    COLLECTIONS.RETURNS,
    COLLECTIONS.DELIVERY_AGENTS,
    COLLECTIONS.DELIVERY_BATCHES,
    COLLECTIONS.STOCK_MOVEMENTS,
    COLLECTIONS.PROMO_CODES,
    COLLECTIONS.BANNERS,
    COLLECTIONS.ANNOUNCEMENTS,
    COLLECTIONS.CAMPAIGNS,
    COLLECTIONS.PRODUCT_REQUESTS,
    COLLECTIONS.SMART_COIN_TRANSACTIONS
  ];

  let deletedCount = 0;
  const { deleteDoc } = await import('firebase/firestore');

  for (const colName of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, colName));
      for (const docSnap of snap.docs) {
        await deleteDoc(doc(db, colName, docSnap.id));
        deletedCount++;
      }
    } catch (e) {
      console.warn(`[Firestore Clear] Could not clear collection ${colName}:`, e.message);
    }
  }

  console.info(`[Firestore Clear] Deleted ${deletedCount} documents across Firestore.`);
  return { success: true, count: deletedCount };
};
