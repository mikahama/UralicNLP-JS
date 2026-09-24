/**
 * TypeScript definitions for uralicnlp
 */

export type AnalysisResult = [string, number];

export interface AnalyzeOptions {
  forceLocal?: boolean;
  force_local?: boolean;
  descriptive?: boolean;
  removeSymbols?: boolean;
  remove_symbols?: boolean;
  languageFlags?: boolean;
  language_flags?: boolean;
  dictionaryForms?: boolean;
  dictionary_forms?: boolean;
  filename?: string | Uint8Array | ArrayBuffer | null;
  segmentation?: boolean;
  timeCutoff?: number;
  time_cutoff?: number;
  cache?: boolean;
}

export interface GenerateOptions {
  forceLocal?: boolean;
  force_local?: boolean;
  descriptive?: boolean;
  dictionaryForms?: boolean;
  dictionary_forms?: boolean;
  removeSymbols?: boolean;
  remove_symbols?: boolean;
  filename?: string | Uint8Array | ArrayBuffer | null;
  timeCutoff?: number;
  time_cutoff?: number;
  cache?: boolean;
}

export interface LemmatizeOptions {
  forceLocal?: boolean;
  force_local?: boolean;
  descriptive?: boolean;
  wordBoundaries?: boolean;
  word_boundaries?: boolean;
  dictionaryForms?: boolean;
  dictionary_forms?: boolean;
  filename?: string | Uint8Array | ArrayBuffer | null;
}

export interface SegmentOptions {
  filename?: string | Uint8Array | ArrayBuffer | null;
  cache?: boolean;
}

export interface GetTranslationOptions {
  trans_lang?: string | null;
  transLang?: string | null;
  filename1?: string | Uint8Array | null;
  filename2?: string | Uint8Array | null;
}

export interface DownloadProgress {
  language: string;
  model: string;
  status: string;
}

export interface DownloadOptions {
  models?: string[];
  showProgress?: boolean;
  onProgress?: (progress: DownloadProgress) => void;
}

/**
 * Analyzes morphological forms for a word/query.
 */
export function analyze(
  query: string,
  language: string | string[],
  options?: AnalyzeOptions
): Promise<AnalysisResult[]>;
export function analyze(
  query: string,
  language: string | string[],
  forceLocal?: boolean,
  descriptive?: boolean,
  removeSymbols?: boolean,
  languageFlags?: boolean,
  dictionaryForms?: boolean,
  filename?: string | Uint8Array | null,
  segmentation?: boolean
): Promise<AnalysisResult[]>;

/**
 * Generates surface forms from morphological analysis tags.
 */
export function generate(
  query: string,
  language: string,
  options?: GenerateOptions
): Promise<AnalysisResult[]>;
export function generate(
  query: string,
  language: string,
  forceLocal?: boolean,
  descriptive?: boolean,
  dictionaryForms?: boolean,
  removeSymbols?: boolean,
  filename?: string | Uint8Array | null
): Promise<AnalysisResult[]>;

/**
 * Extracts base lemma(s) from a wordform.
 */
export function lemmatize(
  word: string,
  language: string,
  options?: LemmatizeOptions
): Promise<string[]>;
export function lemmatize(
  word: string,
  language: string,
  forceLocal?: boolean,
  descriptive?: boolean,
  wordBoundaries?: boolean,
  dictionaryForms?: boolean,
  filename?: string | Uint8Array | null
): Promise<string[]>;

/**
 * Segments a word into morphemes using the morpher transducer.
 */
export function segment(
  query: string,
  language: string,
  options?: SegmentOptions
): Promise<string[][]>;

/**
 * Looks up dictionary translations for a lemma.
 */
export function get_translation(
  lemma: string,
  lang: string,
  trans_lang?: string | null,
  options?: GetTranslationOptions
): Promise<string[] | Record<string, string[]>>;

export function get_translation(
  lemma: string,
  lang: string,
  options?: GetTranslationOptions
): Promise<Record<string, string[]>>;

export const getTranslation: typeof get_translation;

/**
 * Checks if a language is installed in local storage.
 */
export function is_language_installed(language: string): Promise<boolean>;
export const isLanguageInstalled: typeof is_language_installed;

/**
 * Downloads language models and saves to storage.
 */
export function download(
  language: string,
  options?: DownloadOptions
): Promise<void>;

/**
 * Retrieves supported languages list from server.
 */
export function supported_languages(): Promise<any>;
export const supportedLanguages: typeof supported_languages;

/**
 * Uninstalls language models.
 */
export function uninstall(language: string): Promise<void>;

/**
 * Loads transducer from storage or filename, with caching.
 */
export function get_transducer(
  language: string,
  options?: any
): Promise<any>;
export const getTransducer: typeof get_transducer;

/**
 * Clears in-memory transducer caches.
 */
export function clearCache(): void;

/**
 * Sets download server base URL.
 */
export function setDownloadServerUrl(url: string): void;

/**
 * Returns current download server base URL.
 */
export function getDownloadServerUrl(): string;

/**
 * Removes symbols / flag diacritics (@...@) from string.
 */
