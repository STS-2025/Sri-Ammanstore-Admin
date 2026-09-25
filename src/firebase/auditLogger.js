import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { COLLECTIONS } from './collections';

/**
 * Logs sensitive, financial, or administrative actions into the immutable activityLogs collection.
 */
export const logActivity = async ({
  userId,
  userEmail,
  userRole,
  action,
  module,
  targetId = null,
  targetType = null,
  reason = null,
  metadata = {},
  previousState = null,
  newState = null
}) => {
  const logEntry = {
    userId: userId || 'anonymous',
    userEmail: userEmail || 'unknown@sriammanstore.com',
    userRole: userRole || 'system',
    action,
    module,
    targetId,
    targetType,
    reason: reason || 'Routine operational update',
    metadata,
    previousState,
    newState,
    timestamp: serverTimestamp(),
    createdAt: new Date().toISOString()
  };

  console.info(`[Audit Log] [${module}] ${action} by ${userEmail} (${userRole})`, { targetId, reason });

  if (!isFirebaseConfigured) {
    // Persist in local storage for development/preview inspection
    try {
      const existing = JSON.parse(localStorage.getItem('grocery_admin_audit_logs') || '[]');
      existing.unshift({ ...logEntry, id: `local-${Date.now()}` });
      localStorage.setItem('grocery_admin_audit_logs', JSON.stringify(existing.slice(0, 100)));
    } catch (e) {
      console.warn('Could not store audit log locally', e);
    }
    return;
  }

  try {
    const logsRef = collection(db, COLLECTIONS.ACTIVITY_LOGS);
    await addDoc(logsRef, logEntry);
  } catch (error) {
    console.error('[Audit Log] Failed to write to activityLogs collection:', error);
  }
};
