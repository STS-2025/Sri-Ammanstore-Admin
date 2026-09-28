import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './config';
import { COLLECTIONS } from './collections';
import { ROLES, ROLE_DEFINITIONS } from '../utils/roles';

/**
 * Local Storage Key for Registered Staff Users
 */
const REGISTERED_USERS_KEY = 'grocery_admin_registered_users';

export const getRegisteredUsers = () => {
  try {
    const saved = localStorage.getItem(REGISTERED_USERS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('[authService] Error parsing registered users:', err);
    return [];
  }
};

export const saveRegisteredUser = (user) => {
  try {
    const users = getRegisteredUsers();
    const cleanEmail = (user.email || '').trim().toLowerCase();
    const existingIndex = users.findIndex((u) => u.email.trim().toLowerCase() === cleanEmail);
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...user };
    } else {
      users.push(user);
    }
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));

    if (user.role && DEMO_USERS[user.role]) {
      DEMO_USERS[user.role] = { ...DEMO_USERS[user.role], ...user };
    }
  } catch (err) {
    console.error('[authService] Error saving registered user:', err);
  }
};

/**
 * Pre-configured Development / Demo Users for the 8 Grocery Roles
 */
export const DEMO_USERS = {
  [ROLES.SUPER_ADMIN]: {
    uid: 'demo-super-admin-01',
    email: 'owner@sriammanstore.com',
    displayName: 'Thiru R. Amman',
    role: ROLES.SUPER_ADMIN,
    phone: '+91 98765 43210',
    status: 'active'
  },
  [ROLES.STORE_MANAGER]: {
    uid: 'demo-store-manager-01',
    email: 'manager@sriammanstore.com',
    displayName: 'Karthik Subramanian',
    role: ROLES.STORE_MANAGER,
    phone: '+91 98450 12345',
    status: 'active'
  },
  [ROLES.INVENTORY_STAFF]: {
    uid: 'demo-inventory-01',
    email: 'inventory@sriammanstore.com',
    displayName: 'Murugan Velu',
    role: ROLES.INVENTORY_STAFF,
    phone: '+91 97890 23456',
    status: 'active'
  },
  [ROLES.PACKING_STAFF]: {
    uid: 'demo-packing-01',
    email: 'packing@sriammanstore.com',
    displayName: 'Anandhi Selvam',
    role: ROLES.PACKING_STAFF,
    phone: '+91 96290 34567',
    status: 'active'
  },
  [ROLES.DELIVERY_MANAGER]: {
    uid: 'demo-delivery-mgr-01',
    email: 'logistics@sriammanstore.com',
    displayName: 'Dinesh Kumar',
    role: ROLES.DELIVERY_MANAGER,
    phone: '+91 95000 45678',
    status: 'active'
  },
  [ROLES.DELIVERY_AGENT]: {
    uid: 'demo-delivery-agent-01',
    email: 'rider.saravanan@sriammanstore.com',
    displayName: 'Saravanan M. (Rider #12)',
    role: ROLES.DELIVERY_AGENT,
    phone: '+91 94440 56789',
    status: 'active'
  },
  [ROLES.MARKETING_STAFF]: {
    uid: 'demo-marketing-01',
    email: 'marketing@sriammanstore.com',
    displayName: 'Priya Sundaram',
    role: ROLES.MARKETING_STAFF,
    phone: '+91 93600 67890',
    status: 'active'
  },
  [ROLES.ACCOUNTS_STAFF]: {
    uid: 'demo-accounts-01',
    email: 'accounts@sriammanstore.com',
    displayName: 'Balaji Natarajan (CA)',
    role: ROLES.ACCOUNTS_STAFF,
    phone: '+91 92800 78901',
    status: 'active'
  }
};

/**
 * Sign in with email and password via Firebase Auth or Dev Registry
 */
export const loginWithEmail = async (email, password, fallbackRole = null) => {
  if (!isFirebaseConfigured) {
    const cleanEmail = (email || '').trim().toLowerCase();

    // 1. Check registered users in localStorage
    const registered = getRegisteredUsers();
    const foundRegistered = registered.find((u) => u.email.trim().toLowerCase() === cleanEmail);
    if (foundRegistered) {
      return foundRegistered;
    }

    // 2. Check preconfigured DEMO_USERS
    const foundDemo = Object.values(DEMO_USERS).find((u) => u.email.trim().toLowerCase() === cleanEmail);
    if (foundDemo) {
      return foundDemo;
    }

    // 3. Fallback: Generate user profile dynamically using fallbackRole if provided, else SUPER_ADMIN
    const targetRole = fallbackRole || ROLES.SUPER_ADMIN;
    const dynamicUser = {
      uid: `staff-${Date.now()}`,
      email: cleanEmail || 'staff@sriammanstore.com',
      displayName: cleanEmail ? cleanEmail.split('@')[0] : 'Staff Member',
      role: targetRole,
      status: 'active'
    };
    saveRegisteredUser(dynamicUser);
    return dynamicUser;
  }
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

/**
 * Sign out
 */
export const logoutUser = async () => {
  if (isFirebaseConfigured) {
    await fbSignOut(auth);
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
  if (isFirebaseConfigured) {
    await sendPasswordResetEmail(auth, email);
  }
};

/**
 * Fetch user profile from Firestore `users` collection or Dev Registry
 */
export const fetchUserProfile = async (uid) => {
  if (!isFirebaseConfigured) {
    const registered = getRegisteredUsers();
    const foundReg = registered.find((u) => u.uid === uid);
    if (foundReg) return foundReg;

    const demo = Object.values(DEMO_USERS).find((u) => u.uid === uid) || DEMO_USERS[ROLES.SUPER_ADMIN];
    return demo;
  }
  const docRef = doc(db, COLLECTIONS.USERS, uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { uid, ...docSnap.data() };
  }
  return null;
};

/**
 * Subscribe to auth state changes
 */
export const subscribeToAuth = (callback) => {
  if (!isFirebaseConfigured) {
    const savedRole = localStorage.getItem('grocery_admin_active_role') || ROLES.SUPER_ADMIN;
    const savedUserEmail = localStorage.getItem('grocery_admin_active_user_email');
    
    const registered = getRegisteredUsers();
    const matchedRegisteredUser = savedUserEmail 
      ? registered.find((u) => u.email.trim().toLowerCase() === savedUserEmail.trim().toLowerCase())
      : registered.find((u) => u.role === savedRole);

    const initialUser = matchedRegisteredUser || DEMO_USERS[savedRole] || DEMO_USERS[ROLES.SUPER_ADMIN];
    callback(initialUser);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};
