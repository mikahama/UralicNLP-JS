var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/storage/node-storage.js
var node_storage_exports = {};
__export(node_storage_exports, {
  NodeStorage: () => NodeStorage
});
var import_node_fs, import_node_path, import_node_os, currentDir, NodeStorage;
var init_node_storage = __esm({
  "src/storage/node-storage.js"() {
    import_node_fs = __toESM(require("node:fs"), 1);
    import_node_path = __toESM(require("node:path"), 1);
    import_node_os = __toESM(require("node:os"), 1);
    currentDir = typeof __dirname !== "undefined" ? __dirname : typeof process !== "undefined" && process.cwd ? process.cwd() : ".";
    NodeStorage = class {
      /**
       * @param {string[]} [customFolders=[]]
       */
      constructor(customFolders = []) {
        this.customFolders = [...customFolders];
        this.installedCache = /* @__PURE__ */ new Set();
      }
      /**
       * Adds a custom search directory for models.
       * @param {string} folderPath
       */
      addBaseFolder(folderPath) {
        if (!this.customFolders.includes(folderPath)) {
          this.customFolders.unshift(folderPath);
        }
      }
      /**
       * Returns list of base directories checked for models.
       * @returns {string[]}
       */
      getBaseFolders() {
        const defaultPackageModels = import_node_path.default.resolve(currentDir, "..", "..", "models");
        const userHomeModels = import_node_path.default.join(import_node_os.default.homedir(), ".uralicnlp");
        const folders = [...this.customFolders, defaultPackageModels, userHomeModels];
        const pyCandidate = import_node_path.default.join(
          import_node_os.default.homedir(),
          ".local/lib/python3.14/site-packages/uralicNLP/models"
        );
        if (import_node_fs.default.existsSync(pyCandidate) && !folders.includes(pyCandidate)) {
          folders.push(pyCandidate);
        }
        return folders;
      }
      /**
       * Finds the first writable base directory (creates ~/.uralicnlp if needed).
       * @returns {string}
       */
      getWritableFolder() {
        const folders = [
          ...this.customFolders,
          import_node_path.default.join(import_node_os.default.homedir(), ".uralicnlp"),
          import_node_path.default.resolve(currentDir, "..", "..", "models")
        ];
        for (const folder of folders) {
          try {
            if (!import_node_fs.default.existsSync(folder)) {
              import_node_fs.default.mkdirSync(folder, { recursive: true });
            }
            import_node_fs.default.accessSync(folder, import_node_fs.default.constants.W_OK);
            return folder;
          } catch {
          }
        }
        const tmp = import_node_path.default.join(import_node_os.default.tmpdir(), ".uralicnlp");
        if (!import_node_fs.default.existsSync(tmp)) {
          import_node_fs.default.mkdirSync(tmp, { recursive: true });
        }
        return tmp;
      }
      /**
       * Finds the directory containing models for the given language.
       * Following Python UralicNLP logic: checks multiple folders, sorts by mtime if requested.
       * @param {string} language
       * @param {boolean} [safe=false]
       * @returns {string | null}
       */
      whereModels(language, safe = false) {
        const folders = this.getBaseFolders();
        let latestPath = null;
        let latestTime = 0;
        for (const baseFolder of folders) {
          const candidate = import_node_path.default.join(baseFolder, language);
          if (import_node_fs.default.existsSync(candidate)) {
            try {
              const files = import_node_fs.default.readdirSync(candidate);
              if (files.length === 0) continue;
              let maxFileTime = 0;
              for (const f of files) {
                try {
                  const stat = import_node_fs.default.statSync(import_node_path.default.join(candidate, f));
                  if (stat.mtimeMs > maxFileTime) {
                    maxFileTime = stat.mtimeMs;
                  }
                } catch {
                }
              }
              if (latestPath === null || maxFileTime > latestTime) {
                latestPath = candidate;
                latestTime = maxFileTime;
              }
            } catch {
            }
          }
        }
        if (latestPath !== null) {
          return latestPath;
        }
        if (safe) {
          return null;
        }
        throw new Error(
          `Models for ${language} were not in ${folders.join(
            " or "
          )}. Use download("${language}") to download models.`
        );
      }
      /**
       * Returns path to model file, or null if missing.
       * @param {string} language
       * @param {string} modelType
       * @returns {Promise<string | null>}
       */
      async getModel(language, modelType) {
        const dir = this.whereModels(language, true);
        if (!dir) return null;
        const filePath = import_node_path.default.join(dir, modelType);
        if (import_node_fs.default.existsSync(filePath)) {
          return filePath;
        }
        return null;
      }
      /**
       * Checks if a specific model exists.
       * @param {string} language
       * @param {string} modelType
       * @returns {Promise<boolean>}
       */
      async hasModel(language, modelType) {
        const p = await this.getModel(language, modelType);
        return p !== null;
      }
      /**
       * Saves model data to disk.
       * @param {string} language
       * @param {string} modelType
       * @param {Uint8Array | ArrayBuffer | Buffer} data
       * @returns {Promise<void>}
       */
      async saveModel(language, modelType, data) {
        const writableBase = this.getWritableFolder();
        const targetDir = import_node_path.default.join(writableBase, language);
        if (!import_node_fs.default.existsSync(targetDir)) {
          import_node_fs.default.mkdirSync(targetDir, { recursive: true });
        }
        const filePath = import_node_path.default.join(targetDir, modelType);
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
        await import_node_fs.default.promises.writeFile(filePath, buffer);
        this.installedCache.add(language);
      }
      /**
       * Checks if language is installed.
       * @param {string} language
       * @returns {Promise<boolean>}
       */
      async isLanguageInstalled(language) {
        if (this.installedCache.has(language)) {
          return true;
        }
        const dir = this.whereModels(language, true);
        if (dir !== null) {
          this.installedCache.add(language);
          return true;
        }
        return false;
      }
      /**
       * Loads metadata JSON.
       * @param {string} language
       * @returns {Promise<any | null>}
       */
      async getMetadata(language) {
        const dir = this.whereModels(language, true);
        if (!dir) return null;
        const metaPath = import_node_path.default.join(dir, "metadata.json");
        if (import_node_fs.default.existsSync(metaPath)) {
          try {
            const text = await import_node_fs.default.promises.readFile(metaPath, "utf-8");
            return JSON.parse(text);
          } catch {
            return null;
          }
        }
        return null;
      }
      /**
       * Saves metadata JSON.
       * @param {string} language
       * @param {any} metadata
       * @returns {Promise<void>}
       */
      async saveMetadata(language, metadata) {
        const writableBase = this.getWritableFolder();
        const targetDir = import_node_path.default.join(writableBase, language);
        if (!import_node_fs.default.existsSync(targetDir)) {
          import_node_fs.default.mkdirSync(targetDir, { recursive: true });
        }
        const filePath = import_node_path.default.join(targetDir, "metadata.json");
        await import_node_fs.default.promises.writeFile(
          filePath,
          JSON.stringify(metadata, null, 2),
          "utf-8"
        );
      }
      /**
       * Uninstalls language models by removing the language directory.
       * @param {string} language
       * @returns {Promise<void>}
       */
      async uninstall(language) {
        let dir = this.whereModels(language, true);
        while (dir !== null) {
          try {
            import_node_fs.default.rmSync(dir, { recursive: true, force: true });
          } catch {
          }
          dir = this.whereModels(language, true);
        }
        this.installedCache.delete(language);
      }
      /**
       * Lists all installed languages across base folders.
       * @returns {Promise<string[]>}
       */
      async listInstalledLanguages() {
        const folders = this.getBaseFolders();
        const langs = /* @__PURE__ */ new Set();
        for (const base of folders) {
          if (import_node_fs.default.existsSync(base)) {
            try {
              const entries = import_node_fs.default.readdirSync(base, { withFileTypes: true });
              for (const entry of entries) {
                if (entry.isDirectory()) {
                  langs.add(entry.name);
                }
              }
            } catch {
            }
          }
        }
        return Array.from(langs);
      }
    };
  }
});

