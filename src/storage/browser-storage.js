/**
 * Browser-based model storage using IndexedDB.
 * Enables persistent storage of large binary HFST models in client-side web applications.
 */
export class BrowserStorage {
  /**
   * @param {string} [dbName='uralicnlp_models']
   */
  constructor(dbName = 'uralicnlp_models') {
    this.dbName = dbName;
    this.dbPromise = null;
  }

  /**
   * Returns or initializes the IndexedDB database instance.
   * @returns {Promise<IDBDatabase>}
   */
  async getDb() {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    const idb =
      typeof indexedDB !== 'undefined'
        ? indexedDB
        : typeof globalThis !== 'undefined'
        ? globalThis.indexedDB
        : null;

    if (!idb) {
      throw new Error(
        'IndexedDB is not supported or not available in the current environment.'
      );
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = idb.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'language' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Checks if a specific model type exists in storage.
   * @param {string} language
   * @param {string} modelType
   * @returns {Promise<boolean>}
   */
  async hasModel(language, modelType) {
    const data = await this.getModel(language, modelType);
    return data !== null;
  }

  /**
   * Retrieves binary model data from IndexedDB.
   * @param {string} language
   * @param {string} modelType
   * @returns {Promise<Uint8Array | null>}
   */
  async getModel(language, modelType) {
    const db = await this.getDb();
    const key = `${language}/${modelType}`;

    return new Promise((resolve, reject) => {
      const tx = db.transaction('models', 'readonly');
      const store = tx.objectStore('models');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.data) {
          resolve(
            result.data instanceof Uint8Array
              ? result.data
              : new Uint8Array(result.data)
          );
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Saves binary model data to IndexedDB.
   * @param {string} language
   * @param {string} modelType
   * @param {Uint8Array | ArrayBuffer} data
   * @returns {Promise<void>}
   */
  async saveModel(language, modelType, data) {
    const db = await this.getDb();
    const key = `${language}/${modelType}`;
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

    return new Promise((resolve, reject) => {
      const tx = db.transaction('models', 'readwrite');
      const store = tx.objectStore('models');
      const request = store.put({
        key,
        language,
        modelType,
        data: bytes,
        size: bytes.byteLength,
        timestamp: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Checks if any models for this language are installed in IndexedDB.
   * @param {string} language
   * @returns {Promise<boolean>}
   */
  async isLanguageInstalled(language) {
    const db = await this.getDb();
    const prefix = `${language}/`;

    return new Promise((resolve, reject) => {
      const tx = db.transaction('models', 'readonly');
      const store = tx.objectStore('models');
      const range =
        typeof IDBKeyRange !== 'undefined'
          ? IDBKeyRange.bound(prefix, prefix + '\uffff')
          : null;

      const request = range ? store.openCursor(range) : store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          if (range || cursor.key.startsWith(prefix)) {
            resolve(true);
            return;
          }
          cursor.continue();
        } else {
          resolve(false);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Gets metadata JSON for a language.
   * @param {string} language
   * @returns {Promise<any | null>}
   */
  async getMetadata(language) {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');
      const request = store.get(language);

      request.onsuccess = () => {
        resolve(request.result?.data ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Saves metadata JSON for a language.
   * @param {string} language
   * @param {any} metadata
   * @returns {Promise<void>}
   */
  async saveMetadata(language, metadata) {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');
      const request = store.put({
        language,
        data: metadata,
        timestamp: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Uninstalls all models for a language from IndexedDB.
   * @param {string} language
   * @returns {Promise<void>}
   */
  async uninstall(language) {
    const db = await this.getDb();
    const prefix = `${language}/`;

    await new Promise((resolve, reject) => {
      const tx = db.transaction('models', 'readwrite');
      const store = tx.objectStore('models');
      const range =
        typeof IDBKeyRange !== 'undefined'
          ? IDBKeyRange.bound(prefix, prefix + '\uffff')
          : null;

      const request = range ? store.openCursor(range) : store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          if (range || cursor.key.startsWith(prefix)) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });

    await new Promise((resolve, reject) => {
      const tx = db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');
      const request = store.delete(language);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Lists all installed language codes.
   * @returns {Promise<string[]>}
   */
  async listInstalledLanguages() {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('models', 'readonly');
      const store = tx.objectStore('models');
      const request = store.openCursor();
      const langs = new Set();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const slash = cursor.key.indexOf('/');
          if (slash !== -1) {
            langs.add(cursor.key.slice(0, slash));
          }
          cursor.continue();
        } else {
          resolve(Array.from(langs));
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
}
