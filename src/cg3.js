import { readFileSync } from 'node:fs';
import { Cg } from '@rueter/jscg3';
import { analyze, download } from './uralicApi.js';
import { getStorage } from './storage/index.js';

/**
 * Reads a CG3 grammar saved by any of the supported storage backends.
 * Node storage returns a path while browser and memory storage return bytes.
 *
 * @param {string | Uint8Array | ArrayBuffer} model
 * @returns {string}
 */
function grammarText(model) {
  if (typeof model === 'string') {
    return readFileSync(model, 'utf8');
  }

  const bytes = model instanceof Uint8Array ? model : new Uint8Array(model);
  return new TextDecoder().decode(bytes);
}

/**
 * JavaScript equivalent of UralicNLP's Python Cg3 wrapper.
 *
 * The grammar is fetched from `<language>/disambiguator.cg3` on demand and
 * cached on this instance. Morphological analyses are generated with the
 * normal UralicNLP analyzer unless supplied explicitly in `options`.
 */
export class Cg3 {
  /**
   * @param {string} language Language whose CG3 grammar is used.
   * @param {string[] | null} [morphologyLanguages=null]
   */
  constructor(language, morphologyLanguages = null) {
    if (!language || typeof language !== 'string') {
      throw new TypeError('Cg3 requires a language code.');
    }

    this.language = language;
    this.morphologyLanguages = Array.from(
      new Set([...(morphologyLanguages || []), language])
    );
    this.path = 'cg3';
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
      let model = await storage.getModel(this.language, 'cg3');

      if (!model) {
        await download(this.language, { models: ['cg3'] });
        model = await storage.getModel(this.language, 'cg3');
      }

      if (!model) {
        throw new Error(
          `CG3 grammar for language "${this.language}" is not available. ` +
            `Use download("${this.language}", { models: ['cg3'] }) to download it.`
        );
      }

      this.cg = Cg.fromTexts([grammarText(model)], {
        names: [this.language],
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
  async disambiguate(words, options = {}) {
    if (!Array.isArray(words) || !words.every((word) => typeof word === 'string')) {
      throw new TypeError('Cg3.disambiguate expects an array of strings.');
    }

    const opts =
      typeof options === 'boolean' ? { descriptive: options } : options || {};
    const engine = await this.load();
    const morphologies = opts.morphologies || (await this.analyze(words, opts));

    if (!Array.isArray(morphologies)) {
      throw new TypeError('options.morphologies must be an array of analyses.');
    }

    return engine.disambiguate(words, morphologies, opts.cgOptions);
  }

  /**
   * Creates the morphology input expected by jscg3. When several morphology
   * languages are configured, alternatives are combined for each word.
   *
   * @param {string[]} words
   * @param {object} options
   * @returns {Promise<Array<Array<[string, number]>>>}
   */
  async analyze(words, options) {
    const descriptive = options.descriptive ?? true;
    const analyses = await Promise.all(
      words.map(async (word) => {
        const perLanguage = await Promise.all(
          this.morphologyLanguages.map((language) =>
            analyze(word, language, {
              descriptive,
              neuralFallback: options.neuralFallback ?? options.neural_fallback ?? false,
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
      throw new Error('The CG3 grammar has not been loaded yet.');
    }
    return this.cg.toMorphologies(result);
  }
}

/**
 * Chains Cg3 instances, passing each stage's surviving analyses to the next.
 */
export class Cg3Pipe {
  /** @param {...Cg3} cgs */
  constructor(...cgs) {
    if (!cgs.length || !cgs.every((cg) => cg instanceof Cg3)) {
      throw new TypeError('Cg3Pipe requires one or more Cg3 instances.');
    }
    this.cgs = cgs;
  }

  /**
   * @param {string[]} words
   * @param {object | boolean} [options={}]
   * @returns {Promise<Array<[string, import('@rueter/jscg3').CgWord[]]>>}
   */
  async disambiguate(words, options = {}) {
    const opts =
      typeof options === 'boolean' ? { descriptive: options } : options || {};
    let morphologies = opts.morphologies;
    let result;

    for (const cg of this.cgs) {
      result = await cg.disambiguate(words, { ...opts, morphologies });
      morphologies = cg.toMorphologies(result);
    }

    return result;
  }
}

export default Cg3;
