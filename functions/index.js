const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');

initializeApp();
setGlobalOptions({ region: 'us-central1' });

const db = getFirestore();
const staffRoles = new Set([
  'super_admin',
  'store_manager',
  'inventory_staff',
  'packing_staff',
  'delivery_manager',
  'delivery_agent',
  'marketing_staff',
  'accounts_staff',
  'manual_staff'
]);

const syncClaimsFromProfile = async (uid) => {
  let authUser;
  try {
    authUser = await getAuth().getUser(uid);
  } catch (error) {
    if (error.code === 'auth/user-not-found') return;
    throw error;
  }

  const profileSnapshot = await db.collection('users').doc(uid).get();
  const profile = profileSnapshot.exists ? profileSnapshot.data() : null;
  const activeRole = profile?.status === 'active' && staffRoles.has(profile.role)
    ? profile.role
    : null;
  const claims = { ...authUser.customClaims };
  delete claims.role;
  delete claims.staffActive;

  if (activeRole) {
    claims.role = activeRole;
    claims.staffActive = true;
  }

  await getAuth().setCustomUserClaims(uid, claims);
  return { role: activeRole, staffActive: Boolean(activeRole) };
};

exports.resolveMyStaffProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before loading a staff profile.');
  }

  const uid = request.auth.uid;
  const users = db.collection('users');
  const currentSnapshot = await users.doc(uid).get();
  if (currentSnapshot.exists) {
    return { ...currentSnapshot.data(), uid };
  }

  const email = request.auth.token.email;
  if (!email || request.auth.token.email_verified !== true) {
    throw new HttpsError(
      'failed-precondition',
      'No staff profile is linked to this account. Verify its email or ask the Super Admin to provision the staff profile.'
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const matchesSnapshot = await users.get();
  const matches = matchesSnapshot.docs.filter((staffDoc) => {
    const profileEmail = staffDoc.data().email;
    return typeof profileEmail === 'string' &&
      profileEmail.trim().toLowerCase() === normalizedEmail;
  });

  if (matches.length !== 1) {
    const profileAfterLookup = await users.doc(uid).get();
    if (profileAfterLookup.exists) {
      return { ...profileAfterLookup.data(), uid };
    }
    throw new HttpsError(
      'failed-precondition',
      matches.length > 1
        ? 'Multiple staff profiles use this email. Ask the Super Admin to resolve the duplicate profiles.'
        : 'No staff profile is linked to this account. Ask the Super Admin to provision your staff profile.'
    );
  }

  const profileRef = users.doc(uid);
  const legacyRef = matches[0].ref;
  return db.runTransaction(async (transaction) => {
    const currentProfile = await transaction.get(profileRef);
    if (currentProfile.exists) {
      return { ...currentProfile.data(), uid };
    }

    const legacySnapshot = await transaction.get(legacyRef);
    if (!legacySnapshot.exists) {
      throw new HttpsError(
        'failed-precondition',
        'No staff profile is linked to this account. Ask the Super Admin to provision your staff profile.'
      );
    }

    const legacyProfile = legacySnapshot.data();
    if (legacyProfile.status !== 'active' || !staffRoles.has(legacyProfile.role)) {
      throw new HttpsError(
        'permission-denied',
        'This account is not assigned an active staff role. Ask the Super Admin to check its role and status.'
      );
    }

    const migratedProfile = { ...legacyProfile, uid };
    transaction.create(profileRef, migratedProfile);
    if (legacyRef.path !== profileRef.path) {
      transaction.delete(legacyRef);
    }
    return migratedProfile;
  });
});

exports.syncStaffRoleClaims = onDocumentWritten('users/{userId}', async (event) => {
  await syncClaimsFromProfile(event.params.userId);
});

const normalizeOrderStatus = (status) => String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
const toPositiveQuantity = (value) => {
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
};

