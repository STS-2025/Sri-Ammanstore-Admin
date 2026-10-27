import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { COLLECTIONS } from './collections';
import { INITIAL_CATEGORIES } from '../data/grocerySeedData';
import { logActivity } from './auditLogger';

const LOCAL_STORAGE_KEY = 'grocery_admin_categories_v2';

const getStoredCategories = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

const saveStoredCategories = (cats) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cats));
  } catch (e) {
    console.error('Error caching categories', e);
  }
};

const SEEDED_KEY = 'grocery_admin_categories_seeded_v1';

export const seedInitialCategories = async () => {
  if (!isFirebaseConfigured) return INITIAL_CATEGORIES;
  try {
    const promises = INITIAL_CATEGORIES.map((cat) =>
      setDoc(
        doc(db, COLLECTIONS.CATEGORIES, cat.id),
        {
          ...cat,
          serverTimestamp: serverTimestamp()
        },
        { merge: true }
      )
    );
    await Promise.all(promises);
    try { localStorage.setItem(SEEDED_KEY, 'true'); } catch (e) {}
    return INITIAL_CATEGORIES;
  } catch (err) {
    console.warn('[Firestore] Auto-seed categories notice:', err.message);
    return INITIAL_CATEGORIES;
  }
};

export const getAllCategories = async () => {
  if (!isFirebaseConfigured) {
    const stored = getStoredCategories();
    return stored;
  }

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    const sorted = list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    saveStoredCategories(sorted);
    return sorted;
  } catch (e) {
    const stored = getStoredCategories();
    return stored;
  }
};

export const createCategory = async (catData, user) => {
  const newId = `cat-${Date.now().toString(36)}`;
  const record = {
    ...catData,
    id: newId,
    displayOrder: Number(catData.displayOrder || 1),
    isActive: catData.isActive ?? true,
    showOnHomepage: catData.showOnHomepage ?? true,
    itemCount: 0,
    createdAt: new Date().toISOString()
  };

  const current = getStoredCategories();
  current.push(record);
  saveStoredCategories(current);

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.CATEGORIES, newId), {
        ...record,
        serverTimestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('[Firestore] Category write failed:', err);
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'CREATE_CATEGORY',
    module: 'Categories',
    targetId: newId,
    targetType: 'category',
    reason: `Added new grocery taxonomy category: ${record.name}`
  });

  return record;
};

export const updateCategory = async (id, catData, user) => {
  const current = getStoredCategories();
  const index = current.findIndex((c) => c.id === id);

  const old = index !== -1 ? current[index] : {};
  const updated = { ...old, ...catData, id, updatedAt: new Date().toISOString() };
  if (index !== -1) {
    current[index] = updated;
  } else {
    current.push(updated);
  }
  saveStoredCategories(current);

  if (isFirebaseConfigured) {
    try {
      await setDoc(
        doc(db, COLLECTIONS.CATEGORIES, id),
        {
          ...updated,
          serverTimestamp: serverTimestamp()
        },
        { merge: true }
      );
    } catch (err) {
      console.error('[Firestore] Category update failed:', err);
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'UPDATE_CATEGORY',
    module: 'Categories',
    targetId: id,
    targetType: 'category',
    reason: `Modified category properties for ${updated.name || id}`
  });

  return updated;
};

export const deleteCategory = async (id, reason, user) => {
  const current = getStoredCategories();
  const target = current.find((c) => c.id === id);

  // Remove from local storage cache
  const filtered = current.filter((c) => c.id !== id);
  saveStoredCategories(filtered);

  if (isFirebaseConfigured) {
    try {
      // 1. Delete by document ID
      await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, id));

      // 2. Also attempt deletion if ID was stored under cat.slug or cat.name
      if (target?.slug && target.slug !== id) {
        try { await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, target.slug)); } catch (e) {}
      }
      if (target?.name && target.name !== id) {
        try { await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, target.name)); } catch (e) {}
      }
    } catch (err) {
      console.error('[Firestore] Category delete failed:', err);
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'DELETE_CATEGORY',
    module: 'Categories',
    targetId: id,
    targetType: 'category',
    reason: reason || 'Taxonomy pruning'
  });

  return true;
};
