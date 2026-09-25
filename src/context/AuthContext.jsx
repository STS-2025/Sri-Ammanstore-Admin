import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  subscribeToAuth,
  loginWithEmail,
  logoutUser,
  fetchUserProfile,
  DEMO_USERS
} from '../firebase/authService';
import { isFirebaseConfigured } from '../firebase/config';
import { ROLES, ROLE_DEFINITIONS } from '../utils/roles';
import { logActivity } from '../firebase/auditLogger';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState(ROLES.SUPER_ADMIN);
  const [permissions, setPermissions] = useState(ROLE_DEFINITIONS[ROLES.SUPER_ADMIN].permissions);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);

        if (isFirebaseConfigured) {
          try {
            const profile = await fetchUserProfile(firebaseUser.uid);
            if (profile) {
              setUserProfile(profile);
              const assignedRole = profile.role || ROLES.STORE_MANAGER;
              setUserRole(assignedRole);
              setPermissions(ROLE_DEFINITIONS[assignedRole]?.permissions || []);
            } else {
              // Default fallback for new unassigned authenticated account
              setUserRole(ROLES.PACKING_STAFF);
              setPermissions(ROLE_DEFINITIONS[ROLES.PACKING_STAFF].permissions);
            }
          } catch (err) {
            console.error('[AuthContext] Error fetching profile:', err);
          }
        } else {
          // Dev / Preview demo user
          setUserProfile(firebaseUser);
          setUserRole(firebaseUser.role);
          setPermissions(ROLE_DEFINITIONS[firebaseUser.role]?.permissions || []);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setUserRole(null);
        setPermissions([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const user = await loginWithEmail(email, password);
      if (!isFirebaseConfigured) {
        setCurrentUser(user);
        setUserProfile(user);
        setUserRole(user.role);
        setPermissions(ROLE_DEFINITIONS[user.role]?.permissions || []);
        localStorage.setItem('grocery_admin_active_role', user.role);
      }
      await logActivity({
        userId: user.uid,
        userEmail: user.email,
        userRole: user.role || userRole,
        action: 'USER_LOGIN',
        module: 'Authentication',
        reason: 'Staff login session initiated'
      });
      return user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (currentUser) {
      await logActivity({
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userRole: userRole,
        action: 'USER_LOGOUT',
        module: 'Authentication',
        reason: 'Staff explicit logout'
      });
    }
    await logoutUser();
    if (!isFirebaseConfigured) {
      setCurrentUser(null);
      setUserProfile(null);
      setUserRole(null);
      setPermissions([]);
      localStorage.removeItem('grocery_admin_active_role');
    }
  };

  /**
   * Fast Role Switcher (Crucial for development, previewing and auditing all 8 roles)
   */
  const switchDemoRole = (newRole) => {
    if (!ROLE_DEFINITIONS[newRole]) return;
    const demoUser = DEMO_USERS[newRole];
    setCurrentUser(demoUser);
    setUserProfile(demoUser);
    setUserRole(newRole);
    setPermissions(ROLE_DEFINITIONS[newRole].permissions);
    localStorage.setItem('grocery_admin_active_role', newRole);
    console.info(`[AuthContext] Switched active operational role to: ${newRole}`);
  };

  const value = {
    currentUser,
    userProfile,
    userRole,
    permissions,
    loading,
    login,
    logout,
    switchDemoRole,
    isFirebaseConfigured
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