export function removeSymbols(string: string): string;
export function removeAnalysisSymbols(
  results: AnalysisResult[]
): AnalysisResult[];
export function addLanguageFlag(
  results: AnalysisResult[],
  language: string
): AnalysisResult[];
export function filterArabic(
  text: string,
  keepVowels?: boolean,
  combineBy?: string
): string;

/**
 * Tokenizer interface
 */
export namespace tokenizer {
  export function sentences(text: string): string[];
  export function words(text: string): string[];
  export function tokenize(text: string): string[][];
}

export function sentences(text: string): string[];
export function words(text: string): string[];
export function tokenize(text: string): string[][];

export const uralicApi: {
  analyze: typeof analyze;
  generate: typeof generate;
  lemmatize: typeof lemmatize;
  segment: typeof segment;
  get_translation: typeof get_translation;
  getTranslation: typeof getTranslation;
  download: typeof download;
  is_language_installed: typeof is_language_installed;
  isLanguageInstalled: typeof isLanguageInstalled;
  supported_languages: typeof supported_languages;
  supportedLanguages: typeof supportedLanguages;
  uninstall: typeof uninstall;
  get_transducer: typeof get_transducer;
  getTransducer: typeof getTransducer;
  clearCache: typeof clearCache;
  setDownloadServerUrl: typeof setDownloadServerUrl;
  getDownloadServerUrl: typeof getDownloadServerUrl;
  removeSymbols: typeof removeSymbols;
  removeAnalysisSymbols: typeof removeAnalysisSymbols;
  addLanguageFlag: typeof addLanguageFlag;
  filterArabic: typeof filterArabic;
};

export interface IModelStorage {
  hasModel(language: string, modelType: string): Promise<boolean>;
  getModel(language: string, modelType: string): Promise<any>;
  saveModel(language: string, modelType: string, data: any): Promise<void>;
  isLanguageInstalled(language: string): Promise<boolean>;
  uninstall(language: string): Promise<void>;
  listInstalledLanguages?(): Promise<string[]>;
}

export class MemoryStorage implements IModelStorage {
  hasModel(language: string, modelType: string): Promise<boolean>;
  getModel(language: string, modelType: string): Promise<Uint8Array | null>;
  saveModel(language: string, modelType: string, data: any): Promise<void>;
  isLanguageInstalled(language: string): Promise<boolean>;
  uninstall(language: string): Promise<void>;
  listInstalledLanguages(): Promise<string[]>;
}

export class BrowserStorage implements IModelStorage {
  constructor(dbName?: string);
  getDb(): Promise<IDBDatabase>;
  hasModel(language: string, modelType: string): Promise<boolean>;
  getModel(language: string, modelType: string): Promise<Uint8Array | null>;
  saveModel(language: string, modelType: string, data: any): Promise<void>;
  isLanguageInstalled(language: string): Promise<boolean>;
  uninstall(language: string): Promise<void>;
  listInstalledLanguages(): Promise<string[]>;
}

export class NodeStorage implements IModelStorage {
  constructor(customFolders?: string[]);
  getBaseFolders(): string[];
  addBaseFolder(folderPath: string): void;
  whereModels(language: string, safe?: boolean): string | null;
  hasModel(language: string, modelType: string): Promise<boolean>;
  getModel(language: string, modelType: string): Promise<string | null>;
  saveModel(language: string, modelType: string, data: any): Promise<void>;
  isLanguageInstalled(language: string): Promise<boolean>;
  uninstall(language: string): Promise<void>;
  listInstalledLanguages(): Promise<string[]>;
}

export function getStorage(): Promise<IModelStorage>;
export function setStorage(storage: IModelStorage): void;
export function isNodeEnvironment(): boolean;
export function isBrowserEnvironment(): boolean;

declare const uralicNLP: {
  lemmatize: typeof lemmatize;
  analyze: typeof analyze;
  generate: typeof generate;
  segment: typeof segment;
  get_translation: typeof get_translation;
  getTranslation: typeof getTranslation;
  tokenizer: typeof tokenizer;
  sentences: typeof sentences;
  words: typeof words;
  tokenize: typeof tokenize;
  download: typeof download;
  is_language_installed: typeof is_language_installed;
  isLanguageInstalled: typeof isLanguageInstalled;
  supported_languages: typeof supported_languages;
  supportedLanguages: typeof supportedLanguages;
  uninstall: typeof uninstall;
  get_transducer: typeof get_transducer;
  getTransducer: typeof getTransducer;
  clearCache: typeof clearCache;
  setDownloadServerUrl: typeof setDownloadServerUrl;
  getDownloadServerUrl: typeof getDownloadServerUrl;
  removeSymbols: typeof removeSymbols;
  removeAnalysisSymbols: typeof removeAnalysisSymbols;
  addLanguageFlag: typeof addLanguageFlag;
  filterArabic: typeof filterArabic;
  uralicApi: typeof uralicApi;
  getStorage: typeof getStorage;
  setStorage: typeof setStorage;
  isNodeEnvironment: typeof isNodeEnvironment;
  isBrowserEnvironment: typeof isBrowserEnvironment;
  MemoryStorage: typeof MemoryStorage;
};

export default uralicNLP;
