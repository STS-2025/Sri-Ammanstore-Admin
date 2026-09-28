import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Barcode,
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
  WifiOff
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_DEFINITIONS, ROLES } from '../../utils/roles';
import { useNotification } from '../../context/NotificationContext';

export const Header = ({ onOpenMobileSidebar, onOpenGlobalSearch, onOpenBarcodeScanner }) => {
  const { currentUser, userProfile, userRole, isSuperAdmin, logout, switchDemoRole, isFirebaseConfigured } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const notify = useNotification();

  const currentRoleDef = ROLE_DEFINITIONS[userRole] || {
    name: 'Operator',
    badgeColor: 'bg-slate-100 text-slate-800'
  };

  const isSuperAdminUser =
    isSuperAdmin ||
    userRole === ROLES.SUPER_ADMIN ||
    currentUser?.role === ROLES.SUPER_ADMIN ||
    userProfile?.role === ROLES.SUPER_ADMIN;

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
    switchDemoRole(newRole);
    setRoleDropdownOpen(false);
    const targetRoleDef = ROLE_DEFINITIONS[newRole];
    notify.success('Role Switched', `Switched active preview role to: ${targetRoleDef?.name}`);
    if (targetRoleDef?.defaultRoute) {
      navigate(targetRoleDef.defaultRoute);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 shadow-subtle">
      {/* Left: Mobile Menu Toggle & Global Search Trigger */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar (Trigger) */}
        <button
          onClick={onOpenGlobalSearch}
          className="w-full max-w-md flex items-center justify-between px-3.5 py-2 text-xs bg-slate-100 hover:bg-slate-200/70 text-slate-500 rounded-xl border border-slate-200/80 transition-all text-left group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 transition-colors" />
            <span className="truncate">Search Order, Product, SKU, Customer...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm">
            ⌘K
          </kbd>
        </button>

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
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0" ref={dropdownRef}>

        {/* Role Indicator / Switcher Pill */}
        <div className="relative">
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
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-dropdown border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Simulate Role Permission
                  </div>
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
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
        <div className="relative">
          <button
            onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors relative"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
          </button>

          {notificationDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                <span className="text-xs font-bold text-slate-900">Operational Alerts</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  2 New
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
                  <p className="font-semibold text-amber-900">Low Stock Alert: Sambar Powder</p>
                  <p className="text-[11px] text-amber-700/80 mt-0.5">8 units remaining (Safety threshold: 20)</p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                  <p className="font-semibold text-blue-900">Express Delivery Dispatch</p>
                  <p className="text-[11px] text-blue-700/80 mt-0.5">Batch #B-104 assigned to Saravanan M.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-800 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {currentUser?.displayName ? currentUser.displayName.charAt(0) : 'A'}
            </div>
            <span className="hidden md:inline-block text-xs font-semibold text-slate-800 max-w-[120px] truncate text-left">
              {currentUser?.displayName || 'Admin'}
            </span>
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-dropdown border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {currentUser?.displayName || 'Sri Amman Admin'}
                </p>
                <p className="text-[11px] text-slate-400 truncate font-mono">
                  {currentUser?.email || 'admin@sriammanstore.com'}
                </p>
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

              <div className="pt-1 border-t border-slate-100 text-xs">
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
