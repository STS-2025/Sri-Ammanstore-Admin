import { collection, doc, getDocs, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { COLLECTIONS } from './collections';
import { INITIAL_STOCK_MOVEMENTS } from '../data/grocerySeedData';
import { getAllProducts } from './productService';
import { logActivity } from './auditLogger';

const MOVEMENTS_STORAGE_KEY = 'grocery_admin_stock_movements_v2';
const BATCHES_STORAGE_KEY = 'grocery_admin_batches_v2';

const getStoredMovements = () => {
  try {
    const raw = localStorage.getItem(MOVEMENTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(INITIAL_STOCK_MOVEMENTS));
      return INITIAL_STOCK_MOVEMENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_STOCK_MOVEMENTS;
  }
};

const saveStoredMovements = (movements) => {
  try {
    localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(movements));
  } catch (e) {
    console.error('Failed to cache movements', e);
  }
};

/**
 * Fetch all stock movements for the immutable audit ledger
 */
export const getStockMovements = async () => {
  if (!isFirebaseConfigured) {
    return getStoredMovements();
  }

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.STOCK_MOVEMENTS));
    if (snap.empty) return getStoredMovements();
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (e) {
    return getStoredMovements();
  }
};

/**
 * Record a formal stock adjustment / intake / damage movement
 */
export const recordStockMovement = async ({
  productId,
  productName,
  variantId,
  variantName,
  sku,
  previousQuantity,
  changedQuantity,
  movementType,
  supplierName,
  reason,
  user
}) => {
  const newQuantity = Math.max(0, Number(previousQuantity) + Number(changedQuantity));
  const newMovement = {
    id: `mov-${Date.now().toString(36)}`,
    productId,
    productName,
    variantId,
    variantName,
    sku,
    previousQuantity: Number(previousQuantity),
    changedQuantity: Number(changedQuantity),
    newQuantity,
    movementType,
    supplierName: supplierName || 'Sri Amman Central Wholesale Distributors',
    reason: reason || `Inventory ${movementType} adjustment`,
    userName: user?.displayName || user?.email || 'Operations Staff',
    userRole: user?.role || 'inventory_staff',
    createdAt: new Date().toISOString()
  };

  // Update local movements
  const movements = getStoredMovements();
  movements.unshift(newMovement);
  saveStoredMovements(movements);

  // Sync to products store
  try {
    const products = JSON.parse(localStorage.getItem('grocery_admin_products_v2') || '[]');
    const pIndex = products.findIndex((p) => p.id === productId);
    if (pIndex !== -1) {
      const vIndex = (products[pIndex].variants || []).findIndex((v) => v.id === variantId);
      if (vIndex !== -1) {
        products[pIndex].variants[vIndex].stock = newQuantity;
        localStorage.setItem('grocery_admin_products_v2', JSON.stringify(products));
      }
    }
  } catch (err) {
    console.warn('Local variant stock sync notice:', err);
  }

  // Save to Firestore if available
  if (isFirebaseConfigured) {
    try {
      await addDoc(collection(db, COLLECTIONS.STOCK_MOVEMENTS), {
        ...newMovement,
        serverTimestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('[Firestore] Error logging stock movement:', err);
    }
  }

  // Immutable audit log
  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: `STOCK_${movementType.toUpperCase()}`,
    module: 'Inventory',
    targetId: `${productId}/${variantId}`,
    targetType: 'inventory_stock',
    previousState: { stock: previousQuantity },
    newState: { stock: newQuantity, change: changedQuantity },
    reason
  });

  return newMovement;
};

/**
 * Compute inventory overview KPIs directly from active product variants
 */
export const getInventoryMetrics = async () => {
  const products = await getAllProducts();
  const now = new Date();
  const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let totalStockUnits = 0;
  let totalStockValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let expiringSoonCount = 0;
  let expiredCount = 0;

  const flattenedVariants = [];

  products.forEach((p) => {
    (p.variants || []).forEach((v) => {
      const qty = Number(v.stock || 0);
      const purchasePrice = Number(v.purchasePrice || v.sellingPrice * 0.75);
      totalStockUnits += qty;
      totalStockValue += qty * purchasePrice;

      if (qty === 0) {
        outOfStockCount++;
      } else if (qty <= (v.safetyStock || 15)) {
        lowStockCount++;
      }

      let expiryCondition = 'valid';
      if (v.expiryDate) {
        const exp = new Date(v.expiryDate);
        if (exp < now) {
          expiredCount++;
          expiryCondition = 'expired';
        } else if (exp <= thirtyDaysAhead) {
          expiringSoonCount++;
          expiryCondition = 'expiring_soon';
        }
      }

      const supplierName = v.supplierName || p.supplierName || (
        p.categoryName === 'Rice & Grains' ? 'Virudhunagar Paddy & Rice Traders' :
        p.categoryName === 'Edible Oils & Ghee' ? 'Sri Amman Oil Mills Co.' :
        p.categoryName === 'Spices & Masala' ? 'Aachi & Sakthi Spices Agency' :
        'Sri Amman Central Wholesale Distributors'
      );

      flattenedVariants.push({
        productId: p.id,
        productName: p.name,
        tamilName: p.tamilName,
        categoryName: p.categoryName,
        brandName: p.brandName,
        variantId: v.id,
        variantName: v.name,
        weight: v.weight,
        unit: v.unit,
        sku: v.sku,
        barcode: v.barcode,
        purchasePrice,
        mrp: v.mrp,
        sellingPrice: v.sellingPrice,
        stock: qty,
        safetyStock: v.safetyStock || 15,
        batchNumber: v.batchNumber || 'B-GEN-01',
        expiryDate: v.expiryDate || '2027-12-31',
        expiryCondition,
        supplierName
      });
    });
  });

  return {
    totalStockUnits,
    totalStockValue,
    lowStockCount,
    outOfStockCount,
    expiringSoonCount,
    expiredCount,
    flattenedVariants
  };
};
