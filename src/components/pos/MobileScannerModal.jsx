import React, { useState, useEffect, useRef } from 'react';
import { X, Smartphone, Barcode as BarcodeIcon, RefreshCw, CheckCircle2, AlertCircle, ShieldCheck, Power, Clock } from 'lucide-react';
import QRCode from 'qrcode';
import { createScannerSession, listenToScannerSession, disconnectScannerSession } from '../../firebase/scannerService';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';

export const MobileScannerModal = ({ isOpen, onClose, activeSession, onSessionCreated, scanCount = 0 }) => {
  const notify = useNotification();
  const { currentUser, userRole } = useAuth();

  const [session, setSession] = useState(activeSession || null);
  const [loading, setLoading] = useState(false);
  const [qrCanvasUrl, setQrCanvasUrl] = useState('');
  const canvasRef = useRef(null);

  // Initialize or Listen to Session
  const initSession = async () => {
    setLoading(true);
    try {
      const newSess = await createScannerSession({ counterId: 'Counter #1', user: currentUser || { role: userRole } });
      setSession(newSess);
      if (onSessionCreated) onSessionCreated(newSess);
    } catch (err) {
      notify.error('Session Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !activeSession) {
      initSession();
    } else if (activeSession) {
      setSession(activeSession);
    }
  }, [isOpen, activeSession]);

  // Generate QR Code Image Canvas
  useEffect(() => {
    if (!session || !session.sessionId) return;

    const connectUrl = `${window.location.origin}/scanner/connect?s=${session.sessionId}&t=${session.token}`;

    QRCode.toDataURL(connectUrl, {
      width: 250,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then((url) => setQrCanvasUrl(url))
      .catch((err) => console.error('QR code render error', err));
  }, [session]);

  // Realtime Connection Listener
  useEffect(() => {
    if (!session || !session.sessionId) return;

    const unsubscribe = listenToScannerSession(session.sessionId, (updatedSess) => {
      setSession((prev) => ({ ...prev, ...updatedSess }));
    });

    return () => unsubscribe();
  }, [session?.sessionId]);

  if (!isOpen) return null;

  const isConnected = session?.status === 'CONNECTED';
  const isWaiting = session?.status === 'WAITING_FOR_MOBILE';

  const handleDisconnect = async () => {
    if (session?.sessionId) {
      await disconnectScannerSession(session.sessionId);
      notify.info('Scanner Disconnected', 'Mobile phone scanner session closed.');
      initSession();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Wireless Mobile Barcode Scanner</h2>
              <p className="text-xs text-slate-300">Turn phone camera into high-speed POS scanner</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-5 bg-slate-50">
          {/* Connection Status Badge */}
          <div className="flex items-center justify-center">
            {isConnected ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span>🟢 Mobile Scanner Connected ({session.connectedDeviceName || 'Phone'})</span>
              </span>
            ) : isWaiting ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span>🟡 Waiting for Mobile Connection...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                <span>🔴 Scanner Disconnected</span>
              </span>
            )}
          </div>

          {/* QR Code Section */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm max-w-[260px] mx-auto space-y-2">
            {qrCanvasUrl ? (
              <img src={qrCanvasUrl} alt="Scanner QR Code" className="w-56 h-56 mx-auto rounded-lg" />
            ) : (
              <div className="w-56 h-56 mx-auto rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs">
                Generating QR...
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-500 leading-tight">
              Scan this QR code using your phone camera to pair with Counter #1
            </p>
          </div>

          {/* Session Details */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1 font-mono text-slate-600">
            <div className="flex justify-between">
              <span>Session ID:</span>
              <strong className="text-slate-900">{session?.sessionId || '-'}</strong>
            </div>
            <div className="flex justify-between">
              <span>Scans in Current Bill:</span>
              <strong className="text-emerald-700 font-bold text-sm">{scanCount} items</strong>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Token Security:</span>
              <span>Encrypted Random Token</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <button
            onClick={initSession}
            disabled={loading}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Generate New QR</span>
          </button>

          <div className="flex items-center gap-2">
            {isConnected && (
              <button
                onClick={handleDisconnect}
                className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition-all"
              >
                Disconnect Phone
              </button>
            )}
            <button
              onClick={onClose}
              className="btn-primary text-xs py-2 px-4 shadow-sm"
            >
              Done (Keep Active)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
