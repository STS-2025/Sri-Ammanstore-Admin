import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoAdminGroceryKeyPlaceholder01',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'sriammanstore-admin.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'sriammanstore-admin',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'sriammanstore-admin.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:mockappid0123456789',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-MOCK01234'
};

// Check if environment has real Firebase credentials
export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'your-api-key-here'
);

// Initialize Firebase App singleton safely
let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
  console.warn('[Firebase] Initialization notice:', error.message);
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig, 'grocery-admin');
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connect to Local Emulator Suite if configured
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    console.info('[Firebase] Connected to local Firebase Emulators');
  } catch (emuError) {
    console.warn('[Firebase] Emulator connection skipped or already initialized:', emuError.message);
  }
}

export default app;
