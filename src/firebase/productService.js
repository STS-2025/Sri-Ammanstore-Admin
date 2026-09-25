import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { COLLECTIONS } from './collections';
import { INITIAL_PRODUCTS } from '../data/grocerySeedData';
import { logActivity } from './auditLogger';

const LOCAL_STORAGE_KEY = 'grocery_admin_products_v2';

// Helper to initialize local storage
const getStoredProducts = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_PRODUCTS;
  }
};

const saveStoredProducts = (products) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(products));
  } catch (e) {
    console.warn('[Storage] QuotaExceededError encountered, attempting sanitized save:', e);
    try {
      const sanitized = products.map((p) => {
        const copy = { ...p };
        if (typeof copy.frontImageUrl === 'string' && copy.frontImageUrl.length > 500000) {
          copy.frontImageUrl = copy.frontImageUrl.slice(0, 100);
        }
        if (typeof copy.imageUrl === 'string' && copy.imageUrl.length > 500000) {
          copy.imageUrl = copy.imageUrl.slice(0, 100);
        }
        if (typeof copy.backImageUrl === 'string' && copy.backImageUrl.length > 500000) {
          copy.backImageUrl = copy.backImageUrl.slice(0, 100);
        }
        return copy;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
    } catch (err2) {
      console.error('Failed to save sanitized products to localStorage', err2);
    }
  }
};

/**
 * Fetch all products with their variants
 */
export const getAllProducts = async () => {
  if (!isFirebaseConfigured) {
    return getStoredProducts();
  }

  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
    if (querySnapshot.empty) {
      return getStoredProducts();
    }
    const list = [];
    querySnapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    return list;
  } catch (err) {
    console.warn('[Firestore] Falling back to cached products:', err.message);
    return getStoredProducts();
  }
};

/**
 * Fetch a single product
 */
export const getProductById = async (id) => {
  const products = await getAllProducts();
  return products.find((p) => p.id === id) || null;
};

/**
 * Create a new product with variants
 */
export const createProduct = async (productData, user) => {
  const newId = `prod-${Date.now().toString(36)}`;
  const productRecord = {
    ...productData,
    id: newId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: productData.status || 'active'
  };

  const currentProducts = getStoredProducts();
  currentProducts.unshift(productRecord);
  saveStoredProducts(currentProducts);

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.PRODUCTS, newId), {
        ...productRecord,
        serverTimestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('[Firestore] Error saving product:', err);
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'CREATE_PRODUCT',
    module: 'Products',
    targetId: newId,
    targetType: 'product',
    reason: `Added new grocery product: ${productRecord.name}`,
    metadata: { name: productRecord.name, variantsCount: productRecord.variants?.length || 0 }
  });

  return productRecord;
};

/**
 * Update an existing product
 */
export const updateProduct = async (id, updatedData, user) => {
  const currentProducts = getStoredProducts();
  const index = currentProducts.findIndex((p) => p.id === id);
  if (index === -1) throw new Error('Product not found');

  const oldProduct = currentProducts[index];
  const updatedRecord = {
    ...oldProduct,
    ...updatedData,
    id,
    updatedAt: new Date().toISOString()
  };

  currentProducts[index] = updatedRecord;
  saveStoredProducts(currentProducts);

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, COLLECTIONS.PRODUCTS, id), {
        ...updatedRecord,
        serverTimestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('[Firestore] Error updating product:', err);
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'UPDATE_PRODUCT',
    module: 'Products',
    targetId: id,
    targetType: 'product',
    reason: `Updated product specifications for ${updatedRecord.name}`,
    previousState: { name: oldProduct.name, price: oldProduct.variants?.[0]?.sellingPrice },
    newState: { name: updatedRecord.name, price: updatedRecord.variants?.[0]?.sellingPrice }
  });

  return updatedRecord;
};

/**
 * Duplicate a product
 */
export const duplicateProduct = async (id, user) => {
  const existing = await getProductById(id);
  if (!existing) throw new Error('Product to duplicate not found');

  const duplicatedData = {
    ...existing,
    name: `${existing.name} (Copy)`,
    tamilName: existing.tamilName ? `${existing.tamilName} (நகல்)` : '',
    status: 'draft',
    variants: (existing.variants || []).map((v, i) => ({
      ...v,
      id: `var-${Date.now()}-${i}`,
      sku: `${v.sku}-COPY`,
      barcode: `${v.barcode.slice(0, -2)}${Math.floor(10 + Math.random() * 89)}`
    }))
  };
  delete duplicatedData.id;

  return await createProduct(duplicatedData, user);
};

/**
 * Delete a product (Requires Super Admin or Store Manager with reason)
 */
export const deleteProduct = async (id, reason, user) => {
  const currentProducts = getStoredProducts();
  const target = currentProducts.find((p) => p.id === id);
  if (!target) throw new Error('Product not found');

  const filtered = currentProducts.filter((p) => p.id !== id);
  saveStoredProducts(filtered);

  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, id));
    } catch (err) {
      console.error('[Firestore] Error deleting product:', err);
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'DELETE_PRODUCT',
    module: 'Products',
    targetId: id,
    targetType: 'product',
    reason: reason || 'Routine catalog pruning',
    previousState: { name: target.name }
  });

  return true;
};

/**
 * Update single variant price with High-Risk Reason Logging
 */
export const updateVariantPrice = async (productId, variantId, { newSellingPrice, newMrp, reason }, user) => {
  const currentProducts = getStoredProducts();
  const product = currentProducts.find((p) => p.id === productId);
  if (!product) throw new Error('Product not found');

  const variant = (product.variants || []).find((v) => v.id === variantId);
  if (!variant) throw new Error('Variant not found');

  const previousPrices = { mrp: variant.mrp, sellingPrice: variant.sellingPrice };

  variant.sellingPrice = Number(newSellingPrice);
  if (newMrp) variant.mrp = Number(newMrp);

  saveStoredProducts(currentProducts);

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'CHANGE_PRODUCT_PRICE',
    module: 'Pricing & Financials',
    targetId: `${productId}/${variantId}`,
    targetType: 'variant_price',
    previousState: previousPrices,
    newState: { mrp: variant.mrp, sellingPrice: variant.sellingPrice },
    reason: reason || 'Commercial price revision'
  });

  return product;
};
