import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Barcode,
  Package,
  Users,
  MapPin,
  Bell,
  Menu,
  LogOut,
  Settings,
  User,
  Shield,
  Check,
  ChevronDown,
  Sparkles,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_DEFINITIONS, ROLES } from '../../utils/roles';
import { useNotification } from '../../context/NotificationContext';
import { getAllProducts } from '../../firebase/productService';
import { getAllOrders } from '../../firebase/orderService';
import { getAllCustomers, getAllOnlineCustomers } from '../../firebase/customerService';

const FontSizeControl = ({ value, onChange, className = '' }) => (
  <label className={`flex items-center gap-2 text-xs font-semibold text-slate-600 ${className}`}>
    <span>Font Size</span>
    <select
      aria-label="Font Size"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
    >
      <option value="small">Small</option>
      <option value="normal">Normal</option>
      <option value="large">Large</option>
      <option value="extra-large">Extra Large</option>
    </select>
  </label>
);

export const Header = ({
  onOpenMobileSidebar,
  onOpenGlobalSearch,
  onOpenBarcodeScanner,
  fontSize = 'normal',
  onFontSizeChange
}) => {
  const { currentUser, userProfile, userRole, isSuperAdmin, logout, switchDemoRole, isFirebaseConfigured } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotification();
  const isManualOrderPage = location.pathname === '/orders/create-manual-order';

  const currentRoleDef = ROLE_DEFINITIONS[userRole] || {
    name: 'Operator',
    badgeColor: 'bg-slate-100 text-slate-800'
  };

  const isSuperAdminUser =
    isSuperAdmin ||
    userRole === ROLES.SUPER_ADMIN ||
    currentUser?.role === ROLES.SUPER_ADMIN ||
    userProfile?.role === ROLES.SUPER_ADMIN;

  useEffect(() => {
    let cancelled = false;
    const loadSearchIndex = async () => {
      setSearchLoading(true);
      try {
        const [products, manualCustomers, onlineCustomers] = await Promise.all([
          getAllProducts(), getAllCustomers(), getAllOnlineCustomers()
        ]);
        const customerItems = [
          ...(manualCustomers || []).map((c) => ({ ...c, source: 'Manual Customer', type: 'manual_customer', path: '/manual-customers' })),
          ...(onlineCustomers || []).map((c) => ({ ...c, source: 'Online Customer', type: 'online_customer', path: '/customers' }))
        ].map((customer) => {
          const customerId = customer.customerId || customer.id || '';
          const mobile = customer.mobile || customer.phone || customer.mobileNumber || customer.phoneNumber || '';
          return {
            id: `${customer.type}-${customer.id || customerId}`,
            ...customer,
            title: customer.name || 'Unnamed customer',
            subtitle: `${customerId || 'No customer ID'} • ${mobile || 'No mobile number'}`,
            details: {
              customerId,
              mobile,
              area: customer.area || customer.locality || customer.address?.area || customer.address?.locality || customer.address?.city || 'N/A',
              outstandingBalance: customer.outstandingBalance ?? customer.outstandingAmount ?? customer.dueAmount ?? customer.balance ?? customer.creditBalance ?? 0
            },
            searchable: [customer.name, customerId, customer.id, mobile, customer.email].filter(Boolean).join(' ')
          };
        });
        const productItems = (products || []).map((product) => {
          const variants = product.variants || [];
          const identifiers = [...new Set([
            product.hsnCode,
            ...variants.flatMap((v) => [v.barcode, v.sku, v.hsnCode])
          ].filter(Boolean))];
          return {
            id: `product-${product.id}`,
            type: 'product', source: 'Product', path: '/products',
            title: product.name || 'Unnamed product',
            subtitle: identifiers.length ? identifiers.slice(0, 3).join(' • ') : 'No barcode / HSN code',
            details: {
              pack: variants[0]?.title || variants[0]?.packSize || variants[0]?.name || '',
              localName: product.localName || product.tamilName || product.shortDescription || '',
              sku: variants[0]?.sku || product.sku || 'N/A',
              barcodeValue: variants[0]?.barcode || product.barcode || 'N/A',
              rack: product.rack || product.storage?.rack || product.location?.rack || variants[0]?.rack || 'N/A',
              self: product.self || product.shelf || product.storage?.self || product.storage?.shelf || product.location?.self || variants[0]?.self || 'N/A',
              bin: product.bin || product.storage?.bin || product.location?.bin || variants[0]?.bin || 'N/A',
              stock: product.totalStock ?? product.stock ?? variants.reduce((total, variant) => total + Number(variant.stock || 0), 0),
              price: variants[0]?.retailPrice ?? variants[0]?.sellingPrice ?? variants[0]?.price ?? product.price ?? 0,
              mrp: variants[0]?.mrp ?? variants[0]?.marketPrice ?? ''
            },
            searchable: [product.name, product.id, ...identifiers].filter(Boolean).join(' ')
          };
        });
        if (!cancelled) setSearchIndex([...customerItems, ...productItems]);
      } catch (error) {
        if (!cancelled) setSearchIndex([]);
        console.warn('Header search index load error:', error);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    };
    loadSearchIndex();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleSearchOutsideClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handleSearchOutsideClick);
    return () => document.removeEventListener('mousedown', handleSearchOutsideClick);
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchResults = normalizedQuery
    ? searchIndex.filter((item) => item.searchable.toLowerCase().includes(normalizedQuery)).slice(0, 8)
    : [];

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      setSearchQuery('');
      setSearchOpen(false);
    }
    if (event.key === 'Enter' && searchResults[0]) {
      navigate(searchResults[0].path);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  const handleSearchResultClick = (result) => {
    navigate(result.path);
    setSearchQuery('');
    setSearchOpen(false);
  };

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const [products, orders] = await Promise.all([
          getAllProducts(),
          getAllOrders()
        ]);

        const lowStockAlerts = [];
        (products || []).forEach(p => {
          (p.variants || []).forEach(v => {
            const stock = Number(v.stock ?? 10);
            const threshold = Number(v.reorderLevel || p.reorderLevel || 10);
            if (stock <= threshold) {
              lowStockAlerts.push({
                id: `low-stock-${p.id}-${v.id || v.name}`,
                type: 'low_stock',
                title: `Low Stock: ${p.name} (${v.name || (v.weight ? `${v.weight}${v.unit || 'g'}` : 'Variant')})`,
                subtitle: `${stock} units remaining (Safety threshold: ${threshold})`,
                link: '/inventory'
              });
            }
          });
        });

        const pendingOrderAlerts = [];
        (orders || []).filter(o => o.status === 'confirmed').forEach(o => {
          pendingOrderAlerts.push({
            id: `order-${o.id}`,
            type: 'order',
            title: `New Customer Order: ${o.orderNumber}`,
            subtitle: `${o.customerName} • ${o.itemsCount || (o.items?.length || 1)} items (₹${o.totalAmount})`,
            link: '/orders'
          });
        });

        setAlerts([...pendingOrderAlerts.slice(0, 3), ...lowStockAlerts.slice(0, 3)]);
      } catch (e) {
        setAlerts([]);
      }
    };

    loadAlerts();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
        setRoleDropdownOpen(false);
        setNotificationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      notify.info('Logged Out', 'You have securely signed out of Sri Amman Store Admin.');
      navigate('/login');
    } catch (err) {
      notify.error('Logout Failed', err.message);
    }
  };

  const handleSwitchRole = (newRole) => {
    if (!switchDemoRole(newRole)) return;
    setRoleDropdownOpen(false);
    const targetRoleDef = ROLE_DEFINITIONS[newRole];
    notify.success('Role Switched', `Switched active preview role to: ${targetRoleDef?.name}`);
    if (targetRoleDef?.defaultRoute) {
      navigate(targetRoleDef.defaultRoute);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex min-w-0 items-center justify-between h-16 px-2.5 sm:px-4 bg-white border-b border-slate-200 md:px-6 shadow-subtle">
      {/* Left: Mobile Menu Toggle & Global Search Trigger */}
      <div className="flex items-center flex-1 max-w-3xl min-w-0 gap-2 sm:gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 transition-colors rounded-lg lg:hidden text-slate-600 hover:bg-slate-100"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Inline global search */}
        <div className="relative flex-1 max-w-xl min-w-0" ref={searchRef}>
          <div className={`min-w-0 flex items-center gap-2 px-2.5 sm:px-3.5 py-2 text-xs bg-slate-100 text-slate-600 rounded-xl border transition-all ${searchOpen ? 'border-emerald-400 ring-2 ring-emerald-100 bg-white' : 'border-slate-200/80 hover:bg-slate-200/70'}`}>
            <Search className={`w-4 h-4 shrink-0 ${searchOpen ? 'text-emerald-700' : 'text-slate-400'}`} />
            <input
              type="search"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search customer name, mobile, ID, product, barcode, HSN..."
              aria-label="Search customers and products"
              className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-slate-400"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm">Enter</kbd>
          </div>

          {searchOpen && normalizedQuery && (
            <div className="absolute left-0 right-0 top-full z-[60] mt-2 overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-2xl">
              {searchLoading ? (
                <div className="px-4 py-5 text-xs text-slate-400">Loading customers and products...</div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-5 text-xs text-slate-400">No matching customer or product found.</div>
              ) : (
                <div className="max-h-80 overflow-y-auto p-1.5">
                  {searchResults.map((result) => (
                    <button key={result.id} type="button" onClick={() => handleSearchResultClick(result)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-emerald-50 transition-colors">
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-slate-100">
                        {result.type === 'product' ? <Package className="w-4 h-4 text-emerald-600" /> : <Users className="w-4 h-4 text-purple-600" />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-semibold truncate text-slate-900">{result.title}</span>
                        <span className="block truncate text-[11px] text-slate-400">{result.subtitle}</span>
                        {result.type === 'manual_customer' && (
                          <span className="mt-1 grid grid-cols-2 gap-x-2 text-[10px] text-slate-500">
                            <span>Area: <strong className="text-slate-700">{result.details.area}</strong></span>
                            <span>Outstanding: <strong className="text-rose-700">₹{Number(result.details.outstandingBalance || 0).toLocaleString('en-IN')}</strong></span>
                          </span>
                        )}
                        {result.type === 'product' && (
                          <span className="mt-2 block rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] shadow-sm">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              {result.details.pack && <span className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-700">{result.details.pack}</span>}
                              {result.details.localName && <span className="text-slate-500">({result.details.localName})</span>}
                            </span>
                            <span className="block mt-1 text-slate-500">SKU: <strong className="font-mono text-slate-600">{result.details.sku}</strong> · Barcode: <strong className="font-mono text-slate-600">{result.details.barcodeValue}</strong></span>
                            <span className="mt-1 inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-amber-800"><MapPin className="w-3 h-3" />Rack — {result.details.rack} / Shelf — {result.details.self} / Bin — {result.details.bin}</span>
                          </span>
                        )}
                      </span>
                      {result.type === 'product' && (
                        <span className="flex-col items-end hidden gap-1 sm:flex shrink-0">
                          <strong className="text-xs text-slate-800">₹{Number(result.details.price || 0).toFixed(2)}</strong>
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">Stock: {result.details.stock}</span>
                        </span>
                      )}
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{result.source}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Barcode scanner remains available beside the inline search. */}
        {false && <button
          onClick={onOpenGlobalSearch}
          className="min-w-0 flex-1 max-w-md flex items-center justify-between gap-2 px-2.5 sm:px-3.5 py-2 text-xs bg-slate-100 hover:bg-slate-200/70 text-slate-500 rounded-xl border border-slate-200/80 transition-all text-left group"
        >
          <div className="flex items-center min-w-0 gap-2">
            <Search className="w-4 h-4 transition-colors text-slate-400 group-hover:text-emerald-700" />
            <span className="min-w-0 truncate">Search Order, Product, SKU, Customer...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm">
            ⌘K
          </kbd>
        </button>}

        {/* Quick Barcode Scanner Button */}
        <button
          onClick={onOpenBarcodeScanner}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shrink-0"
          title="Open Barcode Scanner"
        >
          <Barcode className="w-4 h-4 text-emerald-600" />
          <span>Barcode</span>
        </button>
      </div>

      {/* Right: Operational Status, Role Switcher, Alerts, Profile */}
          <div className="flex items-center gap-1 sm:gap-2.5 md:gap-4 shrink-0" ref={dropdownRef}>

        {isManualOrderPage && (
          <FontSizeControl
            value={fontSize}
            onChange={onFontSizeChange}
            className="hidden xl:flex"
          />
        )}

        {/* Role Indicator / Switcher Pill */}
        <div className="relative hidden sm:block">
          {isSuperAdminUser ? (
            <>
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${currentRoleDef.badgeColor}`}
                title="Super Admin Role Switcher (Preview)"
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="max-w-[110px] sm:max-w-none truncate">{currentRoleDef.name}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 z-50 w-64 py-2 mt-2 bg-white border rounded-2xl shadow-dropdown border-slate-200 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Simulate Role Permission
                  </div>
                  <div className="overflow-y-auto divide-y divide-slate-100 max-h-80">
                    {Object.values(ROLE_DEFINITIONS).map((def) => {
                      const isSelected = userRole === def.id;
                      return (
                        <button
                          key={def.id}
                          onClick={() => handleSwitchRole(def.id)}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-emerald-50 font-semibold text-emerald-900' : 'text-slate-700'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="truncate">{def.name}</div>
                            <div className="text-[10px] text-slate-400 truncate font-normal">
                              {def.permissions.length} capabilities
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentRoleDef.badgeColor}`}
              title={`Logged in as ${currentRoleDef.name}`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="max-w-[110px] sm:max-w-none truncate">{currentRoleDef.name}</span>
            </div>
          )}
        </div>

        {/* Notifications Icon & Drawer */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
            className="relative p-2 transition-colors rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {alerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>

          {notificationDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">Operational Alerts</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  alerts.length > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'
                }`}>
                  {alerts.length} New
                </span>
              </div>

              {alerts.length === 0 ? (
                <div className="py-6 space-y-1 text-center text-slate-500">
                  <CheckCircle2 className="mx-auto w-7 h-7 text-emerald-500" />
                  <p className="text-xs font-bold text-slate-800">No Active Operational Alerts</p>
                  <p className="text-[11px] text-slate-400">All product inventory stock levels & customer orders are up to date.</p>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {alerts.map(a => (
                    <div
                      key={a.id}
                      onClick={() => {
                        navigate(a.link);
                        setNotificationDropdownOpen(false);
                      }}
                      className={`p-2.5 rounded-xl cursor-pointer transition-colors ${
                        a.type === 'low_stock'
                          ? 'bg-amber-50/70 hover:bg-amber-100/70 border border-amber-100'
                          : 'bg-blue-50/70 hover:bg-blue-100/70 border border-blue-100'
                      }`}
                    >
                      <p className={`font-semibold ${a.type === 'low_stock' ? 'text-amber-900' : 'text-blue-900'}`}>
                        {a.title}
                      </p>
                      <p className={`text-[11px] mt-0.5 ${a.type === 'low_stock' ? 'text-amber-700/80' : 'text-blue-700/80'}`}>
                        {a.subtitle}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center justify-center w-8 h-8 text-xs font-bold text-white shadow-sm rounded-xl bg-emerald-800">
              {currentUser?.displayName ? currentUser.displayName.charAt(0) : 'A'}
            </div>
            <span className="hidden md:inline-block text-xs font-semibold text-slate-800 max-w-[120px] truncate text-left">
              {currentUser?.displayName || 'Admin'}
            </span>
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 z-50 w-56 py-2 mt-2 bg-white border rounded-2xl shadow-dropdown border-slate-200 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold truncate text-slate-900">
                  {currentUser?.displayName || 'Sri Amman Admin'}
                </p>
                <p className="text-[11px] text-slate-400 truncate font-mono">
                  {currentUser?.email || 'admin@sriammanstore.com'}
                </p>
              </div>

              {isManualOrderPage && (
                <div className="px-3 py-2 border-b border-slate-100 xl:hidden">
                  <FontSizeControl
                    value={fontSize}
                    onChange={onFontSizeChange}
                    className="justify-between"
                  />
                </div>
              )}

              
{/* Mobile-only Role Switcher & Notifications */}
<div className="px-3 py-2 space-y-3 border-b sm:hidden border-slate-100">

  {/* Role */}
  <div>
    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
      Current Role
    </p>

    {isSuperAdminUser ? (
      <div className="space-y-1">
        {Object.values(ROLE_DEFINITIONS).map((def) => {
          const isSelected = userRole === def.id;

          return (
            <button
              key={def.id}
              onClick={() => handleSwitchRole(def.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                isSelected
                  ? 'bg-emerald-50 text-emerald-900 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{def.name}</span>
              {isSelected && (
                <Check className="w-4 h-4 text-emerald-600" />
              )}
            </button>
          );
        })}
      </div>
    ) : (
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${currentRoleDef.badgeColor}`}
      >
        <Shield className="w-4 h-4" />
        {currentRoleDef.name}
      </div>
    )}
  </div>

  {/* Notifications */}
  <div>
    <div className="flex items-center justify-between mb-2">
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
        Operational Alerts
      </p>
      <span className="text-[10px] font-semibold text-slate-500">
        {alerts.length} New
      </span>
    </div>

    {alerts.length === 0 ? (
      <p className="py-2 text-xs text-slate-500">
        No active operational alerts.
      </p>
    ) : (
      <div className="space-y-2 overflow-y-auto max-h-48">
        {alerts.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              navigate(a.link);
              setProfileDropdownOpen(false);
            }}
            className={`w-full text-left p-2.5 rounded-lg border ${
              a.type === 'low_stock'
                ? 'bg-amber-50 border-amber-100 text-amber-900'
                : 'bg-blue-50 border-blue-100 text-blue-900'
            }`}
          >
            <p className="text-xs font-semibold">{a.title}</p>
            <p className="text-[11px] mt-1 opacity-80">
              {a.subtitle}
            </p>
          </button>
        ))}
      </div>
    )}
  </div>
</div>


              <div className="py-1 text-xs">
                <button
                  onClick={() => {
                    navigate('/settings');
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Store Settings</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/activity-logs');
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Audit Logs</span>
                </button>
              </div>

              <div className="pt-1 text-xs border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 transition-colors text-left font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
