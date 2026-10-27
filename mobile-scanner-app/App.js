import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, Alert, FlatList } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Sourced Firebase Configuration matching Web Admin App
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForSriAmmanStore",
  authDomain: "sri-amman-store.firebaseapp.com",
  projectId: "sri-amman-store",
  storageBucket: "sri-amman-store.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const db = getFirestore();

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [sessionInfo, setSessionInfo] = useState(null);
  const [connected, setConnected] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  const [statusToast, setStatusToast] = useState(null);

  const lastScanTimeRef = useRef(0);
  const soundRef = useRef(null);

  // Play Scanner Beep Sound
  const playBeep = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.replayAsync();
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'https://actions.google.com/sounds/v1/submarines/ping.ogg' }
        );
        soundRef.current = sound;
        await sound.playAsync();
      }
    } catch (_) {}
  };

  // Handle Deep Links (sriammanstore://scanner?s=<sessionId>&t=<token>)
  useEffect(() => {
    const handleUrl = (event) => {
      if (event.url) {
        const { queryParams } = Linking.parse(event.url);
        if (queryParams?.s && queryParams?.t) {
          verifyAndConnect(queryParams.s, queryParams.t);
        }
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) {
        const { queryParams } = Linking.parse(url);
        if (queryParams?.s && queryParams?.t) {
          verifyAndConnect(queryParams.s, queryParams.t);
        }
      }
    });

    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub.remove();
  }, []);

  // Verify and Connect to Firestore Billing PC Session
  const verifyAndConnect = async (sessionId, token) => {
    try {
      const sessRef = doc(db, 'scannerSessions', sessionId);
      const snap = await getDoc(sessRef);

      if (!snap.exists()) {
        Alert.alert('Connection Failed', 'Scanner session not found or invalid QR code.');
        return;
      }

      const sess = snap.data();
      if (sess.token !== token) {
        Alert.alert('Security Error', 'Invalid or expired scanner token.');
        return;
      }

      // Update session status in Firestore
      await updateDoc(sessRef, {
        status: 'CONNECTED',
        connectedDeviceId: 'android_app_native',
        connectedDeviceName: 'React Native Android POS App',
        lastActivityAt: serverTimestamp()
      });

      setSessionInfo({ sessionId, token, counterId: sess.counterId || 'Counter #1' });
      setConnected(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert('Connection Error', err.message);
    }
  };

  // Barcode Detected Handler with 800ms Debounce Cooldown
  const handleBarcodeScanned = async ({ data }) => {
    const now = Date.now();
    if (now - lastScanTimeRef.current < 800) return;
    lastScanTimeRef.current = now;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playBeep();

    const barcode = data.trim();
    setStatusToast(`Sending ${barcode}...`);

    try {
      const eventId = `event_${now}_${Math.random().toString(36).substring(2, 6)}`;
      const scanEventRef = doc(db, 'scannerSessions', sessionInfo.sessionId, 'scanEvents', eventId);

      // Send ONLY raw barcode string to Firestore
      await setDoc(scanEventRef, {
        eventId,
        sessionId: sessionInfo.sessionId,
        barcode,
        type: 'BARCODE_SCANNED',
        deviceId: 'android_native_app',
        status: 'pending',
        createdAt: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      });

      setStatusToast(`✓ Sent barcode ${barcode} to ${sessionInfo.counterId}`);
      setRecentScans((prev) => [
        { barcode, time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 4)
      ]);
    } catch (err) {
      setStatusToast(`Failed sending barcode: ${err.message}`);
    }

    setTimeout(() => setStatusToast(null), 2500);
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Camera Permission Required</Text>
          <Text style={styles.subtitle}>
            Sri Amman Store POS Scanner requires camera access to scan product barcodes.
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>GRANT CAMERA PERMISSION</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090d16" />

      {/* Top Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sri Amman Store POS Scanner</Text>
        <Text style={styles.headerSubtitle}>
          {connected ? `🟢 Connected: ${sessionInfo?.counterId}` : '🟡 Waiting for QR Scan...'}
        </Text>
      </View>

      {!connected ? (
        <View style={styles.centerContent}>
          <View style={styles.card}>
            <Text style={styles.title}>Scan Billing PC QR Code</Text>
            <Text style={styles.subtitle}>
              Point your camera at the QR code displayed on the Billing PC screen.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => verifyAndConnect('scan_demo', 'token_demo')}
            >
              <Text style={styles.buttonText}>TEST DEMO CONNECTION</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.scannerContainer}>
          {/* Native Camera Scanner */}
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr']
            }}
            onBarcodeScanned={handleBarcodeScanned}
          >
            <View style={styles.overlay}>
              <View style={styles.targetBox}>
                <Text style={styles.targetText}>ALIGN BARCODE HERE</Text>
              </View>
            </View>
          </CameraView>

          {/* Toast Notification */}
          {statusToast && (
            <View style={styles.toast}>
              <Text style={styles.toastText}>{statusToast}</Text>
            </View>
          )}

          {/* Recent Scans */}
          {recentScans.length > 0 && (
            <View style={styles.historyBox}>
              <Text style={styles.historyTitle}>RECENT SCANS SENT</Text>
              <FlatList
                data={recentScans}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <View style={styles.historyItem}>
                    <Text style={styles.historyBarcode}>{item.barcode}</Text>
                    <Text style={styles.historyTime}>{item.time}</Text>
                  </View>
                )}
              />
            </View>
          )}

          <TouchableOpacity style={styles.disconnectBtn} onPress={() => setConnected(false)}>
            <Text style={styles.disconnectText}>DISCONNECT SCANNER</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16'
  },
  header: {
    padding: 16,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  headerSubtitle: {
    color: '#34d399',
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'monospace'
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 20
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'extrabold',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18
  },
  button: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center'
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold'
  },
  scannerContainer: {
    flex: 1,
    padding: 16
  },
  camera: {
    height: 300,
    borderRadius: 20,
    overflow: 'hidden'
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  targetBox: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#34d399',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.05)'
  },
  targetText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: 'rgba(9, 13, 22, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  toast: {
    backgroundColor: '#064e3b',
    borderColor: '#047857',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginTop: 12
  },
  toastText: {
    color: '#a7f3d0',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  historyBox: {
    marginTop: 12,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 12,
    flex: 1
  },
  historyTitle: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#090d16',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6
  },
  historyBarcode: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace'
  },
  historyTime: {
    color: '#34d399',
    fontSize: 10
  },
  disconnectBtn: {
    marginTop: 12,
    backgroundColor: '#450a0a',
    borderColor: '#991b1b',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  disconnectText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: 'bold'
  }
});
