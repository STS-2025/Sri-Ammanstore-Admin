/**
 * Master Permissions Definition
 * Granular capability keys for the Sri Amman Store Grocery Admin Management System.
 */

export const PERMISSIONS = {
  // Dashboard Capabilities
  DASHBOARD_VIEW: 'dashboard.view',
  DASHBOARD_FINANCIAL_METRICS: 'dashboard.metrics.financial',
  DASHBOARD_OPERATIONAL_METRICS: 'dashboard.metrics.operations',

  // Catalog & Product Capabilities
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',
  PRODUCTS_PRICE_CHANGE: 'products.price_change',
  CATEGORIES_MANAGE: 'categories.manage',
  BRANDS_MANAGE: 'brands.manage',

  // Inventory & Warehouse Capabilities
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_BATCHES: 'inventory.batches',
  INVENTORY_BARCODES: 'inventory.barcodes',

  // Orders & Fulfillment Capabilities
  ORDERS_VIEW: 'orders.view',
  ORDERS_EDIT: 'orders.edit',
  ORDERS_PACK: 'orders.pack',
  ORDERS_CANCEL: 'orders.cancel',
  ORDERS_PRINT: 'orders.print',

  // Customers & CRM
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_MANAGE: 'customers.manage',
  CUSTOMERS_BLOCK: 'customers.block',

  // Delivery & Logistics Capabilities
  DELIVERY_VIEW: 'delivery.view',
  DELIVERY_ASSIGN: 'delivery.assign',
  DELIVERY_MANAGE_AGENTS: 'delivery.manage_agents',
  DELIVERY_ASSIGNED_ONLY: 'delivery.assigned_only',
  DELIVERY_UPDATE_STATUS: 'delivery.update_status',
  DELIVERY_COLLECT_COD: 'delivery.collect_cod',

  // Marketing & Promotions
  MARKETING_VIEW: 'marketing.view',
  MARKETING_BANNERS: 'marketing.banners',
  MARKETING_PROMOS: 'marketing.promos',
  MARKETING_CAMPAIGNS: 'marketing.campaigns',
  MARKETING_NOTIFICATIONS: 'marketing.notifications',
  PRODUCT_REQUESTS_MANAGE: 'product_requests.manage',

  // Financials & Accounting
  REPORTS_VIEW: 'reports.view',
  REPORTS_FINANCIAL: 'reports.financial',
  REPORTS_SALES: 'reports.sales',
  FINANCIALS_REFUND: 'financials.refund',
  FINANCIALS_COD_SETTLEMENT: 'financials.cod_settlement',
  SMART_COINS_MANAGE: 'smart_coins.manage',

  // Governance & System
  STAFF_VIEW: 'staff.view',
  STAFF_MANAGE: 'staff.manage',
  ROLES_MANAGE: 'roles.manage',
  SETTINGS_MANAGE: 'settings.manage',
  AUDIT_VIEW: 'audit.view'
};

