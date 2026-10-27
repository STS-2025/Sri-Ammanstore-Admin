import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  getAuth,
  connectAuthEmulator,
  inMemoryPersistence,
  setPersistence,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  deleteUser
} from 'firebase/auth';
import { initializeApp, getApp, deleteApp } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, functions, isFirebaseConfigured } from './config';
import { COLLECTIONS } from './collections';
import { ROLES, ROLE_DEFINITIONS } from '../utils/roles';

const isValidStaffProfile = (profile) =>
  Boolean(profile && ROLE_DEFINITIONS[profile.role] && profile.status === 'active');

const requireStaffAdministrator = async () => {
  if (!isFirebaseConfigured || !auth.currentUser) {
    throw new Error('A signed-in Firebase administrator is required.');
  }

  const actorSnapshot = await getDoc(doc(db, COLLECTIONS.USERS, auth.currentUser.uid));
  const actor = actorSnapshot.exists() ? actorSnapshot.data() : null;
  if (!isValidStaffProfile(actor) || actor.role !== ROLES.SUPER_ADMIN) {
    throw new Error('Only an active Super Admin can manage staff accounts.');
  }

  return auth.currentUser.uid;
};

/**
 * Pre-configured Development / Demo Users for the 8 Grocery Roles
 */
export const DEMO_USERS = {
  [ROLES.SUPER_ADMIN]: {
    uid: 'demo-super-admin-01',
    email: 'stsadmin@gmail.com',
    displayName: 'Mari R.',
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
 * Authenticate with Firebase and use the Firestore profile as the role source.
 */
export const loginWithEmail = async (email, password, expectedRole) => {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter a valid staff email address.');
  }
  if (!ROLE_DEFINITIONS[expectedRole]) {
    throw new Error('Please select your assigned staff role.');
  }
  if (!password) {
    throw new Error('Please enter your password.');
  }

  if (!isFirebaseConfigured) {
    throw new Error('Staff authentication is unavailable because Firebase is not configured.');
  }

  const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
  try {
    const profile = await fetchUserProfile(userCredential.user.uid);
    if (!isValidStaffProfile(profile)) {
      throw new Error('This account is not assigned an active staff role. Ask the Super Admin to verify its role and status.');
    }
    if (profile.role !== expectedRole) {
      throw new Error('The selected role does not match the role assigned to this account.');
    }
    await refreshStaffRoleClaims();
    return profile;
  } catch (error) {
    if (auth.currentUser?.uid === userCredential.user.uid) {
      await fbSignOut(auth);
    }
    throw error;
  }
};

export const refreshStaffRoleClaims = async () => {
  if (!isFirebaseConfigured || !auth.currentUser) {
    throw new Error('A signed-in Firebase user is required to synchronize staff access.');
  }

  const syncClaims = httpsCallable(functions, 'syncMyStaffRoleClaims');
  await syncClaims();
  await auth.currentUser.getIdToken(true);
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
  if (!isFirebaseConfigured) {
    throw new Error('Password reset is unavailable because Firebase is not configured.');
  }
  await sendPasswordResetEmail(auth, email.trim());
};

/**
 * Fetch the authenticated user's authoritative profile from Firestore.
 */
export const fetchUserProfile = async (uid) => {
  if (!isFirebaseConfigured) {
    throw new Error('Staff authentication is unavailable because Firebase is not configured.');
  }

  const docSnap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (docSnap.exists()) return { ...docSnap.data(), uid };

  const resolveProfile = httpsCallable(functions, 'resolveMyStaffProfile');
  const result = await resolveProfile();
  return result.data;
};

export const subscribeToUserProfile = (uid, onProfile, onError) => {
  return onSnapshot(
    doc(db, COLLECTIONS.USERS, uid),
    (snapshot) => onProfile(snapshot.exists() ? { ...snapshot.data(), uid } : null),
    onError
  );
};

export const getAllStaffProfiles = async () => {
  await requireStaffAdministrator();
  const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
  return snapshot.docs.map((staffDoc) => ({ ...staffDoc.data(), uid: staffDoc.id }));
};

export const createStaffAccount = async ({ email, password, displayName, phone, role }) => {
  await requireStaffAdministrator();
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !displayName?.trim() || !ROLE_DEFINITIONS[role] || !password || password.length < 6) {
    throw new Error('A valid email, staff name, assigned role, and password of at least 6 characters are required.');
  }

  const provisioningApp = initializeApp(getApp().options, `staff-provisioning-${Date.now()}-${crypto.randomUUID()}`);
  const provisioningAuth = getAuth(provisioningApp);
  let createdUser = null;
  let profileWritten = false;

  try {
    if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
      connectAuthEmulator(provisioningAuth, 'http://localhost:9099', { disableWarnings: true });
    }
    await setPersistence(provisioningAuth, inMemoryPersistence);
    const credential = await createUserWithEmailAndPassword(provisioningAuth, cleanEmail, password);
    createdUser = credential.user;
    const profile = {
      uid: createdUser.uid,
      email: cleanEmail,
      displayName: displayName.trim(),
      phone: phone || '',
      role,
      status: 'active',
      delegatedPermissions: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, COLLECTIONS.USERS, createdUser.uid), profile);
    profileWritten = true;
    return { ...profile, uid: createdUser.uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  } catch (error) {
    if (createdUser) {
      try {
        if (profileWritten) {
          await deleteDoc(doc(db, COLLECTIONS.USERS, createdUser.uid));
        }
        await deleteUser(createdUser);
      } catch (cleanupError) {
        console.error('[authService] Failed to clean up incomplete staff provisioning:', cleanupError);
      }
    }
    throw error;
  } finally {
    try {
      if (provisioningAuth.currentUser) {
        await fbSignOut(provisioningAuth);
      }
    } finally {
      await deleteApp(provisioningApp);
    }
  }
};

export const sendStaffPasswordReset = async (email) => {
  await requireStaffAdministrator();
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('The staff member does not have a valid email address.');
  }
  await sendPasswordResetEmail(auth, cleanEmail);
};

export const updateStaffProfile = async (uid, updates) => {
  const actorUid = await requireStaffAdministrator();
  if (uid === actorUid && ['role', 'status', 'delegatedPermissions'].some((key) => key in updates)) {
    throw new Error('You cannot change your own role, status, or delegated permissions.');
  }
  if (updates.role && !ROLE_DEFINITIONS[updates.role]) {
    throw new Error('The selected staff role is not valid.');
  }
  if (updates.status && !['active', 'disabled'].includes(updates.status)) {
    throw new Error('The selected staff status is not valid.');
  }

  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

export const deleteStaffProfile = async (uid) => {
  const actorUid = await requireStaffAdministrator();
  if (uid === actorUid) {
    throw new Error('You cannot delete your own staff account.');
  }
  await deleteDoc(doc(db, COLLECTIONS.USERS, uid));
};

/**
 * Subscribe to auth state changes
 */
export const subscribeToAuth = (callback) => {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};
