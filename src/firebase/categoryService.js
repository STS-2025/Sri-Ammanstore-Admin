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
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_CATEGORIES));
      return INITIAL_CATEGORIES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_CATEGORIES;
  }
};

const saveStoredCategories = (cats) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cats));
  } catch (e) {
    console.error('Error caching categories', e);
  }
};

export const getAllCategories = async () => {
  if (!isFirebaseConfigured) {
    return getStoredCategories();
  }

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
    if (snap.empty) {
      return getStoredCategories();
    }
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  } catch (e) {
    return getStoredCategories();
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
  if (index === -1) throw new Error('Category not found');

  const old = current[index];
  const updated = { ...old, ...catData, id, updatedAt: new Date().toISOString() };
  current[index] = updated;
  saveStoredCategories(current);

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, COLLECTIONS.CATEGORIES, id), {
        ...updated,
        serverTimestamp: serverTimestamp()
      });
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
    reason: `Modified category properties for ${updated.name}`
  });

  return updated;
};

export const deleteCategory = async (id, reason, user) => {
  const current = getStoredCategories();
  const target = current.find((c) => c.id === id);
  if (!target) throw new Error('Category not found');

  const filtered = current.filter((c) => c.id !== id);
  saveStoredCategories(filtered);

  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, id));
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
