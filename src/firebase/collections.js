/**
 * Firestore Collection Architecture Definition
 * Canonical collection names and schema blueprints for Sri Amman Store Grocery Admin Management System.
 */

export const COLLECTIONS = {
  // Identity, Roles & Permissions
  USERS: 'users',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',

  // Catalog & Hierarchy
  PRODUCTS: 'products',
  PRODUCT_VARIANTS: 'productVariants',
  CATEGORIES: 'categories',
  BRANDS: 'brands',

  // Inventory & Warehouse Operations
  INVENTORY: 'inventory',
  STOCK_MOVEMENTS: 'stockMovements',
  BATCHES: 'batches',

  // Customers & CRM
  CUSTOMERS: 'customers',
  ADDRESSES: 'addresses',

  // Orders & Fulfillment
  ORDERS: 'orders',
  ORDER_ITEMS: 'orderItems',
  ORDER_STATUS_HISTORY: 'orderStatusHistory',

  // Delivery & Route Logistics
  DELIVERY_AGENTS: 'deliveryAgents',
  DELIVERY_BATCHES: 'deliveryBatches',
  DELIVERY_STOPS: 'deliveryStops',

  // Financials, Payments & Reconciliation
  PAYMENTS: 'payments',
  COD_COLLECTIONS: 'codCollections',
  RETURNS: 'returns',
  REFUNDS: 'refunds',

  // Promotions & Marketing
  PROMO_CODES: 'promoCodes',
  PROMO_USAGE: 'promoUsage',
  BANNERS: 'banners',
  HOMEPAGE_SECTIONS: 'homepageSections',
  ANNOUNCEMENTS: 'announcements',
  CAMPAIGNS: 'campaigns',
  NOTIFICATION_TEMPLATES: 'notificationTemplates',
  NOTIFICATION_LOGS: 'notificationLogs',

  // Customer Loyalty & Feedback
  PRODUCT_REQUESTS: 'productRequests',
  SMART_COIN_TRANSACTIONS: 'smartCoinTransactions',

  // Governance, Audit Trail & Settings
  ACTIVITY_LOGS: 'activityLogs',
  BUSINESS_SETTINGS: 'businessSettings'
};

/**
 * Storage Path Constants
 */
export const STORAGE_PATHS = {
  PRODUCTS: (productId) => `products/${productId}`,
  BANNERS: (bannerId) => `banners/${bannerId}`,
  CUSTOMERS: (customerId) => `customers/${customerId}`,
  ORDERS: (orderId) => `orders/${orderId}`,
  DELIVERY_PROOF: (orderId) => `deliveryProof/${orderId}`,
  RETURNS: (returnId) => `returns/${returnId}`,
  STAFF: (staffId) => `staff/${staffId}`
};

/**
 * Collection Metadata Blueprint detailing operational scope and Phase roadmap
 */
