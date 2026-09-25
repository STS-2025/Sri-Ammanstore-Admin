import React, { useState, useEffect } from 'react';
import { X, Megaphone, Eye, Palette, CheckCircle2, Clock } from 'lucide-react';

export const AnnouncementModal = ({ isOpen, onClose, onSave, announcement = null }) => {
  const [formData, setFormData] = useState({
    text: '',
    tamilText: '',
    linkUrl: '/products',
    bgColor: '#0f5132',
    textColor: '#ffffff',
    speedSeconds: 15,
    isActive: true,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '2026-12-31'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (announcement) {
      setFormData({
        text: announcement.text || '',
        tamilText: announcement.tamilText || '',
        linkUrl: announcement.linkUrl || '/products',
        bgColor: announcement.bgColor || '#0f5132',
        textColor: announcement.textColor || '#ffffff',
        speedSeconds: announcement.speedSeconds || 15,
        isActive: announcement.isActive !== undefined ? announcement.isActive : true,
        startDate: announcement.startDate || new Date().toISOString().slice(0, 10),
        endDate: announcement.endDate || '2026-12-31'
      });
    } else {
      setFormData({
        text: '',
        tamilText: '',
        linkUrl: '/products',
        bgColor: '#0f5132',
        textColor: '#ffffff',
        speedSeconds: 15,
        isActive: true,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '2026-12-31'
      });
    }
    setErrors({});
  }, [announcement, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.text.trim()) errs.text = 'Announcement message text is required';
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {announcement ? 'Edit Announcement Bar' : 'Create Scrolling Announcement Bar'}
              </h3>
              <p className="text-xs text-slate-400">Storewide top-banner notification ticker</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Box */}
        <div className="p-4 bg-slate-100 border-b border-slate-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
            Live Interactive Ticker Preview
          </span>
          <div
            className="py-2.5 px-4 rounded-xl overflow-hidden font-medium text-xs flex items-center justify-center shadow-inner"
            style={{ backgroundColor: formData.bgColor, color: formData.textColor }}
          >
            <span className="truncate">
              {formData.text || '🌾 Free Express Home Delivery in Coimbatore for all orders above ₹499!'}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Ticker Announcement Message (English) *
            </label>
            <textarea
              rows={2}
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              placeholder="e.g. 🌾 Free Express Home Delivery in Coimbatore for all orders above ₹499!"
              className={`w-full px-3.5 py-2 text-xs rounded-lg border ${errors.text ? 'border-rose-500 bg-rose-50' : 'border-slate-300'} focus:ring-2 focus:ring-emerald-500 outline-none`}
            />
            {errors.text && <p className="text-xs text-rose-600 mt-1">{errors.text}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tamil Announcement Translation (தமிழ் அறிவிப்பு)
            </label>
            <input
              type="text"
              value={formData.tamilText}
              onChange={(e) => setFormData({ ...formData, tamilText: e.target.value })}
              placeholder="எ.கா. ₹499க்கு மேல் வாங்கும் ஆர்டர்களுக்கு இலவச டெலிவரி!"
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Background Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.bgColor}
                  onChange={(e) => setFormData({ ...formData, bgColor: e.target.value })}
                  className="w-10 h-9 rounded-lg border border-slate-300 p-0.5 cursor-pointer bg-white"
                />
                <input
                  type="text"
                  value={formData.bgColor}
                  onChange={(e) => setFormData({ ...formData, bgColor: e.target.value })}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Text Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.textColor}
                  onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                  className="w-10 h-9 rounded-lg border border-slate-300 p-0.5 cursor-pointer bg-white"
                />
                <input
                  type="text"
                  value={formData.textColor}
                  onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Scroll Speed
              </label>
              <select
                value={formData.speedSeconds}
                onChange={(e) => setFormData({ ...formData, speedSeconds: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
              >
                <option value={8}>Fast (8s)</option>
                <option value={15}>Normal (15s)</option>
                <option value={25}>Slow (25s)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Active Status
              </label>
              <select
                value={formData.isActive ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
              >
                <option value="true">🟢 Active on Website</option>
                <option value="false">⚪ Inactive / Hidden</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Link Target URL
              </label>
              <input
                type="text"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="/products"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

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
              Save Announcement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
