import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Eye, Calendar, Link, Layers, AlertCircle } from 'lucide-react';

export const BannerFormModal = ({ isOpen, onClose, onSave, banner = null, onPreviewRequest = null }) => {
  const [formData, setFormData] = useState({
    title: '',
    tamilTitle: '',
    desktopImageUrl: '',
    mobileImageUrl: '',
    videoUrl: '',
    redirectUrl: '/products',
    placement: 'homepage_slider', // 'homepage_slider' | 'mid_page' | 'category_page' | 'offer_wall' | 'popup'
    priority: 1,
    status: 'active', // 'draft' | 'scheduled' | 'active' | 'paused'
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '2026-12-31'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (banner) {
      setFormData({
        title: banner.title || '',
        tamilTitle: banner.tamilTitle || '',
        desktopImageUrl: banner.desktopImageUrl || '',
        mobileImageUrl: banner.mobileImageUrl || '',
        videoUrl: banner.videoUrl || '',
        redirectUrl: banner.redirectUrl || '/products',
        placement: banner.placement || 'homepage_slider',
        priority: banner.priority || 1,
        status: banner.status || 'active',
        startDate: banner.startDate || new Date().toISOString().slice(0, 10),
        endDate: banner.endDate || '2026-12-31'
      });
    } else {
      setFormData({
        title: '',
        tamilTitle: '',
        desktopImageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=80',
        mobileImageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
        videoUrl: '',
        redirectUrl: '/products',
        placement: 'homepage_slider',
        priority: 1,
        status: 'active',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '2026-12-31'
      });
    }
    setErrors({});
  }, [banner, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = 'Banner title is required';
    if (!formData.desktopImageUrl.trim()) errs.desktopImageUrl = 'Desktop image URL is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {banner ? 'Edit Promotional Banner' : 'Create Promotional Banner'}
              </h3>
              <p className="text-xs text-slate-400">Marketing Creative & Multi-Device Target</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Banner Headline (English) *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Festival Cooking Specials — Up to 25% Off"
                className={`w-full px-3.5 py-2 text-xs rounded-lg border ${errors.title ? 'border-rose-500 bg-rose-50' : 'border-slate-300'} focus:ring-2 focus:ring-emerald-500 outline-none`}
              />
              {errors.title && <p className="text-[11px] text-rose-600 mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Headline in Tamil (தமிழ் தலைப்பு)
              </label>
              <input
                type="text"
                value={formData.tamilTitle}
                onChange={(e) => setFormData({ ...formData, tamilTitle: e.target.value })}
                placeholder="எ.கா. பண்டிகை கால மசாலா சிறப்பு தள்ளுபடி"
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Placement Location
              </label>
              <select
                value={formData.placement}
                onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
              >
                <option value="homepage_slider">Homepage Top Carousel</option>
                <option value="mid_page">Mid-Page Featured Strip</option>
                <option value="category_page">Category Header Banner</option>
                <option value="offer_wall">Exclusive Offer Wall</option>
                <option value="popup">Entry Modal Popup</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Display Priority
              </label>
              <input
                type="number"
                min={1}
                max={99}
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="text-[10px] text-slate-400">1 = First position</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
              >
                <option value="active">🟢 Active / Published</option>
                <option value="draft">⚪ Draft</option>
                <option value="scheduled">🟡 Scheduled</option>
                <option value="paused">🔴 Paused</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Desktop Image URL (1200 x 400 recommended) *
            </label>
            <input
              type="url"
              value={formData.desktopImageUrl}
              onChange={(e) => setFormData({ ...formData, desktopImageUrl: e.target.value })}
              placeholder="https://images.unsplash.com/photo-..."
              className={`w-full px-3.5 py-2 text-xs rounded-lg border ${errors.desktopImageUrl ? 'border-rose-500 bg-rose-50' : 'border-slate-300'} focus:ring-2 focus:ring-emerald-500 outline-none`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Mobile Image URL (600 x 400 recommended)
              </label>
              <input
                type="url"
                value={formData.mobileImageUrl}
                onChange={(e) => setFormData({ ...formData, mobileImageUrl: e.target.value })}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Redirect Link / Action
              </label>
              <input
                type="text"
                value={formData.redirectUrl}
                onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
                placeholder="e.g. /products?category=cat-spices"
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Schedule Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Schedule End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Quick Image Preview Strip */}
          {formData.desktopImageUrl && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={formData.desktopImageUrl}
                  alt="Desktop Preview"
                  className="w-20 h-10 object-cover rounded-lg border border-slate-200"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">Banner Creative Ready</p>
                  <p className="text-[11px] text-slate-500">Preview on Desktop, Tablet, and Mobile devices before publishing</p>
                </div>
              </div>

              {onPreviewRequest && (
                <button
                  type="button"
                  onClick={() => onPreviewRequest(formData)}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview Frame
                </button>
              )}
            </div>
          )}

          {/* Modal Footer */}
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
              {banner ? 'Update Banner' : 'Publish Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
