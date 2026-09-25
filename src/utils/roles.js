import { PERMISSIONS } from './permissions';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  STORE_MANAGER: 'store_manager',
  INVENTORY_STAFF: 'inventory_staff',
  PACKING_STAFF: 'packing_staff',
  DELIVERY_MANAGER: 'delivery_manager',
  DELIVERY_AGENT: 'delivery_agent',
  MARKETING_STAFF: 'marketing_staff',
  ACCOUNTS_STAFF: 'accounts_staff'
};

export const ROLE_DEFINITIONS = {
  [ROLES.SUPER_ADMIN]: {
    id: ROLES.SUPER_ADMIN,
    name: 'Super Admin / Owner',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Full unconstrained platform governance, financial controls and role administration.',
    permissions: Object.values(PERMISSIONS)
  },
  [ROLES.STORE_MANAGER]: {
    id: ROLES.STORE_MANAGER,
    name: 'Store Manager',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Day-to-day retail operations oversight across products, stock, orders and delivery.',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.DASHBOARD_FINANCIAL_METRICS,
      PERMISSIONS.DASHBOARD_OPERATIONAL_METRICS,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.PRODUCTS_CREATE,
      PERMISSIONS.PRODUCTS_EDIT,
      PERMISSIONS.CATEGORIES_MANAGE,
      PERMISSIONS.BRANDS_MANAGE,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.INVENTORY_BATCHES,
      PERMISSIONS.INVENTORY_BARCODES,
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.ORDERS_EDIT,
      PERMISSIONS.ORDERS_PACK,
      PERMISSIONS.ORDERS_PRINT,
      PERMISSIONS.ORDERS_CANCEL,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.CUSTOMERS_MANAGE,
      PERMISSIONS.DELIVERY_VIEW,
      PERMISSIONS.DELIVERY_ASSIGN,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_SALES,
      PERMISSIONS.AUDIT_VIEW
    ]
  },
  [ROLES.INVENTORY_STAFF]: {
    id: ROLES.INVENTORY_STAFF,
    name: 'Inventory Staff',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Warehouse intake, stock count adjustments, shelf audits and expiry monitoring.',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.DASHBOARD_OPERATIONAL_METRICS,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.INVENTORY_BATCHES,
      PERMISSIONS.INVENTORY_BARCODES
    ]
  },
  [ROLES.PACKING_STAFF]: {
    id: ROLES.PACKING_STAFF,
    name: 'Packing & Fulfillment Staff',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    description: 'Order item picking, verification weighing, packing and shipping label generation.',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.DASHBOARD_OPERATIONAL_METRICS,
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.ORDERS_PACK,
      PERMISSIONS.ORDERS_PRINT,
      PERMISSIONS.INVENTORY_VIEW
    ]
  },
  [ROLES.DELIVERY_MANAGER]: {
    id: ROLES.DELIVERY_MANAGER,
    name: 'Delivery Manager',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    description: 'Fleet coordination, delivery route optimization and rider load balancing.',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.DASHBOARD_OPERATIONAL_METRICS,
      PERMISSIONS.DELIVERY_VIEW,
      PERMISSIONS.DELIVERY_ASSIGN,
      PERMISSIONS.DELIVERY_MANAGE_AGENTS,
      PERMISSIONS.REPORTS_VIEW
    ]
  },
  [ROLES.DELIVERY_AGENT]: {
    id: ROLES.DELIVERY_AGENT,
    name: 'Delivery Agent',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    description: 'Assigned order route drop-offs, customer handover, OTP verification and COD collection.',
    permissions: [
      PERMISSIONS.DELIVERY_ASSIGNED_ONLY,
      PERMISSIONS.DELIVERY_UPDATE_STATUS,
      PERMISSIONS.DELIVERY_COLLECT_COD
    ]
  },
  [ROLES.MARKETING_STAFF]: {
    id: ROLES.MARKETING_STAFF,
    name: 'Marketing Staff',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Promotional banners, homepage display banners, campaigns and push messaging.',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.MARKETING_VIEW,
      PERMISSIONS.MARKETING_BANNERS,
      PERMISSIONS.MARKETING_PROMOS,
      PERMISSIONS.MARKETING_CAMPAIGNS,
      PERMISSIONS.MARKETING_NOTIFICATIONS,
      PERMISSIONS.PRODUCT_REQUESTS_MANAGE
    ]
  },
  [ROLES.ACCOUNTS_STAFF]: {
    id: ROLES.ACCOUNTS_STAFF,
    name: 'Accounts & Finance Staff',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    description: 'Sales reconciliation, COD settlement audits, refund validation and financial statements.',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.DASHBOARD_FINANCIAL_METRICS,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_FINANCIAL,
      PERMISSIONS.REPORTS_SALES,
      PERMISSIONS.FINANCIALS_REFUND,
      PERMISSIONS.FINANCIALS_COD_SETTLEMENT,
      PERMISSIONS.SMART_COINS_MANAGE
    ]
  }
};

/**
 * Checks if a specific role possesses the required permission.
 */
export const hasPermission = (userRole, requiredPermission) => {
  if (!userRole) return false;
  if (userRole === ROLES.SUPER_ADMIN) return true;
  const roleDef = ROLE_DEFINITIONS[userRole];
  if (!roleDef) return false;
  return roleDef.permissions.includes(requiredPermission);
};

/**
 * Checks if a user has all of the provided permissions.
 */
export const hasAllPermissions = (userRole, requiredPermissions = []) => {
  if (!userRole) return false;
  if (userRole === ROLES.SUPER_ADMIN) return true;
  return requiredPermissions.every((perm) => hasPermission(userRole, perm));
};

/**
 * Checks if a user has at least one of the provided permissions.
 */
export const hasAnyPermission = (userRole, candidatePermissions = []) => {
  if (!userRole) return false;
  if (userRole === ROLES.SUPER_ADMIN) return true;
  if (candidatePermissions.length === 0) return true;
  return candidatePermissions.some((perm) => hasPermission(userRole, perm));
};
