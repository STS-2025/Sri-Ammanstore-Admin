/**
 * IndexedDB Video Storage Helper
 * Solves browser localStorage 5MB quota limit for large MP4 video files.
 */

const DB_NAME = 'SriAmmanStoreMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'product_videos';

const openDB = () => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Save video blob/dataUrl into IndexedDB
 * @param {string} key 
 * @param {Blob|File|string} videoData 
 */
export const saveVideoToDB = async (key, videoData) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(videoData, key);
      req.onsuccess = () => resolve(key);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[VideoStorage] Error saving to IndexedDB:', err);
    return null;
  }
};

/**
 * Get video blob/dataUrl from IndexedDB
 * @param {string} key 
 */
export const getVideoFromDB = async (key) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[VideoStorage] Error fetching from IndexedDB:', err);
    return null;
  }
};

/**
 * Delete video from IndexedDB
 * @param {string} key 
 */
export const deleteVideoFromDB = async (key) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[VideoStorage] Error deleting from IndexedDB:', err);
    return false;
  }
};
