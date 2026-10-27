import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, collectionGroup, query } from 'firebase/firestore';
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
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
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
        // Firestore remains the source of truth for inline images. Avoid filling
        // the browser's small localStorage quota with duplicate data URLs.
        ['frontImageUrl', 'imageUrl', 'backImageUrl', 'image'].forEach((field) => {
          if (typeof copy[field] === 'string' && copy[field].startsWith('data:image')) delete copy[field];
        });
        if (Array.isArray(copy.imageUrls)) {
          copy.imageUrls = copy.imageUrls.filter((url) => typeof url !== 'string' || !url.startsWith('data:image'));
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
 * Fetch all products with their variants (checking top-level products and category items subcollections)
 */
export const getAllProducts = async () => {
  if (!isFirebaseConfigured) {
    return getStoredProducts();
  }

  try {
    let topList = [];
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
      querySnapshot.forEach((docSnap) => {
        topList.push({ id: docSnap.id, ...docSnap.data() });
      });
    } catch (e) {
      console.warn('[Firestore] Top-level products query failed:', e.message);
    }

    let itemsList = [];
    try {
      const itemsQuery = query(collectionGroup(db, 'items'));
      const snapshot = await getDocs(itemsQuery);
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const cat = d.categoryName || d.category || docSnap.ref.parent?.parent?.id || 'General';
        itemsList.push({
          id: docSnap.id,
          ...d,
          categoryName: cat,
          categoryId: d.categoryId || cat
        });
      });
    } catch (cgErr) {
      console.warn('[Firestore] Subcollection items query failed:', cgErr.message);
    }

    const combined = [...topList, ...itemsList];
    const map = new Map();

    combined.forEach((item) => {
      // Ignore documents that are not actual products (e.g. empty category placeholder documents)
      if (!item.name && !item.productName && !item.title) return;

      const normName = item.name || item.productName || item.title || 'Unnamed Product';
      const normTamil = item.tamilName || item.nameTamil || '';
      const normCategoryName = item.categoryName || item.category || 'General';
      const normCategoryId = item.categoryId || item.category || 'General';
      const normBrandName = item.brandName || item.brand || 'Sri Amman Store';
      const normImage = item.imageUrl || item.frontImageUrl || item.image || (Array.isArray(item.imageUrls) ? item.imageUrls[0] : '') || '';

      let rawVariants = Array.isArray(item.variants) && item.variants.length > 0 ? item.variants : null;

      if (!rawVariants && Array.isArray(item.options) && item.options.length > 0) {
        rawVariants = item.options.map((opt, idx) => ({
          id: `var-${item.id}-${idx}`,
          name: opt.unit || opt.unitSize || `${opt.weight || 500}g`,
          sellingPrice: Number(opt.sellingPrice ?? opt.price ?? item.sellingPrice ?? item.price ?? 0),
          mrp: Number(opt.mrp ?? item.mrp ?? opt.sellingPrice ?? 0),
          stock: Number(opt.stock ?? item.stock ?? 10),
          sku: item.sku || `SKU-${item.id}-${idx}`,
          barcode: item.barcode || ''
        }));
      }

      if (!rawVariants) {
        const rootSellingPrice = Number(item.sellingPrice ?? item.price ?? item.offerPrice ?? item.discountPrice ?? 0);
        const rootMrp = Number(item.mrp ?? item.originalPrice ?? item.price ?? rootSellingPrice);
        rawVariants = [
          {
            id: `var-${item.id}`,
            name: item.unit || item.weight || '1 pkg',
            mrp: rootMrp,
            sellingPrice: rootSellingPrice,
            stock: Number(item.stock ?? 10),
            sku: item.sku || `SKU-${item.id}`,
            barcode: item.barcode || ''
          }
        ];
      }

      const normalizedVariants = rawVariants.map((v, idx) => {
        const sPrice = Number(v.sellingPrice ?? v.price ?? v.offerPrice ?? item.sellingPrice ?? item.price ?? 0);
        const mPrice = Number(v.mrp ?? v.originalPrice ?? item.mrp ?? item.price ?? sPrice);
        return {
          ...v,
          id: v.id || `var-${item.id}-${idx}`,
          name: v.name || v.weight || v.unit || '1 pkg',
          sellingPrice: sPrice,
          price: sPrice,
          mrp: mPrice >= sPrice ? mPrice : sPrice,
          stock: Number(v.stock ?? item.stock ?? 10),
          sku: v.sku || item.sku || `SKU-${item.id}-${idx}`,
          barcode: v.barcode || item.barcode || ''
        };
      });

      const primaryVariant = normalizedVariants[0] || {};

      const normalized = {
        ...item,
        id: item.id,
        name: normName,
        tamilName: normTamil,
        nameTamil: normTamil,
        categoryName: normCategoryName,
        categoryId: normCategoryId,
        brandName: normBrandName,
        imageUrl: normImage,
        frontImageUrl: normImage,
        price: primaryVariant.sellingPrice,
        sellingPrice: primaryVariant.sellingPrice,
        mrp: primaryVariant.mrp,
        stock: primaryVariant.stock,
        unit: primaryVariant.name || item.unit || '1 pkg',
        variants: normalizedVariants,
        status: item.status || 'active'
      };

      map.set(item.id, normalized);
    });

    const resultList = Array.from(map.values());
    if (resultList.length > 0) {
      saveStoredProducts(resultList);
      return resultList;
    }

    return getStoredProducts();
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

