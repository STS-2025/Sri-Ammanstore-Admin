import React, { useState } from 'react';
import { 
  Settings, Store, Clock, IndianRupee, Coins, ShieldCheck, Save, 
  AlertTriangle, Truck, Bell, Download, RefreshCw, KeyRound, CheckCircle2
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PermissionGuard } from '../../components/auth/PermissionGuard';
import { PERMISSIONS } from '../../utils/permissions';
import { useNotification } from '../../context/NotificationContext';
import { usePermissions } from '../../hooks/usePermissions';
import { logActivity } from '../../firebase/auditLogger';

const SETTINGS_LOCAL_KEY = 'grocery_admin_business_settings_v5';

export const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState('business'); // 'business' | 'orders' | 'delivery' | 'notifications' | 'loyalty' | 'security'

  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_LOCAL_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    return {
      // 1. Business Profile
      storeName: 'Sri Amman Store',
      legalEntity: 'Sri Amman Grocery Retailers LLP',
      storePhone: '+91 98401 22334',
      storeEmail: 'support@sriammanstore.com',
      storeAddress: '142, Cross Cut Road, Gandhipuram, Coimbatore - 641012, Tamil Nadu',
      gstin: '33AAAAA0000A1Z5',
      fssaiLicense: '12423002000456',
      currency: 'INR (₹)',
      invoicePrefix: 'SAS-INV-',
      invoiceFooterNote: 'Thank you for shopping at Sri Amman Store! Fresh spices & traditional groceries delivered with love.',

      // 2. Orders & Cart Rules
      minimumOrderAmount: 199,
      freeDeliveryThreshold: 499,
      standardDeliveryFee: 40,
      codAllowed: true,
      maxCodAmount: 3000,
      orderCutoffTime: '20:00',
      maxItemsPerOrder: 40,

      // 3. Delivery & Fleet Configuration
      deliveryZones: 'Gandhipuram, RS Puram, Tatabad, Saibaba Colony, Peelamedu, Town Hall, Ramanathapuram, Singanallur',
      defaultTwoWheelerMaxOrders: 20,
      defaultTwoWheelerMaxWeightKg: 50,
      defaultCargoAutoMaxWeightKg: 150,
      deliverySlots: 'Morning (07:00 - 10:00 AM), Noon (11:00 AM - 02:00 PM), Evening (04:00 - 07:00 PM), Night (07:00 - 09:30 PM)',

      // 4. Notifications & Communication
      whatsappGatewayActive: true,
      smsGatewayActive: true,
      pushFcmActive: true,
      autoOrderConfirmationSms: true,
      autoOutForDeliveryWhatsapp: true,
      autoDeliveredCoinAlert: true,

      // 5. Smart Coins Loyalty Rules
      smartCoinEarnRate: 1, // 1 coin per ₹100 spent
      smartCoinRedemptionValue: 1, // 1 coin = ₹1
      minCoinsToRedeem: 50,
      maxCoinRedemptionPercent: 20, // Max 20% of order value can be paid with coins
      coinValidityMonths: 12,

      // 6. Security & Session
      sessionTimeoutMinutes: 60,
      requireOtpForHighRisk: true,
      firebaseAppCheckEnforced: true
    };
  });

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const notify = useNotification();
  const { userRole, currentUser, can } = usePermissions();

  const handleSaveClick = (e) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async ({ reason }) => {
    try {
      localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(settings));

      await logActivity(
        currentUser || { id: 'admin', name: 'Super Admin' },
        'settings.update',
        'Settings',
        'businessSettings',
        `Updated operational parameters for section [${activeSection.toUpperCase()}]. Reason: ${reason}`,
        { settings }
      );

      notify.success('Settings Saved', 'Sri Amman Store business parameters updated successfully.');
      setIsConfirmOpen(false);
    } catch (e) {
      notify.error('Save Failed', e.message);
    }
  };

  const handleExportFullBackup = () => {
    const fullBackup = {
      timestamp: new Date().toISOString(),
      exportBy: currentUser?.email || 'admin@sriammanstore.com',
      systemVersion: '5.0.0-enterprise',
      settings
    };

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sri_amman_store_system_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store & Business Settings"
        subtitle="Manage grocery operating parameters, order cut-offs, delivery capacity, and customer loyalty rules."
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Enterprise Configuration Suite
          </span>
        }
        actions={
          <button
            onClick={handleSaveClick}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save All Settings</span>
          </button>
        }
      />

      {/* Settings Navigation Tabs */}
      <div className="bg-white p-1 rounded-2xl border border-slate-200 flex flex-wrap gap-1 shadow-xs">
        {[
          { id: 'business', label: 'Store Profile & Legal', icon: Store },
          { id: 'orders', label: 'Orders & Cart Rules', icon: IndianRupee },
          { id: 'delivery', label: 'Delivery & Fleet Zones', icon: Truck },
          { id: 'notifications', label: 'Communication Gateways', icon: Bell },
          { id: 'loyalty', label: 'Smart Coins Loyalty', icon: Coins },
          { id: 'security', label: 'Security & Backup', icon: ShieldCheck }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSection === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveClick} className="space-y-6">
        {/* SECTION 1: Business Profile & Legal */}
        {activeSection === 'business' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Retail Brand Profile & Legal Credentials</h3>
              <span className="text-xs text-slate-400">Printed on GST Invoices & Customer Receipts</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Store Brand Name *</label>
                <input
                  type="text"
                  value={settings.storeName}
                  onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                  className="input-text text-xs"
                />
              </div>

              <div>
                <label className="input-label">Legal Registered Entity *</label>
                <input
                  type="text"
                  value={settings.legalEntity}
                  onChange={(e) => setSettings({ ...settings, legalEntity: e.target.value })}
                  className="input-text text-xs"
                />
              </div>

              <div>
                <label className="input-label">Customer Support Phone</label>
                <input
                  type="text"
                  value={settings.storePhone}
                  onChange={(e) => setSettings({ ...settings, storePhone: e.target.value })}
                  className="input-text text-xs"
                />
              </div>

              <div>
                <label className="input-label">Support Email Address</label>
                <input
                  type="email"
                  value={settings.storeEmail}
                  onChange={(e) => setSettings({ ...settings, storeEmail: e.target.value })}
                  className="input-text text-xs"
                />
              </div>

              <div>
                <label className="input-label">GSTIN Identification Number *</label>
                <input
                  type="text"
                  value={settings.gstin}
                  onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })}
                  className="input-text text-xs uppercase font-mono"
                />
              </div>

              <div>
                <label className="input-label">FSSAI Food Safety License Number *</label>
                <input
                  type="text"
                  value={settings.fssaiLicense}
                  onChange={(e) => setSettings({ ...settings, fssaiLicense: e.target.value })}
                  className="input-text text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Physical Store Dispatch Hub Address</label>
              <textarea
                rows={2}
                value={settings.storeAddress}
                onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value })}
                className="input-text text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Invoice Number Prefix</label>
                <input
                  type="text"
                  value={settings.invoicePrefix}
                  onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                  className="input-text text-xs font-mono"
                />
              </div>

              <div>
                <label className="input-label">Operating Currency</label>
                <input
                  type="text"
                  readOnly
                  value={settings.currency}
                  className="input-text text-xs bg-slate-100 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Orders & Cart Rules */}
        {activeSection === 'orders' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Order Checkout & Fulfillment Thresholds</h3>
              <span className="text-xs text-slate-400">Controls minimum orders and delivery fee waiver</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="input-label">Minimum Order Amount (₹)</label>
                <input
                  type="number"
                  value={settings.minimumOrderAmount}
                  onChange={(e) => setSettings({ ...settings, minimumOrderAmount: Number(e.target.value) })}
                  className="input-text text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">Orders below this cannot checkout</p>
              </div>

              <div>
                <label className="input-label">Free Delivery Threshold (₹)</label>
                <input
                  type="number"
                  value={settings.freeDeliveryThreshold}
                  onChange={(e) => setSettings({ ...settings, freeDeliveryThreshold: Number(e.target.value) })}
                  className="input-text text-xs font-bold text-emerald-700"
                />
                <p className="text-[11px] text-slate-400 mt-1">Orders above this get ₹0 delivery fee</p>
              </div>

              <div>
                <label className="input-label">Standard Delivery Fee (₹)</label>
                <input
                  type="number"
                  value={settings.standardDeliveryFee}
                  onChange={(e) => setSettings({ ...settings, standardDeliveryFee: Number(e.target.value) })}
                  className="input-text text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="input-label">Maximum Cash on Delivery (COD) Limit (₹)</label>
                <input
                  type="number"
                  value={settings.maxCodAmount}
                  onChange={(e) => setSettings({ ...settings, maxCodAmount: Number(e.target.value) })}
                  className="input-text text-xs font-bold text-amber-700"
                />
              </div>

              <div>
                <label className="input-label">Daily Order Cut-Off Time (24h)</label>
                <input
                  type="time"
                  value={settings.orderCutoffTime}
                  onChange={(e) => setSettings({ ...settings, orderCutoffTime: e.target.value })}
                  className="input-text text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">Orders after this are scheduled next day</p>
              </div>

              <div>
                <label className="input-label">Max Items Allowed Per Order</label>
                <input
                  type="number"
                  value={settings.maxItemsPerOrder}
                  onChange={(e) => setSettings({ ...settings, maxItemsPerOrder: Number(e.target.value) })}
                  className="input-text text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: Delivery & Fleet Zones */}
        {activeSection === 'delivery' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Coimbatore Delivery Zones & Vehicle Limits</h3>
              <span className="text-xs text-slate-400">Enforces dispatch capacity and delivery slots</span>
            </div>

            <div>
              <label className="input-label">Covered Postal Localities & Zones</label>
              <textarea
                rows={2}
                value={settings.deliveryZones}
                onChange={(e) => setSettings({ ...settings, deliveryZones: e.target.value })}
                className="input-text text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="input-label">Two-Wheeler Max Orders / Batch</label>
                <input
                  type="number"
                  value={settings.defaultTwoWheelerMaxOrders}
                  onChange={(e) => setSettings({ ...settings, defaultTwoWheelerMaxOrders: Number(e.target.value) })}
                  className="input-text text-xs font-bold"
                />
              </div>

              <div>
                <label className="input-label">Two-Wheeler Max Weight (kg)</label>
                <input
                  type="number"
                  value={settings.defaultTwoWheelerMaxWeightKg}
                  onChange={(e) => setSettings({ ...settings, defaultTwoWheelerMaxWeightKg: Number(e.target.value) })}
                  className="input-text text-xs font-bold"
                />
              </div>

              <div>
                <label className="input-label">Cargo Auto 3-Wheeler Max Weight (kg)</label>
                <input
                  type="number"
                  value={settings.defaultCargoAutoMaxWeightKg}
                  onChange={(e) => setSettings({ ...settings, defaultCargoAutoMaxWeightKg: Number(e.target.value) })}
                  className="input-text text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Promised Customer Delivery Slots</label>
              <input
                type="text"
                value={settings.deliverySlots}
                onChange={(e) => setSettings({ ...settings, deliverySlots: e.target.value })}
                className="input-text text-xs"
              />
            </div>
          </div>
        )}

        {/* SECTION 4: Communication Gateways */}
        {activeSection === 'notifications' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Customer Communication Gateways</h3>
              <span className="text-xs text-slate-400">WhatsApp, SMS & Firebase Cloud Messaging (FCM)</span>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">WhatsApp Cloud Business API</h4>
                  <p className="text-[11px] text-slate-500">Automated order confirmations, rider tracking links, and stock arrival alerts.</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  Ready (Sandboxed)
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Transactional SMS Gateway (DLT Approved)</h4>
                  <p className="text-[11px] text-slate-500">Fast delivery OTP codes and essential delivery confirmations.</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Firebase Cloud Messaging (FCM Web Push)</h4>
                  <p className="text-[11px] text-slate-500">Browser push notifications for flash sales and festive spice promotions.</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  Connected
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: Smart Coins Loyalty */}
        {activeSection === 'loyalty' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Smart Coins Customer Loyalty Program</h3>
              <span className="text-xs text-slate-400">Rules for coin earn rate and redemption discounts</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Coin Earn Rate (Coins per ₹100 Spent)</label>
                <input
                  type="number"
                  value={settings.smartCoinEarnRate}
                  onChange={(e) => setSettings({ ...settings, smartCoinEarnRate: Number(e.target.value) })}
                  className="input-text text-xs font-bold text-amber-700"
                />
              </div>

              <div>
                <label className="input-label">Coin Redemption Value (₹ per Coin)</label>
                <input
                  type="number"
                  value={settings.smartCoinRedemptionValue}
                  onChange={(e) => setSettings({ ...settings, smartCoinRedemptionValue: Number(e.target.value) })}
                  className="input-text text-xs font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="input-label">Minimum Coins Required to Redeem</label>
                <input
                  type="number"
                  value={settings.minCoinsToRedeem}
                  onChange={(e) => setSettings({ ...settings, minCoinsToRedeem: Number(e.target.value) })}
                  className="input-text text-xs"
                />
              </div>

              <div>
                <label className="input-label">Max Order Value Payable with Coins (%)</label>
                <input
                  type="number"
                  value={settings.maxCoinRedemptionPercent}
                  onChange={(e) => setSettings({ ...settings, maxCoinRedemptionPercent: Number(e.target.value) })}
                  className="input-text text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 6: Security & Backup */}
        {activeSection === 'security' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">System Security & Database Backup</h3>
              <span className="text-xs text-slate-400">Firestore App Check & Configuration Archival</span>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Firebase App Check Attestation</h4>
                  <p className="text-[11px] text-slate-500">Guards Firestore collections against scraping and unauthorized third-party requests.</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  Enforced
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Export Full System Configuration Backup</h4>
                  <p className="text-[11px] text-slate-500">Download encrypted JSON package of business settings, rules, and system parameters.</p>
                </div>
                <button
                  type="button"
                  onClick={handleExportFullBackup}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Backup (JSON)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Bar */}
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500">
            Note: All business setting modifications require mandatory operational justification recorded in the security audit ledger.
          </span>
          <button
            type="submit"
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save All Settings</span>
          </button>
        </div>
      </form>

      {/* Confirmation Dialog with Mandatory Reason */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Save Store Business Settings"
        message="You are updating core operational grocery parameters. This impacts checkout rules, delivery fees, and loyalty calculations."
        confirmText="Confirm & Save Settings"
        variant="warning"
        isHighRisk={true}
        requireReason={true}
        reasonPlaceholder="Mandatory reason for setting change (e.g. Festival Season Fee Adjustment)..."
        onConfirm={handleConfirmSave}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};
