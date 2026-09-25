import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  FolderTree,
  Users,
  Truck,
  Percent,
  Megaphone,
  Sparkles,
  BarChart3,
  UserCheck,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Store,
  Flame
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../utils/permissions';
import { ROLE_DEFINITIONS } from '../../utils/roles';

export const NAVIGATION_ITEMS = [
  // Category: Main
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    permission: PERMISSIONS.DASHBOARD_VIEW,
    category: 'Main'
  },
  // Category: Retail Operations
  {
    name: 'Orders',
    path: '/orders',
    icon: ShoppingCart,
    permission: PERMISSIONS.ORDERS_VIEW,
    category: 'Retail Operations'
  },
  {
    name: 'Products',
    path: '/products',
    icon: Package,
    permission: PERMISSIONS.PRODUCTS_VIEW,
    category: 'Retail Operations'
  },
  {
    name: 'Featured',
    path: '/products/ranking',
    icon: Flame,
    permission: PERMISSIONS.PRODUCTS_VIEW,
    category: 'Retail Operations'
  },
  {
    name: 'Inventory',
    path: '/inventory',
    icon: Boxes,
    permission: PERMISSIONS.INVENTORY_VIEW,
    category: 'Retail Operations'
  },
  {
    name: 'Categories',
    path: '/categories',
    icon: FolderTree,
    permission: PERMISSIONS.CATEGORIES_MANAGE,
    category: 'Retail Operations'
  },
  {
    name: 'Customers',
    path: '/customers',
    icon: Users,
    permission: PERMISSIONS.CUSTOMERS_VIEW,
    category: 'Retail Operations'
  },
  {
    name: 'Delivery',
    path: '/delivery',
    icon: Truck,
    permission: PERMISSIONS.DELIVERY_VIEW,
    category: 'Retail Operations'
  },
  // Category: Growth & Marketing
  {
    name: 'Promotions',
    path: '/promotions',
    icon: Percent,
    permission: PERMISSIONS.MARKETING_PROMOS,
    category: 'Growth & Marketing'
  },
  {
    name: 'Marketing',
    path: '/marketing',
    icon: Megaphone,
    permission: PERMISSIONS.MARKETING_VIEW,
    category: 'Growth & Marketing'
  },
  {
    name: 'Requested Products',
    path: '/requested-products',
    icon: Sparkles,
    permission: PERMISSIONS.PRODUCT_REQUESTS_MANAGE,
    category: 'Growth & Marketing'
  },
  // Category: Governance & System
  {
    name: 'Reports',
    path: '/reports',
    icon: BarChart3,
    permission: PERMISSIONS.REPORTS_VIEW,
    category: 'Governance & System'
  },
  {
    name: 'Staff & Roles',
    path: '/staff',
    icon: UserCheck,
    permission: PERMISSIONS.STAFF_VIEW,
    category: 'Governance & System'
  },
  {
    name: 'Activity Logs',
    path: '/activity-logs',
    icon: History,
    permission: PERMISSIONS.AUDIT_VIEW,
    category: 'Governance & System'
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_MANAGE,
    category: 'Governance & System'
  }
];

export const Sidebar = ({ isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile }) => {
  const { can, userRole } = usePermissions();
  const location = useLocation();

  // Filter navigation items by active user role permissions
  const visibleItems = NAVIGATION_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return can(item.permission);
  });

  const roleDef = ROLE_DEFINITIONS[userRole] || { name: 'Staff Member' };

  // Group items by category for clear visual structure
  const categories = ['Main', 'Retail Operations', 'Growth & Marketing', 'Governance & System'];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out shadow-xl ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Floating High-Visibility Expand/Collapse Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute -right-3.5 top-5 w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white items-center justify-center shadow-lg border border-emerald-400/40 transition-transform duration-200 hover:scale-110 z-50 cursor-pointer"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Brand & Store Identity Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/70">
          <div className="flex items-center gap-3 overflow-hidden w-full">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-800 flex items-center justify-center text-white shrink-0 shadow-md border border-emerald-400/30">
              <Store className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <span className="text-sm font-bold text-white tracking-tight font-sans block truncate">
                  Sri Amman Store
                </span>
                <span className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase block truncate">
                  Grocery Admin OS
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scrollbar-thin">
          {categories.map((catName) => {
            const catItems = visibleItems.filter((item) => item.category === catName);
            if (catItems.length === 0) return null;

            return (
              <div key={catName} className="space-y-1">
                {!isCollapsed ? (
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 pt-2 pb-1 block">
                    {catName}
                  </span>
                ) : (
                  <div className="my-2 border-t border-slate-800/60" />
                )}

                {catItems.map((item) => {
                  const Icon = item.icon;
                  // Exact match for /products so sub-routes like /products/ranking don't highlight both
                  const isActive = item.path === '/products'
                    ? location.pathname === '/products'
                    : (location.pathname === item.path || location.pathname.startsWith(item.path + '/'));

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/products'}
                      onClick={onCloseMobile}
                      title={isCollapsed ? item.name : undefined}
                      className={
                        `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-950/40'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                        } ${isCollapsed ? 'justify-center' : ''}`
                      }
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-emerald-300 rounded-r-full shadow-xs" />
                      )}

                      <Icon
                        className={`w-5 h-5 shrink-0 transition-transform duration-150 ${
                          isActive ? 'text-white scale-105' : 'text-slate-400 group-hover:text-emerald-400 group-hover:scale-105'
                        }`}
                      />

                      {!isCollapsed && (
                        <span className="truncate flex-1">{item.name}</span>
                      )}

                      {!isCollapsed && item.badge && (
                        <span className="text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                          {item.badge}
                        </span>
                      )}

                      {/* Collapsed Tooltip Flyout */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-dropdown border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.badge && (
                            <span className="text-[9px] bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer Role Indicator */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          {!isCollapsed ? (
            <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/70 flex items-center justify-between">
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
                  Active Role
                </span>
                <span className="text-xs font-extrabold text-emerald-400 truncate block">
                  {roleDef.name}
                </span>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="System Active" />
            </div>
          ) : (
            <div className="flex justify-center" title={`Active: ${roleDef.name}`}>
              <div className="w-9 h-9 rounded-xl bg-emerald-900/80 border border-emerald-500/50 flex items-center justify-center text-emerald-300 text-xs font-black shadow-sm">
                {roleDef.name.charAt(0)}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
