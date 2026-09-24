var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
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

// src/storage/node-storage.js
var node_storage_exports = {};
__export(node_storage_exports, {
  NodeStorage: () => NodeStorage
});
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
var currentDir, NodeStorage;
var init_node_storage = __esm({
  "src/storage/node-storage.js"() {
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
        const defaultPackageModels = path.resolve(currentDir, "..", "..", "models");
        const userHomeModels = path.join(os.homedir(), ".uralicnlp");
        const folders = [...this.customFolders, defaultPackageModels, userHomeModels];
        const pyCandidate = path.join(
          os.homedir(),
          ".local/lib/python3.14/site-packages/uralicNLP/models"
        );
        if (fs.existsSync(pyCandidate) && !folders.includes(pyCandidate)) {
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
          path.join(os.homedir(), ".uralicnlp"),
          path.resolve(currentDir, "..", "..", "models")
        ];
        for (const folder of folders) {
          try {
            if (!fs.existsSync(folder)) {
              fs.mkdirSync(folder, { recursive: true });
            }
            fs.accessSync(folder, fs.constants.W_OK);
            return folder;
          } catch {
          }
        }
        const tmp = path.join(os.tmpdir(), ".uralicnlp");
        if (!fs.existsSync(tmp)) {
          fs.mkdirSync(tmp, { recursive: true });
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
          const candidate = path.join(baseFolder, language);
          if (fs.existsSync(candidate)) {
            try {
              const files = fs.readdirSync(candidate);
              if (files.length === 0) continue;
              let maxFileTime = 0;
              for (const f of files) {
                try {
                  const stat = fs.statSync(path.join(candidate, f));
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
        const filePath = path.join(dir, modelType);
        if (fs.existsSync(filePath)) {
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
        const targetDir = path.join(writableBase, language);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        const filePath = path.join(targetDir, modelType);
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
        await fs.promises.writeFile(filePath, buffer);
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
        const metaPath = path.join(dir, "metadata.json");
        if (fs.existsSync(metaPath)) {
          try {
            const text = await fs.promises.readFile(metaPath, "utf-8");
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
        const targetDir = path.join(writableBase, language);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        const filePath = path.join(targetDir, "metadata.json");
        await fs.promises.writeFile(
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
            fs.rmSync(dir, { recursive: true, force: true });
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
          if (fs.existsSync(base)) {
            try {
              const entries = fs.readdirSync(base, { withFileTypes: true });
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

// src/uralicApi.js
import { HfstInputStream } from "hfst-js";

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
function clearCache() {
  analyzerCache.clear();
  generatorCache.clear();
}
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
    const stream2 = new HfstInputStream(filename, cache);
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
  const stream = new HfstInputStream(modelData, cache);
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
  const [t1, t2] = await Promise.all([
    analyze(query, "dictionary", { filename: opts.filename1 }).catch(() => []),
    generate(query, "dictionary", { filename: opts.filename2 }).catch(() => [])
  ]);
  const res = {};
  for (const t of [...t1, ...t2]) {
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
  for (const key of Array.from(analyzerCache.keys())) {
    if (key.startsWith(`${language}:`)) analyzerCache.delete(key);
  }
  for (const key of Array.from(generatorCache.keys())) {
    if (key.startsWith(`${language}:`)) generatorCache.delete(key);
  }
}
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
  get_transducer,
  getTransducer,
  clearCache,
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

// src/index.js
var uralicNLP = {
  lemmatize,
  analyze,
  generate,
  segment,
  get_translation,
  getTranslation,
  tokenizer: tokenizer_default,
  sentences,
  words,
  tokenize,
  download,
  is_language_installed,
  isLanguageInstalled,
  supported_languages,
  supportedLanguages,
  uninstall,
  get_transducer,
  getTransducer,
  clearCache,
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
export {
  MemoryStorage,
  addLanguageFlag,
  analyze,
  clearCache,
  index_default as default,
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
  tokenizer_default as tokenizer,
  uninstall,
  uralicApi,
  words
};
//# sourceMappingURL=uralicnlp.esm.js.map
