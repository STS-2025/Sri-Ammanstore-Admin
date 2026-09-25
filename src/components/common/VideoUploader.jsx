import React, { useState, useRef, useEffect } from 'react';
import { Video, UploadCloud, X, AlertCircle, Play, Film } from 'lucide-react';
import { saveVideoToDB, getVideoFromDB } from '../../utils/videoStorage';

export const VideoUploader = ({
  value,
  onChange,
  onRemove,
  maxSizeMB = 25,
  label = 'Product Showcase Video (MP4)'
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [resolvedSrc, setResolvedSrc] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Resolve video source (whether direct HTTP URL, Base64 Data URL, or idb:// IndexedDB reference)
  useEffect(() => {
    let isMounted = true;
    const resolveVideo = async () => {
      if (!value) {
        setResolvedSrc('');
        return;
      }
      if (typeof value === 'string' && value.startsWith('idb://')) {
        const dbKey = value.replace('idb://', '');
        const data = await getVideoFromDB(dbKey);
        if (isMounted) {
          if (data) {
            setResolvedSrc(typeof data === 'string' ? data : URL.createObjectURL(data));
          } else {
            setResolvedSrc('');
          }
        }
      } else {
        if (isMounted) {
          setResolvedSrc(typeof value === 'string' ? value : value?.previewUrl || '');
        }
      }
    };

    resolveVideo();
    return () => {
      isMounted = false;
    };
  }, [value]);

  const handleFiles = async (files) => {
    setError(null);
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith('video/')) {
      setError('Only video files (MP4, WebM, MOV) are allowed.');
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Video size exceeds the ${maxSizeMB}MB limit.`);
      return;
    }

    setIsUploading(true);

    try {
      const dbKey = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const reader = new FileReader();

      reader.onload = async (e) => {
        const dataUrl = e.target.result;
        // Store heavy video data in IndexedDB
        await saveVideoToDB(dbKey, dataUrl);
        setIsUploading(false);

        // Pass lightweight reference idb://... to parent form
        const idbRef = `idb://${dbKey}`;
        setResolvedSrc(dataUrl);
        onChange({ file, previewUrl: idbRef });
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error handling video file upload:', err);
      setError('Failed to process video file.');
      setIsUploading(false);
    }
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

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label className="input-label mb-0 flex items-center gap-1.5">
          <Film className="w-4 h-4 text-purple-600" />
          <span>{label}</span>
        </label>
        <span className="text-[11px] text-slate-400">Max {maxSizeMB}MB • MP4, WebM</span>
      </div>

      {resolvedSrc ? (
        <div className="relative group w-full h-44 rounded-xl border border-slate-200 overflow-hidden bg-black flex items-center justify-center">
          <video
            src={resolvedSrc}
            controls
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-slate-900/80 backdrop-blur-xs p-1.5 rounded-lg z-20">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded bg-white text-slate-800 hover:bg-slate-100 transition-colors text-xs font-semibold"
            >
              Replace Video
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="px-2.5 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 transition-colors text-xs font-semibold"
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
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            dragActive
              ? 'border-purple-600 bg-purple-50/50'
              : 'border-slate-200 hover:border-purple-500 bg-slate-50/60'
          } ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
        >
          <div className="w-10 h-10 rounded-full bg-white shadow-subtle flex items-center justify-center text-slate-400 mb-2">
            <Video className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-xs font-semibold text-slate-700 mb-0.5">
            {isUploading ? 'Saving Video...' : 'Click to upload video or drag & drop'}
          </p>
          <p className="text-[11px] text-slate-400">MP4, WebM up to {maxSizeMB}MB</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/*"
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
