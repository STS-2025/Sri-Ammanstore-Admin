import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { COLLECTIONS } from './collections';
import { logActivity } from './auditLogger';

const LOCAL_STORAGE_KEY = 'grocery_admin_brands_v1';

const getStoredBrands = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
};

const saveStoredBrands = (brands) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(brands));
  } catch (error) {
    console.warn('Could not cache brands locally:', error);
  }
};

export const getAllBrands = async () => {
  if (!isFirebaseConfigured) return getStoredBrands();

  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.BRANDS));
    const brands = [];
    snapshot.forEach((brandDoc) => brands.push({ id: brandDoc.id, ...brandDoc.data() }));
    const sorted = brands.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    saveStoredBrands(sorted);
    return sorted;
  } catch (error) {
    return getStoredBrands();
  }
};

export const createBrand = async (brandData, user) => {
  const id = `brand-${Date.now().toString(36)}`;
  const record = {
    ...brandData,
    id,
    name: String(brandData.name || '').trim(),
    origin: String(brandData.origin || '').trim(),
    status: brandData.status || 'active',
    createdAt: new Date().toISOString()
  };

  const current = getStoredBrands();
  saveStoredBrands([...current, record]);

  if (isFirebaseConfigured) {
    await setDoc(doc(db, COLLECTIONS.BRANDS, id), {
      ...record,
      serverTimestamp: serverTimestamp()
    });
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'CREATE_BRAND',
    module: 'Brands',
    targetId: id,
    targetType: 'brand',
    reason: `Added brand: ${record.name}`
  });

  return record;
};

export const updateBrand = async (id, brandData, user) => {
  const current = getStoredBrands();
  const old = current.find((brand) => brand.id === id) || {};
  const updated = {
    ...old,
    ...brandData,
    id,
    name: String(brandData.name ?? old.name ?? '').trim(),
    origin: String(brandData.origin ?? old.origin ?? '').trim(),
    updatedAt: new Date().toISOString()
  };

  saveStoredBrands(current.map((brand) => brand.id === id ? updated : brand));

  if (isFirebaseConfigured) {
    await setDoc(doc(db, COLLECTIONS.BRANDS, id), {
      ...updated,
      serverTimestamp: serverTimestamp()
    }, { merge: true });
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'UPDATE_BRAND',
    module: 'Brands',
    targetId: id,
    targetType: 'brand',
    reason: `Updated brand: ${updated.name}`
  });

  return updated;
};

export const deleteBrand = async (id, reason, user) => {
  saveStoredBrands(getStoredBrands().filter((brand) => brand.id !== id));

  if (isFirebaseConfigured) {
    await deleteDoc(doc(db, COLLECTIONS.BRANDS, id));
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'DELETE_BRAND',
    module: 'Brands',
    targetId: id,
    targetType: 'brand',
    reason: reason || 'Brand removed from catalog'
  });

  return true;
};