export const COLLECTION_METADATA = {
  [COLLECTIONS.USERS]: {
    phase: 'Phase 1',
    description: 'System operators, staff accounts, role mappings and active state',
    indexes: ['role', 'status', 'email']
  },
  [COLLECTIONS.ROLES]: {
    phase: 'Phase 1',
    description: 'Role definitions, granular permission arrays and scope limitations',
    indexes: ['name', 'isSystemRole']
  },
  [COLLECTIONS.PERMISSIONS]: {
    phase: 'Phase 1',
    description: 'Master catalog of granular permission keys',
    indexes: ['module', 'key']
  },
  [COLLECTIONS.PRODUCTS]: {
    phase: 'Phase 2',
    description: 'Grocery master products (Cooking powders, Spices, Rice, Dal, FMCG)',
    indexes: ['categoryId', 'brandId', 'status', 'isFeatured', 'createdAt']
  },
  [COLLECTIONS.PRODUCT_VARIANTS]: {
    phase: 'Phase 2',
    description: 'Pack sizes (e.g. 100g, 500g, 1kg, 5kg), barcodes, SKUs and variant pricing',
    indexes: ['productId', 'barcode', 'sku', 'status']
  },
  [COLLECTIONS.CATEGORIES]: {
    phase: 'Phase 2',
    description: 'Category hierarchy (Spices, Grains, Flours, Oils, Personal Care)',
    indexes: ['parentId', 'displayOrder', 'status']
  },
  [COLLECTIONS.BRANDS]: {
    phase: 'Phase 2',
    description: 'Brand definitions and manufacturer credentials',
    indexes: ['name', 'status']
  },
  [COLLECTIONS.INVENTORY]: {
    phase: 'Phase 3',
    description: 'Real-time stock on hand, reserved stock, safety stock and reorder levels',
    indexes: ['productId', 'variantId', 'stockCondition', 'updatedAt']
  },
  [COLLECTIONS.STOCK_MOVEMENTS]: {
    phase: 'Phase 3',
    description: 'Immutable ledger of stock adjustments, receipts, damages and sales deductions',
    indexes: ['variantId', 'type', 'createdAt', 'performedBy']
  },
  [COLLECTIONS.BATCHES]: {
    phase: 'Phase 3',
    description: 'Grocery batch tracking, manufacturing dates and expiry tracking',
    indexes: ['variantId', 'expiryDate', 'batchNumber', 'status']
  },
  [COLLECTIONS.CUSTOMERS]: {
    phase: 'Phase 3',
    description: 'Customer profiles, order frequency, Smart Coins balance and phone numbers',
    indexes: ['phone', 'email', 'createdAt', 'status']
  },
  [COLLECTIONS.ADDRESSES]: {
    phase: 'Phase 3',
    description: 'Customer delivery addresses, geo-locations and landmark instructions',
    indexes: ['customerId', 'isDefault']
  },
  [COLLECTIONS.ORDERS]: {
    phase: 'Phase 3',
    description: 'Customer grocery orders, fulfillment stages, payment status and dispatch batches',
    indexes: ['status', 'paymentStatus', 'createdAt', 'deliveryAgentId', 'deliveryDate']
  },
  [COLLECTIONS.ORDER_ITEMS]: {
    phase: 'Phase 3',
    description: 'Normalized items per order with variant snapshot and unit price',
    indexes: ['orderId', 'variantId']
  },
  [COLLECTIONS.ORDER_STATUS_HISTORY]: {
    phase: 'Phase 3',
    description: 'Audit log of state transitions (Placed -> Packed -> Dispatched -> Delivered)',
    indexes: ['orderId', 'timestamp']
  },
  [COLLECTIONS.DELIVERY_AGENTS]: {
    phase: 'Phase 4',
    description: 'Active fleet riders, current location coordinates, vehicle details and active load',
    indexes: ['status', 'activeBatchId', 'phoneNumber']
  },
  [COLLECTIONS.DELIVERY_BATCHES]: {
    phase: 'Phase 4',
    description: 'Grouped delivery runs optimized by geographical clusters/routes',
    indexes: ['agentId', 'status', 'date']
  },
  [COLLECTIONS.DELIVERY_STOPS]: {
    phase: 'Phase 4',
    description: 'Sequential drop-off points with delivery sequence, OTP verification and proof',
    indexes: ['batchId', 'agentId', 'status', 'sequenceNumber']
  },
  [COLLECTIONS.PAYMENTS]: {
    phase: 'Phase 4',
    description: 'Payment records (UPI, Card, Net Banking, Razorpay, COD)',
    indexes: ['orderId', 'method', 'status', 'createdAt']
  },
  [COLLECTIONS.COD_COLLECTIONS]: {
    phase: 'Phase 4',
    description: 'Cash-On-Delivery collections by agents and daily end-of-day accounts handoff',
    indexes: ['agentId', 'settlementStatus', 'collectionDate']
  },
  [COLLECTIONS.RETURNS]: {
    phase: 'Phase 4',
    description: 'Customer return requests, inspection condition and verification photos',
    indexes: ['orderId', 'status', 'createdAt']
  },
  [COLLECTIONS.REFUNDS]: {
    phase: 'Phase 4',
    description: 'Processed financial refunds with accounting audit reasons',
    indexes: ['orderId', 'status', 'processedBy', 'createdAt']
  },
  [COLLECTIONS.PROMO_CODES]: {
    phase: 'Phase 5',
    description: 'Discount coupons, minimum cart values and grocery basket rules',
    indexes: ['code', 'status', 'startDate', 'endDate']
  },
  [COLLECTIONS.PROMO_USAGE]: {
    phase: 'Phase 5',
    description: 'Redemption history tracking customer discount limits',
    indexes: ['promoCodeId', 'customerId']
  },
  [COLLECTIONS.BANNERS]: {
    phase: 'Phase 5',
    description: 'Promotional hero banners, flash sale graphics and click links',
    indexes: ['status', 'displayOrder', 'placement']
  },
  [COLLECTIONS.HOMEPAGE_SECTIONS]: {
    phase: 'Phase 5',
    description: 'Dynamic frontend store sections (Featured Spices, Daily Essentials)',
    indexes: ['status', 'displayOrder']
  },
  [COLLECTIONS.ANNOUNCEMENTS]: {
    phase: 'Phase 5',
    description: 'Storewide announcements, holiday timings and delivery advisories',
    indexes: ['status', 'createdAt']
  },
  [COLLECTIONS.CAMPAIGNS]: {
    phase: 'Phase 5',
    description: 'Push notification and SMS marketing broadcast campaigns',
    indexes: ['status', 'scheduledAt', 'type']
  },
  [COLLECTIONS.NOTIFICATION_TEMPLATES]: {
    phase: 'Phase 5',
    description: 'Standard transactional and marketing messaging templates',
    indexes: ['event', 'type']
  },
  [COLLECTIONS.NOTIFICATION_LOGS]: {
    phase: 'Phase 5',
    description: 'Delivery receipts and FCM delivery statuses',
    indexes: ['recipientId', 'sentAt']
  },
  [COLLECTIONS.PRODUCT_REQUESTS]: {
    phase: 'Phase 5',
    description: 'Customer wishlists and requests for unlisted grocery items',
    indexes: ['status', 'createdAt']
  },
  [COLLECTIONS.SMART_COIN_TRANSACTIONS]: {
    phase: 'Phase 5',
    description: 'Customer loyalty coin earn, burns and adjustments',
    indexes: ['customerId', 'type', 'createdAt']
  },
  [COLLECTIONS.ACTIVITY_LOGS]: {
    phase: 'Phase 1',
    description: 'Immutable security and operations audit log for all staff actions',
    indexes: ['userId', 'action', 'module', 'timestamp']
  },
  [COLLECTIONS.BUSINESS_SETTINGS]: {
    phase: 'Phase 1',
    description: 'Global grocery business parameters, tax, store hours, COD limits, notifications',
    indexes: ['key']
  }
};
