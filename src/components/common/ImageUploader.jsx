import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, AlertCircle } from 'lucide-react';

const compressImage = (dataUrl, maxWidth = 600, maxHeight = 600, quality = 0.75) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
};

export const ImageUploader = ({
  value,
  onChange,
  onRemove,
  maxSizeMB = 5,
  aspectRatio = 'Square 1:1',
  label = 'Product Image'
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFiles = (files) => {
    setError(null);
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith('image/')) {
      setError('Only image files (JPEG, PNG, WebP) are allowed.');
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Image size exceeds the ${maxSizeMB}MB grocery limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const originalUrl = e.target.result;
      try {
        const compressedUrl = await compressImage(originalUrl);
        onChange({ file, previewUrl: compressedUrl });
      } catch (err) {
        onChange({ file, previewUrl: originalUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const previewSrc = typeof value === 'string' ? value : value?.previewUrl;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label className="input-label mb-0">{label}</label>
        <span className="text-[11px] text-slate-400">Max {maxSizeMB}MB • {aspectRatio}</span>
      </div>

      {previewSrc ? (
        <div className="relative group w-full h-44 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
          <img
            src={previewSrc}
            alt="Upload Preview"
            className="w-full h-full object-contain p-2"
          />
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-md text-xs font-semibold"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="p-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-md text-xs font-semibold"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            dragActive
              ? 'border-emerald-600 bg-emerald-50/50'
              : 'border-slate-200 hover:border-emerald-500 bg-slate-50/60'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-white shadow-subtle flex items-center justify-center text-slate-400 mb-2">
            <UploadCloud className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-xs font-semibold text-slate-700 mb-0.5">
            Click to upload or drag & drop
          </p>
          <p className="text-[11px] text-slate-400">PNG, JPG, WebP up to {maxSizeMB}MB</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