export const PERMISSION_GROUPS = [
  {
    name: 'Dashboard',
    permissions: [
      { key: PERMISSIONS.DASHBOARD_VIEW, label: 'Access Admin Dashboard' },
      { key: PERMISSIONS.DASHBOARD_FINANCIAL_METRICS, label: 'View Revenue & Financial KPIs' },
      { key: PERMISSIONS.DASHBOARD_OPERATIONAL_METRICS, label: 'View Operational & Order KPIs' }
    ]
  },
  {
    name: 'Products & Categories',
    permissions: [
      { key: PERMISSIONS.PRODUCTS_VIEW, label: 'View Products Catalog' },
      { key: PERMISSIONS.PRODUCTS_CREATE, label: 'Create New Products' },
      { key: PERMISSIONS.PRODUCTS_EDIT, label: 'Edit Product Details' },
      { key: PERMISSIONS.PRODUCTS_PRICE_CHANGE, label: 'Change Product Prices (High Risk)' },
      { key: PERMISSIONS.PRODUCTS_DELETE, label: 'Delete Products (High Risk)' },
      { key: PERMISSIONS.CATEGORIES_MANAGE, label: 'Manage Categories & Subcategories' },
      { key: PERMISSIONS.BRANDS_MANAGE, label: 'Manage Brands' }
    ]
  },
  {
    name: 'Inventory & Warehouse',
    permissions: [
      { key: PERMISSIONS.INVENTORY_VIEW, label: 'View Stock On Hand' },
      { key: PERMISSIONS.INVENTORY_ADJUST, label: 'Execute Stock Adjustments' },
      { key: PERMISSIONS.INVENTORY_BATCHES, label: 'Manage Batches & Expiry Dates' },
      { key: PERMISSIONS.INVENTORY_BARCODES, label: 'Scan & Print Barcodes' }
    ]
  },
  {
    name: 'Orders & Packing',
    permissions: [
      { key: PERMISSIONS.ORDERS_VIEW, label: 'View Orders List' },
      { key: PERMISSIONS.ORDERS_EDIT, label: 'Modify Order Details' },
      { key: PERMISSIONS.ORDERS_PACK, label: 'Process Picking & Packing' },
      { key: PERMISSIONS.ORDERS_PRINT, label: 'Print Invoices & Shipping Labels' },
      { key: PERMISSIONS.ORDERS_CANCEL, label: 'Cancel Customer Orders (High Risk)' }
    ]
  },
  {
    name: 'Customers',
    permissions: [
      { key: PERMISSIONS.CUSTOMERS_VIEW, label: 'View Customer Profiles' },
      { key: PERMISSIONS.CUSTOMERS_MANAGE, label: 'Edit Customer Information' },
      { key: PERMISSIONS.CUSTOMERS_BLOCK, label: 'Block/Unblock Customers' }
    ]
  },
  {
    name: 'Delivery & Fleet',
    permissions: [
      { key: PERMISSIONS.DELIVERY_VIEW, label: 'View Delivery Orders & Batches' },
      { key: PERMISSIONS.DELIVERY_ASSIGN, label: 'Assign Orders to Fleet Riders' },
      { key: PERMISSIONS.DELIVERY_MANAGE_AGENTS, label: 'Manage Delivery Personnel' },
      { key: PERMISSIONS.DELIVERY_ASSIGNED_ONLY, label: 'Restricted to Own Assigned Stops' },
      { key: PERMISSIONS.DELIVERY_UPDATE_STATUS, label: 'Update Delivery Drop-off Status' },
      { key: PERMISSIONS.DELIVERY_COLLECT_COD, label: 'Collect Cash-On-Delivery Payments' }
    ]
  },
  {
    name: 'Marketing & Promotions',
    permissions: [
      { key: PERMISSIONS.MARKETING_VIEW, label: 'View Marketing Modules' },
      { key: PERMISSIONS.MARKETING_BANNERS, label: 'Manage App & Web Banners' },
      { key: PERMISSIONS.MARKETING_PROMOS, label: 'Create & Manage Promo Codes' },
      { key: PERMISSIONS.MARKETING_CAMPAIGNS, label: 'Run Push & SMS Campaigns' },
      { key: PERMISSIONS.MARKETING_NOTIFICATIONS, label: 'Configure Notification Templates' },
      { key: PERMISSIONS.PRODUCT_REQUESTS_MANAGE, label: 'Review Customer Product Requests' }
    ]
  },
  {
    name: 'Financials & Accounts',
    permissions: [
      { key: PERMISSIONS.REPORTS_VIEW, label: 'View Operational Reports' },
      { key: PERMISSIONS.REPORTS_FINANCIAL, label: 'View P&L and Financial Reports' },
      { key: PERMISSIONS.REPORTS_SALES, label: 'Export Sales Ledgers' },
      { key: PERMISSIONS.FINANCIALS_REFUND, label: 'Process Refunds (High Risk)' },
      { key: PERMISSIONS.FINANCIALS_COD_SETTLEMENT, label: 'Settle Cash-On-Delivery Handover' },
      { key: PERMISSIONS.SMART_COINS_MANAGE, label: 'Credit/Debit Smart Coins' }
    ]
  },
  {
    name: 'Administration & Security',
    permissions: [
      { key: PERMISSIONS.STAFF_VIEW, label: 'View Staff Directory' },
      { key: PERMISSIONS.STAFF_MANAGE, label: 'Add/Edit Staff Members' },
      { key: PERMISSIONS.ROLES_MANAGE, label: 'Manage Roles & Permission Matrix' },
      { key: PERMISSIONS.SETTINGS_MANAGE, label: 'Configure Store & Financial Settings' },
      { key: PERMISSIONS.AUDIT_VIEW, label: 'View Immutable Activity Audit Logs' }
    ]
  }
];
