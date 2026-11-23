import {
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
  filterArabic,
  uralicApi,
} from './uralicApi.js';

import tokenizer, {
  sentences,
  words,
  tokenize,
} from './tokenizer.js';

import { Cg3, Cg3Pipe } from './cg3.js';

import { BrowserStorage } from './storage/browser-storage.js';
import { MemoryStorage } from './storage/memory-storage.js';
import { setStorage, getStorage } from './storage/index.js';

// Initialize with BrowserStorage (IndexedDB) by default in client builds
if (
  typeof indexedDB !== 'undefined' ||
  (typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined')
) {
  setStorage(new BrowserStorage());
} else {
  setStorage(new MemoryStorage());
}

export {
  lemmatize,
  analyze,
  generate,
  segment,
  get_translation,
  getTranslation,
  tokenizer,
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
  BrowserStorage,
  MemoryStorage,
  setStorage,
  getStorage,
};

const uralicNLP = {
  lemmatize,
  analyze,
  generate,
  segment,
  get_translation,
  getTranslation,
  tokenizer,
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
  BrowserStorage,
  MemoryStorage,
  setStorage,
  getStorage,
};

if (typeof window !== 'undefined') {
  window.uralicNLP = uralicNLP;
}
if (typeof globalThis !== 'undefined') {
  globalThis.uralicNLP = uralicNLP;
}

export default uralicNLP;
