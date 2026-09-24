/**
 * In-memory model storage implementation for testing or fallback environments.
 */
export class MemoryStorage {
  constructor() {
    /** @type {Map<string, Uint8Array>} */
    this.models = new Map();
    /** @type {Map<string, any>} */
    this.metadata = new Map();
  }

  async hasModel(language, modelType) {
    return this.models.has(`${language}/${modelType}`);
  }

  async getModel(language, modelType) {
    return this.models.get(`${language}/${modelType}`) || null;
  }

  async saveModel(language, modelType, data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    this.models.set(`${language}/${modelType}`, bytes);
  }

  async isLanguageInstalled(language) {
    for (const key of this.models.keys()) {
      if (key.startsWith(`${language}/`)) {
        return true;
      }
    }
    return false;
  }

  async getMetadata(language) {
    return this.metadata.get(language) || null;
  }

  async saveMetadata(language, metadata) {
    this.metadata.set(language, metadata);
  }

  async uninstall(language) {
    const prefix = `${language}/`;
    for (const key of Array.from(this.models.keys())) {
      if (key.startsWith(prefix)) {
        this.models.delete(key);
      }
    }
    this.metadata.delete(language);
  }

  async listInstalledLanguages() {
    const langs = new Set();
    for (const key of this.models.keys()) {
      const slash = key.indexOf('/');
      if (slash !== -1) {
        langs.add(key.slice(0, slash));
      }
    }
    return Array.from(langs);
  }
}
