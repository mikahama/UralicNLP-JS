import { MemoryStorage } from './memory-storage.js';

let defaultStorage = null;

/**
 * Checks whether the current runtime is Node.js.
 * @returns {boolean}
 */
export function isNodeEnvironment() {
  return (
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null
  );
}

/**
 * Checks whether the current runtime is a browser environment with IndexedDB.
 * @returns {boolean}
 */
export function isBrowserEnvironment() {
  return (
    typeof window !== 'undefined' &&
    (typeof indexedDB !== 'undefined' || typeof window.indexedDB !== 'undefined')
  );
}

/**
 * Returns the default storage instance for the current environment.
 * @returns {Promise<import('./memory-storage.js').MemoryStorage | import('./browser-storage.js').BrowserStorage | import('./node-storage.js').NodeStorage>}
 */
export async function getStorage() {
  if (defaultStorage) {
    return defaultStorage;
  }

  if (isNodeEnvironment()) {
    try {
      const { NodeStorage } = await import('./node-storage.js');
      defaultStorage = new NodeStorage();
      return defaultStorage;
    } catch {
      // fallback if dynamic import fails
    }
  }

  if (isBrowserEnvironment()) {
    try {
      const { BrowserStorage } = await import('./browser-storage.js');
      defaultStorage = new BrowserStorage();
      return defaultStorage;
    } catch {
      // fallback
    }
  }

  defaultStorage = new MemoryStorage();
  return defaultStorage;
}

/**
 * Explicitly sets the storage provider.
 * @param {any} storage
 */
export function setStorage(storage) {
  defaultStorage = storage;
}

export { MemoryStorage };