// src/storage/browser-storage.js
var browser_storage_exports = {};
__export(browser_storage_exports, {
  BrowserStorage: () => BrowserStorage
});
var BrowserStorage;
var init_browser_storage = __esm({
  "src/storage/browser-storage.js"() {
    BrowserStorage = class {
      /**
       * @param {string} [dbName='uralicnlp_models']
       */
      constructor(dbName = "uralicnlp_models") {
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
        const idb = typeof indexedDB !== "undefined" ? indexedDB : typeof globalThis !== "undefined" ? globalThis.indexedDB : null;
        if (!idb) {
          throw new Error(
            "IndexedDB is not supported or not available in the current environment."
          );
        }
        this.dbPromise = new Promise((resolve, reject) => {
          const request = idb.open(this.dbName, 1);
          request.onupgradeneeded = (event) => {
            const db = request.result;
            if (!db.objectStoreNames.contains("models")) {
              db.createObjectStore("models", { keyPath: "key" });
            }
            if (!db.objectStoreNames.contains("metadata")) {
              db.createObjectStore("metadata", { keyPath: "language" });
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
          const tx = db.transaction("models", "readonly");
          const store = tx.objectStore("models");
          const request = store.get(key);
          request.onsuccess = () => {
            const result = request.result;
            if (result && result.data) {
              resolve(
                result.data instanceof Uint8Array ? result.data : new Uint8Array(result.data)
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
          const tx = db.transaction("models", "readwrite");
          const store = tx.objectStore("models");
          const request = store.put({
            key,
            language,
            modelType,
            data: bytes,
            size: bytes.byteLength,
            timestamp: Date.now()
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
          const tx = db.transaction("models", "readonly");
          const store = tx.objectStore("models");
          const range = typeof IDBKeyRange !== "undefined" ? IDBKeyRange.bound(prefix, prefix + "\uFFFF") : null;
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
          const tx = db.transaction("metadata", "readonly");
          const store = tx.objectStore("metadata");
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
          const tx = db.transaction("metadata", "readwrite");
          const store = tx.objectStore("metadata");
          const request = store.put({
            language,
            data: metadata,
            timestamp: Date.now()
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
          const tx = db.transaction("models", "readwrite");
          const store = tx.objectStore("models");
          const range = typeof IDBKeyRange !== "undefined" ? IDBKeyRange.bound(prefix, prefix + "\uFFFF") : null;
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
          const tx = db.transaction("metadata", "readwrite");
          const store = tx.objectStore("metadata");
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
          const tx = db.transaction("models", "readonly");
          const store = tx.objectStore("models");
          const request = store.openCursor();
          const langs = /* @__PURE__ */ new Set();
          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
              const slash = cursor.key.indexOf("/");
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
    };
  }
});

// src/index.js
var index_exports = {};
__export(index_exports, {
  Cg3: () => Cg3,
  Cg3Pipe: () => Cg3Pipe,
  MemoryStorage: () => MemoryStorage,
  addLanguageFlag: () => addLanguageFlag,
  analyze: () => analyze,
  clearCache: () => clearCache,
  clear_cache: () => clear_cache,
  default: () => index_default,
  deleteLanguage: () => deleteLanguage,
  delete_language: () => delete_language,
  download: () => download,
  filterArabic: () => filterArabic,
  generate: () => generate,
  getDownloadServerUrl: () => getDownloadServerUrl,
  getStorage: () => getStorage,
  getTransducer: () => getTransducer,
  getTranslation: () => getTranslation,
  get_transducer: () => get_transducer,
  get_translation: () => get_translation,
  isBrowserEnvironment: () => isBrowserEnvironment,
  isLanguageInstalled: () => isLanguageInstalled,
  isNodeEnvironment: () => isNodeEnvironment,
  is_language_installed: () => is_language_installed,
  lemmatize: () => lemmatize,
  removeAnalysisSymbols: () => removeAnalysisSymbols,
  removeSymbols: () => removeSymbols,
  segment: () => segment,
  sentences: () => sentences,
  setDownloadServerUrl: () => setDownloadServerUrl,
  setStorage: () => setStorage,
  supportedLanguages: () => supportedLanguages,
  supported_languages: () => supported_languages,
  tokenize: () => tokenize,
  tokenizer: () => tokenizer_default,
  uninstall: () => uninstall,
  uralicApi: () => uralicApi,
  words: () => words
});
module.exports = __toCommonJS(index_exports);

// src/uralicApi.js
var import_hfst_js = require("hfst-js");

// src/storage/memory-storage.js
var MemoryStorage = class {
  constructor() {
    this.models = /* @__PURE__ */ new Map();
    this.metadata = /* @__PURE__ */ new Map();
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
    const langs = /* @__PURE__ */ new Set();
    for (const key of this.models.keys()) {
      const slash = key.indexOf("/");
      if (slash !== -1) {
        langs.add(key.slice(0, slash));
      }
    }
    return Array.from(langs);
  }
};

// src/storage/index.js
var defaultStorage = null;
function isNodeEnvironment() {
  return typeof process !== "undefined" && process.versions != null && process.versions.node != null;
}
function isBrowserEnvironment() {
  return typeof window !== "undefined" && (typeof indexedDB !== "undefined" || typeof window.indexedDB !== "undefined");
}
async function getStorage() {
  if (defaultStorage) {
    return defaultStorage;
  }
  if (isNodeEnvironment()) {
    try {
      const { NodeStorage: NodeStorage2 } = await Promise.resolve().then(() => (init_node_storage(), node_storage_exports));
      defaultStorage = new NodeStorage2();
      return defaultStorage;
    } catch {
    }
  }
  if (isBrowserEnvironment()) {
    try {
      const { BrowserStorage: BrowserStorage2 } = await Promise.resolve().then(() => (init_browser_storage(), browser_storage_exports));
      defaultStorage = new BrowserStorage2();
      return defaultStorage;
    } catch {
    }
  }
  defaultStorage = new MemoryStorage();
  return defaultStorage;
}
function setStorage(storage) {
  defaultStorage = storage;
}

// src/uralicApi.js
var downloadServerUrl = "http://models.uralicnlp.com/nightly/";
var MODEL_TYPES = {
  analyser: "analyser-gt-desc.hfstol",
  "analyser-norm": "analyser-gt-norm.hfstol",
  "analyser-dict": "analyser-dict-gt-norm.hfstol",
  generator: "generator-dict-gt-norm.hfstol",
  "generator-desc": "generator-gt-desc.hfstol",
  "generator-norm": "generator-gt-norm.hfstol",
  "morpher-gt-desc.hfstol": "morpher-gt-desc.hfstol",
  cg3: "disambiguator.cg3",
  "metadata.json": "metadata.json",
  "dictionary.json": "dictionary.json"
};
var analyzerCache = /* @__PURE__ */ new Map();
var generatorCache = /* @__PURE__ */ new Map();
function getDownloadServerUrl() {
  return downloadServerUrl;
}
function setDownloadServerUrl(url) {
  downloadServerUrl = url.endsWith("/") ? url : url + "/";
}
function clearCache(language = null) {
  if (language == null) {
    analyzerCache.clear();
    generatorCache.clear();
    return;
  }
  const prefix = `${language}:`;
  for (const key of analyzerCache.keys()) {
    if (key.startsWith(prefix)) analyzerCache.delete(key);
  }
  for (const key of generatorCache.keys()) {
    if (key.startsWith(prefix)) generatorCache.delete(key);
  }
}
var clear_cache = clearCache;
function removeSymbols(string) {
  return string.replace(/@[^@]*@/g, "");
}
function removeAnalysisSymbols(results) {
  return results.map(([str, weight]) => [removeSymbols(str), weight]);
}
function addLanguageFlag(results, language) {
  return results.map(([str, weight]) => [str + "+" + language, weight]);
}
function filterArabic(text, keepVowels = true, combineBy = "") {
  const pattern = keepVowels ? /[ء-ي'ًٌٍَُِّْـ']+/gu : /[ء-ي]+/gu;
  const matches = text.match(pattern) || [];
  return matches.join(combineBy);
}
function getAnalyzerModelName(descriptive, dictionaryForms, segmentation) {
  if (segmentation) return "morpher-gt-desc.hfstol";
  if (dictionaryForms) return "analyser-dict";
  if (descriptive) return "analyser";
  return "analyser-norm";
}
function getGeneratorModelName(descriptive, dictionaryForms) {
  if (!descriptive && dictionaryForms) return "generator";
  if (descriptive) return "generator-desc";
  return "generator-norm";
}
async function is_language_installed(language) {
  const storage = await getStorage();
  return await storage.isLanguageInstalled(language);
}
var isLanguageInstalled = is_language_installed;
async function download(language, options = {}) {
  const storage = await getStorage();
  const modelsToDownload = options.models || [
    "analyser",
    "analyser-norm",
    "analyser-dict",
    "generator",
    "generator-desc",
    "generator-norm",
    "morpher-gt-desc.hfstol",
    "cg3",
    "metadata.json"
  ];
  for (const modelType of modelsToDownload) {
    const remoteFilename = MODEL_TYPES[modelType] || modelType;
    const url = `${getDownloadServerUrl()}${language}/${remoteFilename}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (modelType === "metadata.json") {
          await storage.saveMetadata?.(language, {
            info: "no metadata provided"
          });
        }
        continue;
      }
      if (modelType === "metadata.json") {
        const json = await response.json();
        await storage.saveMetadata?.(language, json);
        await storage.saveModel(
          language,
          modelType,
          new TextEncoder().encode(JSON.stringify(json))
        );
      } else {
        const buffer = await response.arrayBuffer();
        await storage.saveModel(language, modelType, new Uint8Array(buffer));
      }
      if (typeof options.onProgress === "function") {
        options.onProgress({ language, model: modelType, status: "downloaded" });
      }
    } catch (err) {
      if (modelType === "metadata.json") {
        await storage.saveMetadata?.(language, {
          info: "no metadata provided"
        });
      }
    }
  }
  clearCache(language);
}
async function get_transducer(language, options = {}) {
  const {
    cache = true,
    analyzer = true,
    descriptive = analyzer ? true : false,
    dictionaryForms = false,
    segmentation = false,
    filename = null
  } = options;
  const storage = await getStorage();
  if (filename) {
    const cacheKey2 = typeof filename === "string" ? filename : "custom_buffer";
    const cacheMap2 = analyzer ? analyzerCache : generatorCache;
    if (cache && cacheMap2.has(cacheKey2)) {
      return cacheMap2.get(cacheKey2);
    }
    const stream2 = new import_hfst_js.HfstInputStream(filename, cache);
    const transducer2 = stream2.read();
    if (cache) cacheMap2.set(cacheKey2, transducer2);
    return transducer2;
  }
  const modelName = analyzer ? getAnalyzerModelName(descriptive, dictionaryForms, segmentation) : getGeneratorModelName(descriptive, dictionaryForms);
  const cacheKey = `${language}:${modelName}`;
  const cacheMap = analyzer ? analyzerCache : generatorCache;
  if (cache && cacheMap.has(cacheKey)) {
    return cacheMap.get(cacheKey);
  }
  let modelData = await storage.getModel(language, modelName);
  if (!modelData) {
    await download(language, { models: [modelName, "metadata.json"] });
    modelData = await storage.getModel(language, modelName);
  }
  if (!modelData) {
    throw new Error(
      `Model "${modelName}" for language "${language}" is not available.`
    );
  }
  const stream = new import_hfst_js.HfstInputStream(modelData, cache);
  const transducer = stream.read();
  if (cache) {
    cacheMap.set(cacheKey, transducer);
  }
  return transducer;
}
var getTransducer = get_transducer;
function parseAnalyzeArgs(optionsOrForceLocal, rest) {
  if (typeof optionsOrForceLocal === "object" && optionsOrForceLocal !== null) {
    const o = optionsOrForceLocal;
    return {
      forceLocal: o.forceLocal ?? o.force_local ?? true,
      descriptive: o.descriptive ?? true,
      removeSymbols: o.removeSymbols ?? o.remove_symbols ?? true,
      languageFlags: o.languageFlags ?? o.language_flags ?? false,
      dictionaryForms: o.dictionaryForms ?? o.dictionary_forms ?? false,
      filename: o.filename ?? null,
      segmentation: o.segmentation ?? false,
      timeCutoff: o.timeCutoff ?? o.time_cutoff ?? 0,
      cache: o.cache ?? true
    };
  }
  const [
    descriptive = true,
    removeSymbols2 = true,
    languageFlags = false,
    dictionaryForms = false,
    filename = null,
    segmentation = false
  ] = rest;
  return {
    forceLocal: optionsOrForceLocal ?? true,
    descriptive,
    removeSymbols: removeSymbols2,
    languageFlags,
    dictionaryForms,
    filename,
    segmentation,
    timeCutoff: 0,
    cache: true
  };
}
async function analyze(query, language, optionsOrForceLocal = {}, ...rest) {
  const opts = parseAnalyzeArgs(optionsOrForceLocal, rest);
  if (Array.isArray(language)) {
    const results2 = [];
    for (const lang of language) {
      const sub = await analyze(query, lang, {
        ...opts,
        languageFlags: false
      });
      results2.push(...sub);
    }
    return opts.languageFlags ? addLanguageFlag(results2, language.join(",")) : results2;
  }
  const transducer = await get_transducer(language, {
    cache: opts.cache,
    analyzer: true,
    descriptive: opts.descriptive,
    dictionaryForms: opts.dictionaryForms,
    segmentation: opts.segmentation,
    filename: opts.filename
  });
  const raw = transducer.lookup(query, opts.timeCutoff);
  let results = raw;
  if (opts.removeSymbols) {
    results = removeAnalysisSymbols(results);
  }
  if (opts.languageFlags) {
    results = addLanguageFlag(results, language);
  }
  return results;
}
function parseGenerateArgs(optionsOrForceLocal, rest) {
  if (typeof optionsOrForceLocal === "object" && optionsOrForceLocal !== null) {
    const o = optionsOrForceLocal;
    return {
      forceLocal: o.forceLocal ?? o.force_local ?? true,
      descriptive: o.descriptive ?? false,
      dictionaryForms: o.dictionaryForms ?? o.dictionary_forms ?? false,
      removeSymbols: o.removeSymbols ?? o.remove_symbols ?? true,
      filename: o.filename ?? null,
      timeCutoff: o.timeCutoff ?? o.time_cutoff ?? 0,
      cache: o.cache ?? true
    };
  }
  const [
    descriptive = false,
    dictionaryForms = false,
    removeSymbols2 = true,
    filename = null
  ] = rest;
  return {
    forceLocal: optionsOrForceLocal ?? true,
    descriptive,
    dictionaryForms,
    removeSymbols: removeSymbols2,
    filename,
    timeCutoff: 0,
    cache: true
  };
}
async function generate(query, language, optionsOrForceLocal = {}, ...rest) {
  const opts = parseGenerateArgs(optionsOrForceLocal, rest);
  const transducer = await get_transducer(language, {
    cache: opts.cache,
    analyzer: false,
    descriptive: opts.descriptive,
    dictionaryForms: opts.dictionaryForms,
    filename: opts.filename
  });
  const raw = transducer.lookup(query, opts.timeCutoff);
  let results = raw;
  if (opts.removeSymbols) {
    results = removeAnalysisSymbols(results);
  }
  return results;
}
function parseLemmatizeArgs(optionsOrForceLocal, rest) {
  if (typeof optionsOrForceLocal === "object" && optionsOrForceLocal !== null) {
    const o = optionsOrForceLocal;
    return {
      forceLocal: o.forceLocal ?? o.force_local ?? true,
      descriptive: o.descriptive ?? true,
      wordBoundaries: o.wordBoundaries ?? o.word_boundaries ?? false,
      dictionaryForms: o.dictionaryForms ?? o.dictionary_forms ?? false,
      filename: o.filename ?? null
    };
  }
  const [
    descriptive = true,
    wordBoundaries = false,
    dictionaryForms = false,
    filename = null
  ] = rest;
  return {
    forceLocal: optionsOrForceLocal ?? true,
    descriptive,
    wordBoundaries,
    dictionaryForms,
    filename
  };
}
async function lemmatize(word, language, optionsOrForceLocal = {}, ...rest) {
  const opts = parseLemmatizeArgs(optionsOrForceLocal, rest);
  const analysis = await analyze(word, language, {
    descriptive: opts.descriptive,
    dictionaryForms: opts.dictionaryForms,
    filename: opts.filename,
    forceLocal: opts.forceLocal
  });
  const bound = opts.wordBoundaries ? "|" : "";
  const lemmas = [];
  for (const tupla of analysis) {
    let an = tupla[0];
    if (!an) continue;
    if (language === "swe") {
      const lemma = an.replace(/<.*?>/g, bound).replace(new RegExp(`^\\${bound}+|\\${bound}+$`, "g"), "");
      lemmas.push(lemma);
    } else if (language === "ara") {
      lemmas.push(filterArabic(an, true, bound));
    } else if (language === "fin_hist") {
      const matches = Array.from(an.matchAll(/(?<=WORD_ID=)[^\]]*/g), (m) => m[0]);
      lemmas.push(matches.join(bound));
    } else if (an.includes("<") && an.includes(">")) {
      const parts = an.split("+");
      const lemma = parts.map((x) => x.split("<")[0]).join(bound);
      lemmas.push(lemma);
    } else {
      if (!an.includes("+Cmp#") && an.includes("#")) {
        an = an.replace(/#/g, "+Cmp#");
      }
      const res = an.split("+Cmp#");
      let parts = res.map((x) => x.split("+")[0]);
      if (language === "eng") {
        parts = parts.map((x) => x.replace(/\[.*?\]/g, ""));
      }
      lemmas.push(parts.join(bound));
    }
  }
  return Array.from(new Set(lemmas));
}
async function segment(query, language, options = {}) {
  const analysis = await analyze(query, language, {
    ...options,
    segmentation: true
  });
  return analysis.map((x) => x[0].replace(/#/g, ">").split(">"));
}
async function get_translation(lemma, lang, trans_lang = null, options = {}) {
  let targetLang = trans_lang;
  let opts = options;
  if (typeof trans_lang === "object" && trans_lang !== null) {
    opts = trans_lang;
    targetLang = opts.trans_lang ?? opts.transLang ?? null;
  }
  const query = `${lang}_${lemma}`;
  const [t1, t2, t3] = await Promise.all([
    analyze(query, "dictionary", { filename: opts.filename1 }).catch(() => []),
    generate(query, "dictionary", { filename: opts.filename2 }).catch(() => []),
    // The normalized dictionary analyzer is a separate FST.  It is not
    // available in every dictionary installation, so match the Python API's
    // best-effort behavior when it cannot be loaded.
    analyze(query, "dictionary", {
      filename: opts.filename1,
      descriptive: false
    }).catch(() => {
      console.warn(
        "Not all dictionaries are loaded. Please download the dictionary models and try again."
      );
      return [];
    })
  ]);
  const res = {};
  for (const t of [...t1, ...t2, ...t3]) {
    if (!t || !t[0]) continue;
    const splitIdx = t[0].indexOf("_");
    if (splitIdx === -1) continue;
    const l = t[0].slice(0, splitIdx);
    const w = t[0].slice(splitIdx + 1).replace(/_/g, " ");
    if (!res[l]) {
      res[l] = [];
    }
    res[l].push(w);
  }
  for (const key of Object.keys(res)) {
    res[key] = Array.from(new Set(res[key]));
  }
  if (targetLang != null) {
    return res[targetLang] || [];
  }
  return res;
}
var getTranslation = get_translation;
async function supported_languages() {
  const url = `${getDownloadServerUrl()}supported_languages.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch supported languages: ${res.statusText}`);
  }
  return await res.json();
}
var supportedLanguages = supported_languages;
async function uninstall(language) {
  const storage = await getStorage();
  await storage.uninstall(language);
  clearCache(language);
}
var deleteLanguage = uninstall;
var delete_language = uninstall;
var uralicApi = {
  analyze,
  generate,
  lemmatize,
  segment,
  get_translation,
  getTranslation,
  download,
  is_language_installed,
  isLanguageInstalled,
  supported_languages,
  supportedLanguages,
  uninstall,
  deleteLanguage,
  delete_language,
  get_transducer,
  getTransducer,
  clearCache,
  clear_cache,
  setDownloadServerUrl,
  getDownloadServerUrl,
  removeSymbols,
  removeAnalysisSymbols,
  addLanguageFlag,
  filterArabic
};

// src/data/abrvs.js
var abrvs_default = ["rec", "\u0442.\u0433", "t.a.m", "m.i", "h.r", "b.b", "utt", "griech", "kl", "poc", "cm", "jan", "l.a", "eritt", "kft", "eccl", "nov", "\xFE", "pe", "a.u.m", "a.g", "jer", "s.a", "c..", "maks", "\u0434\u0443\u043D", "h.u.c", "u.s.w", "ft", "soddisfatt", "ca", "dipl", "\u056A\u0569", "responsabilit", "ri", "su", "vol", "bennett#harj", "\u092A\u094D\u0930\u094B", "\u0568\u0576\u0564\u0570", "b.v", "e.v", "\u0906\u0930", "eteisper", "i.v", "xlvii", "sens", "\u0566", "tml", "a.\u015F", "u.c", "u.tml", "tr", "yap\u0131yorlar", "governa", "brah", "pkl", "m", "lv", "vs", "f.a", "\u092A\u094D\u0930\u093E", "n.l", "bush'tur", "g.o.f", "c.m", "tzv", "b.i.p", "xiv", "az", "i.d.s", "\u0219.a", "\u044F", "s\xF6yledi", "huom", "taglia", "ekr", "int", "kg", "\u0568", "var", "\u0438\u043D", "mm", "con", "\u0123", "red.anm", "m.fl", "exo", "nyk", "kcl#inf", "zzgl", "c.a.r", "geliyor", "ot.prp", "sottosegreta", "sce", "phys", "\u043F\u0430\u0445\u043E\u043D\u0438\u043D\u043E", "\u0B9F\u0BBF.\u0B8E\u0BB8\u0BCD", "r.r", "\u0448", "evtl", "qual", "\u0BAA\u0BBE.\u0BAE.\u0B95", "i.w", "non", "cav", "j.-y", "\u05E1", "r\xF3m", "\u0443\u043B", "c.i.a", "\u057D\u0580\u056F", "h.s", "g", "\u0435\u0442", "georg", "\u0430\u043C\u0435\u0440", "\u0444\u0440", "amministra", "\u091C\u0940", "\u0567\u0586", "madam", "red", "p.a", "att", "psyykk", "hab", "s.e", ".__", "t.a", "steht", "o.v", "wollen", "\u049B", "f.u.n", "o.g.m", "t.i.a", "kat\u0131lmad\u0131", "d.c", "j.g", "interkom", "sog", "c.h", "h.a.l", "l.w.s.a.l.b", "croll", "ogg", "\u043E", "\u015Fekilde", "iacob", "k.g", "\u03B2\u03BB", "r.a", "\u0BAA", "toist", "\u0565", "sis", "ny", "d.h", "ltd", "historias", "\u0B9C\u0BBF.\u0B8E\u0BB2\u0BCD", "semif", "ediyordu", "ed", "\u03B4\u03B9\u03C3", "v.v.d", "navigan", "\u017E", "b.a", "mrs", "ii", "\u2C89..\u2C99.", "dr", "\u043C\u0456\u043D", "m.a.w", "k", "w", "#istituo", "e.t", "\u0440\u0440", "plm", "be", "\u0564\u057A", "doc", "o.d.s", "ok", "fax", "e.p", "\u0161v\u010D", "saks", "\u0B8E\u0BAE\u0BCD.\u0B8E\u0BB8\u0BCD\u0BB8\u0BBF", "g.m", "a.f", "j.w", "c-\xE0-d", "cit", "s.b", "alt", "abt", "z", "t.u", "\u043F\u0440", "rev", "h.g", "krs", "kon", "\u03BA\u03BA\u03B5", "us-nr", "x", "bzw", "p", "dc", "sras", "ezekh", "esim", "n.w", "\u0456", "pom", "a\xE7mad\u0131m", "qd", "g.i", "fa", "matt", "de\u011Fi\u015Fmedi", "rchb.f", "\u0442.\u043D", "\u0433", "info", "\u03B2", "\u03B3", "\u0433\u0440", "dr.med", "pte", "pont", "n.n", "kgl", "\u090F", "r.a.v.e", "syr", "sever", "\u0431\u0435\u043B", "heb", "dec", "\u092C\u0940", "\u0921\u092C\u094D\u0932\u0942", "tasarlanm\u0131\u015Ft\u0131r", "treten", "h\xF3s", "j.d.p", "\u03B5.\u03B5", "akt", "l.p", "c.j", "t\xE9l", "kal", "nr", "\u0432\u0438\u043F", "j.c", "pan", "messrs", "y.w", "\u0563", "fung", "f.eks", "\u0930\u0947\u0924", "a.p.s", "yok", "burg", "\u03BD", "d.o.m", "i.c", "tedes", "at&t", "plc", "ug", "n.b.a", "interrog", "kap", "ry", "g.u", "xxiv", "mhgr", "p\xE9t", "\u0441\u0435\u0440", "att\u0131", "ff", "plkst", "\xFEess", "o.a", "resp", "\u090F\u092E", "\u0101", "ml", "\u0441\u0442\u0440", "a.iii", "j.j", "\u044D\u043B\u044C\u0431\u0438\u043D\u0433", "xxvi", "nn", "pdes", "e.d", "p\xE1x", "para", "greenwich/conn", "m.cr", "que", "g.p", "h.r.f", "\u043C\u0430\u043B\u044C", "pc", "et", "p.j.m", "._", "\u05E4", "juris", "s.k.a.t.e", "kungl", "ricove", "g.d.p", "pf./min", "g.o", "iyi", "lda", "\u057F\u0578\u0584\u0569", "s.o.s", "\u0561\u0566\u0563", "r.b.t", "xi", "mwst", "r.m", "www", "g.e", "kr", ":/", "vii", "b.m", "itd", "pot", "p.d.c", "\u0435", "xlv", "vind", "k.k", "proc", "\u0577", "h.-g", "decembr", "c.s", "c.c", "i.m", "\u0442.\u043F", "s.p", "okt", "\u0564", "esp", "satur", "yay", "s.c", "ift.tt", "sec", "exod", "o/m", "\u03BC.\u03BC", "npr", "mov", "\u0441\u0430\u0446", "es", "a.s.o", "m.sh", "t.s", "e.a.t", "\u044B", "joh", "bros", "h.l", "f", "s.f", "ley", "r.y", "jne", "f.v", "st", "'", "flg", "\u057A", "d.a.p", "h.e.r", "vv", "\u0442\u0440\u043B\u043D", "mo", "\u090F\u0932", "\u043F\u043E\u0440", "pvt", "\u092E.\u092A\u094D\u0930", "a.m.k", "\u0219", "\u043F\u043E\u0434\u043F", "jap", "journ", "u", "janv", "hita", "krf", "\u043E.\u0437", "v.j", "\u0443\u0433\u043E\u0440\u0441\u044C\u043A", "m\xE5n", "\u056E\u0576", "op", "so", "m.h", "xlvi", "l\xFAk", "\u0926", "mi", "a.b.p", "c.iii", "c.a", "a.b.c", "\xE9l", "u.s.o", "ds", "l.h", "mln", "mr", "r", "h.f", "liv", "detroit-st", "\u043D\u0430\u043F\u0440", "o.s.v", "ifj", "r.i.d", "\u0432", "al", "w.e", "corp", "s.u.s.e", "i.n", "frk", "t.j", "s.g", "mevr", "bl.a", "ass't", "l.o", "kapituli", "tn", "lb", "\u091C\u0940.\u091F\u0940", "manifesta", "p.g", "totalmente", "pnt", "\u0433\u0440\u0435\u0446", "r.c", "bay", "etj", "\u0567", "i.d", "\xF8", "feat", "\u0437\u0443\u0431", "guid", "\u0456\u043C", "\u0434\u043E\u0446", "res", "r.k", "sts", "\u0441\u043E\u043F", "approx", "c.g", "pst", "uimh", "koyar", "lt", "j\xF3h", "jak", "b.iii", "sundu", "mc", "heng", "\u0431.\u0437.\u0431", "stationsstraat-ged", "consigl", "a.b.d", "viv", "kapan\u0131k", "\u0441\u0442.\u043D.\u0441", "ver", "nl", "johs", "\u05DC", "ou", "t.h", "\u057F\u056B\u056F", "carga", "sare", "n.s", ".i", "\u0563\u0565\u0580\u0577", "bzgl", "http://www.quitandwin.org)", "com", "cannons", "\u03BA\u03BA", "\u03B4\u03C1", "\u0584\u0570\u0576\u0575", "e.u.a", "g.g", "k-x", "e.r", "\u03BC", "per", "\u092B\u093F\u0932", "w.i", "kt", "y\xFCksek", "apr", "ehem", "sv", "xliv", "sc", "diffi", "co", "deut", "\u0431\u043B\u0430\u0433\u043E\u0432", "a.u.b", "deutr", "\u0576", "aug", "j.-p", "ac", "p.s", "c.l.r", "etti", "buon", "tu", "l.e.d", "\u043D", "\u091F\u0940", "will", "gld", "\u0442.\u043E.\u043A", "\u0570", "giorn", "m.c", "xvii", "ggf", "peri", "bv", "e.c", "j.b", "di", "e.g.b", "s.w.i.f.t", "lii", "\u0456\u043D", "a.v", "attn", "i.g", "\u0437\u0432", "cie", "zof", "v.c", "\u0438.\u043E", "i.k.u", "\u0433\u043E\u0434", "u.d", "a.d", "\u0921\u0940", "i.r", "\u092E\u093F", "\u056D", "t.n.v", "\u0B8E\u0BB8\u0BCD.\u0B8E\u0BAE\u0BCD", "\xE7\u0131kt\u0131", "ariz", "eg", "h.p", "s.w.a.t", "\u0434\u0436", "\u05E9", "soc", "pehme\xE4#", "kokonaan", "pl", "s.k", "\u0909.\u092A\u094D\u0930", "\u0906\u0908", "edell", "mv", "dic", "\u03B5\u03BA", "b.o.b", "osb", "alk", "e.m", "\u03BB.\u03C7", "j.j.a", "konl", "matth", "\u044E\u0491\u043E\u0441\u043B", "meld", "frp", "\u0433\u0443\u0431", "t\xEDt", "\u091C\u0947", "a.m", "cep", "cordarone#inf", "\u0431\u043B", "\u0939\u0948", "oll", "gr", "\uBD80\uB974+\uC5C8+\uB2E4", "c.p", "\u03C0.\u03BC", "\u0441\u0435\u043C\u0438\u0433\u043E\u0440\u043E\u0434", "parlamentul_european", "h.m.s", "mgr", "ne", "etc", "c.p.c", "p.u.f", "o.s.frv", "bh", "lic", "anm", "wm", "palazz", "\u056C", "\u0B8E\u0BA9\u0BCD", "\u03B1.\u03B5", "ruots", "n.o", "pdas", "o.m", "dvs", "umr", "vgs", "s.a.r.a.c", "el", "c.v", "\u0131nc", "j.w.m", "ph.d", "\u0161t", "u\u011Fram\u0131\u015Ft\u0131m", "\u057D\u0565\u057A\u057F", "d.o.c", "subsp", "mrd", "f.e", "\u043B", "abk", "j.p", "filipp", "d.t", "u.\xFE.b", "b.a.t", "t.o.v", "arrv", "\u043C\u0440", "\u0161v", "\u0B95\u0BC7.\u0BAA\u0BBF.\u0BAA\u0BBF", "r.h", "circ", "f.kr", "e.h", "ww", "\u0493", "ang", "j.m", "val", "nei", "mag", "j.a", "s.p.a", "e.n.i", "xxxiii", "\u056F\u0580\u0569", "sext", "m.s.n.m", "\u0434\u0440\u0430\u043C", "\u0B9A\u0BBF", "b.c.e", "app", "heinrich-hertz-str", "zor", "rp", "\u0441\u0442", "toiv", "\u0563\u0565\u0580\u057A", "jf", "ej", "\u0442.\u043C", "j.r.r", "o.j", "zn", "\u043B\u0432", "xii", "llc", "\u0434\u043E\u043B\u043B", "eks", "j.d", "istemezsin", "tel", "s.r", "u.t.t", "p-r", "jesaj", "c.b.\xE9", "e.t.a", "\u0574\u0578\u0576\u057D", "a.v.p", "mlle", "\u0584", "g.b", "mobilis", "ns", "i.b", "l.f", "\u05E1\u05D8", "ex", "ymsgr:sendim?mayursha&__hi+mayur", "s.h", "e.n.o.t", "bilmiyorlar", "\u0BA4\u0BBE", "oz", "\u010Dl", "\u0574\u0561\u0563", "u.a", "\u0434", "prof", "\u0442.\u0431", "biv", "a.k.a", "kongl", "f.h", "bo", "vyr", "\u0430.\u043A.\u0430", "ned", "depto", "th", "u.n", "c", "igualar", "on", "p.m", "t.g.v", "asoc", "antimaf", "siliconvalley.com", "mht", "ing", "f.w", "me", "c.i", "z.m", "jr", "\u043A", "ave", "a", "tas", "\u057F", "pf/min", "non.iun", "xvi", "a.v.g", "naz", "verensok", "p.o.w", "belirsizdir", "ques", "t.g.f", "hengitys#fr", "n.-br", "h.t", "o.t.o", "xlix", "j", "eaa", "trave", "verdi", "l.s", "\u0561\u0580\u056A", "d.j", "a.r", "m.g", "sid", "spp", "\u03BA\u03B1", "\u0B9C\u0BBF", "vi", "\u010D", "fla", "\u0575\u0578\u0582\u0576\u057E", "t\xEDm\xF3th", "i.e", "ba\u015Faramad\u0131", "\u0647.\u0642", "\u03B5\u03B5", "\u0441\u043B", "ts", "mak", "\u056F", "k.-h", "w.h.s", "alabilirsiniz", "yms", "ym", "aplo", "adj", "piem", "m.i.t", "\u03BA", "eco", "k.p", "\u0B8E\u0BB8\u0BCD.\u0B8E\u0BB8\u0BCD", "prp", "ev", "job", "vgl", "\u0561\u0580\u0584", "o.r", "inkl", "j.l", "ya\u015Famazd\u0131m", ".", "\u0565\u0580\u0565\u057D\u0583", "\u043F\u043E\u043B\u043A", "h.m", "k.o", "\u057D", "h.h", "eur", "grl", "@.", "m.w", "\u0B95\u0BBF", "\u0B95\u0BC7.\u0B8E\u0BB8\u0BCD", "c.r", "one", "casin", "reg", "pp", "\u0BAA\u0BB4", "tra", "gara", "mark", "junc", "\u03C0.\u03C7", "k.c", "\xF6\u011Frenece\u011Fim", "olabilir", "s.u.a.p.s", "art", "olacak", "osv", "dwz", "\u0456\u043D\u0448", "deutro", "n.v", "god", "\xE4nkytt", "articol", "novembr", "m.j.e.m", "\u0438", "r.u", "u.s", "xliii", "pr", "innst", "\u0430\u043A\u0430\u0434", "\u043A\u043E\u043D\u0441\u0442\u0430\u043D\u0442\u0438\u043D\u043E\u043F\u043E\u043B\u044C\u0441\u043A\u0438\u0439", "hndr", "niv", "ch", "\u043C\u0438\u043A", "ukr", "\u056A\u0567", "t\u016Bkst", "\xFE.b", "www.uno-e", "evt", "c.p.p.p", "angl", "em", "conf", "\u03BF\u03B7\u03B5", "\u0454", "s.a.t", "pt", "gibiydi", "e.t.o", "d.o.o", "entsp", "convar", "mfl", "a.l.f.a", "vas", "\u0562", "@", "incl", "\u0443", "t.a.v", "max", "n.chr", "o.j.a.m", "s.a.d", "\u0915\u093F\u092E\u0940", "b.c", "cum", "conn", "altr", "xx", "b.f", "tms", "handr", "\u0B90.\u0BAA\u0BBF.\u0B8E\u0BB2\u0BCD", "e.w", "gepr", "\u0441.\u0432", "l", "\u0445", "\u0440", "ha", "ont", "p.j", "\u0574", "a.s", "br", "febr", "cos", "prop", "ef", "prior", "c.ii", "\xE7\u0131kard\u0131k", "past", "c.t", "quint", "aa", "col", "arh", "orami", "\u0645", "\u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0430", "mahd", "s.s", "o.n.u", "frz", "s\xF6yl\xFCyor", "f.n", "\u0B8E\u0BA9\u0BCD.\u0B8E\u0BB2\u0BCD.\u0B9A\u0BBF", "xviii", "\u0913", "t.ex", "\u0430\u0433\u0435\u043D\u0442\u0443\u0440\u0430", "va", "in.", "port", "\u0BA4\u0BBF.\u0BAE\u0BC1.\u0B95", "\u0437\u0430\u0445", "v.b", "s", "mek", "bl", "e", "insbes", "s.d", "jos", "blvd", "b.o", "p.p.s", "ga", "fazla", "\u0915\u094D\u092F\u0942", "\u0434\u0440", "prof-dr", "rdr", "km/t", "\u0440.\u0445", "capt", "\u057E\u0580\u0564", "k.n.s.m", "\u091F\u0947\u0915", "lib", "d.w", "\u043D\u0456\u043C", "personal", "iv", "p.c", "s.a.m", "\u0585", "a\xF1s", "\u0442", "e.n.m", ".-", "\u0583\u0580\u0578\u0586", "dhr", "ar.co", "\u043A\u043E\u043B", "ms", "v . h ", "dr.-ing", "dat", "\u03B5\u03BA\u03B1\u03C4", "rivo", "notables", "\u0430\u043D\u0433\u043B", "sto", "\u092D\u0940", "i", "b.t", "lavor", "hemo#dyn", "maias", "\u03BC.\u03C7", "l.l", "b.i", "corr", "\u0438.\u0434", "o.l", "\u0442\u0435\u0440", "mil", "bouw-c.a.o", "j.b.o", "#protezion", "tsankov", "eu", "aloit", "q.e.p.d", "termin", "dr.psychol", "pvz", "\u0B90.\u0BA8\u0BBE", "\u0434\u043E\u043B", "t.i", "viii", "ptas", ",", "l.j", "inc", "e.kr", "o", "vrk", "ricevu", "ph", "no", "ks", "srl", "convint", "http://t", "sen", "r.d", "arts", "kone#fr", "n.e.br", "\u0938\u0940", "pre", "m.v", "\u0935\u093E\u0908", "nom", "m.l", "\u043B\u0430\u0442", "e.a.r", "oik", "\u056E", "m.c.c", "maxiemenda", "kht", "o.u.a", "\u0561", "d.v.s", "t.t", "vorre", "ext", "y", "s.l", "a.m.l", "\u043C\u043B\u0440\u0434", "u.t", "abs", "g.k", "ky", "\u0431\u0443\u043B", "n.j", "t.s.a", "\u056A", "distr", "d.i", "\u0444", "\u043A\u0432", "j.-c", "f.j.g", "cf", "k\xF3r", "j.v", "devt", "tbk", "\u0584\u0570\u0575\u0576", "f.r.s", "\u043A.\u0441", "m.u.s.e.u.m", "t.n.t", "h.q", "\u0565\u057A\u056B\u057D\u056F", "t.i.m", "lat", "\u0431.\u0432", "v.c.i", "e.g", "gen", "\u0440\u0435\u0434", "w.h", "h", "ud", "\u043A\u0435\u0440", "lp", "\u0B9F\u0BBF", "r.m.r", "jkr", "mill", "v", "s.a.r.l", "mos", "\u0585\u0580", "st.meld", "reddeder", "sr", "politi", "g.j", "c.l", "\u043B\u0456\u0442", "s.n", "m.a", "\u017Ein", "p.e.v", "xv", "bp", "m.ag", "can", "a.l.f", "\u0B90.\u0B8F.\u0B8E\u0BB8\u0BCD", "v.a", "\u0935\u0940", ".\u2C9F", "\u043F\u0440\u043E\u0444", "commons", "hemo#dynam", "por.l", "\u0441", "bulmal\u0131", "erit", "a.p", "sl", "xiii", "spec", "relig", "\u090F\u091A", "jesai", "n", "\u0569\u0561\u0572", "sit.", "mass", "fund", "\u0441\u0443\u0447", "f.b.i", "c.d", "u.e.r", "o.n.c.e", "\u0456\u0442\u0430\u043B", "dell", "dem", "sk", "ftpx", "dz", "kol", "mlrd", "\u0442.\u043D\u0430\u0440", "fig", "fil.mag", "l.i", "organismus", "\u05E6", "\u0562\u0580\u056F", "\u0437", "xix", "po", "dan", "\u043C\u0430\u043B", "g.s", "jj.oo", "a.r.e", "oa", "u.\xE4", "hr", "q", "\u03B1\u03C1", "\u0430\u043F", "cc", "\u{1F602}", "h.e", "\u0569", "milj", "fas", "d.l", "j\u016Bn", "f.a.z", "e.k", "o.p", "p.i.b", "\u0B8F.\u0B8E\u0BAE\u0BCD", "\u0561\u0574\u0565\u0576", "\u0442.\u0435", "ir", "reigate", "\u0431", "pweination", "c.f", "sept", "qu", "pga", "mio", "vid", "liii", "p.h", "mej", "sextil", "kor", "ass", "f.l", "rt", "n.y", "\u0456\u0441\u0442", "hl", "stolt", "t.z", "san", "e.r.c.m", "\u043C\u043B\u043D", "\u0440\u0435\u0436", "\u0921\u092C\u094D\u0932\u094D\u092F\u0942", "\u0915\u0947", "min", "kath", "zur\xFCck", "lindl", "t", "r.i.p", "chr", "s.r.i.a", "gov", "\u0921\u0949", "\u043B.c", "cal", "a.o", "n.c", "\u0146", "pass", "\xFE.e", "marquin", "\u015Fey", "zypper", "\u090F\u0938", "doce", "m.sc", "\u0B9F\u0BBF.\u0B8E\u0BAE\u0BCD", "\u043C", "\u0430", "olu\u015Fturdu", "r.c.d", "\u0431.\u0442.\u0441", "a.c", "f.o.b", "j.s.r", "minis", "relativ", "\u0433\u043E\u0441", "adm.dir", "\u0432\u0443\u043B", "velenoso", "\u0908", "u.k", "dra", "nk", "best.nr", "d", "syd\xE4nkir", "iyidir", "syst", "\u03B5.\u03B1.\u03BC", "remaster", "\u0438\u0437\u0434", "z.b", "n.c.r", "\u043A.\u043F.\u043D", "suom", "j.f.k", "\u0434\u0438\u0444", "penn", "hos", "diyoruz", "k.u.k", "\u0440\u0435\u0454\u0441\u0442\u0440", "\u0442\u0438\u0441", "rilas", "tj", "sal", "engl", "vb", "v.d", "oops", "o.fl", "levit", "a.r.m.o.r", "r.-g", "\u0436", "\u043F\u043B", "\u0441\u0435\u0440\u0436", "subit", "jkv", "hebr", "jour", "ap", "ghz", "\u0434\u0437", "\u0B8E\u0BAE\u0BCD.\u0BAA\u0BBF", "n.b", "aprox", "str", "\u090F\u0928", "b.r", "t.d", "isl", "psalm", "inca", "cc.oo", "u.s.a", "\u056F\u0580\u0585\u0576", "ec", "gmd/st", "ahd", "o.k", "mij", "fr", "m.l.r", "m.b", "\u0161.g", "dr.philos", "c.b", "etab", "c.i.d", "\u0915\u093F.\u092E\u0940", "d.d", "mob", "\u0447\u043B", "\u043C\u044B\u0441", "j\u016Bl", "entspr", "\u0440.\u0444", "c.s.d", "\u092F\u0942", "sp", "\u0B8E\u0BB2\u0BCD.\u0B8E\u0BA9\u0BCD", "mikh", "m.m", "\u044E", "jon", "j.s.g", "comme", "b.d", "a.a", "o.s", "li", "h.c", "w.s", "cap", "\u0161", "f.r", "cand.polit", "s\xE4v", "t\u0101lr", "ecc", "quiri", "a.u", "\u0938\u094D\u0935", "est", "gal", "mind", "\u0B86\u0BB0\u0BCD", "\u05D5\u05D5", "usw", "al\xFE", "segreta", "uitgeversmij", "prep", "f.c", "ala", "\u0430\u043B", "\xFCst\xFCnde", "lgh", "d\u017E", "a.h", "pop", "inf", "t.o.m", "prov", "\u0B9F\u0BBF.\u0BB5\u0BBF", "vo", "b.ii", "gs", "ko", "mar", "c.c.c", "m\u0117n", "eds", "istedim", "vl\u010D", "d.e", "bayan", "m.c.b", "c.q", "f.m", "ot", "sat", "sud.", "olie", "gbit/sq.in", "eve", "\u05D9", "jesa", "harj", "\u0431.\u0430", "p.r", "\u0441\u043F\u044D\u0446", "b", "tp", "c.m.l.g", "\u03BA\u03BB\u03C0", "o.g", "t.a.c", "hermann-j", "e.c.u", "mg", "\u043A\u043E\u043F", "g\xF6rd\xFC", "m.a.l.i.c.i.a", "lpp", "rep", "\u03B1\u03C1\u03B9\u03B8", "m.s", "ven", "a.t", "d.c.a", "edizio", "\u0568\u0576\u056F", "e.e", "\u0456\u0441\u043F", "urr", "v.chr", "\u043C\u0438\u043D", "\u0921\u093E", "hnd", "drs", "joo#", "\u0BA4\u0BCA.\u0BAE\u0BC1.\u0B9A", "\u0908.\u092A\u0942", "\u0441\u0432", "\u043C.\u0433", "apok", "sett", "fr.o.m", "tele", "lo", "z.i", "pas", "b.o.n.d", "t\xEDm", "\u057A\u0580", "gebr", "g\xF6r\xFCn\xFCyor", "n.r.m", "wa", "dom", "idv", "med", "g\xF6r\xFCyor", "\u0564\u0578\u056F\u057F", "ad", "hospitalet-u", "m\xFCmk\xFCn", "\u0447", "ek", "pa", "la", "r.e.m", "\u044D", "\u0431\u0432", "mt", "\u0434\u0438\u0432", "noradr", "urb", "m.d", "anton", "\u0431.\u0440", "\xE7o\u011Fal\u0131yor", "\u03C7\u03BB\u03BC", "colo", "l.sin", "\u057A\u0580\u0576", "xlviii", "ps", "ee.uu", "\u092A\u0940", "jhr", "''d\u0131r", "i.s.c", "\u0B95\u0BC7", "\xFCstleniyordu", "p.o", "xxi", "t.v", ".j", "diyor", "m\xE4nner", "ix", "par", "\u043F", "iii", "nj", "soul", "m.\xF6", "\u03BA.\u03BA.\u03B5", "c.k", "simul", "pb", "c.u.r"];

// src/tokenizer.js
var sentenceEnd = new Set(Array.from("!?\u3002\u2026\u2026\u2025\uFF01\uFF1F\u3002\u22EF\u2026\u061F\u10FB!\u2026"));
var wordEndPunct = new Set(Array.from(`,;:\u201D\u2019'"\xBB\u300D)]}\u060C\u061B\u300B\u300F\u3015\uFF60\u3009\u300B\u3011\u3017\u3019\u301B\u2013\u2014`));
var wordStartPunct = new Set(Array.from(`'"\xA1\xBF\u300C\xAB\u201C\u201D\u2018({[\u300A\u300E\u3014\uFF5F\u3008\u300A\u3010\u3016\u3018\u301A\u2013\u2014\u201D`));
var numbers = new Set(Array.from("0123456789\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669\u0660"));
var customPunctuation = new Set(Array.from("!\"#$%&'()*+,-.:;<=>?@[]^_`{|}~"));
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
var abrvRegex = new RegExp(
  "(^|\\s)(" + abrvs_default.map(escapeRegex).join("|") + ")$",
  "i"
);
function endsInAbrv(text) {
  return abrvRegex.test(text.toLowerCase());
}
function sentences(text) {
  if (typeof text !== "string") {
    return [];
  }
  const parts = [];
  let currentS = "";
  let previousBreak = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (sentenceEnd.has(c)) {
      if (currentS.length > 0) {
        parts.push(currentS + c);
        currentS = "";
      } else if (parts.length > 0) {
        parts[parts.length - 1] += c;
      } else {
        currentS = c;
      }
    } else if (c === ".") {
      if (currentS.length === 0) {
        if (parts.length > 0) {
          parts[parts.length - 1] += c;
        } else {
          currentS = c;
        }
      } else if (currentS.length > 0 && numbers.has(currentS[currentS.length - 1])) {
        currentS += c;
      } else if (endsInAbrv(currentS)) {
        currentS += c;
      } else if (text.length > i + 1 && text[i + 1].trim().length !== 0) {
        currentS += c;
      } else {
        parts.push(currentS + c);
        currentS = "";
      }
    } else if (c === "\n") {
      if (previousBreak && currentS.length > 0) {
        parts.push(currentS);
        currentS = "";
      }
      if (!previousBreak && currentS.length > 0) {
        currentS += c;
      }
      previousBreak = true;
      continue;
    } else if (c === "\r") {
      continue;
    } else {
      currentS += c;
    }
    previousBreak = false;
  }
  if (currentS.length > 0) {
    parts.push(currentS);
  }
  const spaceRegex = /\s+/g;
  return parts.map((part) => part.replace(spaceRegex, " ").trim()).filter((part) => part.length > 0);
}
function words(text) {
  if (typeof text !== "string") {
    return [];
  }
  const multidot = /(\.{2,})$/;
  const spaceRegex = /\s+/g;
  let processedText = text;
  for (const sentenceEndP of sentenceEnd) {
    processedText = processedText.split(sentenceEndP).join(" " + sentenceEndP);
  }
  processedText = processedText.replace(spaceRegex, " ").trim();
  if (processedText.length === 0) {
    return [];
  }
  const whitespaceTokens = processedText.split(" ");
  const tokens = [];
  for (let t of whitespaceTokens) {
    const firstTok = [];
    const lastTok = [];
    let contFirst = true;
    while (contFirst) {
      contFirst = false;
      if (t.length > 0 && wordStartPunct.has(t[0])) {
        contFirst = true;
        firstTok.push(t[0]);
        t = t.slice(1);
      }
    }
    let contLast = true;
    while (contLast) {
      contLast = false;
      if (t.length > 0 && wordEndPunct.has(t[t.length - 1])) {
        contLast = true;
        lastTok.unshift(t[t.length - 1]);
        t = t.slice(0, -1);
      } else if (t.length > 1 && t[t.length - 1] === "." && wordEndPunct.has(t[t.length - 2])) {
        contLast = true;
        lastTok.unshift(t[t.length - 1]);
        lastTok.unshift(t[t.length - 2]);
        t = t.slice(0, -2);
      }
    }
    const dotsMatch = t.match(multidot);
    if (dotsMatch) {
      const dots = dotsMatch[1];
      lastTok.unshift(dots);
      t = t.slice(0, -dots.length);
    } else if (t.length > 0 && t[t.length - 1] === ".") {
      if (!endsInAbrv(t.slice(0, -1))) {
        t = t.slice(0, -1);
        lastTok.unshift(".");
      }
    }
    let tList;
    if ((t.includes("/") || t.includes("\\")) && !Array.from(t).some((x) => customPunctuation.has(x))) {
      t = t.replace(/\//g, " /").replace(/\\/g, " \\");
      tList = t.split(" ");
    } else {
      tList = [t];
    }
    tList = tList.filter((x) => x.length > 0);
    firstTok.push(...tList);
    firstTok.push(...lastTok);
    tokens.push(...firstTok);
  }
  return tokens.filter((tok) => tok.length > 0);
}
function tokenize(text) {
  const sents = sentences(text);
  return sents.map((s) => words(s));
}
var tokenizer = {
  sentences,
  words,
  tokenize
};
var tokenizer_default = tokenizer;

// src/cg3.js
var import_node_fs2 = require("node:fs");

// node_modules/@rueter/jscg3/src/tag.js
var WEIGHT_RE = /^<W:(-?[0-9]+(?:\.[0-9]+)?)>$/;
var ESCAPED_RE = /\\([\s\S])/g;
var ESCAPED_NOT_QUOTE_RE = /\\([^"\\])/g;
var PROP_RE = /\\{1,2}([pP])\{(\^?)([A-Za-z_]+)\}/g;
var SYNTAX_CHARS = "^$\\.*+?()[]{}|/";
function unescapeTag(raw) {
  if (!raw.includes("\\")) return raw;
  if (raw.startsWith("/") || raw.startsWith("~/") || raw.startsWith('r"') || raw.startsWith("r'")) return raw;
  const bare = raw.startsWith("!") ? raw.slice(1) : raw;
  if (bare.startsWith('"')) {
    const last = bare.lastIndexOf('"');
    if (last > 0 && bare.slice(last + 1).toLowerCase().includes("r")) return raw;
    return raw.replace(ESCAPED_NOT_QUOTE_RE, "$1");
  }
  return raw.replace(ESCAPED_RE, "$1");
}
function translatePattern(pattern) {
  let p = pattern.replace(PROP_RE, (_m, kind, neg, name) => "\\" + (kind === "P" !== (neg === "^") ? "P" : "p") + "{" + name + "}");
  p = p.replace(/\(\?P</g, "(?<").replace(/\(\?P=(\w+)\)/g, "\\k<$1>").replace(/\\Z/g, "$").replace(/\\A/g, "^");
  return p;
}
function sanitizeEscapes(p) {
  let out = "";
  let inClass = false;
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === "\\" && i + 1 < p.length) {
      const d = p[i + 1];
      i++;
      if (/[A-Za-z0-9]/.test(d) || SYNTAX_CHARS.includes(d) || d === "-" && inClass) out += "\\" + d;
      else out += d;
      continue;
    }
    if (c === "[") inClass = true;
    else if (c === "]") inClass = false;
    out += c;
  }
  return out;
}
var regexCache = /* @__PURE__ */ new Map();
function getCompiledRegex(pattern, ignoreCase = false) {
  const key = (ignoreCase ? "i" : "-") + pattern;
  if (regexCache.has(key)) return regexCache.get(key);
  let src = translatePattern(pattern);
  let ic = ignoreCase;
  if (src.startsWith("(?i)")) {
    src = src.slice(4);
    ic = true;
  }
  const attempts = [[src, "u"], [sanitizeEscapes(src), "u"], [src, ""]];
  let result = null;
  for (const [source, flags] of attempts) {
    try {
      const f = flags + (ic ? "i" : "");
      const search = new RegExp(source, f);
      const full = new RegExp("^(?:" + source + ")$", f);
      result = { search, full };
      break;
    } catch (e) {
    }
  }
  if (regexCache.size > 4096) regexCache.clear();
  regexCache.set(key, result);
  return result;
}
var CG3_HASH_SEED = 705577479;
function cg3Hash(text) {
  const n = text.length;
  if (n === 0) return 0;
  let h = CG3_HASH_SEED;
  let i = 0;
  for (let k = n >> 1; k > 0; k--) {
    h = h + text.charCodeAt(i) >>> 0;
    const tmp = (text.charCodeAt(i + 1) << 11 ^ h) >>> 0;
    h = (h << 16 ^ tmp) >>> 0;
    i += 2;
    h = h + (h >>> 11) >>> 0;
  }
  if (n & 1) {
    h = h + text.charCodeAt(i) >>> 0;
    h = (h ^ h << 11) >>> 0;
    h = h + (h >>> 17) >>> 0;
  }
  h = (h ^ h << 3) >>> 0;
  h = h + (h >>> 5) >>> 0;
  h = (h ^ h << 4) >>> 0;
  h = h + (h >>> 17) >>> 0;
  h = (h ^ h << 25) >>> 0;
  h = h + (h >>> 6) >>> 0;
  if (h === 0 || h === 4294967295 || h === 4294967294) h = CG3_HASH_SEED;
  return h;
}
function isWordform(tag) {
  return tag.startsWith('"<') && tag.endsWith('>"');
}
function isBaseform(tag) {
  return tag.startsWith('"') && tag.endsWith('"') && !(tag.startsWith('"<') && tag.endsWith('>"'));
}
function toNumber(text) {
  if (text.trim() === "") return NaN;
  return Number(text);
}
var TagPattern = class _TagPattern {
  constructor(raw) {
    raw = unescapeTag(raw);
    this.raw = raw;
    this.isAny = raw === "*" || raw === "(*)";
    this.isFailfast = raw.startsWith("!") && raw.length > 1;
    const patternStr = this.isFailfast ? raw.slice(1) : raw;
    this.isWordform = isWordform(patternStr);
    this.isBaseform = isBaseform(patternStr);
    this.isRegex = false;
    this.isCaseInsensitive = false;
    this.literal = patternStr;
    this._regex = null;
    this._full = null;
    this.lastMatch = null;
    this.numValue = null;
    const wm = WEIGHT_RE.exec(patternStr);
    if (wm) this.numValue = Number(wm[1]);
    this.regexKind = null;
    if (patternStr.startsWith('"') && patternStr.indexOf('"', 1) >= 0) {
      const lastQuote = patternStr.lastIndexOf('"');
      const flags = patternStr.slice(lastQuote + 1).toLowerCase();
      const inner = patternStr.slice(1, lastQuote);
      if (flags.includes("r")) {
        this.isRegex = true;
        if (flags.includes("i")) this.isCaseInsensitive = true;
        this.regexKind = inner.startsWith("<") && inner.endsWith(">") && inner.length > 1 ? "wordform" : "baseform";
        this._initRegex(inner, flags);
      } else if (flags.includes("i")) {
        this.isCaseInsensitive = true;
        this.literal = inner;
      } else {
        this.literal = patternStr;
      }
    } else if ((patternStr.startsWith("/") || patternStr.startsWith("~/")) && patternStr.indexOf("/", 2) >= 0) {
      const start = patternStr.startsWith("~/") ? 2 : 1;
      const lastSlash = patternStr.lastIndexOf("/");
      const flags = patternStr.slice(lastSlash + 1).toLowerCase();
      const inner = patternStr.slice(start, lastSlash);
      this.isRegex = true;
      if (flags.includes("i")) this.isCaseInsensitive = true;
      this._initRegex(inner, flags);
    } else if ((patternStr.startsWith('r"') || patternStr.startsWith("r'")) && (patternStr.endsWith('"') || patternStr.endsWith("'"))) {
      this.isRegex = true;
      this._initRegex(patternStr.slice(2, -1), "");
    }
  }
  _initRegex(inner, flagsStr) {
    const compiled = getCompiledRegex(inner, this.isCaseInsensitive || flagsStr.includes("i"));
    if (compiled === null) {
      this.isRegex = false;
      this._regex = null;
      this._full = null;
    } else {
      this._regex = compiled.search;
      this._full = compiled.full;
    }
  }
  /** Check if this pattern matches an individual tag string. */
  matchesTag(tag) {
    if (this.isAny) return true;
    if (this.numValue !== null && tag.startsWith("<W:") && tag.endsWith(">")) {
      if (toNumber(tag.slice(3, -1)) === this.numValue) return true;
    }
    if (this.isRegex && this._regex !== null) {
      if (this.regexKind === "wordform" && !isWordform(tag)) return false;
      if (this.regexKind === "baseform" && !isBaseform(tag)) return false;
      if (this.regexKind !== null) {
        const m2 = this._full.exec(tag.slice(1, -1));
        if (m2) {
          this.lastMatch = m2;
          return true;
        }
        return false;
      }
      let m = this._regex.exec(tag);
      if (!m && tag.startsWith('"') && tag.endsWith('"')) m = this._regex.exec(tag.slice(1, -1));
      if (m) {
        this.lastMatch = m;
        return true;
      }
      return false;
    }
    if (this.isCaseInsensitive) {
      const target = tag.startsWith('"') && tag.endsWith('"') ? tag.slice(1, -1) : tag;
      return target.toLowerCase() === this.literal.toLowerCase() || tag.toLowerCase() === this.raw.toLowerCase();
    }
    return this.raw === tag;
  }
  equals(other) {
    if (other instanceof _TagPattern) return this.raw === other.raw;
    if (typeof other === "string") return this.raw === other;
    return false;
  }
  toString() {
    return `TagPattern(${this.raw})`;
  }
};

// node_modules/@rueter/jscg3/src/cohort.js
var Reading = class _Reading {
  constructor(baseform = "", tags = null, parentCohort = null) {
    this.baseform = baseform;
    this.tags = tags !== null ? [...tags] : [];
    this.tagSet = new Set(this.tags);
    this.subReadings = [];
    this.deleted = false;
    this.changed = false;
    this.trace = [];
    this.parentCohort = parentCohort;
    this.mappingTags = /* @__PURE__ */ new Set();
    this.id = null;
    this.parentId = null;
    this.relName = null;
    this.matchCache = null;
    this.mapped = false;
    this.number = -1;
    for (const t of this.tags) {
      if (t.startsWith("#") && t.includes("->")) {
        const parts = t.slice(1).split("->");
        const id = parsePyInt(parts[0]);
        if (id === null) continue;
        this.id = id;
        const colon = parts[1].indexOf(":");
        if (colon >= 0) {
          const pid = parsePyInt(parts[1].slice(0, colon));
          if (pid === null) continue;
          this.parentId = pid;
          this.relName = parts[1].slice(colon + 1);
        } else {
          const pid = parsePyInt(parts[1]);
          if (pid !== null) this.parentId = pid;
        }
      }
    }
  }
  /** Add a tag to the reading if not already present. */
  addTag(tag, mappingPrefix = "@") {
    if (!this.tagSet.has(tag)) {
      this.matchCache = null;
      this.tags.push(tag);
      this.tagSet.add(tag);
      if (tag.startsWith(mappingPrefix)) this.mappingTags.add(tag);
      this.changed = true;
    }
  }
  /** Remove a tag from the reading. */
  removeTag(tag) {
    if (this.tagSet.has(tag)) {
      this.matchCache = null;
      this.tags = this.tags.filter((t) => t !== tag);
      this.tagSet.delete(tag);
      this.mappingTags.delete(tag);
      this.changed = true;
    }
  }
  /** Replace oldTag with one or more newTags in-place. */
  replaceTag(oldTag, newTags, mappingPrefix = "@") {
    if (!this.tagSet.has(oldTag)) return;
    this.matchCache = null;
    const out = [];
    let replaced = false;
    for (const t of this.tags) {
      if (t === oldTag && !replaced) {
        out.push(...newTags);
        replaced = true;
      } else if (t !== oldTag) {
        out.push(t);
      }
    }
    this.tags = out;
    this.tagSet = new Set(out);
    this.mappingTags = new Set(out.filter((t) => t.startsWith(mappingPrefix)));
    this.changed = true;
  }
  /** What makes two readings the same: base form and tag set (order does not matter), sub-readings in order. */
  identity() {
    return JSON.stringify([this.baseform, [...new Set(this.tags)].sort(), this.subReadings.map((s) => s.identity())]);
  }
  /** The sub-readings in the order the stream lists them (1 = the first line below this reading). */
  subChain() {
    const out = [];
    const stack = [...this.subReadings].reverse();
    while (stack.length) {
      const r = stack.pop();
      out.push(r);
      for (const s of [...r.subReadings].reverse()) stack.push(s);
    }
    return out;
  }
  /** Sub-reading n as vislcg3 numbers them: 1, 2, ... from the first, -1, -2, ... from the last, 0 = this reading. */
  subReading(n) {
    if (n === 0) return this;
    const chain = this.subChain();
    if (n > 0) return n <= chain.length ? chain[n - 1] : null;
    return -n <= chain.length ? chain[chain.length + n] : null;
  }
  /** Check if reading contains exact tag. */
  hasTag(tag) {
    return this.tagSet.has(tag) || tag === this.baseform;
  }
  /** Every tag a set can match on this reading, base form and word form included (cached). */
  matchSet() {
    if (this.matchCache === null) this.matchCache = new Set(this.allTags());
    return this.matchCache;
  }
  /** All tags including baseform and wordform. */
  allTags() {
    const res = [];
    if (this.baseform) res.push(this.baseform);
    res.push(...this.tags);
    if (this.parentCohort && this.parentCohort.wordform) res.push(this.parentCohort.wordform);
    if (this.parentCohort && this.parentCohort.isEnd) res.push("<<<");
    return res;
  }
  /** Format reading as VISL CG-3 text line(s). */
  toText({ indent = "	", showRules = false, trace = false, dep = "" } = {}) {
    const parts = [];
    if (this.baseform) parts.push(this.baseform);
    parts.push(...this.tags.filter((t) => t !== "<<<" && t !== ">>>"));
    if (dep) parts.push(dep);
    let line = indent + parts.join(" ");
    if (showRules && this.changed) line += " <<<";
    if (trace && this.trace.length) line += " " + this.trace.join(" ");
    const lines = [line];
    for (const sub of this.subReadings) lines.push(sub.toText({ indent: indent + "	", showRules, trace, dep }));
    return lines.join("\n");
  }
  /** Deep copy reading for cohort operations. */
  clone(parentCohort = null) {
    const nr = new _Reading(this.baseform, [...this.tags], parentCohort);
    nr.deleted = this.deleted;
    nr.changed = this.changed;
    nr.trace = [...this.trace];
    nr.mappingTags = new Set(this.mappingTags);
    nr.id = this.id;
    nr.parentId = this.parentId;
    nr.relName = this.relName;
    nr.mapped = this.mapped;
    nr.number = this.number;
    nr.subReadings = this.subReadings.map((s) => s.clone(parentCohort));
    return nr;
  }
  toString() {
    return `Reading(${this.baseform} ${this.tags.join(" ")})`;
  }
};
function parsePyInt(text) {
  const t = text.trim();
  return /^[+-]?\d+$/.test(t) ? parseInt(t, 10) : null;
}
function plainKey(r) {
  const tags = [...new Set(r.tags.filter((t) => !r.mappingTags.has(t)))].sort();
  return [r.baseform, tags, r.subReadings.map(plainKey)];
}
function hasMapping(r) {
  return r.mappingTags.size > 0 || r.subReadings.some(hasMapping);
}
function mergeMappedReadings(readings, withTrace = false) {
  const groups = /* @__PURE__ */ new Map();
  for (const r of readings) {
    const key = JSON.stringify([plainKey(r), withTrace ? r.trace : [], hasMapping(r)]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  if (groups.size === readings.length) return [...readings];
  const out = [];
  for (const members of groups.values()) {
    const first = members[0];
    const nr = first.clone(first.parentCohort);
    const maps = [];
    for (const m of members) {
      for (const t of m.tags) if (m.mappingTags.has(t) && !maps.includes(t)) maps.push(t);
    }
    nr.tags = [...first.tags.filter((t) => !first.mappingTags.has(t)), ...maps];
    nr.tagSet = new Set(nr.tags);
    nr.mappingTags = new Set(maps);
    nr.matchCache = null;
    out.push(nr);
  }
  return out;
}
var Cohort = class _Cohort {
  constructor({ wordform = "", untouchableTags = null, textBefore = null, lineNumber = 0, globalNumber = 0, parentWindow = null } = {}) {
    this.wordform = wordform;
    this.untouchableTags = untouchableTags !== null ? [...untouchableTags] : [];
    this.readings = [];
    this.deletedReadings = [];
    this.textBefore = textBefore !== null ? [...textBefore] : [];
    this.lineNumber = lineNumber;
    this.globalNumber = globalNumber;
    this.parentWindow = parentWindow;
    this.wread = null;
    this.nextNumber = 0;
    this.isEnd = false;
    this.depParent = null;
    this.depChildren = [];
    this.relations = /* @__PURE__ */ new Map();
    this.related = false;
    this.relIn = null;
    this.depIn = null;
  }
  /** Append a reading to this cohort. */
  appendReading(reading) {
    reading.parentCohort = this;
    if (reading.number < 0) reading.number = this.nextNumber;
    this.nextNumber = Math.max(this.nextNumber, reading.number + 1);
    this.readings.push(reading);
  }
  /**
   * A reading with several mapping tags becomes one reading per mapping tag (vislcg3 does this to every
   * cohort before it runs the next rule, so after a MAP (@A @B) the two are separate readings).
   */
  splitMappings(mappingPrefix = "@") {
    if (!this.readings.some((r) => r.mappingTags.size > 1)) return false;
    const out = [];
    for (const r of this.readings) {
      const mapping = r.tags.filter((t) => t.startsWith(mappingPrefix));
      if (mapping.length > 1) {
        const base = r.tags.filter((t) => !t.startsWith(mappingPrefix));
        for (const mt of mapping) {
          const nr = new Reading(r.baseform, [...base, mt], this);
          nr.number = r.number;
          nr.deleted = r.deleted;
          nr.changed = r.changed;
          nr.trace = [...r.trace];
          nr.subReadings = r.subReadings.map((x) => x.clone(this));
          nr.mappingTags = /* @__PURE__ */ new Set([mt]);
          nr.mapped = true;
          out.push(nr);
        }
      } else {
        out.push(r);
      }
    }
    this.readings = out;
    return true;
  }
  addRelation(name, target) {
    if (!this.relations.has(name)) this.relations.set(name, []);
    const ids = this.relations.get(name);
    if (ids.includes(target)) return false;
    ids.push(target);
    ids.sort((a, b) => a - b);
    return true;
  }
  setRelation(name, target) {
    const ids = this.relations.get(name) || [];
    if (!this.relations.has(name)) this.relations.set(name, ids);
    if (ids.length === 1 && ids[0] === target) return false;
    this.relations.set(name, [target]);
    return true;
  }
  remRelation(name, target) {
    const ids = this.relations.get(name);
    const at = ids ? ids.indexOf(target) : -1;
    if (at < 0) return false;
    ids.splice(at, 1);
    return true;
  }
  /** ID:n R:name:m ... as vislcg3 prints them: the names in the order of their hashes. */
  relationText() {
    if (!this.related) return "";
    const parts = [`ID:${this.globalNumber}`];
    const names = [...this.relations.keys()].sort((a, b) => cg3Hash(a) - cg3Hash(b));
    for (const name of names) for (const target of this.relations.get(name)) parts.push(`R:${name}:${target}`);
    return parts.join(" ");
  }
  /** The readings in the order vislcg3 prints them (see removeReading for why that is not this.readings). */
  orderedReadings() {
    return [...this.readings].sort((a, b) => a.number - b.number);
  }
  /**
   * Drop later readings that have the same base form and the same set of tags as an earlier one
   * (vislcg3 does this silently, on input and after a rule has changed a reading). With -t the rules
   * that hit a reading are part of what it is, so readings with different traces stay apart.
   */
  dedupeReadings(withTrace = false) {
    const seen = /* @__PURE__ */ new Set();
    const keep = [];
    for (const r of this.readings) {
      const key = r.identity() + "\0" + (withTrace ? JSON.stringify(r.trace) : "");
      if (seen.has(key) && !r.deleted) continue;
      seen.add(key);
      keep.push(r);
    }
    let changed = keep.length !== this.readings.length;
    this.readings = keep;
    if (this.deletedReadings.length > 1) {
      const seenDel = /* @__PURE__ */ new Set();
      const keptDel = [];
      for (const r of this.deletedReadings) {
        const key = r.identity() + "\0" + (withTrace ? JSON.stringify(r.trace) : "");
        if (seenDel.has(key)) {
          changed = true;
          continue;
        }
        seenDel.add(key);
        keptDel.push(r);
      }
      this.deletedReadings = keptDel;
    }
    return changed;
  }
  /** Active (non-deleted) readings. */
  activeReadings() {
    return this.readings.filter((r) => !r.deleted);
  }
  /** Select this reading, removing all other non-matching readings. */
  selectReading(reading, ruleName = "") {
    for (const r of this.readings) {
      if (r !== reading && !r.deleted) {
        r.deleted = true;
        r.changed = true;
        if (ruleName) r.trace.push(ruleName);
        this.deletedReadings.push(r);
      }
    }
    this.readings = [reading];
    reading.changed = true;
    if (ruleName) reading.trace.push(ruleName);
  }
  /** Remove a reading. */
  removeReading(reading, ruleName = "") {
    if (reading.deleted) return;
    reading.deleted = true;
    reading.changed = true;
    if (ruleName) reading.trace.push(ruleName);
    this.deletedReadings.push(reading);
    for (let i = 0; i < this.readings.length; i++) {
      if (this.readings[i] === reading) {
        const last = this.readings.pop();
        if (i < this.readings.length) this.readings[i] = last;
        break;
      }
    }
  }
  /** Format cohort into VISL CG-3 stream format. */
  toText({ showRules = false, trace = false, pipeDeleted = false, dep = "" } = {}) {
    const out = [];
    if (this.textBefore.length) out.push(...this.textBefore);
    let header = this.wordform;
    if (this.untouchableTags.length) header += " " + this.untouchableTags.join(" ");
    out.push(header);
    for (const r of mergeMappedReadings(this.orderedReadings(), trace)) out.push(r.toText({ showRules, trace, dep }));
    if (pipeDeleted) {
      for (const r of [...this.deletedReadings].sort((a, b) => a.number - b.number)) {
        for (const ln of r.toText({ showRules, trace }).split("\n")) out.push(";" + ln);
      }
    }
    return out.join("\n");
  }
  /** Deep copy cohort. */
  clone(parentWindow = null) {
    const nc = new _Cohort({
      wordform: this.wordform,
      untouchableTags: this.untouchableTags,
      textBefore: this.textBefore,
      lineNumber: this.lineNumber,
      globalNumber: this.globalNumber,
      parentWindow
    });
    for (const r of this.readings) nc.appendReading(r.clone(nc));
    nc.deletedReadings = this.deletedReadings.map((r) => r.clone(nc));
    return nc;
  }
  toString() {
    return `Cohort(${this.wordform}, ${this.readings.length} readings)`;
  }
};
var SingleWindow = class {
  constructor(cohorts = null) {
    this.hasDep = false;
    this.number = 0;
    this.depPrint = null;
    this.depSpanned = false;
    this.previous = null;
    this.next = null;
    this.cohorts = cohorts !== null ? [...cohorts] : [];
    this.textAfter = [];
    this.variables = /* @__PURE__ */ new Map();
    this.flushAfter = false;
    this.begin = this._edge(">>>");
    for (const c of this.cohorts) c.parentWindow = this;
  }
  _edge(tag) {
    const c = new Cohort({ wordform: "", parentWindow: this });
    c.appendReading(new Reading("", [tag]));
    return c;
  }
  /** The last cohort of the window gets the tag <<< (for matching only), as vislcg3 does. */
  markEnd() {
    for (const c of this.cohorts) {
      if (c.isEnd) {
        c.isEnd = false;
        for (const r of c.readings) r.matchCache = null;
      }
    }
    if (this.cohorts.length) {
      const last = this.cohorts[this.cohorts.length - 1];
      last.isEnd = true;
      for (const r of last.readings) r.matchCache = null;
    }
  }
  /** The number of cohorts vislcg3 sees in the window: the begin cohort and the real ones. */
  get size() {
    return this.cohorts.length + 1;
  }
  /** This window and the ones linked to it, from the first to the last. */
  *chain() {
    let w = this;
    while (w.previous !== null) w = w.previous;
    for (; w !== null; w = w.next) yield w;
  }
  /** Cohort at virtual index vi: 0 is the begin cohort, 1..n the real cohorts. */
  virtual(vi) {
    return vi === 0 ? this.begin : this.cohorts[vi - 1];
  }
  /** The virtual index of a cohort: 0 for the begin cohort, 1..n for the real ones (vislcg3's dependency numbers). */
  indexOf(cohort) {
    if (cohort === this.begin) return 0;
    for (let k = 0; k < this.cohorts.length; k++) if (this.cohorts[k] === cohort) return k + 1;
    return -1;
  }
  appendCohort(cohort) {
    cohort.parentWindow = this;
    this.cohorts.push(cohort);
  }
  /**
   * ID:n and R:name:m of the input: relationMap takes an input id to the cohort that carried it; relations to ids
   * not seen (yet) are dropped.
   */
  resolveInputRelations(relationMap) {
    for (const c of this.cohorts) if (c.relIn !== null && c.relIn[0]) relationMap.set(c.relIn[0], c);
    for (const c of this.cohorts) {
      if (c.relIn === null) continue;
      c.related = true;
      for (const [name, targets] of c.relIn[1]) {
        for (const t of [...targets].sort((a, b) => a - b)) {
          const other = relationMap.get(t);
          if (other !== void 0) c.addRelation(name, other.globalNumber);
        }
      }
    }
  }
  /**
   * The #n->m of the input become real links. n and m count the cohorts as the input numbered them (it may restart
   * in every window, or a repeated n starts a new numbering); a parent that does not exist leaves the cohort without
   * one, and 0 is the root (vislcg3's reflowDependencyWindow).
   */
  resolveInputDependencies() {
    const pending = [];
    let numbering = /* @__PURE__ */ new Map();
    const byIndex = (a, b) => this.indexOf(a) - this.indexOf(b);
    const flush = () => {
      numbering.set(0, this.begin);
      for (const c of pending) {
        const [own, parent] = c.depIn;
        if (own === parent) continue;
        const target = numbering.get(parent);
        if (target === void 0 || target === c) continue;
        c.depParent = target;
        target.depChildren.push(c);
      }
      for (const c of pending) c.depChildren.sort(byIndex);
      this.begin.depChildren.sort(byIndex);
      pending.length = 0;
      numbering = /* @__PURE__ */ new Map();
    };
    for (const c of this.cohorts) {
      if (c.depIn === null) continue;
      this.hasDep = true;
      if (numbering.has(c.depIn[0])) flush();
      numbering.set(c.depIn[0], c);
      pending.push(c);
    }
    if (pending.length) flush();
  }
  /**
   * deps: print #self->parent on every reading (vislcg3 does once a dependency rule has attached anything);
   * null/undefined means: if this window has an attachment.
   */
  toText({ showRules = false, trace = false, pipeDeleted = false, deps = null } = {}) {
    if (deps === null || deps === void 0) deps = this.depPrint !== null ? this.depPrint : this.hasDep;
    const lines = [];
    this.cohorts.forEach((c, k) => {
      let dep = "";
      if (deps) {
        let parent = c.depParent;
        if (parent !== null && parent.parentWindow !== null && parent.parentWindow.number < this.number) {
          parent = null;
        }
        if (this.depSpanned) {
          const pw = parent !== null && parent.parentWindow !== null ? parent.parentWindow : this;
          const pk = parent !== null ? pw.indexOf(parent) : k + 1;
          const pad = (n) => String(n).padStart(3, "0");
          dep = `#${this.number}${pad(k + 1)}->${parent !== null ? pw.number : this.number}${pad(pk)}`;
        } else {
          dep = `#${k + 1}->${parent !== null ? this.indexOf(parent) : k + 1}`;
        }
      }
      const rel = c.relationText();
      if (rel) dep = dep ? `${dep} ${rel}` : rel;
      lines.push(c.toText({ showRules, trace, pipeDeleted, dep }));
    });
    if (this.textAfter.length) lines.push(...this.textAfter);
    return lines.join("\n");
  }
};

// node_modules/@rueter/jscg3/src/set_def.js
function isLiteral(p) {
  return !(p.isAny || p.isRegex || p.isCaseInsensitive || p.isFailfast || p.numValue !== null);
}
function patternMatches(p, have) {
  if (p.isAny) return true;
  if (isLiteral(p)) return have.has(p.raw);
  for (const t of have) if (p.matchesTag(t)) return true;
  return false;
}
var CompositeTag = class {
  constructor(elements) {
    this.elements = elements;
    this._lits = new Set(elements.filter((e) => isLiteral(e)).map((e) => e.raw));
    this._pats = elements.filter((e) => !isLiteral(e));
  }
  matchesReading(reading) {
    const have = reading.matchSet();
    for (const l of this._lits) if (!have.has(l)) return false;
    for (const p of this._pats) if (!patternMatches(p, have)) return false;
    return true;
  }
  toString() {
    return `CompositeTag(${this.elements.map((e) => e.raw).join(" ")})`;
  }
};
var unifState = null;
function getUnif() {
  return unifState;
}
function setUnif(value) {
  unifState = value;
}
function sameItem(a, b) {
  return a === b || a instanceof TagPattern && b instanceof TagPattern && a.raw === b.raw;
}
var UnifySet = class {
  constructor(name, kind, registry) {
    this.name = name;
    this.kind = kind;
    this.registry = registry;
  }
  matchesReading(reading) {
    const target = this.registry.get(this.name);
    const unif = getUnif();
    if (unif === null || !target.items.length) return target.matchesReading(reading);
    const have = reading.matchSet();
    const hits = [];
    for (const item of target.items) {
      if (item instanceof CompositeTag) {
        if (item.matchesReading(reading)) hits.push(item);
      } else if (patternMatches(item, have)) {
        hits.push(item);
      }
    }
    if (!hits.length) return false;
    const key = this.kind + this.name;
    const bound = unif.get(key);
    if (bound === void 0) {
      unif.set(key, hits);
      return true;
    }
    const both = hits.filter((h) => bound.some((b) => sameItem(h, b)));
    if (!both.length) return false;
    unif.set(key, both);
    return true;
  }
  toString() {
    return `${this.kind}${this.name}`;
  }
};
var SetDefinition = class _SetDefinition {
  constructor(name = "", lineNumber = 0, isOrdered = false, registry = null) {
    this.name = name;
    this.lineNumber = lineNumber;
    this.isOrdered = isOrdered;
    this.items = [];
    this.groups = [];
    this.registry = registry !== null ? registry : /* @__PURE__ */ new Map();
  }
  isEmpty() {
    return !this.items.length && !this.groups.length;
  }
  addItem(item) {
    this.items.push(item);
  }
  _resolve(operand) {
    if (operand instanceof _SetDefinition || operand instanceof UnifySet) return operand;
    const found = this.registry.get(operand);
    if (found === void 0) {
      throw new Error(`Undefined set ${JSON.stringify(operand)} (used in ${this.name ? JSON.stringify(this.name) : "an inline set"})`);
    }
    return found;
  }
  matchesReading(reading) {
    if (this.groups.length) {
      for (const group of this.groups) {
        let res = this._resolve(group[0][1]).matchesReading(reading);
        for (let k = 1; k < group.length; k++) {
          const [op, operand] = group[k];
          const other = this._resolve(operand).matchesReading(reading);
          if (op === "and") res = res && other;
          else if (op === "minus") res = res && !other;
          else if (op === "xor") res = res !== other;
        }
        if (res) return true;
      }
      return false;
    }
    const have = reading.matchSet();
    for (const item of this.items) {
      if (item instanceof CompositeTag) {
        if (item.matchesReading(reading)) return true;
      } else if (patternMatches(item, have)) {
        return true;
      }
    }
    return false;
  }
  /** At least one active reading matches. */
  matchesCohortNormal(cohort) {
    for (const r of cohort.readings) if (!r.deleted && this.matchesReading(r)) return true;
    return false;
  }
  /** Every active reading matches. */
  matchesCohortCareful(cohort) {
    let seen = false;
    for (const r of cohort.readings) {
      if (r.deleted) continue;
      seen = true;
      if (!this.matchesReading(r)) return false;
    }
    return seen;
  }
  toString() {
    return `SetDefinition(${this.name}, items=${this.items.length}, groups=${this.groups.length})`;
  }
};

// node_modules/@rueter/jscg3/src/context.js
var TRV_BREAK = 1;
var TRV_BARRIER = 2;
var TRV_BREAK_DEFAULT = 4;
var Ctx = class {
  constructor(test = null, not = false, inBarrier = false, window2 = null, index = 0) {
    this.test = test;
    this.not = not;
    this.matchedTarget = false;
    this.matchedTests = false;
    this.didTest = false;
    this.inBarrier = inBarrier;
    this.window = window2;
    this.index = index;
    this.rejected = false;
  }
};
var ContextualTest = class {
  constructor({
    target,
    offset = 0,
    scanFirst = false,
    scanAll = false,
    careful = false,
    not = false,
    negate = false,
    absolute = false,
    self = false,
    noBarrier = false,
    all = false,
    none = false,
    barrier = null,
    cbarrier = null,
    linkedTest = null,
    rawPos = "",
    sub = null,
    dep = null,
    attach = false,
    relation = null,
    spanLeft = false,
    spanRight = false,
    spanBoth = false
  }) {
    this.spanLeft = spanLeft;
    this.spanRight = spanRight;
    this.spanBoth = spanBoth;
    this.relation = relation;
    this.dep = dep;
    this.attach = attach;
    this.target = target;
    this.offset = offset;
    this.scanFirst = scanFirst;
    this.scanAll = scanAll;
    this.careful = careful;
    this.not = not;
    this.negate = negate;
    this.absolute = absolute;
    this.self = self;
    this.noBarrier = noBarrier;
    this.all = all;
    this.none = none;
    this.barrier = barrier;
    this.cbarrier = cbarrier;
    this.linkedTest = linkedTest;
    this.rawPos = rawPos;
    this.sub = sub;
    this.ors = [];
  }
  get isScan() {
    return this.scanFirst || this.scanAll;
  }
  /** True if the test holds for the real cohort at window.cohorts[cohortIdx]. */
  evaluate(window2, cohortIdx) {
    return runContextualTest(window2, cohortIdx + 1, this);
  }
  toString() {
    return `(${this.negate ? "NEGATE " : ""}${this.not ? "NOT " : ""}${this.rawPos})`;
  }
};
var AttachState = class {
  constructor(window2, cohort, asChild = true, allowLoop = false, allowCross = false, blockCrossing = false, blockLoops = true, check = true) {
    this.window = window2;
    this.cohort = cohort;
    this.asChild = asChild;
    this.allowLoop = allowLoop || !blockLoops;
    this.allowCross = allowCross;
    this.blockCrossing = blockCrossing;
    this.blockLoops = blockLoops;
    this.check = check;
    this.marked = null;
    this.final = null;
    this.matched = false;
    this.rejections = 0;
  }
  /** wouldParentChildCross, quirks included: it only looks at the parent's parent and what that one hangs on. */
  _crosses(parent, child) {
    const a = this.window.indexOf(parent);
    const b = this.window.indexOf(child);
    if (a < 0 || b < 0) return false;
    const mn = Math.min(a, b);
    const mx = Math.max(a, b);
    if (mx - mn < 2) return false;
    const grand = parent.depParent;
    if (grand !== null && grand.depParent !== null) {
      const top = this.window.indexOf(grand.depParent);
      if (top < mn || top > mx) return true;
    }
    return false;
  }
  valid(other) {
    if (!this.check) return true;
    if (other === this.cohort || other.parentWindow === null) return false;
    const [child, parent] = this.asChild ? [this.cohort, other] : [other, this.cohort];
    if (!this.allowLoop && child.depParent !== parent) {
      let node = parent;
      const seen = /* @__PURE__ */ new Set();
      while (node !== null && !seen.has(node)) {
        if (node === child) return false;
        seen.add(node);
        node = node.depParent;
      }
    }
    if (this.blockCrossing && !this.allowCross && this._crosses(parent, child)) return false;
    return true;
  }
};
var ATTACH = null;
var SEEN_BARRIER = false;
var ALWAYS_SPAN = false;
function resetSeenBarrier() {
  SEEN_BARRIER = false;
}
function seenBarrier() {
  return SEEN_BARRIER;
}
function setAlwaysSpan(flag) {
  ALWAYS_SPAN = Boolean(flag);
}
function orderKey(cohort) {
  const w = cohort.parentWindow;
  return w !== null ? [w.number, w.indexOf(cohort)] : [0, -1];
}
function byOrder(a, b) {
  const [aw, ai] = orderKey(a);
  const [bw, bi] = orderKey(b);
  return aw - bw || ai - bi;
}
function setAttach(state) {
  ATTACH = state;
}
function testLinked(window2, index, ctx) {
  const linked = ctx.test !== null ? ctx.test.linkedTest : null;
  if (linked === null) {
    const att = ATTACH;
    if (att !== null && ctx.test !== null && !ctx.inBarrier) {
      const cand = att.marked !== null ? att.marked : window2.virtual(index);
      att.matched = true;
      if (!att.valid(cand)) {
        att.rejections++;
        return false;
      }
      att.final = cand;
    }
    return true;
  }
  if (!ctx.didTest) {
    ctx.matchedTests = runContextualTest(window2, index, linked);
    ctx.didTest = true;
  }
  return ctx.matchedTests;
}
function helper(window2, index, reading, target, ctx) {
  let ret = false;
  let anySub = false;
  if (ctx !== null && ctx.test !== null && ctx.test.sub !== null && !ctx.inBarrier) {
    if (ctx.test.sub === "*") anySub = reading !== null;
    else if (reading !== null) reading = reading.subReading(ctx.test.sub);
  }
  let hit;
  if (anySub) hit = target.matchesReading(reading) || reading.subChain().some((r) => target.matchesReading(r));
  else hit = reading !== null && target.matchesReading(reading);
  if (hit) {
    ret = true;
    if (ctx !== null) ctx.matchedTarget = true;
  }
  if (ret && ctx !== null && ctx.not) ret = !ret;
  const att = ATTACH;
  const live = att !== null && ctx !== null && ctx.test !== null && !ctx.inBarrier;
  if (ret && live && ctx.test.attach) att.marked = window2.virtual(index);
  if (ret && ctx !== null && !ctx.inBarrier) {
    const before = live ? att.rejections : 0;
    ret = testLinked(window2, index, ctx);
    if (!ret && live && (att.rejections !== before || ctx.rejected)) {
      ctx.matchedTarget = false;
      ctx.rejected = true;
    }
  }
  return ret;
}
function wread(cohort) {
  if (cohort.wread === null) cohort.wread = new Reading("", [...cohort.untouchableTags], cohort);
  return cohort.wread;
}
function matchNormal(window2, index, target, ctx) {
  const cohort = window2.virtual(index);
  let ret = false;
  if (cohort.untouchableTags.length && !ctx.inBarrier) {
    ret = helper(window2, index, wread(cohort), target, ctx);
    if (ret && ctx.didTest) return ret;
  }
  for (const reading of cohort.readings) {
    if (reading.deleted) continue;
    if (helper(window2, index, reading, target, ctx)) ret = true;
    if (ret && (ctx.test === null || ctx.test.linkedTest === null || ctx.didTest)) return ret;
  }
  if (!ctx.matchedTarget && ctx.not) ret = testLinked(window2, index, ctx);
  return ret;
}
function matchCareful(window2, index, target, ctx) {
  const cohort = window2.virtual(index);
  let ret = false;
  for (const reading of cohort.readings) {
    if (reading.deleted) continue;
    ret = helper(window2, index, reading, target, ctx);
    if (!ret) break;
  }
  if (!ctx.matchedTarget && ctx.not) ret = testLinked(window2, index, ctx);
  return ret;
}
function single(window2, index, test, rvs) {
  if (index < 0 || index > window2.cohorts.length) return [null, false, rvs | TRV_BREAK];
  const ctx = new Ctx(test, test.not, false, window2, index);
  let ret;
  if (test.careful) {
    ret = matchCareful(window2, index, test.target, ctx);
    if (!ctx.matchedTarget && test.scanFirst) {
      ctx.didTest = true;
      matchNormal(window2, index, test.target, ctx);
    }
  } else {
    ret = matchNormal(window2, index, test.target, ctx);
  }
  if (ctx.matchedTarget && test.scanFirst) rvs |= TRV_BREAK;
  else if (!(test.scanAll || test.scanFirst)) rvs |= TRV_BREAK | TRV_BREAK_DEFAULT;
  const broken = Boolean(rvs & TRV_BREAK);
  if (test.barrier !== null) {
    const bctx = new Ctx(null, test.not, true, window2, index);
    if (matchNormal(window2, index, test.barrier, bctx)) {
      SEEN_BARRIER = true;
      rvs |= TRV_BREAK | TRV_BARRIER;
      rvs &= ~TRV_BREAK_DEFAULT;
    }
  }
  if (test.cbarrier !== null) {
    const bctx = new Ctx(null, test.not, true, window2, index);
    if (matchCareful(window2, index, test.cbarrier, bctx)) {
      SEEN_BARRIER = true;
      rvs |= TRV_BREAK | TRV_BARRIER;
      rvs &= ~TRV_BREAK_DEFAULT;
    }
  }
  if (ctx.matchedTarget && ret) rvs |= TRV_BREAK;
  if (!broken && rvs & TRV_BARRIER && test.self && test.noBarrier) rvs &= ~(TRV_BREAK | TRV_BARRIER);
  return [index, ret, rvs];
}
function depCandidates(cohort, kind, test = null, window2 = null) {
  if (kind === "r") {
    const ids = [];
    for (const [name, targets] of cohort.relations) {
      if (test.relation === "*" || name === test.relation) {
        for (const t of targets) if (!ids.includes(t)) ids.push(t);
      }
    }
    const byNumber = /* @__PURE__ */ new Map();
    for (const w of window2.chain()) {
      byNumber.set(w.begin.globalNumber, w.begin);
      for (const c of w.cohorts) byNumber.set(c.globalNumber, c);
    }
    return ids.filter((t) => byNumber.has(t)).map((t) => byNumber.get(t));
  }
  if (kind === "p") return cohort.depParent !== null ? [cohort.depParent] : [];
  if (kind === "c") return [...cohort.depChildren];
  if (kind === "s") {
    const parent = cohort.depParent;
    return parent !== null ? parent.depChildren.filter((c) => c !== cohort) : [];
  }
  if (kind === "pp") {
    const out2 = [];
    let node = cohort.depParent;
    while (node !== null && !out2.includes(node)) {
      out2.push(node);
      node = node.depParent;
    }
    return out2;
  }
  const out = [];
  const stack = [...cohort.depChildren].reverse();
  while (stack.length) {
    const node = stack.pop();
    if (!out.includes(node)) {
      out.push(node);
      for (const c of [...node.depChildren].reverse()) stack.push(c);
    }
  }
  return out;
}
function runDepTest(window2, position, test) {
  if (position < 0 || position > window2.cohorts.length) return Boolean(test.none) !== Boolean(test.negate);
  const candidates = depCandidates(window2.virtual(position), test.dep, test, window2);
  let matched = 0;
  let good = 0;
  for (const cand of candidates) {
    const idx = window2.indexOf(cand);
    if (idx < 0) continue;
    const ret = single(window2, idx, test, 0)[1];
    if (ret) {
      matched++;
      if (!(test.all || test.none)) break;
    } else {
      good = 1;
      if (test.all) break;
    }
  }
  let retval;
  if (test.none) retval = matched === 0;
  else if (test.all) retval = candidates.length > 0 && !good && matched === candidates.length;
  else {
    retval = matched > 0;
    if (!candidates.length && test.not && test.linkedTest === null) retval = true;
  }
  return test.negate ? !retval : retval;
}
function cohortInWindow(window2, position, test) {
  let pos = position + test.offset;
  if (test.absolute && (test.spanLeft || test.spanRight)) {
    if (window2.previous !== null && test.spanLeft) window2 = window2.previous;
    else if (window2.next !== null && test.spanRight) window2 = window2.next;
    else return [window2, pos, null];
  }
  if (test.absolute) pos = test.offset < 0 ? window2.size + test.offset : test.offset;
  if (pos >= 0) {
    if (pos >= window2.size && (test.spanRight || test.spanBoth) && window2.next !== null) {
      window2 = window2.next;
      pos = 0;
    }
  } else if ((test.spanLeft || test.spanBoth) && window2.previous !== null) {
    window2 = window2.previous;
    pos = window2.size - 1;
  }
  return [window2, pos, pos >= 0 && pos < window2.size ? pos : null];
}
function maySpan(test, left) {
  return ALWAYS_SPAN || test.spanBoth || (left ? test.spanLeft : test.spanRight);
}
function stepFrom(window2, index, step, test) {
  if (step < 0) {
    if (index === 0) {
      if (window2.previous === null || !maySpan(test, true)) return null;
      return [window2.previous, window2.previous.size - 1];
    }
    return [window2, index - 1];
  }
  if (index === window2.size - 1) {
    if (window2.next === null || !maySpan(test, false)) return null;
    return [window2.next, 0];
  }
  return [window2, index + 1];
}
function runContextualTest(window2, position, test) {
  if (test.ors.length) {
    const found = test.ors.some((alt) => runContextualTest(window2, position, alt));
    return test.negate ? !found : found;
  }
  if (test.dep) return runDepTest(window2, position, test);
  const orgWindow = window2;
  let retval = true;
  let pos;
  let cohort;
  [window2, pos, cohort] = cohortInWindow(window2, position, test);
  if (cohort === null) {
    retval = false;
  } else if (test.offset === 0 && test.isScan) {
    let left = window2;
    let right = window2;
    let lpos = pos;
    let rpos = pos;
    let rvs = 0;
    if (test.self) {
      [cohort, retval, rvs] = single(window2, cohort, test, rvs);
      if (!retval && rvs & TRV_BREAK_DEFAULT) rvs &= ~(TRV_BREAK | TRV_BREAK_DEFAULT);
    }
    if (rvs & TRV_BREAK && retval) {
    } else {
      let i = 1;
      while (left !== null || right !== null) {
        if (left !== null) {
          rvs = 0;
          [cohort, retval, rvs] = single(left, lpos - i, test, rvs);
          if (rvs & TRV_BREAK && retval) break;
          else if (rvs & TRV_BREAK) {
            left = null;
            if (test.not) right = null;
          } else if (lpos - i === 0) {
            if (maySpan(test, true)) {
              left = left.previous;
              if (left !== null) lpos = i + left.size;
            } else left = null;
          }
        }
        if (right !== null) {
          rvs = 0;
          [cohort, retval, rvs] = single(right, rpos + i, test, rvs);
          if (rvs & TRV_BREAK && retval) break;
          else if (rvs & TRV_BREAK) {
            right = null;
            if (test.not) left = null;
          } else if (rpos + i === right.size - 1) {
            if (maySpan(test, false)) {
              right = right.next;
              rpos = -i - 1;
            } else right = null;
          }
        }
        i++;
      }
    }
  } else {
    const step = test.offset < 0 ? -1 : test.offset > 0 ? 1 : 0;
    let at = [window2, cohort];
    let seen = 0;
    let rvs = 0;
    let nc = cohort;
    if (test.self) {
      seen++;
      [nc, retval, rvs] = single(orgWindow, position, test, rvs);
      if (!retval && rvs & TRV_BREAK_DEFAULT) rvs &= ~(TRV_BREAK | TRV_BREAK_DEFAULT);
    }
    if (!(rvs & TRV_BREAK)) {
      while (at !== null) {
        seen++;
        [nc, retval, rvs] = single(at[0], at[1], test, rvs);
        if (test.all && !retval) {
          nc = null;
          break;
        }
        if (test.none && retval) {
          nc = null;
          break;
        }
        if (rvs & TRV_BREAK) break;
        at = step ? stepFrom(at[0], at[1], step, test) : null;
      }
    }
    if (seen === 0) retval = false;
    if (!retval && test.none) {
      retval = true;
      nc = cohort;
    }
    cohort = nc;
  }
  if (cohort === null) retval = false;
  if (cohort === null && test.not && test.linkedTest === null) retval = !retval;
  if (test.negate) retval = !retval;
  return retval;
}

// node_modules/@rueter/jscg3/src/rule.js
var DEP_TYPES = ["SETPARENT", "SETCHILD"];
var REL_TYPES = ["ADDRELATION", "SETRELATION", "REMRELATION", "ADDRELATIONS", "SETRELATIONS", "REMRELATIONS"];
var TO_TYPES = /* @__PURE__ */ new Set([...DEP_TYPES, ...REL_TYPES]);
var DEDUPE_AFTER = /* @__PURE__ */ new Set(["SUBSTITUTE", "REPLACE", "ADD", "MAP", "UNMAP", "COPY", "APPEND"]);
var Rule = class {
  constructor(ruleType, target, {
    name = "",
    lineNumber = 0,
    contextTests = null,
    actionTags = null,
    substOld = null,
    targetModifiers = "",
    wordformFilter = null,
    substOldTag = null
  } = {}) {
    this.type = ruleType.toUpperCase();
    this.name = name;
    this.label = `${this.type}:${lineNumber}${name ? ":" + name : ""}`;
    this.lineNumber = lineNumber;
    this.target = target;
    this.targetModifiers = targetModifiers;
    this.contextTests = contextTests ? [...contextTests] : [];
    this.actionTags = actionTags ? [...actionTags] : [];
    this.substOld = substOld;
    this.substOldTag = substOldTag;
    this.wordformFilter = wordformFilter;
    this.direction = "AFTER";
    this.flags = /* @__PURE__ */ new Set();
    this.isCareful = targetModifiers.toLowerCase().includes("c");
    this.usesUnify = false;
    this._maps = null;
    this.sub = null;
    this.copyExcept = null;
    this.depTests = [];
    this.relSub = [];
    this.childset = null;
  }
  /**
   * Does a change by this rule send its section round again? As in vislcg3, only SELECT, REMOVE, IFF,
   * REMCOHORT, MOVE and SWITCH do, unless the rule says ITERATE / NOITERATE.
   */
  get iterates() {
    if (this.flags.has("ITERATE")) return true;
    if (this.flags.has("NOITERATE")) return false;
    return ["SELECT", "REMOVE", "IFF", "DELIMIT", "REMCOHORT", "MOVE", "SWITCH"].includes(this.type);
  }
  // -- application ------------------------------------------------------------------------
  /** Apply the rule to every cohort of the window once. True if anything changed. */
  applyToWindow(window2, grammar) {
    let changed = false;
    let stuck = false;
    let i = 0;
    if (this._maps === null) this._maps = this._mentionsMappingTag(grammar);
    const mp = grammar ? grammar.mappingPrefix : "@";
    while (i < window2.cohorts.length) {
      const cohort = window2.cohorts[i];
      if (this.wordformFilter && cohort.wordform !== this.wordformFilter) {
        i++;
        continue;
      }
      if (this._maps && cohort.readings.some((r) => !r.deleted && r.mappingTags.size > 1)) {
        if (cohort.readings.some((r) => !r.deleted && r.mappingTags.size > 1 && this._targetMatches(r))) cohort.splitMappings(mp);
      }
      let targets;
      let testsOk;
      if (this.usesUnify && TO_TYPES.has(this.type)) {
        targets = cohort.readings.filter((r) => !r.deleted);
        testsOk = true;
        if (!targets.length) {
          i++;
          continue;
        }
      } else if (this.usesUnify) {
        [targets, testsOk] = this._unifyTargets(window2, i, cohort, grammar);
        if (!targets.length) {
          i++;
          continue;
        }
      } else {
        targets = cohort.readings.filter((r) => !r.deleted && this._targetMatches(r));
        testsOk = null;
      }
      if (!targets.length && this.type !== "SETVARIABLE" && this.type !== "REMVARIABLE") {
        i++;
        continue;
      }
      if ((this.type === "REMPARENT" || this.type === "SWITCHPARENT") && cohort.depParent === null) {
        i++;
        continue;
      }
      if (cohort.depParent !== null && (this.flags.has("NOPARENT") || this.type === "SETPARENT" && this.flags.has("SAFE"))) {
        i++;
        continue;
      }
      if (testsOk === null) testsOk = this.contextTests.every((t) => t.evaluate(window2, i, grammar));
      if (!testsOk) {
        if (this.type === "IFF") {
          const [did2, nowStuck] = this._iffRemove(cohort, targets, stuck);
          stuck = nowStuck;
          changed = did2 || changed;
        }
        i++;
        continue;
      }
      const [did, delta] = this._act(window2, i, cohort, targets, grammar);
      if (did && DEDUPE_AFTER.has(this.type)) cohort.dedupeReadings(Boolean(grammar && grammar.traceMode));
      changed = changed || did;
      i += 1 + delta;
    }
    return changed;
  }
  /** Does the target set of this rule name a mapping tag (@SUBJ ...)? */
  _mentionsMappingTag(grammar) {
    const prefix = grammar ? grammar.mappingPrefix : "@";
    const seen = /* @__PURE__ */ new Set();
    const walk = (obj) => {
      if (obj === null || obj === void 0 || typeof obj === "number") return false;
      if (typeof obj === "string") {
        obj = grammar ? grammar.sets.get(obj) : void 0;
        if (obj === void 0 || seen.has(obj)) return false;
      } else if (seen.has(obj)) {
        return false;
      }
      seen.add(obj);
      if (obj instanceof TagPattern) return obj.raw.replace(/^!+/, "").startsWith(prefix);
      if (obj instanceof CompositeTag) return obj.elements.some(walk);
      if (obj instanceof UnifySet) return walk(obj.registry.get(obj.name));
      if (obj instanceof SetDefinition) {
        if (obj.items.some(walk)) return true;
        return obj.groups.some((chain) => chain.some(([, operand]) => walk(operand)));
      }
      if (obj instanceof ContextualTest) {
        return walk(obj.target) || walk(obj.barrier) || walk(obj.cbarrier) || walk(obj.linkedTest) || obj.ors.some(walk);
      }
      return false;
    };
    return walk(this.target);
  }
  /**
   * With $$Set / &&Set in the rule each target reading is tried on its own: the contexts have to agree
   * with what that reading matched. Returns [readings that pass, true].
   */
  _unifyTargets(window2, i, cohort, grammar) {
    const good = [];
    try {
      for (const r of cohort.readings) {
        if (r.deleted) continue;
        setUnif(/* @__PURE__ */ new Map());
        if (this._targetMatches(r) && this.contextTests.every((t) => t.evaluate(window2, i, grammar))) good.push(r);
      }
    } finally {
      setUnif(null);
    }
    return [good, true];
  }
  _targetMatches(reading) {
    if (this.sub !== null) {
      reading = reading.subReading(this.sub);
      if (reading === null) return false;
    }
    const res = this.target instanceof SetDefinition ? this.target.matchesReading(reading) : false;
    return this.targetModifiers.includes("!") ? !res : res;
  }
  _act(window2, i, cohort, targets, grammar) {
    const t = this.type;
    const mp = grammar ? grammar.mappingPrefix : "@";
    if (TO_TYPES.has(t)) return [this._setDependency(window2, i, cohort, targets, grammar), 0];
    if (t === "REMPARENT") {
      targets[0].trace.push(this.label);
      cohort.depParent = null;
      return [true, 0];
    }
    if (t === "SWITCHPARENT") return [this._switchParent(window2, cohort, targets[0], grammar), 0];
    if (t === "SELECT") return [this._select(cohort, targets), 0];
    if (t === "REMOVE") return [this._remove(cohort, targets), 0];
    if (t === "IFF") return [this._select(cohort, targets), 0];
    if (t === "ADD" || t === "MAP") return [this._add(targets, mp, t === "MAP"), 0];
    if (t === "UNMAP") {
      let did = false;
      for (const r of targets) {
        for (const tag of [...r.mappingTags]) {
          r.removeTag(tag);
          did = true;
        }
        if (did) r.trace.push(this.label);
      }
      return [did, 0];
    }
    if (t === "REPLACE") {
      targets = targets.filter((r) => !r.mapped);
      for (const r of targets) {
        r.tags = [...this.actionTags];
        r.tagSet = new Set(r.tags);
        r.matchCache = null;
        r.mappingTags = new Set(r.tags.filter((x) => x.startsWith(mp)));
        r.changed = true;
        r.trace.push(this.label);
      }
      return [targets.length > 0, 0];
    }
    if (t === "SUBSTITUTE") return [this._substitute(targets, mp), 0];
    if (t === "APPEND" && this.actionTags.length) {
      const nr = new Reading(this.actionTags[0], this.actionTags.slice(1), cohort);
      nr.changed = true;
      nr.trace.push(this.label);
      cohort.appendReading(nr);
      return [true, 0];
    }
    if (t === "COPY") {
      for (const r of targets) {
        const nr = r.clone(cohort);
        if (this.copyExcept !== null) {
          const keep = nr.tags.filter((tag) => !this.copyExcept.matchesReading(new Reading(nr.baseform, [tag])));
          nr.tags = keep;
          nr.tagSet = new Set(keep);
          nr.mappingTags = new Set(keep.filter((x) => x.startsWith(mp)));
        }
        for (const tag of this.actionTags) nr.addTag(tag, mp);
        nr.trace.push(this.label);
        cohort.appendReading(nr);
      }
      return [targets.length > 0, 0];
    }
    if (t === "REMCOHORT") {
      window2.cohorts.splice(i, 1);
      return [true, -1];
    }
    if (t === "ADDCOHORT") return this._addcohort(window2, i);
    if (t === "SETVARIABLE") {
      for (const tag of this.actionTags) {
        const eq = tag.indexOf("=");
        const k = eq < 0 ? tag : tag.slice(0, eq);
        const v = eq < 0 ? "" : tag.slice(eq + 1);
        window2.variables.set(k, v || "1");
      }
      return [true, 0];
    }
    if (t === "REMVARIABLE") {
      for (const tag of this.actionTags) window2.variables.delete(tag);
      return [true, 0];
    }
    return [false, 0];
  }
  /**
   * SETPARENT: the cohort becomes a child of the cohort the TO tests lead to; SETCHILD: the other way round.
   * The cohort it leads to is the one of the test with the A flag, else where the last LINKed test ended;
   * a candidate that would make a loop is skipped (the scan goes on), and an earlier attachment is replaced.
   */
  _setDependency(window2, i, cohort, targets, grammar) {
    if (!this.depTests.length) return false;
    let lead = targets.length ? targets[0] : null;
    let found = null;
    if (this.usesUnify) {
      for (const r of targets) {
        setUnif(/* @__PURE__ */ new Map());
        try {
          if (!this._targetMatches(r)) continue;
          if (this.contextTests.every((t) => t.evaluate(window2, i, grammar))) found = this._depSearch(window2, i, cohort, grammar);
        } finally {
          setUnif(null);
        }
        lead = r;
        break;
      }
    } else {
      found = this._depSearch(window2, i, cohort, grammar);
    }
    if (found === null) return false;
    const other = found;
    if (REL_TYPES.includes(this.type)) return this._relate(cohort, other, lead);
    const asChild = this.type === "SETPARENT" !== this.flags.has("REVERSE");
    const [child, parent] = asChild ? [cohort, other] : [other, cohort];
    if (child.depParent !== parent) {
      if (child.depParent !== null) {
        const sibs = child.depParent.depChildren;
        sibs.splice(sibs.indexOf(child), 1);
      }
      child.depParent = parent;
      parent.depChildren.push(child);
      parent.depChildren.sort(byOrder);
    }
    window2.hasDep = true;
    if (child.parentWindow !== parent.parentWindow && grammar) grammar.depHasSpanned = true;
    if (lead !== null) lead.trace.push(this.label);
    return true;
  }
  /**
   * SWITCHPARENT WITHCHILD set target: the cohort becomes the parent of its own parent and of the siblings the set
   * matches, and takes the place of the parent under the grandparent.
   */
  _switchParent(window2, child, lead, grammar) {
    const parent = child.depParent;
    const grand = parent.depParent;
    const siblings = window2.cohorts.filter((c) => c.depParent === parent && (this.childset === null || this.childset.matchesCohortNormal(c)));
    lead.trace.push(this.label);
    child.depParent = null;
    parent.depParent = null;
    for (const s of siblings) s.depParent = null;
    const attach = (p, c) => {
      const state = new AttachState(
        window2,
        c,
        true,
        false,
        false,
        Boolean(grammar && grammar.depBlockCrossing),
        grammar ? grammar.depBlockLoops !== false : true
      );
      if (!state.valid(p)) return;
      if (c.depParent !== null) {
        const sibs = c.depParent.depChildren;
        const at = sibs.indexOf(c);
        if (at >= 0) sibs.splice(at, 1);
      }
      c.depParent = p;
      p.depChildren.push(c);
      p.depChildren.sort(byOrder);
      if (c.parentWindow !== p.parentWindow && grammar) grammar.depHasSpanned = true;
    };
    if (grand !== null) attach(grand, child);
    attach(child, parent);
    for (const s of siblings) attach(child, s);
    return true;
  }
  /**
   * ADDRELATION / SETRELATION / REMRELATION (name): the target cohort gets a relation to the cohort found (FROM turns
   * it round); the plural rules also give the cohort found one back, under the second name.
   */
  _relate(cohort, other, lead) {
    const [target, attach] = this.flags.has("REVERSE") ? [other, cohort] : [cohort, other];
    let did = false;
    const kind = this.type.slice(0, 3);
    const apply = (owner, name, to) => {
      if (kind === "ADD") {
        owner.related = true;
        return owner.addRelation(name, to.globalNumber);
      }
      if (kind === "SET") {
        owner.related = true;
        return owner.setRelation(name, to.globalNumber);
      }
      return owner.remRelation(name, to.globalNumber);
    };
    for (const name of this.actionTags) {
      if (this.type === "ADDRELATION" || this.type === "SETRELATION") attach.related = true;
      did = apply(target, name, attach) || did;
    }
    for (const name of this.relSub) did = apply(attach, name, target) || did;
    if (did && lead !== null) lead.trace.push(this.label);
    return did;
  }
  /** The cohort the TO tests lead to for the cohort at window index i, or null. */
  _depSearch(window2, i, cohort, grammar) {
    const check = DEP_TYPES.includes(this.type);
    const asChild = this.type === "SETPARENT" !== this.flags.has("REVERSE");
    const attacher = new AttachState(
      window2,
      cohort,
      asChild,
      this.flags.has("ALLOWLOOP"),
      this.flags.has("ALLOWCROSS"),
      Boolean(grammar && grammar.depBlockCrossing),
      grammar ? grammar.depBlockLoops !== false : true,
      check
    );
    const state = new AttachState(window2, cohort, true, false, false, false, true, false);
    const first = this.depTests[0];
    const rest = this.depTests.slice(1);
    const orgOffset = first.offset;
    const seen = /* @__PURE__ */ new Set([cohort]);
    let atWindow = window2;
    let at = i + 1;
    try {
      for (; ; ) {
        const bindings = getUnif();
        const saved = bindings !== null && bindings !== void 0 ? new Map([...bindings].map(([k, v]) => [k, [...v]])) : null;
        state.marked = state.final = null;
        setAttach(state);
        resetSeenBarrier();
        const led = runContextualTest(atWindow, at, first);
        setAttach(null);
        if (!led || state.final === null) return null;
        const attach = state.final;
        const stop = seenBarrier() || this.flags.has("NEAREST");
        const good = rest.every((t) => runContextualTest(attach.parentWindow, attach.parentWindow.indexOf(attach), t));
        if (good) {
          if (check) window2.hasDep = true;
          if (attacher.valid(attach)) return attach;
        }
        if (stop || seen.has(attach)) return null;
        seen.add(attach);
        if (saved !== null) setUnif(saved);
        atWindow = attach.parentWindow;
        at = attach.parentWindow.indexOf(attach);
        if (first.offset !== 0) first.offset = first.offset < 0 ? -1 : 1;
      }
    } finally {
      first.offset = orgOffset;
      setAttach(null);
    }
  }
  _select(cohort, targets) {
    const active = cohort.readings.filter((r) => !r.deleted);
    if (active.length <= 1 || !targets.length || targets.length === active.length) return false;
    const keep = new Set(targets);
    for (const r of active) {
      if (!keep.has(r)) cohort.removeReading(r, this.sub !== null ? "" : this.label);
    }
    for (const r of targets) {
      r.changed = true;
      this._traceHolder(r).trace.push(this.label);
    }
    return true;
  }
  /** With SUB:n vislcg3 -t writes the rule on the line of the sub-reading it matched. */
  _traceHolder(reading) {
    if (this.sub !== null) return reading.subReading(this.sub) || reading;
    return reading;
  }
  /**
   * The REMOVE half of IFF. Where a plain REMOVE would take every reading of a cohort and so does nothing, IFF still
   * writes its label on all of them (each time the section is run) although none is removed - and from then on, for the
   * rest of that run of the rule over the window, it only labels the readings it should have removed.
   */
  _iffRemove(cohort, targets, stuck) {
    const active = cohort.readings.filter((r) => !r.deleted);
    if (active.length <= 1) return [false, stuck];
    if (stuck || targets.length >= active.length) {
      for (const r of targets) this._traceHolder(r).trace.push(this.label);
      return [false, true];
    }
    return [this._remove(cohort, targets), stuck];
  }
  _remove(cohort, targets) {
    const active = cohort.readings.filter((r) => !r.deleted);
    if (active.length <= 1 || targets.length >= active.length) return false;
    for (const r of targets) {
      if (this.sub !== null) {
        cohort.removeReading(r);
        this._traceHolder(r).trace.push(this.label);
      } else {
        cohort.removeReading(r, this.label);
      }
    }
    return true;
  }
  /** The order vislcg3 puts added tags in: the plain ones as written, then the mapping tags, last one first. */
  _orderedActionTags(mp) {
    const mapping = this.actionTags.filter((t) => t.startsWith(mp));
    if (mapping.length < 2) return this.actionTags;
    return [...this.actionTags.filter((t) => !t.startsWith(mp)), mapping[mapping.length - 1], ...mapping.slice(0, -1)];
  }
  _add(targets, mp, isMap) {
    let changed = false;
    for (const r of targets) {
      if (r.mapped) continue;
      for (const tag of this._orderedActionTags(mp)) {
        r.tags.push(tag);
        r.tagSet.add(tag);
        if (tag.startsWith(mp)) r.mappingTags.add(tag);
      }
      r.matchCache = null;
      r.changed = true;
      if (isMap) r.mapped = true;
      r.trace.push(this.label);
      changed = true;
    }
    return changed;
  }
  _substitute(targets, mp) {
    if (this.substOld === null) return false;
    const next = this.actionTags.filter((x) => x !== "*");
    let changed = false;
    for (const r of targets) {
      const hits = [];
      r.tags.forEach((tag, k) => {
        if (this._oldMatches(tag)) hits.push(k);
      });
      if (!hits.length) continue;
      const first = hits[0];
      const out = [];
      const plain = [];
      for (const x of next) {
        if (isBaseform(x)) r.baseform = x;
        else plain.push(x);
      }
      r.tags.forEach((tag, k) => {
        if (k === first) out.push(...plain);
        if (!hits.includes(k)) out.push(tag);
      });
      r.tags = out;
      r.tagSet = new Set(out);
      r.matchCache = null;
      r.mappingTags = new Set(out.filter((x) => x.startsWith(mp)));
      r.changed = true;
      r.trace.push(this.label);
      changed = true;
    }
    return changed;
  }
  _oldMatches(tag) {
    return this.substOld.matchesReading(new Reading("", [tag]));
  }
  _addcohort(window2, i) {
    if (!this.actionTags.length) return [false, 0];
    const word = this.actionTags[0];
    const base = this.actionTags.length > 1 ? this.actionTags[1] : '""';
    const newC = new Cohort({ wordform: word, parentWindow: window2 });
    const r = new Reading(base, this.actionTags.slice(2), newC);
    r.changed = true;
    r.trace.push(this.label);
    newC.appendReading(r);
    if (this.direction === "BEFORE") {
      window2.cohorts.splice(i, 0, newC);
      return [true, 1];
    }
    window2.cohorts.splice(i + 1, 0, newC);
    return [true, 0];
  }
  toString() {
    return `Rule(${this.label} ${this.target} ${this.contextTests.map(String).join(" ")})`;
  }
};

// node_modules/@rueter/jscg3/src/grammar.js
var SECTION_KEYWORDS = /* @__PURE__ */ new Set([
  "BEFORE-SECTIONS",
  "AFTER-SECTIONS",
  "NULL-SECTION",
  "SECTION",
  "CONSTRAINTS",
  "MAPPINGS",
  "CORRECTIONS"
]);
var RULE_KEYWORDS = /* @__PURE__ */ new Set([
  "SELECT",
  "REMOVE",
  "IFF",
  "ADD",
  "MAP",
  "UNMAP",
  "REPLACE",
  "SUBSTITUTE",
  "APPEND",
  "COPY",
  "ADDCOHORT",
  "REMCOHORT",
  "MOVE",
  "SWITCH",
  "SETVARIABLE",
  "REMVARIABLE",
  "EXECUTE",
  "JUMP",
  "SETPARENT",
  "SETCHILD",
  "ADDRELATION",
  "SETRELATION",
  "REMRELATION",
  "ADDRELATIONS",
  "SETRELATIONS",
  "REMRELATIONS",
  "REMPARENT",
  "SWITCHPARENT"
]);
var DEP_RULES = /* @__PURE__ */ new Set(["SETPARENT", "SETCHILD"]);
var REL_RULES = /* @__PURE__ */ new Set(["ADDRELATION", "SETRELATION", "REMRELATION", "ADDRELATIONS", "SETRELATIONS", "REMRELATIONS"]);
var REL_PAIR = /* @__PURE__ */ new Set(["ADDRELATIONS", "SETRELATIONS", "REMRELATIONS"]);
var TO_RULES = /* @__PURE__ */ new Set([...DEP_RULES, ...REL_RULES]);
var ONE_ACTION = /* @__PURE__ */ new Set(["ADD", "MAP", "REPLACE", "APPEND", "COPY", "ADDCOHORT", "SETVARIABLE", "REMVARIABLE", ...REL_RULES]);
var RULE_FLAGS = /* @__PURE__ */ new Set([
  "WITHCHILD",
  "NOCHILD",
  "ITERATE",
  "NOITERATE",
  "UNSAFE",
  "SAFE",
  "REVERSE",
  "KEEPORDER",
  "VARYORDER",
  "ENCL_INNER",
  "ENCL_OUTER",
  "ENCL_FINAL",
  "ENCL_ANY",
  "LOOKDELETED",
  "LOOKDELAYED",
  "LOOKIGNORED",
  "NEAREST",
  "ALLOWLOOP",
  "DELAYED",
  "IMMEDIATE",
  "IGNORED",
  "RESETX",
  "REMEMBERX",
  "ALLOWCROSS",
  "ORDERED",
  "BEFORE",
  "AFTER"
]);
var SET_OPS = /* @__PURE__ */ new Map([["+", "and"], ["-", "minus"], ["^", "minus"], ["\\", "tdiff"], ["\u2206", "tsym"], ["\u2229", "tand"]]);
var POSITION_RE = /^([@*\-\dA-Za-z<>]*)(?:\/(-?\d+|\*))?$/;
var SUB_FLAG_RE = /^SUB:(-?\d+)$/i;
var GrammarError = class extends Error {
};
var isSpace = (c) => /\s/.test(c);
function tokenize2(text) {
  const tokens = [];
  let i = 0;
  const n = text.length;
  let line = 1;
  const countNewlines = (from, to) => {
    let k = 0;
    for (let p = from; p < to; p++) if (text.charCodeAt(p) === 10) k++;
    return k;
  };
  while (i < n) {
    const c = text[i];
    if (c === "\n") {
      line++;
      i++;
    } else if (isSpace(c)) {
      i++;
    } else if (c === "#") {
      while (i < n && text[i] !== "\n") i++;
    } else if (c === "/" && text.startsWith("/*", i)) {
      let j = text.indexOf("*/", i + 2);
      j = j < 0 ? n : j + 2;
      line += countNewlines(i, j);
      i = j;
    } else if (c === "(" || c === ")" || c === ";") {
      tokens.push([c, line]);
      i++;
    } else {
      let j = i;
      if (c === '"') {
        j++;
        while (j < n && text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
        j++;
      } else if (c === "/") {
        let eol = text.indexOf("\n", i);
        if (eol < 0) eol = n;
        const firstSlash = text.indexOf("/", i + 1);
        if (firstSlash >= 0 && firstSlash < eol) {
          j = firstSlash;
          while (j > 0 && text[j - 1] === "\\") j = text.indexOf("/", j + 1);
          j = j < 0 ? i : j + 1;
        }
      }
      while (j < n && !isSpace(text[j]) && text[j] !== "(" && text[j] !== ")" && text[j] !== ";") {
        j += text[j] === "\\" && j + 1 < n && "();\\".includes(text[j + 1]) ? 2 : 1;
      }
      tokens.push([text.slice(i, j), line]);
      i = j;
    }
  }
  return tokens;
}
var Grammar = class {
  constructor() {
    this.delimiters = null;
    this.softDelimiters = null;
    this.mappingPrefix = "@";
    this.options = /* @__PURE__ */ new Set();
    this.sets = /* @__PURE__ */ new Map();
    this.beforeSections = [];
    this.sections = [];
    this.afterSections = [];
    this.nullSection = [];
    this.traceMode = false;
    this.hasRelations = false;
    this.hasDep = false;
    this.depBlockCrossing = false;
    this.depBlockLoops = true;
  }
  getSet(name) {
    return this.sets.get(name) || null;
  }
};
var GrammarParser = class {
  constructor() {
    this.grammar = new Grammar();
    this.currentSection = "BEFORE";
    this.activeSectionRules = [];
    this._unifySeen = false;
  }
  // -- driver -----------------------------------------------------------------------------
  parse(text) {
    const toks = tokenize2(text);
    let stmt = [];
    for (const tok of toks) {
      if (tok[0] === ";") {
        this._statement(stmt);
        stmt = [];
        continue;
      }
      if (!stmt.length && tok[0].toUpperCase() === "SETS") continue;
      if (!stmt.length && SECTION_KEYWORDS.has(tok[0].toUpperCase())) {
        this._section(tok[0].toUpperCase());
        continue;
      }
      stmt.push(tok);
    }
    this._statement(stmt);
    return this.grammar;
  }
  _section(kw) {
    this.currentSection = {
      "BEFORE-SECTIONS": "BEFORE",
      MAPPINGS: "BEFORE",
      CORRECTIONS: "BEFORE",
      SECTION: "SECTION",
      CONSTRAINTS: "SECTION",
      "AFTER-SECTIONS": "AFTER",
      "NULL-SECTION": "NULL"
    }[kw];
    if (this.currentSection === "SECTION") {
      this.activeSectionRules = [];
      this.grammar.sections.push(this.activeSectionRules);
    }
  }
  _statement(stmt) {
    if (!stmt.length) return;
    const words2 = stmt.map((t) => t[0]);
    const kw = words2[0].toUpperCase();
    const line = stmt[0][1];
    const g = this.grammar;
    const eq = words2.indexOf("=");
    if (kw === "DELIMITERS" && eq >= 0) {
      g.delimiters = this._tagListSet("_S_DELIMITERS_", stmt.slice(eq + 1), line);
      g.sets.set("_S_DELIMITERS_", g.delimiters);
    } else if (kw === "SOFT-DELIMITERS" && eq >= 0) {
      g.softDelimiters = this._tagListSet("_S_SOFT_DELIMITERS_", stmt.slice(eq + 1), line);
      g.sets.set("_S_SOFT_DELIMITERS_", g.softDelimiters);
    } else if (kw === "MAPPING-PREFIX" && eq >= 0) {
      const val = eq + 1 < words2.length ? words2[eq + 1] : "";
      if (val) g.mappingPrefix = Array.from(val)[0];
    } else if (kw === "OPTIONS") {
      for (const w of words2.slice(1)) {
        if (w !== "+=" && w !== "-=" && w !== "=") g.options.add(w.toLowerCase());
      }
    } else if ((kw === "LIST" || kw === "OLIST") && words2.length >= 3 && words2[2] === "=") {
      g.sets.set(words2[1], this._tagListSet(words2[1], stmt.slice(3), line, kw === "OLIST"));
    } else if (kw === "SET" && words2.length >= 3 && words2[2] === "=") {
      g.sets.set(words2[1], this._setExpression(words2[1], stmt.slice(3), line));
    } else if ([
      "SETS",
      "STATIC-SETS",
      "SUBREADINGS",
      "PARENTHESES",
      "INCLUDE",
      "TEMPLATE",
      "ANCHOR",
      "CMDLINE",
      "DELIMITERS",
      "SOFT-DELIMITERS",
      "MAPPING-PREFIX",
      "LIST-TAGS",
      "CMDARGS"
    ].includes(kw)) {
    } else {
      const rule = this._rule(stmt);
      if (rule === null) return;
      if (this.currentSection === "BEFORE") g.beforeSections.push(rule);
      else if (this.currentSection === "SECTION") this.activeSectionRules.push(rule);
      else if (this.currentSection === "AFTER") g.afterSections.push(rule);
      else g.nullSection.push(rule);
    }
  }
  // -- sets ---------------------------------------------------------------------------------
  _newSet(name, line, ordered = false) {
    return new SetDefinition(name, line, ordered, this.grammar.sets);
  }
  /** LIST / DELIMITERS body: tags and (composite tags), all alternatives of one set. */
  _tagListSet(name, toks, line, ordered = false) {
    const s = this._newSet(name, line, ordered);
    let i = 0;
    while (i < toks.length) {
      const t = toks[i][0];
      if (t === "(") {
        let j = i + 1;
        let depth = 1;
        const inner = [];
        while (j < toks.length && depth) {
          if (toks[j][0] === "(") {
            depth++;
          } else if (toks[j][0] === ")") {
            depth--;
            if (!depth) break;
          }
          inner.push(toks[j][0]);
          j++;
        }
        if (inner.length === 1) s.addItem(new TagPattern(inner[0]));
        else if (inner.length) s.addItem(new CompositeTag(inner.map((x) => new TagPattern(x))));
        i = j + 1;
      } else if (t === ")") {
        i++;
      } else {
        s.addItem(new TagPattern(t));
        i++;
      }
    }
    return s;
  }
  _groupToSet(inner, line) {
    const s = this._newSet("", line);
    if (inner.length === 1) s.addItem(new TagPattern(inner[0]));
    else if (inner.length) s.addItem(new CompositeTag(inner.map((x) => new TagPattern(x))));
    return s;
  }
  /** A set expression: operands joined by OR / + / - / \ / ^ ; '+' and the like bind tighter than OR. */
  _setExpression(name, toks, line) {
    const words2 = toks.map((t) => t[0]);
    const s = this._newSet(name, line);
    let group = [];
    let op = null;
    let i = 0;
    while (i < words2.length) {
      const w = words2[i];
      let operand;
      if (w === "(") {
        let depth = 1;
        let j = i + 1;
        const inner = [];
        while (j < words2.length && depth) {
          if (words2[j] === "(") {
            depth++;
          } else if (words2[j] === ")") {
            depth--;
            if (!depth) break;
          }
          inner.push(words2[j]);
          j++;
        }
        operand = this._groupToSet(inner, line);
        i = j + 1;
      } else if (w.toUpperCase() === "OR" || w === "|") {
        if (group.length) s.groups.push(group);
        group = [];
        op = null;
        i++;
        continue;
      } else if (SET_OPS.has(w)) {
        op = SET_OPS.get(w);
        i++;
        continue;
      } else {
        const head = w.slice(0, 2);
        if ((head === "$$" || head === "&&") && this.grammar.sets.has(w.slice(2))) {
          operand = new UnifySet(w.slice(2), head, this.grammar.sets);
          this._unifySeen = true;
        } else {
          operand = this.grammar.sets.has(w) ? w : this._groupToSet([w], line);
        }
        i++;
      }
      group.push([group.length ? op : null, operand]);
      op = null;
    }
    if (group.length) s.groups.push(group);
    s.groups = s.groups.map((g) => this._foldTagOps(g, line));
    if (s.groups.length === 1 && s.groups[0].length === 1 && s.groups[0][0][1] instanceof SetDefinition) {
      const only = s.groups[0][0][1];
      only.name = only.name || name;
      return only;
    }
    return s;
  }
  /** Carry out \ ∆ ^ ∩ on the tags of the lists they join, leaving a chain of + and - for the rest. */
  _foldTagOps(group, line) {
    const listed = (o) => {
      o = typeof o === "string" ? this.grammar.sets.get(o) : o;
      return o instanceof SetDefinition && !o.groups.length ? o : null;
    };
    const key = (item) => item instanceof TagPattern ? "T" + item.raw : "C" + item.elements.map((e) => e.raw).join("\0");
    const out = [];
    for (const [op, operand] of group) {
      if ((op === "tdiff" || op === "tsym" || op === "tand") && out.length) {
        const a = listed(out[out.length - 1][1]);
        const b = listed(operand);
        if (a === null || b === null) throw new GrammarError(`\\, \u2206 and \u2229 need plain lists on both sides (line ${line})`);
        const ka = new Set(a.items.map(key));
        const kb = new Set(b.items.map(key));
        let items;
        if (op === "tdiff") items = a.items.filter((i) => !kb.has(key(i)));
        else if (op === "tand") items = a.items.filter((i) => kb.has(key(i)));
        else items = [...a.items.filter((i) => !kb.has(key(i))), ...b.items.filter((i) => !ka.has(key(i)))];
        const combined = this._newSet("", line);
        combined.items = items;
        out[out.length - 1] = [out[out.length - 1][0], combined];
      } else {
        out.push([op, operand]);
      }
    }
    return out;
  }
  // -- rules ------------------------------------------------------------------------------------
  _rule(stmt) {
    const words2 = stmt.map((t) => t[0]);
    const head = words2[0];
    this._unifySeen = false;
    let rtype = null;
    let name = "";
    const colon = head.indexOf(":");
    if (colon >= 0 && RULE_KEYWORDS.has(head.slice(0, colon).toUpperCase())) {
      rtype = head.slice(0, colon).toUpperCase();
      name = head.slice(colon + 1);
    } else if (RULE_KEYWORDS.has(head.toUpperCase())) {
      rtype = head.toUpperCase();
    } else {
      return null;
    }
    const line = stmt[0][1];
    let i = 1;
    const flags = /* @__PURE__ */ new Set();
    let sub = null;
    let childset = null;
    const groupAt = (at) => {
      let depth = 1;
      let j2 = at + 1;
      const inner = [];
      while (j2 < words2.length && depth) {
        if (words2[j2] === "(") {
          depth++;
        } else if (words2[j2] === ")") {
          depth--;
          if (!depth) break;
        }
        inner.push(words2[j2]);
        j2++;
      }
      return [inner, j2 + 1];
    };
    const scanSet = (start) => {
      let j2 = start;
      for (; ; ) {
        if (j2 < words2.length && words2[j2] === "(") j2 = groupAt(j2)[1];
        else if (j2 < words2.length && !["IF", "EXCEPT", "TO", "FROM", "TARGET"].includes(words2[j2].toUpperCase())) j2++;
        else break;
        if (j2 < words2.length && (words2[j2].toUpperCase() === "OR" || words2[j2] === "|" || SET_OPS.has(words2[j2]))) {
          j2++;
          continue;
        }
        break;
      }
      return j2;
    };
    while (i < words2.length && (RULE_FLAGS.has(words2[i].toUpperCase()) || SUB_FLAG_RE.test(words2[i]))) {
      const sm = SUB_FLAG_RE.exec(words2[i]);
      if (sm) {
        sub = parseInt(sm[1], 10);
      } else if (words2[i].toUpperCase() === "WITHCHILD") {
        flags.add("WITHCHILD");
        const end = scanSet(i + 1);
        childset = this._setExpression("", stmt.slice(i + 1, end), line);
        this.grammar.hasDep = true;
        i = end;
        continue;
      } else {
        flags.add(words2[i].toUpperCase());
      }
      i++;
    }
    let actionTags = [];
    let relSub = [];
    let substOld = null;
    if (rtype === "SUBSTITUTE") {
      if (i < words2.length && words2[i] === "(") {
        let inner;
        [inner, i] = groupAt(i);
        substOld = this._tagListSet("", inner.map((w) => [w, line]), line);
      } else if (i < words2.length) {
        substOld = this._setExpression("", [[words2[i], line]], line);
        i++;
      }
      if (i < words2.length && words2[i] === "(") [actionTags, i] = groupAt(i);
    } else if (ONE_ACTION.has(rtype)) {
      if (i < words2.length && words2[i] === "(") {
        [actionTags, i] = groupAt(i);
      } else if (i < words2.length) {
        actionTags = [words2[i]];
        i++;
      }
      if (REL_PAIR.has(rtype) && i < words2.length && words2[i] === "(") [relSub, i] = groupAt(i);
    }
    let direction = "AFTER";
    if ((rtype === "ADDCOHORT" || rtype === "MOVE") && i < words2.length && ["BEFORE", "AFTER"].includes(words2[i].toUpperCase())) {
      direction = words2[i].toUpperCase();
      i++;
    }
    let copyExcept = null;
    if (rtype === "COPY" && i < words2.length && words2[i].toUpperCase() === "EXCEPT") {
      let j2 = i + 1;
      while (j2 < words2.length && !["TARGET", "IF"].includes(words2[j2].toUpperCase())) {
        j2 = words2[j2] === "(" ? groupAt(j2)[1] : j2 + 1;
      }
      copyExcept = this._setExpression("", stmt.slice(i + 1, j2), line);
      i = j2;
    }
    if (i < words2.length && words2[i].toUpperCase() === "TARGET") i++;
    let j = i;
    const stops = TO_RULES.has(rtype) ? ["IF", "EXCEPT", "TO", "FROM"] : ["IF", "EXCEPT"];
    for (; ; ) {
      if (j < words2.length && words2[j] === "(") j = groupAt(j)[1];
      else if (j < words2.length && !stops.includes(words2[j].toUpperCase())) j++;
      else break;
      if (j < words2.length && (words2[j].toUpperCase() === "OR" || words2[j] === "|" || SET_OPS.has(words2[j]))) {
        j++;
        continue;
      }
      break;
    }
    const target = j > i ? this._setExpression("", stmt.slice(i, j), line) : this._groupToSet(["*"], line);
    const tests = [];
    const depTests = [];
    let k = j < words2.length && words2[j].toUpperCase() === "IF" ? j + 1 : j;
    let into = tests;
    while (k < words2.length) {
      if (words2[k] === "(") {
        let inner;
        [inner, k] = groupAt(k);
        into.push(this._contextTest(inner, line));
      } else {
        if (TO_RULES.has(rtype) && ["TO", "FROM"].includes(words2[k].toUpperCase())) {
          into = depTests;
          if (words2[k].toUpperCase() === "FROM") flags.add("REVERSE");
        }
        k++;
      }
    }
    const rule = new Rule(rtype, target, { name, lineNumber: line, contextTests: tests, actionTags, substOld });
    rule.depTests = depTests;
    rule.direction = direction;
    rule.flags = flags;
    rule.sub = sub;
    rule.copyExcept = copyExcept;
    if (DEP_RULES.has(rtype)) this.grammar.hasDep = true;
    rule.childset = childset;
    if (REL_RULES.has(rtype)) {
      rule.relSub = relSub;
      this.grammar.hasRelations = true;
      const names = [...actionTags.slice(0, 1), ...REL_PAIR.has(rtype) ? relSub.slice(0, 1) : []];
      rule.label = `${rtype}(${names.join(",")}):${line}${name ? ":" + name : ""}`;
    }
    rule.usesUnify = this._unifySeen;
    this._unifySeen = false;
    return rule;
  }
  // -- contextual tests -----------------------------------------------------------------------------
  /** (test) OR (test) ..., or one bare test that takes all the words (with its own LINKs). */
  _contextList(words2, line) {
    const alts = [];
    let i = 0;
    for (; ; ) {
      if (i < words2.length && words2[i] === "(") {
        let depth = 1;
        let j = i + 1;
        const inner = [];
        while (j < words2.length && depth) {
          if (words2[j] === "(") {
            depth++;
          } else if (words2[j] === ")") {
            depth--;
            if (!depth) break;
          }
          inner.push(words2[j]);
          j++;
        }
        alts.push(this._contextTest(inner, line));
        i = j + 1;
        if (i < words2.length && words2[i].toUpperCase() === "LINK") {
          let tail = alts[alts.length - 1];
          while (tail.linkedTest !== null && !tail.ors.length) tail = tail.linkedTest;
          const nxt = this._contextList(words2.slice(i + 1), line);
          if (tail.ors.length) {
            for (const alt of tail.ors) {
              let end = alt;
              while (end.linkedTest !== null) end = end.linkedTest;
              end.linkedTest = nxt;
            }
          } else {
            tail.linkedTest = nxt;
          }
          i = words2.length;
        }
      } else {
        alts.push(this._contextTest(words2.slice(i), line));
        i = words2.length;
      }
      if (i < words2.length && words2[i].toUpperCase() === "OR") {
        i++;
        continue;
      }
      break;
    }
    if (alts.length === 1) return alts[0];
    const test = new ContextualTest({ target: this._groupToSet(["*"], line) });
    test.ors = alts;
    return test;
  }
  /**
   * words are the tokens inside one ( ... ): [NOT|NEGATE] position set [BARRIER set] [CBARRIER set] [LINK test].
   * A group that begins with ( holds alternatives: (test) OR (test).
   */
  _contextTest(words2, line) {
    if (words2.length && words2[0] === "(") return this._contextList(words2, line);
    let i = 0;
    let isNot = false;
    let isNegate = false;
    let all = false;
    let none = false;
    while (i < words2.length && ["NOT", "NEGATE", "ALL", "NONE"].includes(words2[i].toUpperCase())) {
      const kw = words2[i].toUpperCase();
      isNot = isNot || kw === "NOT";
      isNegate = isNegate || kw === "NEGATE";
      all = all || kw === "ALL";
      none = none || kw === "NONE";
      i++;
    }
    const pos = i < words2.length ? words2[i] : "0";
    i++;
    let offset = 0;
    let scanFirst = false;
    let scanAll = false;
    let careful = false;
    let absolute = false;
    let self = false;
    let noBarrier = false;
    let sub = null;
    let dep = null;
    let attach = false;
    let relation = null;
    let spanLeft = false;
    let spanRight = false;
    let spanBoth = false;
    if (pos.startsWith("r:") && pos.length > 2) {
      dep = "r";
      relation = pos.slice(2);
    }
    const m = POSITION_RE.exec(pos);
    if (m) {
      const body = m[1];
      absolute = body.includes("@");
      const digits = body.match(/\d+/);
      offset = (body.includes("-") ? -1 : 1) * parseInt(digits ? digits[0] : "0", 10) + 0;
      const stars = (body.match(/\*/g) || []).length;
      scanAll = stars >= 2;
      scanFirst = stars === 1;
      const pflags = body.replace(/[@*\-\d]/g, "");
      spanLeft = pflags.includes("<");
      spanRight = pflags.includes(">");
      spanBoth = pflags.includes("W");
      careful = pflags.includes("C");
      self = pflags.includes("S");
      noBarrier = pflags.includes("N");
      attach = pflags.includes("A");
      for (const letters of ["pp", "cc", "p", "c", "s"]) {
        if (pflags.includes(letters)) {
          dep = letters;
          this.grammar.hasDep = true;
          break;
        }
      }
      if (m[2] !== void 0) sub = m[2] === "*" ? "*" : parseInt(m[2], 10);
      if (this.grammar.options.has("self-no-barrier") && self) noBarrier = !noBarrier;
    }
    const collect = (at, stop2) => {
      let depth = 0;
      const out = [];
      while (at < words2.length) {
        const w = words2[at];
        if (depth === 0 && stop2.has(w.toUpperCase())) break;
        if (w === "(") depth++;
        else if (w === ")") depth--;
        out.push([w, line]);
        at++;
      }
      return [out, at];
    };
    const stop = /* @__PURE__ */ new Set(["BARRIER", "CBARRIER", "LINK"]);
    let targetToks;
    [targetToks, i] = collect(i, stop);
    const target = targetToks.length ? this._setExpression("", targetToks, line) : this._groupToSet(["*"], line);
    let barrier = null;
    let cbarrier = null;
    let linked = null;
    while (i < words2.length) {
      const kw = words2[i].toUpperCase();
      if (kw === "BARRIER") {
        let toks;
        [toks, i] = collect(i + 1, stop);
        barrier = this._setExpression("", toks, line);
      } else if (kw === "CBARRIER") {
        let toks;
        [toks, i] = collect(i + 1, stop);
        cbarrier = this._setExpression("", toks, line);
      } else if (kw === "LINK") {
        linked = this._contextList(words2.slice(i + 1), line);
        break;
      } else {
        i++;
      }
    }
    return new ContextualTest({
      target,
      offset,
      scanFirst,
      scanAll,
      careful,
      not: isNot,
      negate: isNegate,
      absolute,
      self,
      noBarrier,
      all,
      none,
      barrier,
      cbarrier,
      linkedTest: linked,
      rawPos: pos,
      sub,
      dep,
      attach,
      relation,
      spanLeft,
      spanRight,
      spanBoth
    });
  }
};

// node_modules/@rueter/jscg3/src/stream.js
var COHORT_RE = /^\s*"<(.+?)>"(?=\s|$)(.*)$/;
var READING_RE = /^(\s+)(;?\s*)"(.*?)"(?=\s|$)(.*)$/;
var DEP_TAG_RE = /^#(\d+)(?:->|\u2192)(\d+)$/;
var REL_TAG_RE = /^(?:ID:(\d+)|R:([^:]+):(\d+))$/;
var STREAM_CMD_RE = /^<STREAMCMD:([A-Z]+)(?::([^>]*))?>$/;
function splitTags(tagStr) {
  const tags = [];
  let current = [];
  let inQuote = false;
  let quoteChar = "";
  let parenDepth = 0;
  const n = tagStr.length;
  for (let i = 0; i < n; i++) {
    const c = tagStr[i];
    if (inQuote) {
      current.push(c);
      if (c === quoteChar && (i === 0 || tagStr[i - 1] !== "\\")) inQuote = false;
    } else if (c === '"' || c === "'") {
      inQuote = true;
      quoteChar = c;
      current.push(c);
    } else if (c === "(") {
      parenDepth++;
      current.push(c);
    } else if (c === ")") {
      if (parenDepth > 0) parenDepth--;
      current.push(c);
    } else if (/\s/.test(c) && parenDepth === 0) {
      if (current.length) {
        tags.push(current.join(""));
        current = [];
      }
    } else {
      current.push(c);
    }
  }
  if (current.length) tags.push(current.join(""));
  return tags;
}
function stripTags(reading, pick) {
  const keep = reading.tags.filter((t) => !pick(t));
  if (keep.length !== reading.tags.length) {
    reading.tags = keep;
    reading.tagSet = new Set(keep);
    reading.matchCache = null;
  }
  for (const sub of reading.subReadings) stripTags(sub, pick);
}
function extractRelations(cohort) {
  let ident = 0;
  const rels = /* @__PURE__ */ new Map();
  let found = false;
  const pick = (t) => {
    const m = t.startsWith("ID:") || t.startsWith("R:") ? REL_TAG_RE.exec(t) : null;
    if (m && (m[1] === void 0 || parseInt(m[1], 10) !== 0)) {
      found = true;
      if (m[1] !== void 0) {
        ident = parseInt(m[1], 10);
      } else {
        if (!rels.has(m[2])) rels.set(m[2], /* @__PURE__ */ new Set());
        rels.get(m[2]).add(parseInt(m[3], 10));
      }
      return true;
    }
    return false;
  };
  for (const r of [...cohort.readings, ...cohort.deletedReadings]) stripTags(r, pick);
  if (found) cohort.relIn = [ident, rels];
}
function extractDependency(cohort) {
  const pick = (t) => {
    const m = t.startsWith("#") ? DEP_TAG_RE.exec(t) : null;
    if (m && parseInt(m[1], 10) !== 0) {
      cohort.depIn = [parseInt(m[1], 10), parseInt(m[2], 10)];
      return true;
    }
    return false;
  };
  for (const r of [...cohort.readings, ...cohort.deletedReadings]) stripTags(r, pick);
}
function splitAllMappings(cohort, mappingPrefix = "@") {
  const out = [];
  for (const r of cohort.readings) {
    const mappingTags = r.tags.filter((t) => t.startsWith(mappingPrefix));
    if (mappingTags.length > 1) {
      const baseTags = r.tags.filter((t) => !t.startsWith(mappingPrefix));
      for (const mt of mappingTags) {
        const nr = new Reading(r.baseform, [...baseTags, mt], cohort);
        nr.number = r.number;
        nr.deleted = r.deleted;
        nr.changed = r.changed;
        nr.trace = [...r.trace];
        nr.subReadings = r.subReadings.map((s) => s.clone(cohort));
        out.push(nr);
      }
    } else {
      out.push(r);
    }
  }
  for (const r of out) {
    const marks = r.tags.filter((t) => t.startsWith(mappingPrefix));
    if (marks.length) {
      r.mappingTags = new Set(marks);
      r.mapped = true;
    }
  }
  cohort.readings = out;
}
function* linesOf(text) {
  let start = 0;
  for (; ; ) {
    const nl = text.indexOf("\n", start);
    if (nl < 0) {
      if (start < text.length) yield text.slice(start);
      return;
    }
    yield text.slice(start, nl);
    start = nl + 1;
  }
}
function* parseStream(lines, delimitersSet = null, mappingPrefix = "@", hardLimit = 500, hasRelations = false, hasDep = true) {
  if (typeof lines === "string") lines = linesOf(lines);
  let currentWindow = new SingleWindow();
  let currentCohort = null;
  let readingStack = [];
  let pendingText = [];
  let lineNumber = 0;
  let cohortCounter = 1;
  currentWindow.begin.globalNumber = 0;
  const finishCohort = (c) => {
    if (!c.readings.length && !c.deletedReadings.length) {
      c.appendReading(new Reading(`"${c.wordform.slice(2, -2)}"`, [], c));
    }
    if (hasRelations) extractRelations(c);
    if (hasDep) extractDependency(c);
    splitAllMappings(c, mappingPrefix);
  };
  const finishWindow = () => {
    if (currentCohort !== null) {
      finishCohort(currentCohort);
      currentWindow.appendCohort(currentCohort);
      currentCohort = null;
      readingStack = [];
    }
    if (pendingText.length) {
      currentWindow.textAfter.push(...pendingText);
      pendingText = [];
    }
    const win = currentWindow;
    currentWindow = new SingleWindow();
    currentWindow.begin.globalNumber = cohortCounter;
    cohortCounter++;
    return win;
  };
  for (const rawLine of lines) {
    lineNumber++;
    const line = rawLine.replace(/[\r\n]+$/, "");
    const stripped = line.trim();
    const cmdMatch = STREAM_CMD_RE.exec(stripped);
    if (cmdMatch) {
      const cmd = cmdMatch[1];
      const arg = cmdMatch[2];
      if (cmd === "FLUSH") {
        if (currentWindow.cohorts.length || currentCohort) {
          const win = finishWindow();
          win.flushAfter = true;
          yield win;
        } else {
          const win = new SingleWindow();
          win.textAfter.push(line);
          win.flushAfter = true;
          yield win;
        }
        continue;
      } else if (cmd === "EXIT") {
        if (currentWindow.cohorts.length || currentCohort) yield finishWindow();
        return;
      } else if (cmd === "SETVAR") {
        if (arg) {
          for (const vpart of arg.split(",")) {
            const eq = vpart.indexOf("=");
            if (eq >= 0) currentWindow.variables.set(vpart.slice(0, eq), vpart.slice(eq + 1));
            else currentWindow.variables.set(vpart, "1");
          }
        }
        pendingText.push(line);
        continue;
      } else if (cmd === "REMVAR") {
        if (arg) for (const vpart of arg.split(",")) currentWindow.variables.delete(vpart);
        pendingText.push(line);
        continue;
      } else {
        pendingText.push(line);
        continue;
      }
    }
    const cohortMatch = COHORT_RE.exec(line);
    if (cohortMatch) {
      if (currentCohort !== null) {
        finishCohort(currentCohort);
        currentWindow.appendCohort(currentCohort);
        let isDelim = false;
        if (delimitersSet && delimitersSet.matchesCohortNormal(currentCohort)) isDelim = true;
        currentCohort = null;
        readingStack = [];
        if (isDelim || currentWindow.cohorts.length >= hardLimit) yield finishWindow();
      }
      const word = cohortMatch[1];
      const rest = cohortMatch[2].trim();
      currentCohort = new Cohort({
        wordform: `"<${word}>"`,
        untouchableTags: rest ? splitTags(rest) : [],
        textBefore: pendingText,
        lineNumber,
        globalNumber: cohortCounter
      });
      cohortCounter++;
      pendingText = [];
      continue;
    }
    if ((line.startsWith(" ") || line.startsWith("	")) && currentCohort !== null) {
      const rMatch = READING_RE.exec(line);
      if (rMatch) {
        const indentLevel = rMatch[1].replace(/\t/g, "    ").length;
        const delStr = rMatch[2].trim();
        const restTags = rMatch[4].trim();
        const reading = new Reading(`"${rMatch[3]}"`, restTags ? splitTags(restTags) : [], currentCohort);
        if (delStr.startsWith(";")) reading.deleted = true;
        while (readingStack.length && indentLevel <= readingStack[readingStack.length - 1][0]) readingStack.pop();
        if (readingStack.length) {
          readingStack[readingStack.length - 1][1].subReadings.push(reading);
        } else if (reading.deleted) {
          currentCohort.deletedReadings.push(reading);
        } else {
          currentCohort.appendReading(reading);
        }
        readingStack.push([indentLevel, reading]);
        continue;
      }
    }
    pendingText.push(line);
  }
  if (currentCohort !== null) {
    finishCohort(currentCohort);
    currentWindow.appendCohort(currentCohort);
  }
  if (pendingText.length) currentWindow.textAfter.push(...pendingText);
  if (currentWindow.cohorts.length || currentWindow.textAfter.length) yield currentWindow;
}

// node_modules/@rueter/jscg3/src/engine.js
var Disambiguator = class {
  constructor(grammar, {
    maxIterations = 50,
    trace = false,
    depNoCrossing = false,
    depAllowLoops = false,
    numWindows = 2,
    alwaysSpan = false
  } = {}) {
    this.numWindows = numWindows;
    this.alwaysSpan = alwaysSpan;
    this.grammar = grammar;
    grammar.traceMode = trace;
    grammar.depBlockCrossing = depNoCrossing;
    grammar.depBlockLoops = !depAllowLoops;
    this.maxIterations = maxIterations;
    this._relationMap = /* @__PURE__ */ new Map();
  }
  /** Run all sections on a single window. */
  runWindow(window2, numSections = null) {
    setAlwaysSpan(this.alwaysSpan);
    window2.markEnd();
    window2.resolveInputDependencies();
    if (this.grammar.hasRelations) window2.resolveInputRelations(this._relationMap);
    for (const rule of this.grammar.beforeSections) rule.applyToWindow(window2, this.grammar);
    let sectionsToRun = this.grammar.sections;
    if (numSections !== null && numSections !== void 0) sectionsToRun = sectionsToRun.slice(0, numSections);
    let rulesSoFar = [];
    for (const sectionRules of sectionsToRun) {
      rulesSoFar = rulesSoFar.concat(sectionRules);
      for (let n = 0; n < this.maxIterations; n++) {
        let changed = false;
        for (const rule of rulesSoFar) {
          if (rule.applyToWindow(window2, this.grammar) && rule.iterates) changed = true;
        }
        if (!changed) break;
      }
    }
    for (const rule of this.grammar.afterSections) rule.applyToWindow(window2, this.grammar);
    const traceMode = Boolean(this.grammar.traceMode);
    for (const cohort of window2.cohorts) cohort.dedupeReadings(traceMode);
    return window2;
  }
  /**
   * Streamingly process windows from an iterable of lines (or a string).
   *
   * Like vislcg3 this keeps a few windows around the one being run, so that contextual tests with W, < and > can look
   * into them: the windows already run (the last `numWindows` of them) and the ones read ahead (`numWindows` full ones,
   * and the begin cohort of the one after, which is there as soon as it has been started). A window is handed on once
   * it falls out of the windows behind. FLUSH in the input runs and hands on everything.
   */
  *runStream(lines, numSections = null) {
    const mp = this.grammar ? this.grammar.mappingPrefix : "@";
    if (typeof lines === "string") lines = linesOf(lines);
    const ahead = this.numWindows + 2;
    this.grammar.depHasSpanned = false;
    let counter = 0;
    let depOn = false;
    const waiting = [];
    const behind = [];
    const handOn = (win) => {
      win.depSpanned = this.grammar.depHasSpanned;
      win.depPrint = depOn;
      return win;
    };
    const runFirst = (phantom) => {
      const out = [];
      while (behind.length > this.numWindows) {
        const done = behind.shift();
        if (behind.length) behind[0].previous = null;
        out.push(handOn(done));
      }
      const win = waiting.shift();
      let hidden = null;
      if (phantom && waiting.length) {
        hidden = waiting[waiting.length - 1];
        const stub = new SingleWindow();
        stub.begin = hidden.begin;
        stub.previous = waiting.length > 1 ? waiting[waiting.length - 2] : win;
        stub.next = null;
        stub.previous.next = stub;
        waiting[waiting.length - 1] = stub;
      }
      if (behind.length) {
        win.previous = behind[behind.length - 1];
        win.previous.next = win;
      }
      this.runWindow(win, numSections);
      depOn = depOn || win.hasDep;
      if (hidden !== null) {
        waiting[waiting.length - 1] = hidden;
        hidden.previous.next = hidden;
      }
      win.next = waiting.length ? waiting[0] : null;
      behind.push(win);
      return out;
    };
    for (const window2 of parseStream(lines, this.grammar.delimiters, mp, 500, this.grammar.hasRelations, this.grammar.hasDep)) {
      counter++;
      if (window2.cohorts.some((c) => c.depIn !== null)) depOn = true;
      window2.number = counter;
      window2.markEnd();
      if (waiting.length) {
        waiting[waiting.length - 1].next = window2;
        window2.previous = waiting[waiting.length - 1];
      } else if (behind.length) {
        behind[behind.length - 1].next = window2;
        window2.previous = behind[behind.length - 1];
      }
      waiting.push(window2);
      const flush = window2.flushAfter;
      while (waiting.length >= ahead && !flush) yield* runFirst(true);
      if (flush) {
        while (waiting.length) yield* runFirst(false);
        while (behind.length) yield handOn(behind.shift());
      }
    }
    while (waiting.length) yield* runFirst(false);
    while (behind.length) yield handOn(behind.shift());
  }
  /** Run grammar on input string and return formatted output string. */
  runText(inputText, { numSections = null, showRules = false, trace = false, pipeDeleted = false } = {}) {
    const windows = [...this.runStream(inputText, numSections)];
    const parts = windows.map((w) => w.toText({ showRules, trace, pipeDeleted }));
    return parts.join("\n") + (parts.length ? "\n" : "");
  }
};

// node_modules/@rueter/jscg3/src/pipeline.js
var VARIANT = /^v\d+$/;
var WEIGHT = /^<W:([-+0-9.eE]+)>$/;
function pyFloat(x) {
  x = Number(x);
  if (!Number.isFinite(x)) return Number.isNaN(x) ? "nan" : x > 0 ? "inf" : "-inf";
  if (x === 0) return Object.is(x, -0) ? "-0.0" : "0.0";
  const [mant, exp] = x.toExponential().split("e");
  const e = parseInt(exp, 10);
  if (e < -4 || e >= 16) return `${mant}e${e < 0 ? "-" : "+"}${String(Math.abs(e)).padStart(2, "0")}`;
  const s = String(x);
  return Number.isInteger(x) ? s + ".0" : s;
}
function analysisToCg(analysis, weight = 0, { dropVariants = true } = {}) {
  const parts = analysis.split("#").map((part) => {
    const [lemma, ...rest] = part.split("+");
    return [lemma, dropVariants ? rest.filter((t) => !VARIANT.test(t)) : rest];
  });
  const lines = [];
  [...parts].reverse().forEach(([lemma, tags], k) => {
    const depth = k + 1;
    const w = depth === 1 ? ` <W:${pyFloat(weight)}>` : "";
    lines.push("	".repeat(depth) + `"${lemma}"` + (tags.length ? " " + tags.join(" ") : "") + w);
  });
  return lines;
}
function analysesToCg(words2, morphologies, options = {}) {
  const out = [];
  words2.forEach((word, index) => {
    if (!word) return;
    const analyses = index < morphologies.length ? morphologies[index] : [];
    out.push(`"<${word}>"`);
    const seen = /* @__PURE__ */ new Set();
    for (const item of analyses) {
      const analysis = item[0];
      const weight = item.length > 1 ? item[1] : 0;
      if (seen.has(analysis)) continue;
      seen.add(analysis);
      out.push(...analysisToCg(analysis, weight, options));
    }
    if (!seen.size) out.push(`	"${word}" ?`);
  });
  return out.join("\n") + "\n";
}
var CgWord = class {
  constructor(form, lemma, morphology, subReadings = null, trace = null) {
    this.form = form;
    this.lemma = lemma;
    this.morphology = morphology;
    this.tags = morphology.filter((t) => !WEIGHT.test(t));
    const m = morphology.map((t) => WEIGHT.exec(t)).find((x) => x);
    this.weight = m ? Number(m[1]) : 0;
    this.subReadings = subReadings || [];
    this.trace = trace || [];
  }
  /** Back to the shape pyhfst gives: ["lemma+Tag+Tag", weight]; the next tool can take it from there. */
  analysis() {
    return [this.lemma + this.tags.map((t) => "+" + t).join(""), this.weight];
  }
  toString() {
    return `<${this.lemma} - ${this.morphology.join(", ")}>`;
  }
};
function readingToWord(form, reading, keepTrace) {
  const subs = reading.subReadings.map((sub) => readingToWord(form, sub, keepTrace));
  return new CgWord(form, reading.baseform.replace(/^"+|"+$/g, ""), [...reading.tags], subs, keepTrace ? [...reading.trace] : null);
}
var Cg = class _Cg {
  /** grammars: parsed Grammar objects or grammar texts. names label the stages. */
  constructor(grammars, { names = null, trace = false } = {}) {
    const parsed = grammars.map((g) => g instanceof Grammar ? g : new GrammarParser().parse(g));
    this.names = names ? [...names] : parsed.map((_, i) => `stage${i + 1}`);
    this.trace = trace;
    this._engines = parsed.map((g, i) => new Disambiguator(g, { trace: trace && i === parsed.length - 1 }));
  }
  /** Grammar texts, run in the order given. */
  static fromTexts(texts, options = {}) {
    return new _Cg(texts, options);
  }
  /** A CG stream through all the grammars; the stream out. */
  runText(cgInput) {
    let text = cgInput;
    this._engines.forEach((engine, number) => {
      const last = number === this._engines.length - 1;
      const windows = [...engine.runStream(text)];
      text = windows.map((w) => w.toText({ trace: this.trace && last, pipeDeleted: false }) + "\n").join("");
    });
    return text;
  }
  /**
   * [[word, [CgWord, ...]], ...] for the words, in order. morphologies: one list of [analysis, weight] pairs
   * per word, as pyhfst's lookup gives them. options go to analysisToCg (dropVariants).
   */
  disambiguate(words2, morphologies, options = {}) {
    const kept = [];
    words2.forEach((w, i) => {
      if (w) kept.push([w, i < morphologies.length ? morphologies[i] : []]);
    });
    const ws = kept.map(([w]) => w);
    const ms = kept.map(([, m]) => m);
    const engines = this._engines;
    let text = analysesToCg(ws, ms, options);
    for (const engine of engines.slice(0, -1)) {
      text = [...engine.runStream(text)].map((w) => w.toText({ pipeDeleted: false }) + "\n").join("");
    }
    const out = [];
    for (const window2 of engines[engines.length - 1].runStream(text)) {
      for (const cohort of window2.cohorts) {
        const form = cohort.wordform.slice(2, -2);
        out.push([form, cohort.orderedReadings().filter((r) => !r.deleted).map((r) => readingToWord(form, r, this.trace))]);
      }
    }
    return out;
  }
  /** A result as pyhfst-shaped analyses again. */
  toMorphologies(result) {
    return [...result].map(([, readings]) => readings.map((w) => w.analysis()));
  }
};

// src/cg3.js
function grammarText(model) {
  if (typeof model === "string") {
    return (0, import_node_fs2.readFileSync)(model, "utf8");
  }
  const bytes = model instanceof Uint8Array ? model : new Uint8Array(model);
  return new TextDecoder().decode(bytes);
}
var Cg3 = class {
  /**
   * @param {string} language Language whose CG3 grammar is used.
   * @param {string[] | null} [morphologyLanguages=null]
   */
  constructor(language, morphologyLanguages = null) {
    if (!language || typeof language !== "string") {
      throw new TypeError("Cg3 requires a language code.");
    }
    this.language = language;
    this.morphologyLanguages = Array.from(
      /* @__PURE__ */ new Set([...morphologyLanguages || [], language])
    );
    this.path = "cg3";
    this.cg = null;
    this._loading = null;
  }
  /**
   * Loads and parses this instance's `disambiguator.cg3` grammar once.
   * @returns {Promise<Cg>}
   */
  async load() {
    if (this.cg) return this.cg;
    if (this._loading) return this._loading;
    this._loading = (async () => {
      const storage = await getStorage();
      let model = await storage.getModel(this.language, "cg3");
      if (!model) {
        await download(this.language, { models: ["cg3"] });
        model = await storage.getModel(this.language, "cg3");
      }
      if (!model) {
        throw new Error(
          `CG3 grammar for language "${this.language}" is not available. Use download("${this.language}", { models: ['cg3'] }) to download it.`
        );
      }
      this.cg = Cg.fromTexts([grammarText(model)], {
        names: [this.language]
      });
      return this.cg;
    })();
    try {
      return await this._loading;
    } finally {
      this._loading = null;
    }
  }
  /**
   * Disambiguates an ordered list of wordforms.
   *
   * @param {string[]} words
   * @param {object | boolean} [options={}]
   * @param {boolean} [options.descriptive=true]
   * @param {boolean} [options.neuralFallback=false] Kept for Python API parity.
   * @param {boolean} [options.neural_fallback=false] Snake-case alias.
   * @param {Array<Array<[string, number]>>} [options.morphologies]
   *   Precomputed analyses, one list per word. This is useful for pipelines.
   * @returns {Promise<Array<[string, import('@rueter/jscg3').CgWord[]]>>}
   */
  async disambiguate(words2, options = {}) {
    if (!Array.isArray(words2) || !words2.every((word) => typeof word === "string")) {
      throw new TypeError("Cg3.disambiguate expects an array of strings.");
    }
    const opts = typeof options === "boolean" ? { descriptive: options } : options || {};
    const engine = await this.load();
    const morphologies = opts.morphologies || await this.analyze(words2, opts);
    if (!Array.isArray(morphologies)) {
      throw new TypeError("options.morphologies must be an array of analyses.");
    }
    return engine.disambiguate(words2, morphologies, opts.cgOptions);
  }
  /**
   * Creates the morphology input expected by jscg3. When several morphology
   * languages are configured, alternatives are combined for each word.
   *
   * @param {string[]} words
   * @param {object} options
   * @returns {Promise<Array<Array<[string, number]>>>}
   */
  async analyze(words2, options) {
    const descriptive = options.descriptive ?? true;
    const analyses = await Promise.all(
      words2.map(async (word) => {
        const perLanguage = await Promise.all(
          this.morphologyLanguages.map(
            (language) => analyze(word, language, {
              descriptive,
              neuralFallback: options.neuralFallback ?? options.neural_fallback ?? false
            })
          )
        );
        return perLanguage.flat();
      })
    );
    return analyses;
  }
  /**
   * Converts a CG3 result back to UralicNLP morphology tuples.
   * @param {Array<[string, import('@rueter/jscg3').CgWord[]]>} result
   * @returns {Array<Array<[string, number]>>}
   */
  toMorphologies(result) {
    if (!this.cg) {
      throw new Error("The CG3 grammar has not been loaded yet.");
    }
    return this.cg.toMorphologies(result);
  }
};
var Cg3Pipe = class {
  /** @param {...Cg3} cgs */
  constructor(...cgs) {
    if (!cgs.length || !cgs.every((cg) => cg instanceof Cg3)) {
      throw new TypeError("Cg3Pipe requires one or more Cg3 instances.");
    }
    this.cgs = cgs;
  }
  /**
   * @param {string[]} words
   * @param {object | boolean} [options={}]
   * @returns {Promise<Array<[string, import('@rueter/jscg3').CgWord[]]>>}
   */
  async disambiguate(words2, options = {}) {
    const opts = typeof options === "boolean" ? { descriptive: options } : options || {};
    let morphologies = opts.morphologies;
    let result;
    for (const cg of this.cgs) {
      result = await cg.disambiguate(words2, { ...opts, morphologies });
      morphologies = cg.toMorphologies(result);
    }
    return result;
  }
};

// src/index.js
var uralicNLP = {
  lemmatize,
  analyze,
  generate,
  segment,
  get_translation,
  getTranslation,
  tokenizer: tokenizer_default,
  Cg3,
  Cg3Pipe,
  sentences,
  words,
  tokenize,
  download,
  is_language_installed,
  isLanguageInstalled,
  supported_languages,
  supportedLanguages,
  uninstall,
  deleteLanguage,
  delete_language,
  get_transducer,
  getTransducer,
  clearCache,
  clear_cache,
  setDownloadServerUrl,
  getDownloadServerUrl,
  removeSymbols,
  removeAnalysisSymbols,
  addLanguageFlag,
  filterArabic,
  uralicApi,
  getStorage,
  setStorage,
  isNodeEnvironment,
  isBrowserEnvironment,
  MemoryStorage
};
var index_default = uralicNLP;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Cg3,
  Cg3Pipe,
  MemoryStorage,
  addLanguageFlag,
  analyze,
  clearCache,
  clear_cache,
  deleteLanguage,
  delete_language,
  download,
  filterArabic,
  generate,
  getDownloadServerUrl,
  getStorage,
  getTransducer,
  getTranslation,
  get_transducer,
  get_translation,
  isBrowserEnvironment,
  isLanguageInstalled,
  isNodeEnvironment,
  is_language_installed,
  lemmatize,
  removeAnalysisSymbols,
  removeSymbols,
  segment,
  sentences,
  setDownloadServerUrl,
  setStorage,
  supportedLanguages,
  supported_languages,
  tokenize,
  tokenizer,
  uninstall,
  uralicApi,
  words
});
//# sourceMappingURL=uralicnlp.cjs.map