const formatRecordForUserApp = (record) => {
  const normName = record.name || record.productName || record.title || 'Grocery Item';
  const normTamil = record.tamilName || record.nameTamil || '';
  const img = record.imageUrl || record.frontImageUrl || record.image || (Array.isArray(record.imageUrls) ? record.imageUrls[0] : '') || '';

  const rawVariants = Array.isArray(record.variants) && record.variants.length > 0 ? record.variants : [];
  const primary = rawVariants[0] || {};

  const sPrice = Number(primary.sellingPrice ?? primary.price ?? record.sellingPrice ?? record.price ?? 0);
  const mrpVal = Number(primary.mrp ?? record.mrp ?? sPrice);
  const stockVal = Number(primary.stock ?? record.stock ?? 10);

  const options = rawVariants.map((v) => ({
    unit: v.name || `${v.weight || 500}${v.unit || 'g'}`,
    unitSize: v.unit || `${v.weight || 500}${v.unit || 'g'}`,
    weight: v.weight || 500,
    sellingPrice: Number(v.sellingPrice ?? v.price ?? sPrice),
    price: Number(v.sellingPrice ?? v.price ?? sPrice),
    mrp: Number(v.mrp ?? mrpVal),
    stock: Number(v.stock ?? stockVal)
  }));

  if (options.length === 0) {
    options.push({
      unit: record.unit || '1 pkg',
      unitSize: record.unit || '1 pkg',
      weight: record.weight || 500,
      sellingPrice: sPrice,
      price: sPrice,
      mrp: mrpVal,
      stock: stockVal
    });
  }

  const imageUrls = [record.frontImageUrl || record.imageUrl, record.backImageUrl].filter(Boolean);
  if (imageUrls.length === 0 && img) {
    imageUrls.push(img);
  }

  return {
    ...record,
    name: normName,
    productName: normName,
    nameTamil: normTamil,
    tamilName: normTamil,
    categoryName: record.categoryName || record.category || 'General',
    categoryId: record.categoryId || record.category || 'General',
    brandName: record.brandName || record.brand || 'Sri Amman Store',
    sellingPrice: sPrice,
    price: sPrice,
    mrp: mrpVal,
    stock: stockVal,
    unit: primary.name || record.unit || '1 pkg',
    imageUrl: img,
    frontImageUrl: img,
    imageUrls,
    options,
    variants: rawVariants.length > 0 ? rawVariants : options
  };
};

