var uralicNLP = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
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
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/shims/empty-node-storage.js
  var empty_node_storage_exports = {};
  __export(empty_node_storage_exports, {
    NodeStorage: () => NodeStorage,
    default: () => empty_node_storage_default
  });
  var NodeStorage, empty_node_storage_default;
  var init_empty_node_storage = __esm({
    "src/shims/empty-node-storage.js"() {
      NodeStorage = class {
        constructor() {
          throw new Error("NodeStorage is not available in browser environment");
        }
      };
      empty_node_storage_default = NodeStorage;
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

  // src/browser.js
  var browser_exports = {};
  __export(browser_exports, {
    BrowserStorage: () => BrowserStorage,
    MemoryStorage: () => MemoryStorage,
    addLanguageFlag: () => addLanguageFlag,
    analyze: () => analyze,
    clearCache: () => clearCache,
    default: () => browser_default,
    download: () => download,
    filterArabic: () => filterArabic,
    generate: () => generate,
    getDownloadServerUrl: () => getDownloadServerUrl,
    getStorage: () => getStorage,
    getTransducer: () => getTransducer3,
    getTranslation: () => getTranslation,
    get_transducer: () => get_transducer2,
    get_translation: () => get_translation,
    isLanguageInstalled: () => isLanguageInstalled,
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

  // node_modules/hfst-js/src/constants.js
  var TRANSITION_TARGET_TABLE_START = 2147483648;
  var NO_SYMBOL_NUMBER = 65535;
  var NO_TABLE_INDEX = 4294967295;

  // node_modules/hfst-js/src/byte_array.js
  var float32ConvBuf = new ArrayBuffer(4);
  var float32ConvUint = new Uint32Array(float32ConvBuf);
  var float32ConvFloat = new Float32Array(float32ConvBuf);
  function uint32BitsToFloat32(uintVal) {
    float32ConvUint[0] = uintVal;
    return float32ConvFloat[0];
  }
  var BinaryReader = class {
    /**
     * @param {Uint8Array | ArrayBuffer | Buffer} input
     */
    constructor(input) {
      if (input instanceof Uint8Array) {
        this.bytes = input;
      } else if (input instanceof ArrayBuffer) {
        this.bytes = new Uint8Array(input);
      } else if (typeof Buffer !== "undefined" && Buffer.isBuffer(input)) {
        this.bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
      } else {
        throw new TypeError("Expected Uint8Array, Buffer, or ArrayBuffer");
      }
      this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
      this.offset = 0;
    }
    get remaining() {
      return this.bytes.length - this.offset;
    }
    readBytes(n) {
      if (this.offset + n > this.bytes.length) {
        throw new RangeError(
          `Unexpected end of binary data: requested ${n} bytes at offset ${this.offset}, but only ${this.bytes.length - this.offset} bytes remain`
        );
      }
      const slice = this.bytes.subarray(this.offset, this.offset + n);
      this.offset += n;
      return slice;
    }
    getUByte() {
      if (this.offset >= this.bytes.length) {
        throw new RangeError(`Unexpected end of data at offset ${this.offset}`);
      }
      const val = this.bytes[this.offset];
      this.offset += 1;
      return val;
    }
    getUShort() {
      const val = this.view.getUint16(this.offset, true);
      this.offset += 2;
      return val;
    }
    getUInt() {
      const val = this.view.getUint32(this.offset, true);
      this.offset += 4;
      return val;
    }
    getBool() {
      return this.getUInt() !== 0;
    }
    getFloat() {
      const val = this.view.getFloat32(this.offset, true);
      this.offset += 4;
      return val;
    }
  };

  // node_modules/hfst-js/src/flag_diacritic_operation.js
  var FlagDiacriticOperator = Object.freeze({
    P: 0,
    // Positive set
    N: 1,
    // Negative set
    R: 2,
    // Require
    D: 3,
    // Disallow
    C: 4,
    // Clear
    U: 5,
    // Unification
    0: "P",
    1: "N",
    2: "R",
    3: "D",
    4: "C",
    5: "U"
  });
  var FlagDiacriticOperation = class {
    /**
     * @param {number | null} [operation] - Flag diacritic operator (from FlagDiacriticOperator)
     * @param {number | null} [feat] - Feature index
     * @param {number | null} [val] - Value index
     */
    constructor(operation = null, feat = null, val = null) {
      if (operation !== null) {
        this.op = operation;
        this.feature = feat;
        this.value = val;
      } else {
        this.op = FlagDiacriticOperator.P;
        this.feature = NO_SYMBOL_NUMBER;
        this.value = 0;
      }
    }
    /**
     * Checks if the operation is a flag diacritic operation.
     * @returns {boolean}
     */
    isFlag() {
      return this.feature !== NO_SYMBOL_NUMBER;
    }
    is_flag() {
      return this.isFlag();
    }
  };

  // node_modules/hfst-js/src/transducer_header.js
  var TransducerHeader = class {
    /**
     * @param {BinaryReader} reader
     */
    constructor(reader) {
      let readBytes = reader.readBytes(5);
      if (this.beginsHfst3Header(readBytes)) {
        this.hfst3 = true;
        const remaining = reader.getUShort();
        reader.readBytes(remaining + 1);
        readBytes = reader.readBytes(56);
      } else {
        const rest = reader.readBytes(56 - 5);
        const combined = new Uint8Array(56);
        combined.set(readBytes);
        combined.set(rest, 5);
        readBytes = combined;
        this.hfst3 = false;
      }
      const subReader = new BinaryReader(readBytes);
      this.numberOfInputSymbols = subReader.getUShort();
      this.numberOfSymbols = subReader.getUShort();
      this.sizeOfTransitionIndexTable = subReader.getUInt();
      this.sizeOfTransitionTargetTable = subReader.getUInt();
      this.numberOfStates = subReader.getUInt();
      this.numberOfTransitions = subReader.getUInt();
      this.weighted = subReader.getBool();
      this.deterministic = subReader.getBool();
      this.inputDeterministic = subReader.getBool();
      this.minimized = subReader.getBool();
      this.cyclic = subReader.getBool();
      this.hasEpsilonEpsilonTransitions = subReader.getBool();
      this.hasInputEpsilonTransitions = subReader.getBool();
      this.hasInputEpsilonCycles = subReader.getBool();
      this.hasUnweightedInputEpsilonCycles = subReader.getBool();
      this.number_of_input_symbols = this.numberOfInputSymbols;
      this.number_of_symbols = this.numberOfSymbols;
      this.size_of_transition_index_table = this.sizeOfTransitionIndexTable;
      this.size_of_transition_target_table = this.sizeOfTransitionTargetTable;
      this.number_of_states = this.numberOfStates;
      this.number_of_transitions = this.numberOfTransitions;
      this.input_deterministic = this.inputDeterministic;
      this.has_epsilon_epsilon_transitions = this.hasEpsilonEpsilonTransitions;
      this.has_input_epsilon_transitions = this.hasInputEpsilonTransitions;
      this.has_input_epsilon_cycles = this.hasInputEpsilonCycles;
      this.has_unweighted_input_epsilon_cycles = this.hasUnweightedInputEpsilonCycles;
    }
    /**
     * Checks if the given bytes begin with the HFST3 header ("HFST\0").
     * @param {Uint8Array} bytes
     * @returns {boolean}
     */
    beginsHfst3Header(bytes) {
      return bytes.length >= 5 && bytes[0] === 72 && // 'H'
      bytes[1] === 70 && // 'F'
      bytes[2] === 83 && // 'S'
      bytes[3] === 84 && // 'T'
      bytes[4] === 0;
    }
    begins_hfst3_header(bytes) {
      return this.beginsHfst3Header(bytes);
    }
    getInputSymbolCount() {
      return this.numberOfInputSymbols;
    }
    get_input_symbol_count() {
      return this.numberOfInputSymbols;
    }
    getSymbolCount() {
      return this.numberOfSymbols;
    }
    get_symbol_count() {
      return this.numberOfSymbols;
    }
    getIndexTableSize() {
      return this.sizeOfTransitionIndexTable;
    }
    get_index_table_size() {
      return this.sizeOfTransitionIndexTable;
    }
    getTargetTableSize() {
      return this.sizeOfTransitionTargetTable;
    }
    get_target_table_size() {
      return this.sizeOfTransitionTargetTable;
    }
    isWeighted() {
      return this.weighted;
    }
    is_weighted() {
      return this.weighted;
    }
    hasHfst3Header() {
      return Boolean(this.hfst3);
    }
    has_hfst3_header() {
      return this.hasHfst3Header();
    }
  };

  // node_modules/hfst-js/src/transducer_alphabet.js
  var TransducerAlphabet = class {
    /**
     * @param {import('./byte_array.js').BinaryReader} reader
     * @param {number} numberOfSymbols
     */
    constructor(reader, numberOfSymbols) {
      this.keyTable = [];
      this.operations = {};
      const featureBucket = {};
      const valueBucket = { "": 0 };
      this.features = 0;
      let values = 1;
      const utf8Decoder = new TextDecoder("utf-8");
      const bytes = reader.bytes;
      for (let s = 0; s < numberOfSymbols; s++) {
        const startOffset = reader.offset;
        while (reader.offset < bytes.length && bytes[reader.offset] !== 0) {
          reader.offset++;
        }
        const ustring = utf8Decoder.decode(bytes.subarray(startOffset, reader.offset));
        if (reader.offset < bytes.length && bytes[reader.offset] === 0) {
          reader.offset++;
        }
        if (ustring.length > 5 && ustring.startsWith("@") && ustring.endsWith("@") && ustring[2] === ".") {
          const parts = ustring.slice(1, -1).split(".");
          if (parts.length < 2) {
            this.keyTable.push("");
            continue;
          }
          const ops = parts[0];
          const feats = parts[1];
          const vals = parts.length > 2 ? parts[2] : "";
          const op = FlagDiacriticOperator[ops];
          if (op === void 0 || typeof op !== "number") {
            this.keyTable.push("");
            continue;
          }
          if (!(vals in valueBucket)) {
            valueBucket[vals] = values;
            values++;
          }
          if (!(feats in featureBucket)) {
            featureBucket[feats] = this.features;
            this.features++;
          }
          this.operations[this.keyTable.length] = new FlagDiacriticOperation(
            op,
            featureBucket[feats],
            valueBucket[vals]
          );
          this.keyTable.push("");
          continue;
        }
        this.keyTable.push(ustring);
      }
      this.keyTable[0] = "";
    }
  };

  // node_modules/hfst-js/src/tables.js
  var IndexTable = class {
    /**
     * @param {import('./byte_array.js').BinaryReader} reader
     * @param {number} indicesCount
     */
    constructor(reader, indicesCount) {
      this.tiInputSymbols = new Uint16Array(indicesCount);
      this.tiTargets = new Uint32Array(indicesCount);
      const view = reader.view;
      let offset = reader.offset;
      for (let i = 0; i < indicesCount; i++) {
        this.tiInputSymbols[i] = view.getUint16(offset, true);
        this.tiTargets[i] = view.getUint32(offset + 2, true);
        offset += 6;
      }
      reader.offset = offset;
      this.ti_input_symbols = this.tiInputSymbols;
      this.ti_targets = this.tiTargets;
    }
    /**
     * Returns the input symbol at the given index.
     * @param {number} i
     * @returns {number}
     */
    getInput(i) {
      if (i < 0 || i >= this.tiInputSymbols.length) return NO_SYMBOL_NUMBER;
      return this.tiInputSymbols[i];
    }
    get_input(i) {
      return this.getInput(i);
    }
    /**
     * Returns the target index at the given index.
     * @param {number} i
     * @returns {number}
     */
    getTarget(i) {
      if (i < 0 || i >= this.tiTargets.length) return NO_TABLE_INDEX;
      return this.tiTargets[i];
    }
    get_target(i) {
      return this.getTarget(i);
    }
    /**
     * Checks if the given index is a final state.
     * @param {number} i
     * @returns {boolean}
     */
    isFinal(i) {
      if (i < 0 || i >= this.tiInputSymbols.length) return false;
      return this.tiInputSymbols[i] === NO_SYMBOL_NUMBER && this.tiTargets[i] !== NO_TABLE_INDEX;
    }
    is_final(i) {
      return this.isFinal(i);
    }
    /**
     * Returns the final weight for the given index.
     * In HFST index tables, the target uint32 bit pattern of a final state encodes a float32 weight.
     * @param {number} i
     * @returns {number}
     */
    getFinalWeight(i) {
      return uint32BitsToFloat32(this.tiTargets[i]);
    }
    get_final_weight(i) {
      return this.getFinalWeight(i);
    }
    /**
     * Returns the size of the index table.
     * @returns {number}
     */
    size() {
      return this.tiTargets.length;
    }
  };
  var TransitionTable = class {
    /**
     * @param {import('./byte_array.js').BinaryReader} reader
     * @param {number} transitionCount
     * @param {boolean} [isWeighted=true]
     */
    constructor(reader, transitionCount, isWeighted = true) {
      this.isWeighted = isWeighted;
      this.is_weighted = isWeighted;
      this.tiInputSymbols = new Uint16Array(transitionCount);
      this.tiOutputSymbols = new Uint16Array(transitionCount);
      this.tiTargets = new Uint32Array(transitionCount);
      this.tiWeights = isWeighted ? new Float32Array(transitionCount) : null;
      const view = reader.view;
      let offset = reader.offset;
      if (isWeighted) {
        for (let i = 0; i < transitionCount; i++) {
          this.tiInputSymbols[i] = view.getUint16(offset, true);
          this.tiOutputSymbols[i] = view.getUint16(offset + 2, true);
          this.tiTargets[i] = view.getUint32(offset + 4, true);
          this.tiWeights[i] = view.getFloat32(offset + 8, true);
          offset += 12;
        }
      } else {
        for (let i = 0; i < transitionCount; i++) {
          this.tiInputSymbols[i] = view.getUint16(offset, true);
          this.tiOutputSymbols[i] = view.getUint16(offset + 2, true);
          this.tiTargets[i] = view.getUint32(offset + 4, true);
          offset += 8;
        }
      }
      reader.offset = offset;
      this.ti_input_symbols = this.tiInputSymbols;
      this.ti_output_symbols = this.tiOutputSymbols;
      this.ti_targets = this.tiTargets;
      this.ti_weights = this.tiWeights;
    }
    /**
     * Returns the input symbol at the given position.
     * @param {number} pos
     * @returns {number}
     */
    getInput(pos) {
      if (pos < 0 || pos >= this.tiInputSymbols.length) return NO_SYMBOL_NUMBER;
      return this.tiInputSymbols[pos];
    }
    get_input(pos) {
      return this.getInput(pos);
    }
    /**
     * Returns the output symbol at the given position.
     * @param {number} pos
     * @returns {number}
     */
    getOutput(pos) {
      if (pos < 0 || pos >= this.tiOutputSymbols.length) return NO_SYMBOL_NUMBER;
      return this.tiOutputSymbols[pos];
    }
    get_output(pos) {
      return this.getOutput(pos);
    }
    /**
     * Returns the target index at the given position.
     * @param {number} pos
     * @returns {number}
     */
    getTarget(pos) {
      if (pos < 0 || pos >= this.tiTargets.length) return NO_TABLE_INDEX;
      return this.tiTargets[pos];
    }
    get_target(pos) {
      return this.getTarget(pos);
    }
    /**
     * Returns the weight at the given position.
     * @param {number} pos
     * @returns {number}
     */
    getWeight(pos) {
      if (!this.isWeighted) {
        throw new Error("Getting weights of unweighted FST.");
      }
      if (pos < 0 || pos >= this.tiWeights.length) return 0;
      return this.tiWeights[pos];
    }
    get_weight(pos) {
      return this.getWeight(pos);
    }
    /**
     * Checks if the given position is a final state.
     * @param {number} pos
     * @returns {boolean}
     */
    isFinal(pos) {
      if (pos < 0 || pos >= this.tiInputSymbols.length) return false;
      return this.tiInputSymbols[pos] === NO_SYMBOL_NUMBER && this.tiOutputSymbols[pos] === NO_SYMBOL_NUMBER && this.tiTargets[pos] === 1;
    }
    is_final(pos) {
      return this.isFinal(pos);
    }
    /**
     * Returns the size of the transition table.
     * @returns {number}
     */
    size() {
      return this.tiTargets.length;
    }
  };

  // node_modules/hfst-js/src/result.js
  var Result = class {
    /**
     * @param {string[]} symbols - List of symbols in the result.
     * @param {number} weight - Weight associated with the result.
     */
    constructor(symbols, weight) {
      this.symbols = symbols;
      this.weight = weight;
    }
    /**
     * Returns the list of symbols in the result.
     * @returns {string[]}
     */
    getSymbols() {
      return this.symbols;
    }
    get_symbols() {
      return this.symbols;
    }
    /**
     * Returns the weight associated with the result.
     * @returns {number}
     */
    getWeight() {
      return this.weight;
    }
    get_weight() {
      return this.weight;
    }
    /**
     * Returns a string representation of the result in the format "(text: weight)".
     * @returns {string}
     */
    toString() {
      return this.symbols.join("") + ": " + this.weight;
    }
    __str__() {
      return this.toString();
    }
  };

  // node_modules/hfst-js/src/state.js
  var State = class {
    /**
     * @param {string} input - The input string to be analyzed.
     * @param {import('./transducer.js').Transducer} parent - The parent transducer.
     */
    constructor(input, parent) {
      this.parent = parent;
      this.state_stack = [];
      const neutral = new Array(parent.alphabet.features).fill(0);
      this.state_stack.push(neutral);
      this.output_string = new Array(1e3).fill(NO_SYMBOL_NUMBER);
      this.input_string = Array.from(this.findKey(input));
      this.output_pointer = 0;
      this.input_pointer = 0;
      this.current_weight = 0;
      this.display_vector = [];
    }
    get stateStack() {
      return this.state_stack;
    }
    set stateStack(val) {
      this.state_stack = val;
    }
    get outputString() {
      return this.output_string;
    }
    set outputString(val) {
      this.output_string = val;
    }
    get inputString() {
      return this.input_string;
    }
    set inputString(val) {
      this.input_string = val;
    }
    get outputPointer() {
      return this.output_pointer;
    }
    set outputPointer(val) {
      this.output_pointer = val;
    }
    get inputPointer() {
      return this.input_pointer;
    }
    set inputPointer(val) {
      this.input_pointer = val;
    }
    get currentWeight() {
      return this.current_weight;
    }
    set currentWeight(val) {
      this.current_weight = val;
    }
    get displayVector() {
      return this.display_vector;
    }
    set displayVector(val) {
      this.display_vector = val;
    }
    /**
     * Tokenizes the index string into symbol IDs matching the transducer symbol map.
     * Uses longest-prefix matching, identical to pyhfst.
     * @param {string} indexString
     * @returns {Generator<number, void, unknown>}
     */
    *findKey(indexString) {
      let i = 0;
      while (i < indexString.length) {
        let matchFound = false;
        for (let length = indexString.length - i; length > 0; length--) {
          const substr = indexString.slice(i, i + length);
          let mapPointer = this.parent.symbol_map;
          let fullMatch = true;
          for (let k = 0; k < substr.length; k++) {
            const char = substr[k];
            if (mapPointer && char in mapPointer) {
              mapPointer = mapPointer[char];
            } else {
              fullMatch = false;
              break;
            }
          }
          if (fullMatch) {
            if (mapPointer && null in mapPointer) {
              yield mapPointer[null];
              i += length - 1;
              matchFound = true;
            }
            break;
          }
        }
        if (!matchFound) {
          yield NO_SYMBOL_NUMBER;
        }
        i++;
      }
      yield NO_SYMBOL_NUMBER;
    }
    find_key(indexString) {
      return this.findKey(indexString);
    }
  };

  // node_modules/hfst-js/src/transducer.js
  var Transducer = class {
    /**
     * @param {BinaryReader | Uint8Array | ArrayBuffer | Buffer} file - Transducer data reader or buffer
     * @param {import('./transducer_header.js').TransducerHeader} h - Transducer header
     * @param {import('./transducer_alphabet.js').TransducerAlphabet} a - Transducer alphabet
     * @param {boolean} [isWeighted=true] - Whether the transducer is weighted
     */
    constructor(file, h, a, isWeighted = true) {
      const reader = file instanceof BinaryReader ? file : new BinaryReader(file);
      this.header = h;
      this.alphabet = a;
      this.is_weighted = isWeighted;
      this.isWeighted = isWeighted;
      this.operations = this.alphabet.operations;
      this.symbol_map = {};
      this.constructSymbolMap();
      this.index_table = new IndexTable(reader, h.getIndexTableSize());
      this.indexTable = this.index_table;
      this.transition_table = new TransitionTable(
        reader,
        h.getTargetTableSize(),
        this.is_weighted
      );
      this.transitionTable = this.transition_table;
    }
    get symbolMap() {
      return this.symbol_map;
    }
    set symbolMap(val) {
      this.symbol_map = val;
    }
    /**
     * Constructs the prefix trie / symbol map from the transducer alphabet.
     */
    constructSymbolMap() {
      for (let i = 0; i < this.header.getInputSymbolCount(); i++) {
        const w = this.alphabet.keyTable[i];
        if (w.length <= 1) {
          if (!(w in this.symbol_map)) {
            this.symbol_map[w] = { [null]: i };
          } else {
            this.symbol_map[w][null] = i;
          }
        } else {
          if (!(w[0] in this.symbol_map)) {
            this.symbol_map[w[0]] = {};
          }
          let o = this.symbol_map[w[0]];
          for (let j = 1; j < w.length; j++) {
            const c = w[j];
            if (!(c in o)) {
              o[c] = {};
            }
            o = o[c];
          }
          if (null in o) {
            throw new Error("Duplicate symbol in symbol map");
          }
          o[null] = i;
        }
      }
    }
    construct_symbol_map() {
      this.constructSymbolMap();
    }
  };

  // node_modules/hfst-js/src/analyzer.js
  function getNowSeconds() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now() / 1e3;
    }
    return Date.now() / 1e3;
  }
  var Analyzer = class {
    /**
     * @param {import('./transducer.js').Transducer} transducer
     * @param {string} inputStr
     * @param {number} [timeCutoff=0.0] - Maximum time in seconds for the lookup operation (0.0 = no limit)
     */
    constructor(transducer, inputStr, timeCutoff = 0) {
      this.transducer = transducer;
      this.input_str = inputStr;
      this.inputStr = inputStr;
      this.state = new State(inputStr, this.transducer);
      this.time_cutoff = timeCutoff;
      this.timeCutoff = timeCutoff;
      this.start_time = timeCutoff > 0 ? getNowSeconds() : 0;
      this.startTime = this.start_time;
    }
    /**
     * Computes the pivot for the given index.
     * If i >= TRANSITION_TARGET_TABLE_START (2^31), shifts it to point into the transition table.
     * @param {number} i
     * @returns {number}
     */
    pivot(i) {
      if (i >= TRANSITION_TARGET_TABLE_START) {
        return i - TRANSITION_TARGET_TABLE_START;
      }
      return i;
    }
    /**
     * Checks if the time cutoff has been exceeded.
     * @returns {boolean}
     */
    isTimeExceeded() {
      if (this.timeCutoff > 0) {
        const elapsed = getNowSeconds() - this.startTime;
        return elapsed > this.timeCutoff;
      }
      return false;
    }
    is_time_exceeded() {
      return this.isTimeExceeded();
    }
    /**
     * Tries epsilon indices for the given index.
     * @param {number} index
     */
    tryEpsilonIndices(index) {
      if (this.transducer.index_table.getInput(index) === 0) {
        this.tryEpsilonTransitions(
          this.pivot(this.transducer.index_table.getTarget(index))
        );
      }
    }
    try_epsilon_indices(index) {
      this.tryEpsilonIndices(index);
    }
    /**
     * Tries epsilon transitions for the given index.
     * @param {number} index
     */
    tryEpsilonTransitions(index) {
      while (true) {
        const inputSymbol = this.transducer.transition_table.getInput(index);
        if (this.transducer.operations[inputSymbol]) {
          if (!this.pushState(this.transducer.operations[inputSymbol])) {
            index++;
            continue;
          }
          this.handleEpsilonTransition(index);
          index++;
          this.state.state_stack.pop();
          continue;
        } else if (inputSymbol === 0) {
          this.handleEpsilonTransition(index);
          index++;
          continue;
        } else {
          break;
        }
      }
    }
    try_epsilon_transitions(index) {
      this.tryEpsilonTransitions(index);
    }
    /**
     * Finds the index in the transducer for the given index.
     * @param {number} index
     */
    findIndex(index) {
      const prevSym = this.state.input_string[this.state.input_pointer - 1];
      if (this.transducer.index_table.getInput(index + prevSym) === prevSym) {
        this.findTransitions(
          this.pivot(this.transducer.index_table.getTarget(index + prevSym))
        );
      }
    }
    find_index(index) {
      this.findIndex(index);
    }
    /**
     * Handles epsilon transitions for the given index.
     * @param {number} index
     */
    handleEpsilonTransition(index) {
      this.updateOutputString(this.transducer.transition_table.getOutput(index));
      this.state.output_pointer++;
      if (this.transducer.is_weighted) {
        this.state.current_weight += this.transducer.transition_table.getWeight(index);
      }
      this.getAnalyses(this.transducer.transition_table.getTarget(index));
      if (this.transducer.is_weighted) {
        this.state.current_weight -= this.transducer.transition_table.getWeight(index);
      }
      this.state.output_pointer--;
    }
    handle_epsilon_transition(index) {
      this.handleEpsilonTransition(index);
    }
    /**
     * Finds transitions in the transducer for the given index.
     * @param {number} index
     */
    findTransitions(index) {
      const tableSize = this.transducer.transition_table.size();
      const prevSym = this.state.input_string[this.state.input_pointer - 1];
      for (let idx = index; idx < tableSize; idx++) {
        const inputSymbol = this.transducer.transition_table.getInput(idx);
        if (inputSymbol === NO_SYMBOL_NUMBER) {
          break;
        }
        if (inputSymbol === prevSym) {
          this.updateOutputString(this.transducer.transition_table.getOutput(idx));
          this.state.output_pointer++;
          if (this.transducer.is_weighted) {
            this.state.current_weight += this.transducer.transition_table.getWeight(idx);
          }
          this.getAnalyses(this.transducer.transition_table.getTarget(idx));
          if (this.transducer.is_weighted) {
            this.state.current_weight -= this.transducer.transition_table.getWeight(idx);
          }
          this.state.output_pointer--;
        } else {
          break;
        }
      }
    }
    find_transitions(index) {
      this.findTransitions(index);
    }
    /**
     * Gets analyses for the given index.
     * @param {number} idx
     */
    getAnalyses(idx) {
      if (this.isTimeExceeded()) {
        return;
      }
      const index = this.pivot(idx);
      const isTransition = idx >= TRANSITION_TARGET_TABLE_START;
      if (isTransition) {
        const nextV = this.transducer.is_weighted ? this.pivot(index) : index;
        this.tryEpsilonTransitions(nextV + 1);
      } else {
        this.tryEpsilonIndices(index + 1);
      }
      if (this.state.input_string[this.state.input_pointer] === NO_SYMBOL_NUMBER) {
        this.handleEndOfInputString(index, isTransition);
        return;
      }
      this.state.input_pointer++;
      if (isTransition) {
        this.findTransitions(index + 1);
      } else {
        this.findIndex(index + 1);
      }
      this.state.input_pointer--;
      this.resetOutputPointer();
    }
    get_analyses(idx) {
      this.getAnalyses(idx);
    }
    /**
     * Updates the output string in the state based on the output symbol.
     * @param {number} outputSymbol
     */
    updateOutputString(outputSymbol) {
      if (this.state.output_pointer === this.state.output_string.length) {
        this.state.output_string.push(outputSymbol);
      } else {
        this.state.output_string[this.state.output_pointer] = outputSymbol;
      }
    }
    update_output_string(outputSymbol) {
      this.updateOutputString(outputSymbol);
    }
    /**
     * Handles reaching the end of the input string.
     * @param {number} index
     * @param {boolean} isTransition
     */
    handleEndOfInputString(index, isTransition) {
      this.resetOutputPointer();
      const [isFinal, weight] = this.getFinalAndWeight(index, isTransition);
      if (isFinal) {
        this.updateAndNoteAnalysis(weight);
      }
    }
    handle_end_of_input_string(index, isTransition) {
      this.handleEndOfInputString(index, isTransition);
    }
    /**
     * Resets the output pointer in the state to NO_SYMBOL_NUMBER.
     */
    resetOutputPointer() {
      if (this.state.output_pointer === this.state.output_string.length) {
        this.state.output_string.push(NO_SYMBOL_NUMBER);
      } else {
        this.state.output_string[this.state.output_pointer] = NO_SYMBOL_NUMBER;
      }
    }
    reset_output_pointer() {
      this.resetOutputPointer();
    }
    /**
     * Gets the final state flag and weight based on the index and transition flag.
     * @param {number} index
     * @param {boolean} isTransition
     * @returns {[boolean, number]}
     */
    getFinalAndWeight(index, isTransition) {
      let isFinal = false;
      let weight = 0;
      if (isTransition) {
        if (this.transducer.transition_table.size() > index) {
          isFinal = this.transducer.transition_table.isFinal(index);
          weight = this.transducer.is_weighted ? this.transducer.transition_table.getWeight(index) : 0;
        } else {
          isFinal = false;
          weight = 0;
        }
      } else {
        isFinal = this.transducer.index_table.isFinal(index);
        if (isFinal && this.transducer.is_weighted) {
          weight = this.transducer.index_table.getFinalWeight(index);
        } else {
          weight = 0;
        }
      }
      return [isFinal, weight];
    }
    get_final_and_weight(index, isTransition) {
      return this.getFinalAndWeight(index, isTransition);
    }
    /**
     * Updates current weight and records the completed analysis.
     * @param {number} weight
     */
    updateAndNoteAnalysis(weight) {
      if (this.transducer.is_weighted) {
        this.state.current_weight += weight;
      }
      this.noteAnalysis();
      if (this.transducer.is_weighted) {
        this.state.current_weight -= weight;
      }
    }
    update_and_note_analysis(weight) {
      this.updateAndNoteAnalysis(weight);
    }
    /**
     * Gets the symbols for the given state.
     * @returns {string[]}
     */
    getSymbols() {
      const symbols = [];
      for (let i = 0; i < this.state.output_string.length; i++) {
        const sym = this.state.output_string[i];
        if (sym !== NO_SYMBOL_NUMBER) {
          symbols.push(this.transducer.alphabet.keyTable[sym]);
        }
      }
      return symbols;
    }
    get_symbols() {
      return this.getSymbols();
    }
    /**
     * Notes the current analysis result into display_vector.
     */
    noteAnalysis() {
      this.state.display_vector.push(
        new Result(
          this.getSymbols(),
          this.transducer.is_weighted ? this.state.current_weight : 0
        )
      );
    }
    note_analysis() {
      this.noteAnalysis();
    }
    /**
     * Returns the alphabet of the transducer.
     * @returns {string[]}
     */
    getAlphabet() {
      return this.transducer.alphabet.keyTable;
    }
    get_alphabet() {
      return this.getAlphabet();
    }
    /**
     * Analyzes the input string using the transducer.
     * @returns {Result[]}
     */
    analyze() {
      if (this.state.input_string[0] === NO_SYMBOL_NUMBER) {
        return [];
      } else {
        this.getAnalyses(0);
        return this.state.display_vector;
      }
    }
    /**
     * Evaluates and pushes state for a flag diacritic operation.
     * @param {import('./flag_diacritic_operation.js').FlagDiacriticOperation} flag
     * @returns {boolean}
     */
    pushState(flag) {
      const stack = this.state.state_stack;
      const top = stack[stack.length - 1];
      if (flag.op === FlagDiacriticOperator.P) {
        const next = top.slice();
        next[flag.feature] = flag.value;
        stack.push(next);
        return true;
      } else if (flag.op === FlagDiacriticOperator.N) {
        const next = top.slice();
        next[flag.feature] = -1 * flag.value;
        stack.push(next);
        return true;
      } else if (flag.op === FlagDiacriticOperator.R) {
        if (flag.value === 0) {
          if (top[flag.feature] === 0) {
            return false;
          } else {
            stack.push(top.slice());
            return true;
          }
        } else if (top[flag.feature] === flag.value) {
          stack.push(top.slice());
          return true;
        }
        return false;
      } else if (flag.op === FlagDiacriticOperator.D) {
        if (flag.value === 0) {
          if (top[flag.feature] !== 0) {
            return false;
          } else {
            stack.push(top.slice());
            return true;
          }
        } else if (top[flag.feature] === flag.value) {
          return false;
        } else {
          stack.push(top.slice());
          return true;
        }
      } else if (flag.op === FlagDiacriticOperator.C) {
        const next = top.slice();
        next[flag.feature] = 0;
        stack.push(next);
        return true;
      } else if (flag.op === FlagDiacriticOperator.U) {
        if (top[flag.feature] === 0 || top[flag.feature] === flag.value || top[flag.feature] !== flag.value && top[flag.feature] < 0) {
          const next = top.slice();
          next[flag.feature] = flag.value;
          stack.push(next);
          return true;
        }
        return false;
      }
      return false;
    }
    push_state(flag) {
      return this.pushState(flag);
    }
  };

  // src/shims/empty-fs.js
  var readFileSync = () => {
    throw new Error("fs.readFileSync is not supported in browser environment");
  };
  var existsSync = () => false;
  var mkdirSync = () => {
  };
  var readdirSync = () => [];
  var statSync = () => ({ mtimeMs: 0 });
  var accessSync = () => {
  };
  var rmSync = () => {
  };
  var promises = {
    readFile: async () => {
      throw new Error("fs.promises.readFile is not supported in browser environment");
    },
    writeFile: async () => {
      throw new Error("fs.promises.writeFile is not supported in browser environment");
    }
  };
  var constants = { W_OK: 2 };
  var empty_fs_default = {
    readFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    statSync,
    accessSync,
    rmSync,
    promises,
    constants
  };

  // node_modules/hfst-js/src/core.js
  function getTransducer(input) {
    let buffer;
    if (input instanceof Uint8Array || input instanceof ArrayBuffer || typeof Buffer !== "undefined" && Buffer.isBuffer(input)) {
      buffer = input;
    } else if (input instanceof BinaryReader) {
      const reader2 = input;
      const header2 = new TransducerHeader(reader2);
      const alphabet2 = new TransducerAlphabet(reader2, header2.getSymbolCount());
      return new Transducer(reader2, header2, alphabet2, header2.isWeighted());
    } else {
      throw new TypeError(
        "getTransducer: expected Uint8Array, ArrayBuffer, Buffer, or BinaryReader"
      );
    }
    const reader = new BinaryReader(buffer);
    const header = new TransducerHeader(reader);
    const alphabet = new TransducerAlphabet(reader, header.getSymbolCount());
    return new Transducer(reader, header, alphabet, header.isWeighted());
  }
  var HfstInputStream = class _HfstInputStream {
    /**
     * @param {Uint8Array | ArrayBuffer | any} buffer
     * @param {boolean | { cache?: boolean }} [cache=true]
     */
    constructor(buffer, cache = true) {
      this.buffer = buffer;
      this.cache = typeof cache === "boolean" ? cache : cache?.cache ?? true;
    }
    /**
     * Reads the transducer and returns an Hfst wrapper instance.
     * @returns {Hfst}
     */
    read() {
      const tr = getTransducer(this.buffer);
      return new Hfst(tr, this.cache);
    }
    /**
     * Creates an HfstInputStream from a binary buffer.
     * @param {Uint8Array | ArrayBuffer} buffer
     * @param {boolean | { cache?: boolean }} [cache=true]
     * @returns {HfstInputStream}
     */
    static fromBuffer(buffer, cache = true) {
      return new _HfstInputStream(buffer, cache);
    }
    /**
     * Fetches an HFST transducer binary from a URL and returns an Hfst instance.
     * @param {string | URL} url
     * @param {{ cache?: boolean, fetchOptions?: RequestInit }} [options]
     * @returns {Promise<Hfst>}
     */
    static async fromUrl(url, { cache = true, fetchOptions } = {}) {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        throw new Error(`Failed to fetch transducer from ${url}: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const tr = getTransducer(arrayBuffer);
      return new Hfst(tr, cache);
    }
  };
  var Hfst = class {
    /**
     * @param {Transducer} tr - The transducer object.
     * @param {boolean} [cache=true] - Whether to cache lookup results.
     */
    constructor(tr, cache = true) {
      this.tr = tr;
      this.cache = cache;
      this.mem = /* @__PURE__ */ new Map();
    }
    static fromBuffer(buffer, cache = true) {
      return new HfstInputStream(buffer, cache).read();
    }
    static async fromUrl(url, options) {
      return HfstInputStream.fromUrl(url, options);
    }
    /**
     * Performs lookup on the input string and returns analyses as [analysis, weight] pairs.
     * @param {string} string
     * @param {number | { timeCutoff?: number, time_cutoff?: number }} [timeCutoff=0.0]
     * @returns {Array<[string, number]>}
     */
    lookup(string, timeCutoff = 0) {
      const cutoff = typeof timeCutoff === "number" ? timeCutoff : timeCutoff?.timeCutoff ?? timeCutoff?.time_cutoff ?? 0;
      let result;
      if (this.cache && cutoff === 0) {
        if (!this.mem.has(string)) {
          this.mem.set(string, new Analyzer(this.tr, string, cutoff).analyze());
        }
        result = this.mem.get(string);
      } else {
        result = new Analyzer(this.tr, string, cutoff).analyze();
      }
      return result.map((r) => [r.getSymbols().join(""), r.getWeight()]);
    }
    /**
     * Performs lookup on the input string and returns raw Result instances.
     * @param {string} string
     * @param {number | { timeCutoff?: number, time_cutoff?: number }} [timeCutoff=0.0]
     * @returns {Result[]}
     */
    lookupResults(string, timeCutoff = 0) {
      const cutoff = typeof timeCutoff === "number" ? timeCutoff : timeCutoff?.timeCutoff ?? timeCutoff?.time_cutoff ?? 0;
      if (this.cache && cutoff === 0) {
        if (!this.mem.has(string)) {
          this.mem.set(string, new Analyzer(this.tr, string, cutoff).analyze());
        }
        return this.mem.get(string);
      }
      return new Analyzer(this.tr, string, cutoff).analyze();
    }
  };

  // node_modules/hfst-js/src/hfst.js
  var HfstInputStream2 = class _HfstInputStream extends HfstInputStream {
    /**
     * @param {string | Buffer | Uint8Array | ArrayBuffer} pathOrBuffer
     * @param {boolean | { cache?: boolean }} [cache=true]
     */
    constructor(pathOrBuffer, cache = true) {
      let resolvedBuffer;
      if (typeof pathOrBuffer === "string") {
        resolvedBuffer = empty_fs_default.readFileSync(pathOrBuffer);
      } else {
        resolvedBuffer = pathOrBuffer;
      }
      super(resolvedBuffer, cache);
      this.path = pathOrBuffer;
    }
    /**
     * Creates an HfstInputStream from a file path.
     * @param {string} path
     * @param {boolean | { cache?: boolean }} [cache=true]
     * @returns {HfstInputStream}
     */
    static fromFile(path, cache = true) {
      return new _HfstInputStream(path, cache);
    }
    /**
     * Asynchronously reads a transducer from disk in Node.js.
     * @param {string} filePath
     * @param {boolean} [cache=true]
     * @returns {Promise<Hfst>}
     */
    static async fromFileAsync(filePath, cache = true) {
      const buffer = await empty_fs_default.promises.readFile(filePath);
      return new _HfstInputStream(buffer, cache).read();
    }
  };

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
        const { NodeStorage: NodeStorage2 } = await Promise.resolve().then(() => (init_empty_node_storage(), empty_node_storage_exports));
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
  async function get_transducer2(language, options = {}) {
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
      const stream2 = new HfstInputStream2(filename, cache);
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
    const stream = new HfstInputStream2(modelData, cache);
    const transducer = stream.read();
    if (cache) {
      cacheMap.set(cacheKey, transducer);
    }
    return transducer;
  }
  var getTransducer3 = get_transducer2;
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
    const transducer = await get_transducer2(language, {
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
    const transducer = await get_transducer2(language, {
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
    get_transducer: get_transducer2,
    getTransducer: getTransducer3,
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

  // src/browser.js
  init_browser_storage();
  if (typeof indexedDB !== "undefined" || typeof window !== "undefined" && typeof window.indexedDB !== "undefined") {
    setStorage(new BrowserStorage());
  } else {
    setStorage(new MemoryStorage());
  }
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
    get_transducer: get_transducer2,
    getTransducer: getTransducer3,
    clearCache,
    setDownloadServerUrl,
    getDownloadServerUrl,
    removeSymbols,
    removeAnalysisSymbols,
    addLanguageFlag,
    filterArabic,
    uralicApi,
    BrowserStorage,
    MemoryStorage,
    setStorage,
    getStorage
  };
  if (typeof window !== "undefined") {
    window.uralicNLP = uralicNLP;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.uralicNLP = uralicNLP;
  }
  var browser_default = uralicNLP;
  return __toCommonJS(browser_exports);
})();
//# sourceMappingURL=uralicnlp.bundle.js.map
