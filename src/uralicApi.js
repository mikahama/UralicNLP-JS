import { HfstInputStream } from 'hfst-js';
import { getStorage } from './storage/index.js';

let downloadServerUrl = 'http://models.uralicnlp.com/nightly/';

export const MODEL_TYPES = {
  analyser: 'analyser-gt-desc.hfstol',
  'analyser-norm': 'analyser-gt-norm.hfstol',
  'analyser-dict': 'analyser-dict-gt-norm.hfstol',
  generator: 'generator-dict-gt-norm.hfstol',
  'generator-desc': 'generator-gt-desc.hfstol',
  'generator-norm': 'generator-gt-norm.hfstol',
  'morpher-gt-desc.hfstol': 'morpher-gt-desc.hfstol',
  'metadata.json': 'metadata.json',
  'dictionary.json': 'dictionary.json',
};

// In-memory caches for loaded Hfst transducer instances
const analyzerCache = new Map();
const generatorCache = new Map();

/**
 * Returns current download server base URL.
 * @returns {string}
 */
export function getDownloadServerUrl() {
  return downloadServerUrl;
}

/**
 * Sets download server base URL.
 * @param {string} url
 */
export function setDownloadServerUrl(url) {
  downloadServerUrl = url.endsWith('/') ? url : url + '/';
}

/**
 * Clears in-memory transducer caches.
 */
export function clearCache() {
  analyzerCache.clear();
  generatorCache.clear();
}

/**
 * Removes flag diacritics / symbols (@...@) from a string.
 * @param {string} string
 * @returns {string}
 */
export function removeSymbols(string) {
  return string.replace(/@[^@]*@/g, '');
}

/**
 * Removes analysis symbols from array of [analysis, weight] pairs.
 * @param {Array<[string, number]>} results
 * @returns {Array<[string, number]>}
 */
export function removeAnalysisSymbols(results) {
  return results.map(([str, weight]) => [removeSymbols(str), weight]);
}

/**
 * Adds language tag to analyses.
 * @param {Array<[string, number]>} results
 * @param {string} language
 * @returns {Array<[string, number]>}
 */
export function addLanguageFlag(results, language) {
  return results.map(([str, weight]) => [str + '+' + language, weight]);
}

/**
 * Filters Arabic text.
 * @param {string} text
 * @param {boolean} [keepVowels=true]
 * @param {string} [combineBy=""]
 * @returns {string}
 */
export function filterArabic(text, keepVowels = true, combineBy = '') {
  const pattern = keepVowels ? /[ء-ي'ًٌٍَُِّْـ']+/gu : /[ء-ي]+/gu;
  const matches = text.match(pattern) || [];
  return matches.join(combineBy);
}

/**
 * Resolves model filename based on parameters matching Python UralicNLP logic.
 */
function getAnalyzerModelName(descriptive, dictionaryForms, segmentation) {
  if (segmentation) return 'morpher-gt-desc.hfstol';
  if (dictionaryForms) return 'analyser-dict';
  if (descriptive) return 'analyser';
  return 'analyser-norm';
}

function getGeneratorModelName(descriptive, dictionaryForms) {
  if (!descriptive && dictionaryForms) return 'generator';
  if (descriptive) return 'generator-desc';
  return 'generator-norm';
}

/**
 * Checks if a language is installed in local/client storage.
 * @param {string} language
 * @returns {Promise<boolean>}
 */
export async function is_language_installed(language) {
  const storage = await getStorage();
  return await storage.isLanguageInstalled(language);
}

export const isLanguageInstalled = is_language_installed;

/**
 * Downloads language models and saves to storage (disk in Node, IndexedDB in browser).
 * @param {string} language
 * @param {object} [options]
 * @param {string[]} [options.models] Specific model types to download
 * @param {boolean} [options.showProgress=true]
 * @param {Function} [options.onProgress]
 * @returns {Promise<void>}
 */
