import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Smartphone, CheckCircle2, AlertTriangle, Camera, RefreshCw, Power, Zap, ShieldCheck, History, Download, Globe, Play } from 'lucide-react';
import { connectMobileScanner, sendScanEvent, getScannerSession } from '../../firebase/scannerService';

export const MobileScannerConnectPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('s');
  const token = searchParams.get('t');

  const [sessionInfo, setSessionInfo] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Scanner & Camera state
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [scanningActive, setScanningActive] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [scanStatusToast, setScanStatusToast] = useState(null);

  const html5QrCodeRef = useRef(null);
  const lastScanTimeRef = useRef(0);

  // Audio Beep Feedback using Web Audio API
  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880 Hz High Pitch Beep
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.15); // 150ms duration
    } catch (_) {}
  };

  // Device Haptic Vibration
  const triggerVibration = () => {
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  };

  // Verify Session Token on Mount
  useEffect(() => {
    const checkSession = async () => {
      if (!sessionId || !token) {
        setErrorMsg('Invalid URL parameters. Please scan the QR code displayed on the Billing PC.');
        setLoading(false);
        return;
      }

      try {
        const sess = await getScannerSession(sessionId);
        if (!sess || sess.token !== token) {
          setErrorMsg('Invalid or expired connection token.');
        } else {
          setSessionInfo(sess);
        }
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [sessionId, token]);

  // Handle Initial Connect Button Click (Web Browser Camera)
  const handleConnectWeb = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const deviceId = `mobile_web_${Date.now().toString(36)}`;
      const deviceName = `${navigator.platform || 'Mobile'} Web Scanner`;

      await connectMobileScanner({
        sessionId,
        token,
        deviceId,
        deviceName
      });

      setConnected(true);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Trigger camera start after DOM element `#mobile-barcode-reader` is rendered
  useEffect(() => {
    if (connected && !scanningActive) {
      const timer = setTimeout(() => {
        requestCameraAndStart();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [connected]);

  // Request Native Browser Camera Permission & Start Html5Qrcode
  const requestCameraAndStart = async () => {
    setCameraStarting(true);
    setErrorMsg(null);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        stream.getTracks().forEach((track) => track.stop());
        setCameraPermissionGranted(true);
      }
    } catch (permErr) {
      if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
        setErrorMsg('Camera access was denied. Please allow camera permissions in your browser settings (tap lock icon in URL bar) and tap Try Again.');
        setCameraStarting(false);
        return;
      }
    }

    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (_) {}
      }

      const readerElem = document.getElementById('mobile-barcode-reader');
      if (!readerElem) {
        setCameraStarting(false);
        return;
      }

      const html5QrCode = new Html5Qrcode('mobile-barcode-reader');
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 160 },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        handleBarcodeDetected,
        () => {}
      );

      setScanningActive(true);
      setCameraPermissionGranted(true);
    } catch (err) {
      setErrorMsg('Unable to start camera. Please check camera permissions and tap Try Again.');
    } finally {
      setCameraStarting(false);
    }
  };

  // Barcode Detection & Throttled Dispatch
  const handleBarcodeDetected = async (decodedText) => {
    const now = Date.now();
    if (now - lastScanTimeRef.current < 800) {
      return;
    }
    lastScanTimeRef.current = now;

    playBeepSound();
    triggerVibration();

    const cleanBarcode = decodedText.trim();
    setLastScannedBarcode(cleanBarcode);

    setScanStatusToast({
      type: 'pending',
      barcode: cleanBarcode,
      message: `Scanning ${cleanBarcode}...`
    });

    try {
      await sendScanEvent({
        sessionId,
        token,
        barcode: cleanBarcode
      });

      setScanStatusToast({
        type: 'success',
        barcode: cleanBarcode,
        message: `✓ Sent barcode ${cleanBarcode} to ${sessionInfo?.counterId || 'Billing PC'}`
      });

      setRecentScans((prev) => [
        { barcode: cleanBarcode, time: new Date().toLocaleTimeString(), status: 'Sent' },
        ...prev.slice(0, 4)
      ]);
    } catch (err) {
      setScanStatusToast({
        type: 'error',
        barcode: cleanBarcode,
        message: err.message || 'Failed sending scan'
      });
    }

    setTimeout(() => {
      setScanStatusToast(null);
    }, 2500);
  };

  // Disconnect & Stop Camera
  const handleDisconnect = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (_) {}
    }
    setConnected(false);
    setScanningActive(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
          <h2 className="text-base font-bold">Connecting to Billing Terminal...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Mobile Top Bar */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
            SA
          </div>
          <div>
            <span className="text-xs font-bold text-white block leading-tight">Sri Amman Store</span>
            <span className="text-[10px] text-emerald-400 font-mono block">Wireless POS Scanner</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connected ? (
            <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded-full text-[10px] font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Connected</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-amber-950 text-amber-300 border border-amber-700/60 rounded-full text-[10px] font-bold">
              Ready
            </span>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 p-4 flex flex-col items-center justify-center space-y-4 max-w-md mx-auto w-full">
        {errorMsg && (
          <div className="w-full bg-rose-950/90 border border-rose-700 text-rose-200 p-4 rounded-2xl text-center space-y-3 shadow-lg">
            <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
            <p className="text-xs font-semibold leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => requestCameraAndStart()}
              className="px-4 py-2 bg-rose-800 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              Try Again / Allow Camera
            </button>
          </div>
        )}

        {!connected ? (
          /* Choice Screen: Web Browser Scanner vs Install Native APK App */
          <div className="w-full bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <Smartphone className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-black text-white">{sessionInfo?.counterId || 'Counter #1'}</h2>
              <p className="text-xs text-slate-400 mt-1">Choose how you want to scan product barcodes on your phone:</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl text-xs font-mono text-slate-400 border border-slate-800 space-y-1">
              <div className="flex justify-between">
                <span>Session:</span>
                <strong className="text-slate-200">{sessionInfo?.sessionId}</strong>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <strong className="text-slate-200">{sessionInfo?.billingUserName}</strong>
              </div>
            </div>

            {/* Option 1: Instant Web Browser Scanner */}
            <button
              onClick={handleConnectWeb}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>USE WEB BROWSER SCANNER (INSTANT)</span>
            </button>

            <div className="flex items-center gap-3 my-2 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
              <div className="flex-1 h-px bg-slate-800" />
              <span>OR</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Option 2: Download & Open Native Android APK App */}
            <a
              href="/downloads/SriAmmanStoreScanner.apk"
              download="SriAmmanStoreScanner.apk"
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>INSTALL ANDROID APP (.APK)</span>
            </a>
            <p className="text-[10px] text-slate-500">
              After downloading, install the APK and open Sri Amman Store Scanner to scan this billing QR.
            </p>
          </div>
        ) : (
          /* Active Camera Scanner View */
          <div className="w-full space-y-4">
            {/* Live Camera Scanner Box */}
            <div className="relative bg-slate-900 border-2 border-emerald-500/60 rounded-2xl overflow-hidden shadow-2xl min-h-[260px] flex items-center justify-center">
              <div id="mobile-barcode-reader" className="w-full h-64 bg-black" />

              {!scanningActive && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center space-y-3 z-10">
                  <Camera className="w-10 h-10 text-emerald-400 animate-pulse" />
                  <p className="text-xs font-bold text-slate-200">
                    {cameraStarting ? 'Requesting Camera Access...' : 'Tap below to grant camera permission and start scanner.'}
                  </p>
                  <button
                    onClick={requestCameraAndStart}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md"
                  >
                    Open Camera Scanner
                  </button>
                </div>
              )}

              {/* Visual Target Alignment Overlay */}
              {scanningActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-36 border-2 border-dashed border-emerald-400/90 rounded-xl bg-emerald-500/5 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest bg-slate-950/80 px-2 py-1 rounded">
                      Align Barcode Here
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Scan Result Toast Feedback */}
            {scanStatusToast && (
              <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-lg animate-in fade-in ${
                scanStatusToast.type === 'success'
                  ? 'bg-emerald-950 text-emerald-200 border-emerald-700'
                  : scanStatusToast.type === 'error'
                    ? 'bg-rose-950 text-rose-200 border-rose-700'
                    : 'bg-amber-950 text-amber-200 border-amber-700'
              }`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{scanStatusToast.message}</span>
                </div>
              </div>
            )}

            {/* Recent Scans Table */}
            {recentScans.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <History className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Recent Scans Sent</span>
                </div>
                <div className="space-y-1.5 font-mono text-xs">
                  {recentScans.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="font-bold text-slate-200">{s.barcode}</span>
                      <span className="text-[10px] text-emerald-400">{s.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disconnect Control */}
            <div className="pt-2 text-center">
              <button
                onClick={handleDisconnect}
                className="w-full py-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Power className="w-4 h-4" />
                <span>Disconnect Camera Scanner</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