/**
 * Create a new product with variants
 */
export const createProduct = async (productData, user, { requireRemote = false } = {}) => {
  const newId = `prod-${Date.now().toString(36)}`;
  const productRecord = formatRecordForUserApp({
    ...productData,
    id: newId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: productData.status || 'active'
  });

  const currentProducts = getStoredProducts();
  currentProducts.unshift(productRecord);
  saveStoredProducts(currentProducts);

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.PRODUCTS, newId), {
        ...productRecord,
        serverTimestamp: serverTimestamp()
      });

      // Dual write to subcollection products/{category}/items/{id} for legacy user app compatibility
      const categoryPath = productRecord.categoryName || productRecord.categoryId || 'General';
      try {
        await setDoc(doc(db, COLLECTIONS.PRODUCTS, categoryPath, 'items', newId), {
          ...productRecord,
          category: categoryPath,
          serverTimestamp: serverTimestamp()
        });
      } catch (subErr) {
        console.warn('[Firestore] Subcollection dual write notice:', subErr.message);
      }
    } catch (err) {
      console.error('[Firestore] Error saving product:', err);
      if (requireRemote) throw err;
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
  const oldProduct = index !== -1 ? currentProducts[index] : {};

  const updatedRecord = formatRecordForUserApp({
    ...oldProduct,
    ...updatedData,
    id,
    updatedAt: new Date().toISOString()
  });

  if (index !== -1) {
    currentProducts[index] = updatedRecord;
  } else {
    currentProducts.unshift(updatedRecord);
  }
  saveStoredProducts(currentProducts);

  if (isFirebaseConfigured) {
    try {
      await setDoc(
        doc(db, COLLECTIONS.PRODUCTS, id),
        {
          ...updatedRecord,
          serverTimestamp: serverTimestamp()
        },
        { merge: true }
      );

      const categoryPath = updatedRecord.categoryName || updatedRecord.categoryId || updatedRecord.category || 'General';
      try {
        await setDoc(
          doc(db, COLLECTIONS.PRODUCTS, categoryPath, 'items', id),
          {
            ...updatedRecord,
            category: categoryPath,
            serverTimestamp: serverTimestamp()
          },
          { merge: true }
        );
      } catch (subErr) {
        console.warn('[Firestore] Subcollection update notice:', subErr.message);
      }
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
    reason: `Updated product specifications for ${updatedRecord.name || id}`,
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

  // Remove from local storage cache
  const filtered = currentProducts.filter((p) => p.id !== id);
  saveStoredProducts(filtered);

  if (isFirebaseConfigured) {
    try {
      // 1. Delete top-level document products/{id}
      try {
        await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, id));
      } catch (topErr) {
        console.warn('[Firestore] Top-level product delete notice:', topErr.message);
      }

      // 2. Delete subcollection items products/{category}/items/{id}
      if (target?.categoryName || target?.categoryId || target?.category) {
        const catPath = target.categoryName || target.categoryId || target.category;
        try {
          await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, catPath, 'items', id));
        } catch (subErr) {
          console.warn('[Firestore] Subcollection item delete notice:', subErr.message);
        }
      }

      // 3. Scan collectionGroup('items') to find and delete any matching document ID
      try {
        const itemsQuery = query(collectionGroup(db, 'items'));
        const itemsSnap = await getDocs(itemsQuery);
        const subDeletes = [];
        itemsSnap.forEach((docSnap) => {
          if (docSnap.id === id) {
            subDeletes.push(deleteDoc(docSnap.ref));
          }
        });
        if (subDeletes.length > 0) {
          await Promise.all(subDeletes);
        }
      } catch (cgErr) {
        console.warn('[Firestore] CollectionGroup item delete notice:', cgErr.message);
      }
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
    previousState: { name: target?.name || id }
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
