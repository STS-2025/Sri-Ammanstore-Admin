import React, { useState, useEffect } from 'react';
import { X, Tag, IndianRupee, Percent, Truck, Gift, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

export const PromoFormModal = ({ isOpen, onClose, onSave, promo = null }) => {
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    type: 'fixed', // 'percentage' | 'fixed' | 'free_delivery' | 'free_product'
    value: 100,
    maxDiscount: 100,
    minOrderAmount: 499,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '2026-12-31',
    totalUsageLimit: 500,
    perUserLimit: 2,
    firstOrderOnly: false,
    status: 'active' // 'active' | 'draft' | 'scheduled' | 'paused'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (promo) {
      setFormData({
        code: promo.code || '',
        description: promo.description || '',
        type: promo.type || 'fixed',
        value: promo.value || 100,
        maxDiscount: promo.maxDiscount || 100,
        minOrderAmount: promo.minOrderAmount || 0,
        startDate: promo.startDate || new Date().toISOString().slice(0, 10),
        endDate: promo.endDate || '2026-12-31',
        totalUsageLimit: promo.totalUsageLimit || 500,
        perUserLimit: promo.perUserLimit || 1,
        firstOrderOnly: promo.firstOrderOnly || false,
        status: promo.status || 'active'
      });
    } else {
      setFormData({
        code: '',
        description: '',
        type: 'fixed',
        value: 100,
        maxDiscount: 100,
        minOrderAmount: 499,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '2026-12-31',
        totalUsageLimit: 500,
        perUserLimit: 2,
        firstOrderOnly: false,
        status: 'active'
      });
    }
    setErrors({});
  }, [promo, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.code.trim()) errs.code = 'Coupon code is required (e.g. AMMAN10)';
    if (!formData.description.trim()) errs.description = 'Description is required';
    if (Number(formData.value) <= 0) errs.value = 'Value must be greater than 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      ...formData,
      code: formData.code.toUpperCase().replace(/\s+/g, ''),
      value: Number(formData.value),
      maxDiscount: Number(formData.maxDiscount),
      minOrderAmount: Number(formData.minOrderAmount),
      totalUsageLimit: Number(formData.totalUsageLimit),
      perUserLimit: Number(formData.perUserLimit)
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {promo ? 'Edit Discount Coupon' : 'Create Promotional Coupon'}
              </h3>
              <p className="text-xs text-slate-400">Cart Rules, Minimum Orders & Usage Controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Coupon Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. DIWALI100"
                className={`w-full px-3.5 py-2 text-xs font-mono font-bold tracking-wider uppercase rounded-lg border ${errors.code ? 'border-rose-500 bg-rose-50' : 'border-slate-300'} focus:ring-2 focus:ring-emerald-500 outline-none`}
              />
              {errors.code && <p className="text-[11px] text-rose-600 mt-1">{errors.code}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Discount Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
              >
                <option value="fixed">Flat Cash Discount (₹)</option>
                <option value="percentage">Percentage Discount (%)</option>
                <option value="free_delivery">Free Delivery Waive Off</option>
                <option value="free_product">Free Promotional Gift</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Customer Description *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Festive Season Grocery Discount — Flat ₹100 Off"
              className={`w-full px-3.5 py-2 text-xs rounded-lg border ${errors.description ? 'border-rose-500 bg-rose-50' : 'border-slate-300'} focus:ring-2 focus:ring-emerald-500 outline-none`}
            />
            {errors.description && <p className="text-[11px] text-rose-600 mt-1">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {formData.type === 'percentage' ? 'Percentage Value (%)' : 'Discount Amount (₹)'} *
              </label>
              <input
                type="number"
                min={1}
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Max Cap Limit (₹)
              </label>
              <input
                type="number"
                min={1}
                value={formData.maxDiscount}
                onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Min Cart Value (₹)
              </label>
              <input
                type="number"
                min={0}
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Total Redemptions Cap
              </label>
              <input
                type="number"
                min={1}
                value={formData.totalUsageLimit}
                onChange={(e) => setFormData({ ...formData, totalUsageLimit: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Per-User Limit
              </label>
              <input
                type="number"
                min={1}
                value={formData.perUserLimit}
                onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Valid From
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Valid Till
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* First Order Toggle */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800">New Customer Acquisition Special</p>
              <p className="text-[11px] text-slate-500">Only eligible for customers placing their 1st grocery order</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.firstOrderOnly}
                onChange={(e) => setFormData({ ...formData, firstOrderOnly: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              {promo ? 'Save Coupon' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
