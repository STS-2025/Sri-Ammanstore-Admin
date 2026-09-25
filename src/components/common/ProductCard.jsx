import React, { useState, useEffect } from 'react';
import { Package, Barcode, Tag, ImageIcon, Video, Play } from 'lucide-react';
import { formatCurrency, formatWeight } from '../../utils/formatters';
import { StockBadge } from './StockBadge';
import { getVideoFromDB } from '../../utils/videoStorage';

export const ProductCard = ({ product, onEdit, onView, onAdjustStock }) => {
  const [activeView, setActiveView] = useState('front'); // 'front' | 'back' | 'video'
  const [resolvedVideoSrc, setResolvedVideoSrc] = useState('');

  const {
    name = 'Grocery Item',
    tamilName,
    sku = 'SKU-0000',
    barcode = '8901234567890',
    categoryName = 'Grocery',
    price = 0,
    mrp = 0,
    stock = 0,
    safetyStock = 10,
    imageUrl,
    frontImageUrl,
    backImageUrl,
    videoUrl,
    unit = 'g',
    weight = 500,
    condition
  } = product || {};

  const discountPercentage = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  useEffect(() => {
    let isMounted = true;
    const resolveVideo = async () => {
      if (!videoUrl) {
        setResolvedVideoSrc('');
        return;
      }
      if (typeof videoUrl === 'string' && videoUrl.startsWith('idb://')) {
        const key = videoUrl.replace('idb://', '');
        const data = await getVideoFromDB(key);
        if (isMounted) {
          if (data) {
            setResolvedVideoSrc(typeof data === 'string' ? data : URL.createObjectURL(data));
          } else {
            setResolvedVideoSrc('');
          }
        }
      } else {
        if (isMounted) {
          setResolvedVideoSrc(videoUrl);
        }
      }
    };
    resolveVideo();
    return () => {
      isMounted = false;
    };
  }, [videoUrl]);

  // Determine which media to display
  const currentImageSrc = activeView === 'back' && backImageUrl 
    ? backImageUrl 
    : (frontImageUrl || imageUrl);

  const hasMultipleMedia = Boolean(backImageUrl || videoUrl);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle hover:shadow-card transition-all duration-200 overflow-hidden flex flex-col group">
      {/* Product Image / Video Display */}
      <div className="relative h-44 bg-black flex items-center justify-center overflow-hidden">
        {activeView === 'video' && resolvedVideoSrc ? (
          <video
            src={resolvedVideoSrc}
            controls
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : currentImageSrc ? (
          <img
            src={currentImageSrc}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-300">
            <Package className="w-12 h-12 stroke-[1.5]" />
            <span className="text-[10px] uppercase font-mono mt-1 tracking-wider text-slate-400">No Image</span>
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          <StockBadge quantity={stock} safetyStock={safetyStock} condition={condition} />
        </div>

        {discountPercentage > 0 && (
          <div className="absolute top-2.5 right-2.5 bg-rose-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-sm z-10">
            {discountPercentage}% OFF
          </div>
        )}

        {/* Media View Selector (Front / Back / Video) overlay buttons */}
        {hasMultipleMedia && (
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-0.5 bg-slate-900/80 backdrop-blur-xs p-0.5 rounded-lg border border-white/20 text-[10px] font-bold z-10 shadow-sm">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveView('front');
              }}
              className={`px-2 py-0.5 rounded transition-all ${
                activeView === 'front'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Front
            </button>

            {backImageUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveView('back');
                }}
                className={`px-2 py-0.5 rounded transition-all ${
                  activeView === 'back'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Back
              </button>
            )}

            {videoUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveView('video');
                }}
                className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                  activeView === 'video'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                <Play className="w-2.5 h-2.5 fill-current" />
                Video
              </button>
            )}
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold mb-1">
            <Tag className="w-3 h-3" />
            <span>{categoryName}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-normal">{formatWeight(weight, unit)}</span>
          </div>

          <h4 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
            {name}
          </h4>
          {tamilName && (
            <p className="text-xs text-slate-500 font-normal line-clamp-1 mb-2 font-sans">
              {tamilName}
            </p>
          )}

          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mb-3">
            <span>SKU: {sku}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Barcode className="w-3 h-3" />
              {barcode}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-lg font-bold text-slate-900 font-sans">
              {formatCurrency(price)}
            </span>
            {mrp > price && (
              <span className="text-xs text-slate-400 line-through">
                {formatCurrency(mrp)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            {onEdit && (
              <button
                onClick={() => onEdit(product)}
                className="flex-1 btn-secondary text-xs py-1.5"
              >
                Edit
              </button>
            )}
            {onAdjustStock && (
              <button
                onClick={() => onAdjustStock(product)}
                className="btn-primary text-xs py-1.5"
              >
                Stock
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
