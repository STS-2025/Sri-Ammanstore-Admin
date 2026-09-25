import React, { useState } from 'react';
import { X, Monitor, Tablet, Smartphone, ExternalLink, ArrowRight } from 'lucide-react';

export const BannerPreviewModal = ({ isOpen, onClose, banner }) => {
  const [deviceMode, setDeviceMode] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'

  if (!isOpen || !banner) return null;

  const currentImage = (deviceMode === 'mobile' && banner.mobileImageUrl)
    ? banner.mobileImageUrl
    : banner.desktopImageUrl;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar */}
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Responsive Creative Preview</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                {banner.placement}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{banner.title}</p>
          </div>

          {/* Device Frame Switcher */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setDeviceMode('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                deviceMode === 'desktop'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop (1200px)</span>
            </button>

            <button
              type="button"
              onClick={() => setDeviceMode('tablet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                deviceMode === 'tablet'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Tablet (768px)</span>
            </button>

            <button
              type="button"
              onClick={() => setDeviceMode('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                deviceMode === 'mobile'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile (375px)</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device Preview Canvas */}
        <div className="p-6 bg-slate-900/10 flex-1 overflow-y-auto flex items-center justify-center min-h-[460px]">
          <div
            className={`transition-all duration-300 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-300 flex flex-col ${
              deviceMode === 'desktop'
                ? 'w-full max-w-4xl'
                : deviceMode === 'tablet'
                ? 'w-[680px]'
                : 'w-[360px]'
            }`}
          >
            {/* Simulated Store Navigation Header */}
            <div className="bg-emerald-700 text-white px-4 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wide">🌾 SRI AMMAN STORE</span>
                <span className="text-[10px] bg-emerald-800 px-2 py-0.5 rounded font-medium">Coimbatore</span>
              </div>
              <div className="text-[11px] text-emerald-100 flex items-center gap-3">
                <span className="hidden sm:inline">Free Express Delivery above ₹499</span>
                <span className="font-bold">🛒 Cart (0)</span>
              </div>
            </div>

            {/* Banner Canvas */}
            <div className="relative group overflow-hidden bg-slate-100">
              <img
                src={currentImage}
                alt={banner.title}
                className={`w-full object-cover transition-transform duration-500 group-hover:scale-102 ${
                  deviceMode === 'desktop'
                    ? 'h-72'
                    : deviceMode === 'tablet'
                    ? 'h-64'
                    : 'h-52'
                }`}
              />

              {/* Optional Text Overlay if supported */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                  Special Supermarket Offer
                </span>
                <h4 className={`font-extrabold leading-tight text-white ${
                  deviceMode === 'mobile' ? 'text-base' : 'text-2xl'
                }`}>
                  {banner.title}
                </h4>
                {banner.tamilTitle && (
                  <p className="text-xs text-slate-200 mt-1 font-medium">{banner.tamilTitle}</p>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-md">
                    Shop Now <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10px] text-slate-300">
                    Valid till {banner.endDate || 'Limited Time'}
                  </span>
                </div>
              </div>
            </div>

            {/* Simulated Store Body Placeholder */}
            <div className="p-4 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Featured Groceries & Spices</span>
                <span className="text-emerald-700 text-[11px]">View All</span>
              </div>
              <div className={`grid gap-3 ${
                deviceMode === 'mobile' ? 'grid-cols-2' : deviceMode === 'tablet' ? 'grid-cols-3' : 'grid-cols-4'
              }`}>
                {[1, 2, 3, 4].slice(0, deviceMode === 'mobile' ? 2 : deviceMode === 'tablet' ? 3 : 4).map(i => (
                  <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                    <div className="h-16 bg-slate-100 rounded-lg mb-2" />
                    <p className="font-semibold text-slate-700 truncate">Cooking Powder Pack</p>
                    <p className="text-[11px] font-bold text-emerald-700 mt-1">₹140</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Banner Status Info */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-4">
            <span>Redirect Target: <strong className="text-slate-800">{banner.redirectUrl}</strong></span>
            <span>Priority: <strong className="text-slate-800">#{banner.priority}</strong></span>
            <span>Status: <strong className="text-emerald-700 uppercase">{banner.status}</strong></span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
