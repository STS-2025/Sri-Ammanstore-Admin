import {
  collection, doc, getDoc, setDoc, updateDoc, onSnapshot, query, where, serverTimestamp
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from './config';
import { COLLECTIONS } from './collections';
import { logActivity } from './auditLogger';

const SESSIONS_LOCAL_KEY = 'grocery_admin_scanner_sessions_v1';
const EVENTS_LOCAL_KEY = 'grocery_admin_scanner_events_v1';

const ensureScannerAuthentication = async () => {
  if (isFirebaseConfigured && !auth.currentUser) {
    await signInAnonymously(auth);
  }
};

// Helper for local storage sessions
const getLocalSessions = () => {
  try {
    const raw = localStorage.getItem(SESSIONS_LOCAL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

const saveLocalSessions = (data) => {
  try {
    localStorage.setItem(SESSIONS_LOCAL_KEY, JSON.stringify(data));
  } catch (e) {}
};

const getLocalEvents = (sessionId) => {
  try {
    const raw = localStorage.getItem(`${EVENTS_LOCAL_KEY}_${sessionId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalEvents = (sessionId, events) => {
  try {
    localStorage.setItem(`${EVENTS_LOCAL_KEY}_${sessionId}`, JSON.stringify(events));
  } catch (e) {}
};

/**
 * Generate Secure Token
 */
const generateRandomHex = (byteLength) => {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error('Secure random token generation is unavailable in this browser.');
  }
  const bytes = cryptoApi.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const generateSecureToken = () => generateRandomHex(32);

/**
 * Create a new Scanner Session on Billing PC
 */
export const createScannerSession = async ({ counterId = 'Counter #1', user } = {}) => {
  const sessionId = `scan_${generateRandomHex(16)}`;
  const token = generateSecureToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString(); // 30 mins validity

  const sessionDoc = {
    sessionId,
    token,
    counterId: counterId || 'Counter #1',
    status: 'WAITING_FOR_MOBILE', // 'WAITING_FOR_MOBILE' | 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED'
    billingUserId: user?.uid || 'staff-1',
    billingUserName: user?.displayName || user?.email || 'Counter Staff',
    connectedDeviceId: null,
    connectedDeviceName: null,
    createdAt: now.toISOString(),
    expiresAt,
    lastActivityAt: now.toISOString()
  };

  const localSessions = getLocalSessions();
  localSessions[sessionId] = sessionDoc;
  saveLocalSessions(localSessions);

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.SCANNER_SESSIONS, sessionId), {
        ...sessionDoc,
        serverTimestamp: serverTimestamp()
      });
    } catch (e) {
      console.error('[Firestore] Create scanner session failed:', e);
      throw e;
    }
  }

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: 'CREATE_SCANNER_SESSION',
    module: 'Mobile Scanner',
    targetId: sessionId,
    targetType: 'scanner_session',
    reason: `Generated mobile scanner QR connection session for ${counterId}`
  });

  return sessionDoc;
};

/**
 * Get Scanner Session Document
 */
export const getScannerSession = async (sessionId) => {
  if (!sessionId) return null;

  if (isFirebaseConfigured) {
    await ensureScannerAuthentication();
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.SCANNER_SESSIONS, sessionId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (e) {
      console.error('[Firestore] Fetch scanner session error:', e);
      throw e;
    }
  }

  const localSessions = getLocalSessions();
  return localSessions[sessionId] || null;
};

/**
 * Mobile Scanner Connect to Billing Session
 */
export const connectMobileScanner = async ({ sessionId, token, deviceId, deviceName }) => {
  const session = await getScannerSession(sessionId);
  if (!session) {
    throw new Error('Scanner session not found or invalid QR code.');
  }

  if (session.token !== token) {
    throw new Error('Invalid or expired scanner security token.');
  }

  if (session.status === 'EXPIRED' || new Date() > new Date(session.expiresAt)) {
    throw new Error('This scanner session has expired. Please refresh the QR code on the Billing PC.');
  }
  if (!['WAITING_FOR_MOBILE', 'CONNECTED'].includes(session.status)) {
    throw new Error('This scanner session is no longer available.');
  }

  const now = new Date().toISOString();
  const updatedDoc = {
    ...session,
    status: 'CONNECTED',
    connectedDeviceId: deviceId || `device_${Date.now().toString(36)}`,
    connectedDeviceName: deviceName || 'Mobile Scanner Phone',
    connectedAt: now,
    lastActivityAt: now
  };

  const localSessions = getLocalSessions();
  localSessions[sessionId] = updatedDoc;
  saveLocalSessions(localSessions);

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, COLLECTIONS.SCANNER_SESSIONS, sessionId), {
        status: 'CONNECTED',
        verifiedToken: token,
        connectedDeviceId: updatedDoc.connectedDeviceId,
        connectedDeviceName: updatedDoc.connectedDeviceName,
        connectedAt: now,
        lastActivityAt: serverTimestamp()
      });
    } catch (e) {
      console.error('[Firestore] Mobile scanner connect update failed:', e);
      throw e;
    }
  }

  return updatedDoc;
};

/**
 * Send Barcode Scan Event from Mobile Scanner to Billing PC
 */
export const sendScanEvent = async ({ sessionId, token, barcode, deviceId }) => {
  if (!barcode || !barcode.trim()) {
    throw new Error('Barcode string cannot be empty.');
  }

  const session = await getScannerSession(sessionId);
  if (!session || session.token !== token) {
    throw new Error('Session unauthorized or expired.');
  }

  const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const scanEventDoc = {
    eventId,
    sessionId,
    barcode: barcode.trim(),
    type: 'BARCODE_SCANNED',
    deviceId: deviceId || session.connectedDeviceId || 'mobile',
    status: 'pending', // 'pending' | 'processed' | 'failed'
    result: null,
    token,
    createdAt: new Date().toISOString()
  };

  const localEvents = getLocalEvents(sessionId);
  localEvents.unshift(scanEventDoc);
  saveLocalEvents(sessionId, localEvents);

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.SCANNER_SESSIONS, sessionId, 'scanEvents', eventId), {
        ...scanEventDoc,
        serverTimestamp: serverTimestamp()
      });
    } catch (e) {
      console.error('[Firestore] Send scan event failed:', e);
      throw e;
    }
  }

  return scanEventDoc;
};

/**
 * Billing PC Realtime Listener for Scanner Connection Status
 */
export const listenToScannerSession = (sessionId, callback) => {
  if (!sessionId) return () => {};

  if (!isFirebaseConfigured) {
    const interval = setInterval(async () => {
      const sess = await getScannerSession(sessionId);
      if (sess) callback(sess);
    }, 1000);
    return () => clearInterval(interval);
  }

  const sessionRef = doc(db, COLLECTIONS.SCANNER_SESSIONS, sessionId);
  const unsubscribe = onSnapshot(sessionRef, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    }
  }, (err) => {
    console.error('[Firestore] Session snapshot listener error:', err);
  });

  return unsubscribe;
};

/**
 * Billing PC Realtime Listener for Pending Barcode Scan Events
 */
export const listenToScanEvents = (sessionId, callback) => {
  if (!sessionId) return () => {};

  if (!isFirebaseConfigured) {
    const interval = setInterval(() => {
      const events = getLocalEvents(sessionId).sort(
        (left, right) => Date.parse(left.createdAt || '') - Date.parse(right.createdAt || '')
      );
      const pending = events.filter((e) => e.status === 'pending');
      if (pending.length > 0) {
        callback(pending);
      }
    }, 800);
    return () => clearInterval(interval);
  }

  const eventsRef = collection(db, COLLECTIONS.SCANNER_SESSIONS, sessionId, 'scanEvents');
  const q = query(eventsRef, where('status', '==', 'pending'));

  const unsubscribe = onSnapshot(q, (snap) => {
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    list.sort((left, right) => {
      const leftTime = left.serverTimestamp?.toMillis?.() ??
        (Date.parse(left.createdAt || '') || 0);
      const rightTime = right.serverTimestamp?.toMillis?.() ??
        (Date.parse(right.createdAt || '') || 0);
      return leftTime - rightTime;
    });
    if (list.length > 0) {
      callback(list);
    }
  }, (err) => {
    console.error('[Firestore] Scan events snapshot listener error:', err);
  });

  return unsubscribe;
};

/**
 * Billing PC Updates Scan Event Processing Result
 */
export const updateScanEventResult = async ({ sessionId, eventId, status, result }) => {
  const localEvents = getLocalEvents(sessionId);
  const idx = localEvents.findIndex((e) => e.eventId === eventId || e.id === eventId);
  if (idx !== -1) {
    localEvents[idx].status = status;
    localEvents[idx].result = result;
    saveLocalEvents(sessionId, localEvents);
  }

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, COLLECTIONS.SCANNER_SESSIONS, sessionId, 'scanEvents', eventId), {
        status,
        result,
        processedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('[Firestore] Update scan event result failed:', e);
      throw e;
    }
  }
};

/**
 * Disconnect / Expire Scanner Session
 */
export const disconnectScannerSession = async (sessionId) => {
  const session = await getScannerSession(sessionId);
  if (!session) return;

  const localSessions = getLocalSessions();
  if (localSessions[sessionId]) {
    localSessions[sessionId].status = 'DISCONNECTED';
    saveLocalSessions(localSessions);
  }

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, COLLECTIONS.SCANNER_SESSIONS, sessionId), {
        status: 'DISCONNECTED',
        disconnectedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('[Firestore] Disconnect scanner session error:', e);
    }
  }
};
