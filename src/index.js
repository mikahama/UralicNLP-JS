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
} from './uralicApi.js';

import tokenizer, {
  sentences,
  words,
  tokenize,
} from './tokenizer.js';

import {
  getStorage,
  setStorage,
  isNodeEnvironment,
  isBrowserEnvironment,
  MemoryStorage,
} from './storage/index.js';

export {
  // Core methods required by user specification
  lemmatize,
  analyze,
  generate,
  segment,
  get_translation,
  getTranslation,
  tokenizer,
  // Tokenizer individual functions
  sentences,
  words,
  tokenize,
  // Model management
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
  // Utility functions
  removeSymbols,
  removeAnalysisSymbols,
  addLanguageFlag,
  filterArabic,
  // Namespaces
  uralicApi,
  // Storage
  getStorage,
  setStorage,
  isNodeEnvironment,
  isBrowserEnvironment,
  MemoryStorage,
};

const uralicNLP = {
  lemmatize,
  analyze,
  generate,
  segment,
  get_translation,
  getTranslation,
  tokenizer,
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
  MemoryStorage,
};

export default uralicNLP;