exports.syncOrderInventory = onDocumentWritten(
  { document: 'orders/{orderId}', retry: true },
  async (event) => {
    const before = event.data.before.exists ? event.data.before.data() : null;
    const after = event.data.after.exists ? event.data.after.data() : null;
    if (!after) return;

    const wasCancelled = normalizeOrderStatus(before?.status) === 'cancelled';
    const isCancelled = normalizeOrderStatus(after.status) === 'cancelled';
    const isNewOrder = !before;
    if ((!isNewOrder && (wasCancelled || !isCancelled)) || (isNewOrder && isCancelled)) return;

    const orderRef = event.data.after.ref;
    const orderId = event.params.orderId;

    await db.runTransaction(async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) return;

      const order = orderSnapshot.data();
      const orderIsCancelled = normalizeOrderStatus(order.status) === 'cancelled';
      const isManualOrder = order.orderSource === 'manual';
      const shouldDeduct = !isManualOrder &&
        isNewOrder &&
        !orderIsCancelled &&
        !order.inventoryStockDeductedAt;
      const shouldRestore = !isNewOrder &&
        !isManualOrder &&
        isCancelled &&
        orderIsCancelled &&
        Boolean(order.inventoryStockDeductedAt) &&
        !order.inventoryStockRestoredAt;
      if (!shouldDeduct && !shouldRestore) return;

      const items = Array.isArray(order.items)
        ? [...order.items]
        : Array.isArray(order.cartItems)
          ? [...order.cartItems]
          : [];
      const stockDeductions = { ...(order.inventoryStockDeductions || {}) };
      const productSnapshots = await transaction.get(db.collection('products'));
      const productsById = new Map(productSnapshots.docs.map((snapshot) => [snapshot.id, {
        id: snapshot.id,
        ref: snapshot.ref,
        data: snapshot.data()
      }]));
      const productsBySku = new Map();
      const addProductSkus = (product) => {
        for (const variant of product.data.variants || product.data.options || []) {
          const sku = variant.sku || variant.barcode;
          if (sku) productsBySku.set(String(sku).trim().toLowerCase(), product);
        }
        if (product.data.sku || product.data.barcode) {
          productsBySku.set(String(product.data.sku || product.data.barcode).trim().toLowerCase(), product);
        }
      };
      for (const product of productsById.values()) {
        addProductSkus(product);
      }

      const hasUnmatchedProduct = items.some((item) => {
        const productId = item?.productId || item?.productID || item?.productDocId || item?.product?.id;
        const sku = String(item?.sku || item?.barcode || '').trim().toLowerCase();
        return !(productId && productsById.has(String(productId))) && !(sku && productsBySku.has(sku));
      });
      if (hasUnmatchedProduct) {
        const nestedProducts = await transaction.get(db.collectionGroup('items'));
        nestedProducts.forEach((snapshot) => {
          const path = snapshot.ref.path.split('/');
          if (path.length !== 4 || path[0] !== 'products' || path[2] !== 'items' || productsById.has(snapshot.id)) return;
          const data = snapshot.data();
          const product = {
            id: snapshot.id,
            ref: db.collection('products').doc(snapshot.id),
            mirrorRef: snapshot.ref,
            data: { ...data, categoryName: data.categoryName || data.category || path[1] }
          };
          productsById.set(product.id, product);
          addProductSkus(product);
        });
      }

      const stockUpdates = new Map();
      const productUpdates = new Map();
      const errors = [];
      const movementWrites = [];

      items.forEach((item, index) => {
        const itemData = item || {};
        const previousDeduction = stockDeductions[String(index)] || {};
        const explicitProductId = previousDeduction.productId ||
          itemData.productId ||
          itemData.productID ||
          itemData.productDocId ||
          itemData.product?.id ||
          (productsById.has(String(itemData.id)) ? itemData.id : null);
        const sku = String(previousDeduction.sku || itemData.sku || itemData.barcode || '').trim().toLowerCase();
        const product = (explicitProductId && productsById.get(String(explicitProductId))) ||
          (sku && productsBySku.get(sku));
        if (!product) {
          errors.push(`Item ${itemData.productName || itemData.name || index + 1}: product not found`);
          if (shouldDeduct) itemData.inventoryDeductedQuantity = 0;
          return;
        }

        let productUpdate = productUpdates.get(product.id);
        if (!productUpdate) {
          const variantsField = Array.isArray(product.data.variants) && product.data.variants.length > 0
            ? 'variants'
            : Array.isArray(product.data.options) && product.data.options.length > 0
              ? 'options'
              : null;
          productUpdate = {
            product,
            variantsField,
            variants: variantsField ? [...product.data[variantsField]] : []
          };
          productUpdates.set(product.id, productUpdate);
        }
        const variants = productUpdate.variants;
        const requestedVariantId = previousDeduction.variantId ||
          itemData.variantId ||
          itemData.productVariantId ||
          itemData.variant?.id;
        const requestedVariantName = String(
          previousDeduction.variantName ||
          itemData.variantName ||
          itemData.packSize ||
          itemData.weight ||
          itemData.unit ||
          ''
        ).trim().toLowerCase();
        const requestedVariantSku = String(previousDeduction.sku || itemData.sku || itemData.barcode || '').trim().toLowerCase();
        let variantIndex = variants.findIndex((variant) =>
          (requestedVariantId && String(variant.id) === String(requestedVariantId)) ||
          (requestedVariantSku && [variant.sku, variant.barcode]
            .some((value) => value && String(value).trim().toLowerCase() === requestedVariantSku)) ||
          (requestedVariantName && [variant.name, variant.unit, variant.weight]
            .some((value) => value && String(value).trim().toLowerCase() === requestedVariantName))
        );
        if (variantIndex === -1 && variants.length === 1) variantIndex = 0;
        if (variants.length > 0 && variantIndex === -1) {
          errors.push(`Item ${itemData.productName || itemData.name || index + 1}: variant not found`);
          if (shouldDeduct) itemData.inventoryDeductedQuantity = 0;
          return;
        }

        const variant = variantIndex === -1 ? null : variants[variantIndex];
        const variantId = String(variant?.id || product.id);
        const variantName = String(variant?.name || product.data.unit || '');
        const stockKey = `${product.id}/${variantId}`;
        let update = stockUpdates.get(stockKey);
        if (!update) {
          const currentStock = Number(variant?.stock ?? product.data.stock ?? 0);
          update = {
            product,
            productUpdate,
            variantIndex,
            variantId,
            variantName,
            sku: variant?.sku || itemData.sku || product.data.sku || '',
            stock: Number.isFinite(currentStock) ? Math.max(0, currentStock) : 0
          };
          stockUpdates.set(stockKey, update);
        }

        const requestedQuantity = toPositiveQuantity(itemData.quantity ?? itemData.qty ?? 1);
        const changedQuantity = shouldDeduct
          ? -Math.min(update.stock, requestedQuantity)
          : toPositiveQuantity(previousDeduction.quantity ?? itemData.inventoryDeductedQuantity);
        if (shouldDeduct && Math.abs(changedQuantity) < requestedQuantity) {
          errors.push(`Item ${itemData.productName || itemData.name || index + 1}: insufficient stock`);
        }
        if (shouldDeduct) {
          itemData.inventoryDeductedQuantity = Math.abs(changedQuantity);
          stockDeductions[String(index)] = {
            productId: product.id,
            variantId: update.variantId,
            variantName: update.variantName,
            sku: update.sku,
            quantity: Math.abs(changedQuantity)
          };
        }
        update.stock += changedQuantity;
        movementWrites.push({
          index,
          product: update.product,
          variantId: update.variantId,
          variantName: update.variantName,
          sku: update.sku,
          previousQuantity: update.stock - changedQuantity,
          changedQuantity
        });
      });

      for (const update of stockUpdates.values()) {
        if (update.productUpdate.variantsField) {
          update.productUpdate.variants[update.variantIndex] = {
            ...update.productUpdate.variants[update.variantIndex],
            stock: update.stock
          };
        }
      }

      const productWrites = Array.from(productUpdates.values()).map((update) => {
        const primaryVariantStock = Number(update.variants[0]?.stock);
        const defaultStock = stockUpdates.get(`${update.product.id}/${update.product.id}`)?.stock;
        return {
          ...update,
          productData: {
            ...(update.variantsField ? { [update.variantsField]: update.variants } : {}),
            stock: update.variantsField
              ? (Number.isFinite(primaryVariantStock) ? primaryVariantStock : Number(update.product.data.stock ?? 0))
              : defaultStock ?? Number(update.product.data.stock ?? 0),
            updatedAt: new Date().toISOString()
          },
          categoryRef: update.product.mirrorRef || (() => {
            const categoryPath = update.product.data.categoryName ||
              update.product.data.categoryId ||
              update.product.data.category;
            return categoryPath ? db.doc(`products/${categoryPath}/items/${update.product.id}`) : null;
          })()
        };
      });
      const categorySnapshots = await Promise.all(
        productWrites.map(({ categoryRef }) => categoryRef ? transaction.get(categoryRef) : Promise.resolve(null))
      );

      productWrites.forEach((write, index) => {
        transaction.set(write.product.ref, write.productData, { merge: true });
        if (write.categoryRef && categorySnapshots[index]?.exists) {
          transaction.set(write.categoryRef, write.productData, { merge: true });
        }
      });

      for (const movement of movementWrites) {
        if (movement.changedQuantity === 0) continue;
        const movementId = `${orderId}_${movement.index}_${shouldDeduct ? 'sale' : 'sale-reversal'}`;
        transaction.set(db.collection('stockMovements').doc(movementId), {
          orderId,
          productId: movement.product.id,
          productName: movement.product.data.name || movement.product.data.productName || 'Grocery Item',
          variantId: movement.variantId,
          variantName: movement.variantName,
          sku: movement.sku,
          previousQuantity: movement.previousQuantity,
          changedQuantity: movement.changedQuantity,
          newQuantity: movement.previousQuantity + movement.changedQuantity,
          movementType: shouldDeduct ? 'Sale' : 'Sale Reversal',
          reason: shouldDeduct
            ? `Stock deducted for order ${order.orderNumber || orderId}`
            : `Stock restored after cancellation of order ${order.orderNumber || orderId}`,
          createdAt: new Date().toISOString(),
          source: 'order'
        });
      }

      const updatedOrder = {
        ...(Array.isArray(order.items) || !Array.isArray(order.cartItems) ? { items } : { cartItems: items }),
        inventoryStockStatus: errors.length ? 'needs_review' : shouldDeduct ? 'deducted' : 'restored',
        inventoryStockDeductions: stockDeductions,
        inventoryStockErrors: errors,
        inventoryStockUpdatedAt: new Date().toISOString(),
        ...(shouldDeduct ? { inventoryStockDeductedAt: new Date().toISOString() } : {}),
        ...(shouldRestore ? { inventoryStockRestoredAt: new Date().toISOString() } : {})
      };
      transaction.set(orderRef, updatedOrder, { merge: true });

      if (errors.length) {
        console.error(`Inventory sync needs review for order ${orderId}: ${errors.join('; ')}`);
      }
    });
  }
);

exports.syncMyStaffRoleClaims = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before synchronizing staff access.');
  }

  return syncClaimsFromProfile(request.auth.uid);
});
