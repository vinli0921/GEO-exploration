/**
 * IndexedDB Storage Wrapper
 * Handles local storage of session data with compression
 */

const DB_NAME = 'LLMSearchBehaviorDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

class SessionStorage {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store for sessions
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          });

          // Create indexes
          objectStore.createIndex('sessionId', 'sessionId', { unique: false });
          objectStore.createIndex('participantId', 'participantId', { unique: false });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('uploaded', 'uploaded', { unique: false });
        }
      };
    });
  }

  /**
   * Store session data
   */
  async storeSession(sessionData) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);

      const data = {
        ...sessionData,
        timestamp: Date.now(),
        uploaded: false,
        compressed: false
      };

      const request = objectStore.add(data);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to store session'));
      };
    });
  }

  /**
   * Store event batch
   */
  async storeEventBatch(sessionId, participantId, events) {
    const batchData = {
      sessionId,
      participantId,
      events,
      eventCount: events.length,
      batchTimestamp: Date.now()
    };

    return this.storeSession(batchData);
  }

  /**
   * Get session by ID
   */
  async getSession(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get session'));
      };
    });
  }

  /**
   * Get all sessions by sessionId
   */
  async getSessionsBySessionId(sessionId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const index = objectStore.index('sessionId');
      const request = index.getAll(sessionId);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get sessions'));
      };
    });
  }

  /**
   * Get all unuploaded sessions
   */
  async getUnuploadedSessions() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const index = objectStore.index('uploaded');
      const request = index.getAll(false);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get unuploaded sessions'));
      };
    });
  }

  /**
   * Mark session as uploaded
   */
  async markAsUploaded(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.get(id);

      request.onsuccess = () => {
        const data = request.result;
        data.uploaded = true;
        data.uploadedAt = Date.now();

        const updateRequest = objectStore.put(data);

        updateRequest.onsuccess = () => {
          resolve();
        };

        updateRequest.onerror = () => {
          reject(new Error('Failed to update session'));
        };
      };

      request.onerror = () => {
        reject(new Error('Failed to get session'));
      };
    });
  }

  /**
   * Delete session
   */
  async deleteSession(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete session'));
      };
    });
  }

  /**
   * Delete uploaded sessions older than specified days
   */
  async cleanupOldSessions(daysOld = 7) {
    if (!this.db) await this.init();

    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const index = objectStore.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.uploaded) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to cleanup sessions'));
      };
    });
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const countRequest = objectStore.count();

      countRequest.onsuccess = () => {
        const totalSessions = countRequest.result;

        const uploadedIndex = objectStore.index('uploaded');
        const uploadedRequest = uploadedIndex.count(true);

        uploadedRequest.onsuccess = () => {
          const uploadedSessions = uploadedRequest.result;

          resolve({
            totalSessions,
            uploadedSessions,
            pendingSessions: totalSessions - uploadedSessions
          });
        };
      };

      countRequest.onerror = () => {
        reject(new Error('Failed to get stats'));
      };
    });
  }

  /**
   * Clear all data
   */
  async clearAll() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear data'));
      };
    });
  }
}

// Export singleton instance
const sessionStorage = new SessionStorage();
export default sessionStorage;