export async function download(language, options = {}) {
  const storage = await getStorage();
  const modelsToDownload = options.models || [
    'analyser',
    'analyser-norm',
    'analyser-dict',
    'generator',
    'generator-desc',
    'generator-norm',
    'morpher-gt-desc.hfstol',
    'metadata.json',
  ];

  for (const modelType of modelsToDownload) {
    const remoteFilename = MODEL_TYPES[modelType] || modelType;
    const url = `${getDownloadServerUrl()}${language}/${remoteFilename}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (modelType === 'metadata.json') {
          await storage.saveMetadata?.(language, {
            info: 'no metadata provided',
          });
        }
        continue;
      }

      if (modelType === 'metadata.json') {
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

      if (typeof options.onProgress === 'function') {
        options.onProgress({ language, model: modelType, status: 'downloaded' });
      }
    } catch (err) {
      if (modelType === 'metadata.json') {
        await storage.saveMetadata?.(language, {
          info: 'no metadata provided',
        });
      }
    }
  }
}

/**
 * Loads transducer from storage or filename, with caching.
 * @param {string} language
 * @param {object} [options]
 * @returns {Promise<any>}
 */
export async function get_transducer(language, options = {}) {
  const {
    cache = true,
    analyzer = true,
    descriptive = analyzer ? true : false,
    dictionaryForms = false,
    segmentation = false,
    filename = null,
  } = options;

  const storage = await getStorage();

  if (filename) {
    const cacheKey = typeof filename === 'string' ? filename : 'custom_buffer';
    const cacheMap = analyzer ? analyzerCache : generatorCache;
    if (cache && cacheMap.has(cacheKey)) {
      return cacheMap.get(cacheKey);
    }
    const stream = new HfstInputStream(filename, cache);
    const transducer = stream.read();
    if (cache) cacheMap.set(cacheKey, transducer);
    return transducer;
  }

  const modelName = analyzer
    ? getAnalyzerModelName(descriptive, dictionaryForms, segmentation)
    : getGeneratorModelName(descriptive, dictionaryForms);

  const cacheKey = `${language}:${modelName}`;
  const cacheMap = analyzer ? analyzerCache : generatorCache;

  if (cache && cacheMap.has(cacheKey)) {
    return cacheMap.get(cacheKey);
  }

  let modelData = await storage.getModel(language, modelName);

  if (!modelData) {
    // Model not found; ensure installed / auto-download
    await download(language, { models: [modelName, 'metadata.json'] });
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

export const getTransducer = get_transducer;

function parseAnalyzeArgs(optionsOrForceLocal, rest) {
  if (typeof optionsOrForceLocal === 'object' && optionsOrForceLocal !== null) {
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
      cache: o.cache ?? true,
    };
  }

  const [
    descriptive = true,
    removeSymbols = true,
    languageFlags = false,
    dictionaryForms = false,
    filename = null,
    segmentation = false,
  ] = rest;

  return {
    forceLocal: optionsOrForceLocal ?? true,
    descriptive,
    removeSymbols,
    languageFlags,
    dictionaryForms,
    filename,
    segmentation,
    timeCutoff: 0,
    cache: true,
  };
}

/**
 * Analyzes morphological forms for a word/query.
 * @param {string} query
 * @param {string | string[]} language
 * @param {object | boolean} [optionsOrForceLocal={}]
 * @param  {...any} rest Positional arguments matching Python API
 * @returns {Promise<Array<[string, number]>>}
 */
export async function analyze(query, language, optionsOrForceLocal = {}, ...rest) {
  const opts = parseAnalyzeArgs(optionsOrForceLocal, rest);

  if (Array.isArray(language)) {
    const results = [];
    for (const lang of language) {
      const sub = await analyze(query, lang, {
        ...opts,
        languageFlags: false,
      });
      results.push(...sub);
    }
    return opts.languageFlags ? addLanguageFlag(results, language.join(',')) : results;
  }

  const transducer = await get_transducer(language, {
    cache: opts.cache,
    analyzer: true,
    descriptive: opts.descriptive,
    dictionaryForms: opts.dictionaryForms,
    segmentation: opts.segmentation,
    filename: opts.filename,
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
  if (typeof optionsOrForceLocal === 'object' && optionsOrForceLocal !== null) {
    const o = optionsOrForceLocal;
    return {
      forceLocal: o.forceLocal ?? o.force_local ?? true,
      descriptive: o.descriptive ?? false,
      dictionaryForms: o.dictionaryForms ?? o.dictionary_forms ?? false,
      removeSymbols: o.removeSymbols ?? o.remove_symbols ?? true,
      filename: o.filename ?? null,
      timeCutoff: o.timeCutoff ?? o.time_cutoff ?? 0,
      cache: o.cache ?? true,
    };
  }

  const [
    descriptive = false,
    dictionaryForms = false,
    removeSymbols = true,
    filename = null,
  ] = rest;

  return {
    forceLocal: optionsOrForceLocal ?? true,
    descriptive,
    dictionaryForms,
    removeSymbols,
    filename,
    timeCutoff: 0,
    cache: true,
  };
}

/**
 * Generates surface forms from morphological analysis tags.
 * @param {string} query
 * @param {string} language
 * @param {object | boolean} [optionsOrForceLocal={}]
 * @param  {...any} rest Positional arguments matching Python API
 * @returns {Promise<Array<[string, number]>>}
 */
export async function generate(query, language, optionsOrForceLocal = {}, ...rest) {
  const opts = parseGenerateArgs(optionsOrForceLocal, rest);

  const transducer = await get_transducer(language, {
    cache: opts.cache,
    analyzer: false,
    descriptive: opts.descriptive,
    dictionaryForms: opts.dictionaryForms,
    filename: opts.filename,
  });

  const raw = transducer.lookup(query, opts.timeCutoff);
  let results = raw;

  if (opts.removeSymbols) {
    results = removeAnalysisSymbols(results);
  }

  return results;
}

function parseLemmatizeArgs(optionsOrForceLocal, rest) {
  if (typeof optionsOrForceLocal === 'object' && optionsOrForceLocal !== null) {
    const o = optionsOrForceLocal;
    return {
      forceLocal: o.forceLocal ?? o.force_local ?? true,
      descriptive: o.descriptive ?? true,
      wordBoundaries: o.wordBoundaries ?? o.word_boundaries ?? false,
      dictionaryForms: o.dictionaryForms ?? o.dictionary_forms ?? false,
      filename: o.filename ?? null,
    };
  }

  const [
    descriptive = true,
    wordBoundaries = false,
    dictionaryForms = false,
    filename = null,
  ] = rest;

  return {
    forceLocal: optionsOrForceLocal ?? true,
    descriptive,
    wordBoundaries,
    dictionaryForms,
    filename,
  };
}

/**
 * Extracts base lemma(s) from a wordform.
 * @param {string} word
 * @param {string} language
 * @param {object | boolean} [optionsOrForceLocal={}]
 * @param  {...any} rest Positional arguments matching Python API
 * @returns {Promise<string[]>}
 */
export async function lemmatize(word, language, optionsOrForceLocal = {}, ...rest) {
  const opts = parseLemmatizeArgs(optionsOrForceLocal, rest);
  const analysis = await analyze(word, language, {
    descriptive: opts.descriptive,
    dictionaryForms: opts.dictionaryForms,
    filename: opts.filename,
    forceLocal: opts.forceLocal,
  });

  const bound = opts.wordBoundaries ? '|' : '';
  const lemmas = [];

  for (const tupla of analysis) {
    let an = tupla[0];
    if (!an) continue;

    if (language === 'swe') {
      const lemma = an
        .replace(/<.*?>/g, bound)
        .replace(new RegExp(`^\\${bound}+|\\${bound}+$`, 'g'), '');
      lemmas.push(lemma);
    } else if (language === 'ara') {
      lemmas.push(filterArabic(an, true, bound));
    } else if (language === 'fin_hist') {
      const matches = Array.from(an.matchAll(/(?<=WORD_ID=)[^\]]*/g), (m) => m[0]);
      lemmas.push(matches.join(bound));
    } else if (an.includes('<') && an.includes('>')) {
      // Apertium
      const parts = an.split('+');
      const lemma = parts.map((x) => x.split('<')[0]).join(bound);
      lemmas.push(lemma);
    } else {
      if (!an.includes('+Cmp#') && an.includes('#')) {
        an = an.replace(/#/g, '+Cmp#');
      }
      const res = an.split('+Cmp#');
      let parts = res.map((x) => x.split('+')[0]);
      if (language === 'eng') {
        parts = parts.map((x) => x.replace(/\[.*?\]/g, ''));
      }
      lemmas.push(parts.join(bound));
    }
  }

  return Array.from(new Set(lemmas));
}

/**
 * Segments a word into morphemes using the morpher transducer.
 * @param {string} query
 * @param {string} language
 * @param {object} [options={}]
 * @returns {Promise<string[][]>}
 */
export async function segment(query, language, options = {}) {
  const analysis = await analyze(query, language, {
    ...options,
    segmentation: true,
  });

  return analysis.map((x) => x[0].replace(/#/g, '>').split('>'));
}

/**
 * Looks up dictionary translations for a lemma.
 * @param {string} lemma
 * @param {string} lang
 * @param {string | null | object} [trans_lang=null]
 * @param {object} [options={}]
 * @returns {Promise<string[] | Record<string, string[]>>}
 */
export async function get_translation(
  lemma,
  lang,
  trans_lang = null,
  options = {}
) {
  let targetLang = trans_lang;
  let opts = options;

  if (typeof trans_lang === 'object' && trans_lang !== null) {
    opts = trans_lang;
    targetLang = opts.trans_lang ?? opts.transLang ?? null;
  }

  const query = `${lang}_${lemma}`;
  const [t1, t2] = await Promise.all([
    analyze(query, 'dictionary', { filename: opts.filename1 }).catch(() => []),
    generate(query, 'dictionary', { filename: opts.filename2 }).catch(() => []),
  ]);

  const res = {};
  for (const t of [...t1, ...t2]) {
    if (!t || !t[0]) continue;
    const splitIdx = t[0].indexOf('_');
    if (splitIdx === -1) continue;
    const l = t[0].slice(0, splitIdx);
    const w = t[0].slice(splitIdx + 1).replace(/_/g, ' ');
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

export const getTranslation = get_translation;

/**
 * Retrieves supported languages list from server.
 * @returns {Promise<any>}
 */
export async function supported_languages() {
  const url = `${getDownloadServerUrl()}supported_languages.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch supported languages: ${res.statusText}`);
  }
  return await res.json();
}

export const supportedLanguages = supported_languages;

/**
 * Uninstalls language models.
 * @param {string} language
 * @returns {Promise<void>}
 */
export async function uninstall(language) {
  const storage = await getStorage();
  await storage.uninstall(language);
  for (const key of Array.from(analyzerCache.keys())) {
    if (key.startsWith(`${language}:`)) analyzerCache.delete(key);
  }
  for (const key of Array.from(generatorCache.keys())) {
    if (key.startsWith(`${language}:`)) generatorCache.delete(key);
  }
}

export const uralicApi = {
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
};

export default uralicApi;
