import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  subscribeToAuth,
  subscribeToUserProfile,
  fetchUserProfile,
  loginWithEmail,
  refreshStaffRoleClaims,
  logoutUser
} from '../firebase/authService';
import { isFirebaseConfigured } from '../firebase/config';
import { ROLES, ROLE_DEFINITIONS } from '../utils/roles';
import { logActivity } from '../firebase/auditLogger';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [demoRole, setDemoRole] = useState(null);
  const [authenticatedRole, setAuthenticatedRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const authGeneration = useRef(0);
  const profileUnsubscribe = useRef(null);

  useEffect(() => {
    const clearSession = () => {
      setCurrentUser(null);
      setUserProfile(null);
      setUserRole(null);
      setAuthenticatedRole(null);
      setPermissions([]);
    };

    const unsubscribe = subscribeToAuth((firebaseUser) => {
      const generation = ++authGeneration.current;
      profileUnsubscribe.current?.();
      profileUnsubscribe.current = null;
      clearSession();
      setLoading(Boolean(firebaseUser));

      if (!firebaseUser || !isFirebaseConfigured) {
        setLoading(false);
        return;
      }

      let lastRole = null;
      profileUnsubscribe.current = subscribeToUserProfile(
        firebaseUser.uid,
        async (profile) => {
          if (generation !== authGeneration.current) return;
          if (!profile || !ROLE_DEFINITIONS[profile.role] || profile.status !== 'active') {
            if (!profile) {
              try {
                const resolvedProfile = await fetchUserProfile(firebaseUser.uid);
                if (generation !== authGeneration.current) return;
                if (resolvedProfile?.status === 'active' && ROLE_DEFINITIONS[resolvedProfile.role]) {
                  return;
                }
              } catch (error) {
                console.error('[AuthContext] No active Firestore staff profile could be resolved:', error);
              }
            }
            if (generation !== authGeneration.current) return;
            try {
              await refreshStaffRoleClaims();
            } catch (error) {
              console.error('[AuthContext] Failed to clear claims for an unauthorized account:', error);
            }
            if (generation !== authGeneration.current) return;
            try {
              await logoutUser();
            } catch (error) {
              console.error('[AuthContext] Failed to sign out an unauthorized account:', error);
            } finally {
              if (generation === authGeneration.current) setLoading(false);
            }
            return;
          }

          if (lastRole !== profile.role) {
            try {
              await refreshStaffRoleClaims();
            } catch (error) {
              console.error('[AuthContext] Failed to synchronize the updated staff role:', error);
              if (generation !== authGeneration.current) return;
              try {
                await logoutUser();
              } catch (signOutError) {
                console.error('[AuthContext] Failed to sign out after a claims synchronization error:', signOutError);
              } finally {
                if (generation === authGeneration.current) setLoading(false);
              }
              return;
            }
          }
          if (generation !== authGeneration.current) return;
          lastRole = profile.role;

          setCurrentUser(firebaseUser);
          setUserProfile(profile);
          setUserRole(profile.role);
          setAuthenticatedRole(profile.role);

          setDemoRole(null);

          setPermissions(ROLE_DEFINITIONS[profile.role].permissions);
          setLoading(false);
        },
        async (error) => {
          if (generation !== authGeneration.current) return;
          console.error('[AuthContext] Failed to load the authenticated staff profile:', error);
          try {
            await logoutUser();
          } catch (signOutError) {
            console.error('[AuthContext] Failed to sign out after a profile error:', signOutError);
          } finally {
            if (generation === authGeneration.current) setLoading(false);
          }
        }
      );
    });

    return () => {
      authGeneration.current += 1;
      profileUnsubscribe.current?.();
      unsubscribe();
    };
  }, []);

  const login = async (email, password, expectedRole) => {
    setLoading(true);
    try {
      const user = await loginWithEmail(email, password, expectedRole);
      if (!ROLE_DEFINITIONS[user.role] || user.status !== 'active') {
        await logoutUser();
        throw new Error('This account is not assigned an active staff role.');
      }
      setCurrentUser(user);
      setUserProfile(user);
      setUserRole(user.role);
      setAuthenticatedRole(user.role);
      setPermissions(ROLE_DEFINITIONS[user.role].permissions);
      await logActivity({
        userId: user.uid,
        userEmail: user.email,
        userRole: user.role,
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
    try {
      if (currentUser) {
        await logActivity({
          userId: currentUser.uid,
          userEmail: currentUser.email,
          userRole,
          action: 'USER_LOGOUT',
          module: 'Authentication',
          reason: 'Staff explicit logout'
        });
      }
    } finally {
      await logoutUser();
      setCurrentUser(null);
      setUserProfile(null);
      setUserRole(null);
      setAuthenticatedRole(null);
      setPermissions([]);
    }
  };

 // const switchDemoRole = (newRole) => {
  //  return isFirebaseConfigured && newRole === authenticatedRole;
  //};
  const switchDemoRole = (newRole) => {
  if (!isFirebaseConfigured) return false;
  if (authenticatedRole !== ROLES.SUPER_ADMIN) return false;
  if (!ROLE_DEFINITIONS[newRole]) return false;

  setDemoRole(newRole);
  setUserRole(newRole);
  setPermissions(ROLE_DEFINITIONS[newRole].permissions);

  return true;
};


  const isSuperAdmin = authenticatedRole === ROLES.SUPER_ADMIN;

  const value = {
    currentUser,
    userProfile,
    userRole,
    authenticatedRole,
    isSuperAdmin,
    permissions,
    loading,
    login,
    logout,
    switchDemoRole,
    isFirebaseConfigured
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
