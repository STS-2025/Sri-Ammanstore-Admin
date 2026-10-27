import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { initializeApp, getApps } from 'firebase/app';
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const requiredFirebaseFields = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
];
const missingFirebaseFields = requiredFirebaseFields.filter((field) => !firebaseConfig[field]);
const firebaseApp = missingFirebaseFields.length === 0
  ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig))
  : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;
const BARCODE_TYPES = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'code93',
  'itf14',
  'codabar',
  'pdf417',
  'aztec',
  'datamatrix'
];
const SCAN_TYPES = ['qr', ...BARCODE_TYPES];
const DEVICE_ID = `native_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const getQrSession = (value) => {
  const rawValue = typeof value === 'string' ? value.trim() : '';
  if (!rawValue) return null;

  const getValue = (source, names) => {
    for (const name of names) {
      const value = source?.[name];
      const candidate = Array.isArray(value) ? value[0] : value;
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
    return null;
  };

  const createSession = (sessionId, token) => {
    if (
      typeof sessionId === 'string' &&
      typeof token === 'string' &&
      sessionId.trim() &&
      token.trim() &&
      !sessionId.includes('/')
    ) {
      return { sessionId: sessionId.trim(), token: token.trim() };
    }
    return null;
  };

  try {
    const json = JSON.parse(rawValue);
    const session = createSession(
      getValue(json, ['s', 'sessionId', 'session_id', 'id']),
      getValue(json, ['t', 'token', 'securityToken', 'security_token'])
    );
    if (session) return session;
  } catch (_) {
    // QR codes usually contain URLs; try URL parsing below.
  }

  try {
    const parsed = Linking.parse(rawValue);
    const session = createSession(
      getValue(parsed.queryParams, ['s', 'sessionId', 'session_id', 'id']),
      getValue(parsed.queryParams, ['t', 'token', 'securityToken', 'security_token'])
    );
    if (session) return session;
  } catch (_) {
    // Fall back to parsing the query string directly.
  }

  const queryStart = rawValue.indexOf('?');
  const query = queryStart >= 0
    ? rawValue.slice(queryStart + 1)
    : rawValue.replace(/^[?#]/, '');
  const params = {};
  query.split('#', 1)[0].split('&').forEach((parameter) => {
    if (!parameter) return;

    const separator = parameter.indexOf('=');
    const rawName = separator < 0 ? parameter : parameter.slice(0, separator);
    const rawParamValue = separator < 0 ? '' : parameter.slice(separator + 1);
    try {
      const name = decodeURIComponent(rawName.replace(/\+/g, ' '));
      const paramValue = decodeURIComponent(rawParamValue.replace(/\+/g, ' '));
      if (name) {
        const previousValue = params[name];
        params[name] = previousValue === undefined
          ? paramValue
          : Array.isArray(previousValue)
            ? [...previousValue, paramValue]
            : [previousValue, paramValue];
      }
    } catch (_) {
      // Ignore malformed query parameters and reject the payload if required fields are missing.
    }
  });
  return createSession(
    getValue(params, ['s', 'sessionId', 'session_id', 'id']),
    getValue(params, ['t', 'token', 'securityToken', 'security_token'])
  );
};

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [sessionInfo, setSessionInfo] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isPairing, setIsPairing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraKey, setCameraKey] = useState(0);
  const pairingInProgressRef = useRef(false);
  const lastScanTimeRef = useRef(0);
  const scanInProgressRef = useRef(false);

  const connectWithQr = useCallback(async (value, { preserveRecentScans = false } = {}) => {
    if (pairingInProgressRef.current) return;
    const qrSession = getQrSession(value);
    if (!qrSession) {
      setErrorMessage('QR detected, but it does not contain a scanner session ID and security token. Scan the QR shown on the billing screen.');
      return;
    }
    if (!db) {
      setErrorMessage('Firebase is not configured. Add the project settings to this app’s .env file and restart Expo.');
      return;
    }

    pairingInProgressRef.current = true;
    setIsPairing(true);
    setErrorMessage('');
    try {
      const sessionRef = doc(db, 'scannerSessions', qrSession.sessionId);
      const sessionSnapshot = await getDoc(sessionRef);
      if (!sessionSnapshot.exists()) {
        throw new Error('Scanner session not found. Generate a new QR code on the billing screen.');
      }

      const session = sessionSnapshot.data();
      if (session.token !== qrSession.token) {
        throw new Error('Invalid scanner security token. Generate a new QR code and try again.');
      }
      if (session.status === 'EXPIRED' || (session.expiresAt && Date.now() > new Date(session.expiresAt).getTime())) {
        throw new Error('This scanner session has expired. Generate a new QR code on the billing screen.');
      }

      const deviceName = 'Sri Amman Store Scanner';
      await updateDoc(sessionRef, {
        status: 'CONNECTED',
        connectedDeviceId: DEVICE_ID,
        connectedDeviceName: deviceName,
        connectedAt: new Date().toISOString(),
        lastActivityAt: serverTimestamp()
      });

      setCameraError('');
      setSessionInfo({
        sessionId: qrSession.sessionId,
        token: qrSession.token,
        counterId: session.counterId || 'Counter #1'
      });
      setStatusMessage(`Connected to ${session.counterId || 'Counter #1'}. Ready to scan.`);
      if (!preserveRecentScans) {
        setRecentScans([]);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setErrorMessage(error.message || 'Could not connect to the billing session.');
    } finally {
      pairingInProgressRef.current = false;
      setIsPairing(false);
    }
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) connectWithQr(url);
    }).catch((error) => {
      console.warn('[Scanner] Could not read the initial app link:', error);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => connectWithQr(url));
    return () => subscription.remove();
  }, [connectWithQr]);

  const handleBarcodeScanned = async ({ data }) => {
    if (!sessionInfo || scanInProgressRef.current) return;
    const now = Date.now();
    if (now - lastScanTimeRef.current < 800) return;

    lastScanTimeRef.current = now;
    scanInProgressRef.current = true;
    const barcode = data.trim();
    setStatusMessage(`Sending ${barcode}...`);
    setErrorMessage('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch((error) => {
      console.warn('[Scanner] Haptic feedback unavailable:', error);
    });

    try {
      const eventId = `event_${now}_${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(doc(db, 'scannerSessions', sessionInfo.sessionId, 'scanEvents', eventId), {
        eventId,
        sessionId: sessionInfo.sessionId,
        barcode,
        type: 'BARCODE_SCANNED',
        deviceId: DEVICE_ID,
        status: 'pending',
        result: null,
        createdAt: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      });
      setStatusMessage(`Sent ${barcode} to ${sessionInfo.counterId}.`);
      setRecentScans((current) => [
        { barcode, time: new Date().toLocaleTimeString() },
        ...current.slice(0, 4)
      ]);
    } catch (error) {
      setErrorMessage(error.message || 'Could not send the barcode to the billing screen.');
      setStatusMessage('');
    } finally {
      scanInProgressRef.current = false;
    }
  };

  const handleCameraScanned = (result) => {
    if (result.type === 'qr') {
      if (!getQrSession(result.data)) {
        setErrorMessage('');
        setStatusMessage('QR detected. Point the camera at the billing screen scanner QR.');
        return;
      }

      if (!sessionInfo && !isPairing && !pairingInProgressRef.current) {
        connectWithQr(result.data);
      }
      return;
    }

    if (sessionInfo) {
      handleBarcodeScanned(result);
    }
  };

  const disconnectScanner = () => {
    setSessionInfo(null);
    setStatusMessage('');
    setErrorMessage('');
    setCameraError('');
    setRecentScans([]);
  };

  const retryCamera = () => {
    setCameraError('');
    setCameraReady(false);
    setCameraKey((key) => key + 1);
  };

  const reconnectAdmin = () => {
    if (!sessionInfo) return;
    setCameraError('');
    connectWithQr(
      `sriammanstore://scanner?s=${encodeURIComponent(sessionInfo.sessionId)}&t=${encodeURIComponent(sessionInfo.token)}`,
      { preserveRecentScans: true }
    );
  };

  if (missingFirebaseFields.length > 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#090d16" />
        <View style={styles.centerContent}>
          <View style={styles.card}>
            <Text style={styles.title}>Firebase Setup Required</Text>
            <Text style={styles.subtitle}>
              Create a .env file from .env.example, enter the Firebase web app settings, then restart Expo.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return <SafeAreaView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#090d16" />
        <View style={styles.centerContent}>
          <View style={styles.card}>
            <Text style={styles.title}>Camera Permission Required</Text>
            <Text style={styles.subtitle}>
              Allow camera access to scan the billing QR code and product barcodes.
            </Text>
            <TouchableOpacity style={styles.button} onPress={requestPermission}>
              <Text style={styles.buttonText}>ALLOW CAMERA</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090d16" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sri Amman Store Scanner</Text>
        <Text style={styles.headerSubtitle}>
          {sessionInfo ? `Connected · ${sessionInfo.counterId}` : 'Wireless POS Barcode Scanner'}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.cameraFrame}>
          <CameraView
            key={`scanner-camera-${cameraKey}`}
            style={StyleSheet.absoluteFill}
            facing="back"
            active
            barcodeScannerSettings={{ barcodeTypes: SCAN_TYPES }}
            onBarcodeScanned={handleCameraScanned}
            onCameraReady={() => {
              setCameraReady(true);
              setCameraError('');
            }}
            onMountError={(event) => {
              setCameraReady(false);
              setCameraError(event.message || 'Camera could not start. Check camera access and retry.');
            }}
          />
          <View pointerEvents="none" style={sessionInfo ? styles.barcodeTarget : styles.qrTarget}>
            {sessionInfo && <Text style={styles.targetText}>ALIGN BARCODE HERE</Text>}
          </View>
          {!cameraReady && !cameraError && (
            <View pointerEvents="none" style={styles.cameraOverlay}>
              <Text style={styles.cameraOverlayText}>Starting camera...</Text>
            </View>
          )}
          {!!cameraError && (
            <View style={styles.cameraErrorOverlay}>
              <Text style={styles.cameraOverlayText}>{cameraError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={retryCamera}>
                <Text style={styles.retryButtonText}>RETRY CAMERA</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!sessionInfo ? (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>Pair with Billing Screen</Text>
              <Text style={styles.subtitle}>
                Point the camera at the scanner QR code shown on the billing screen.
              </Text>
              {isPairing && <Text style={styles.status}>Connecting to billing screen...</Text>}
              <Text style={styles.helper}>
                {statusMessage || 'Scan the QR from inside this app.'}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.messageCard}>
              {!!statusMessage && <Text style={styles.status}>{statusMessage}</Text>}
              {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
            </View>

            <View style={styles.historyCard}>
              <Text style={styles.historyTitle}>RECENT SCANS</Text>
              {recentScans.length === 0 ? (
                <Text style={styles.helper}>Scanned barcodes will appear here.</Text>
              ) : (
                <FlatList
                  data={recentScans}
                  keyExtractor={(item, index) => `${item.barcode}-${index}`}
                  renderItem={({ item }) => (
                    <View style={styles.historyItem}>
                      <Text style={styles.historyBarcode}>{item.barcode}</Text>
                      <Text style={styles.historyTime}>{item.time}</Text>
                    </View>
                  )}
                />
              )}
            </View>

            <TouchableOpacity style={styles.disconnectButton} onPress={disconnectScanner}>
              <Text style={styles.disconnectText}>DISCONNECT SCANNER</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reconnectButton}
              onPress={reconnectAdmin}
              disabled={isPairing}
            >
              <Text style={styles.reconnectText}>
                {isPairing ? 'Reconnecting...' : 'Reconnect admin'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {!!errorMessage && !sessionInfo && (
          <View style={styles.errorCard}>
            <Text style={styles.error}>{errorMessage}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16'
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  headerTitle: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '800'
  },
  headerSubtitle: {
    color: '#34d399',
    fontSize: 12,
    marginTop: 5
  },
  content: {
    flex: 1,
    padding: 18,
    justifyContent: 'center',
    gap: 14
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 20
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center'
  },
  title: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center'
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16
  },
  cameraFrame: {
    width: '100%',
    height: 290,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#10b981',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9, 13, 22, 0.78)'
  },
  cameraErrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(69, 10, 10, 0.92)'
  },
  cameraOverlayText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center'
  },
  retryButton: {
    marginTop: 14,
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800'
  },
  qrTarget: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: '#34d399',
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.06)'
  },
  barcodeTarget: {
    width: '82%',
    height: 130,
    borderWidth: 2,
    borderColor: '#34d399',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.06)'
  },
  targetText: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: '#090d16',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  helper: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12
  },
  status: {
    color: '#a7f3d0',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center'
  },
  error: {
    color: '#fecaca',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 19
  },
  errorCard: {
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#991b1b',
    borderRadius: 12,
    padding: 12
  },
  messageCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12
  },
  historyCard: {
    flex: 1,
    minHeight: 100,
    maxHeight: 180,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12
  },
  historyTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#090d16',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6
  },
  historyBarcode: {
    color: '#fff',
    fontFamily: 'monospace',
    fontWeight: '700'
  },
  historyTime: {
    color: '#34d399',
    fontSize: 11
  },
  button: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800'
  },
  disconnectButton: {
    backgroundColor: '#450a0a',
    borderColor: '#991b1b',
    borderWidth: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center'
  },
  disconnectText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '800'
  },
  reconnectButton: {
    backgroundColor: '#064e3b',
    borderColor: '#059669',
    borderWidth: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center'
  },
  reconnectText: {
    color: '#a7f3d0',
    fontSize: 12,
    fontWeight: '800'
  }
});
