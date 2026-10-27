import React, { useState, useEffect } from 'react';
import { Settings, Barcode as BarcodeIcon, ShieldCheck, Save, CheckCircle2, RefreshCw } from 'lucide-react';
import { getCustomerSettings, saveCustomerSettings } from '../../firebase/customerService';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';

export const PosSettingsSection = () => {
  const notify = useNotification();
  const { currentUser, userRole } = useAuth();

  const [settings, setSettings] = useState({
    prefix: 'CUS',
    separator: '-',
    startingNumber: 1,
    numberLength: 6,
    barcodeFormat: 'CODE128',
    posInvoicePrefix: 'POS-INV-',
    allowWalkInCustomer: true,
    allowCreditSales: true,
    requireCustomerForCredit: true,
    defaultCreditLimit: 5000
  });

  const [previewId, setPreviewId] = useState('');

  useEffect(() => {
    const loaded = getCustomerSettings();
    setSettings((prev) => ({ ...prev, ...loaded }));
  }, []);

  useEffect(() => {
    const padded = String(settings.startingNumber).padStart(Number(settings.numberLength), '0');
    setPreviewId(`${settings.prefix}${settings.separator}${padded}`);
  }, [settings.prefix, settings.separator, settings.startingNumber, settings.numberLength]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await saveCustomerSettings(settings, currentUser || { role: userRole });
      notify.success('Settings Saved', 'Customer ID and POS Billing settings updated successfully.');
    } catch (err) {
      notify.error('Save Failed', err.message);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Customer ID Configuration */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <BarcodeIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Customer ID Configuration</h3>
            <p className="text-xs text-slate-500">Configure customer identification numbering format & prefix rules</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Customer ID Prefix</label>
            <input
              type="text"
              name="prefix"
              value={settings.prefix}
              onChange={handleChange}
              placeholder="e.g. CUS, CUST, GRC"
              required
              className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Separator</label>
            <select
              name="separator"
              value={settings.separator}
              onChange={handleChange}
              className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="-">Hyphen (-)</option>
              <option value="/">Slash (/)</option>
              <option value="_">Underscore (_)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Starting Sequence Number</label>
            <input
              type="number"
              name="startingNumber"
              value={settings.startingNumber}
              onChange={handleChange}
              min="1"
              required
              className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Number Length (Digits)</label>
            <select
              name="numberLength"
              value={settings.numberLength}
              onChange={handleChange}
              className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="4">4 Digits (0001)</option>
              <option value="5">5 Digits (00001)</option>
              <option value="6">6 Digits (000001)</option>
              <option value="7">7 Digits (0000001)</option>
            </select>
          </div>
        </div>

        {/* Format Live Preview Box */}
        <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Live Format Preview</span>
            <span className="text-lg font-mono font-black text-emerald-400">{previewId}</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Sequential • Unique Guaranteed</span>
        </div>
      </div>

      {/* POS Billing Rules */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">POS & Counter Credit Rules</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">POS Invoice Prefix</label>
            <input
              type="text"
              name="posInvoicePrefix"
              value={settings.posInvoicePrefix}
              onChange={handleChange}
              className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Default Customer Credit Limit (₹)</label>
            <input
              type="number"
              name="defaultCreditLimit"
              value={settings.defaultCreditLimit}
              onChange={handleChange}
              step="500"
              className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
            />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="allowWalkInCustomer"
              checked={settings.allowWalkInCustomer}
              onChange={handleChange}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-xs font-semibold text-slate-800">Allow Walk-in Anonymous Customer Billing (Cash/UPI/Card)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="allowCreditSales"
              checked={settings.allowCreditSales}
              onChange={handleChange}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-xs font-semibold text-slate-800">Allow Credit Sales / Pay Later Counter Billing</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="requireCustomerForCredit"
              checked={settings.requireCustomerForCredit}
              onChange={handleChange}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-xs font-semibold text-slate-800">Require Registered Customer Account for Credit Billing (Prevents anonymous credit)</span>
          </label>
        </div>

        <div className="pt-4 flex justify-end">
          <button type="submit" className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5 shadow-md">
            <Save className="w-4 h-4" />
            <span>Save Customer & POS Settings</span>
          </button>
        </div>
      </div>
    </form>
  );
};
