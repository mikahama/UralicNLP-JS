# UralicNLP-JS

JavaScript implementation of the [UralicNLP](https://github.com/mikahama/uralicNLP) NLP library for Uralic languages (Finnish, Komi-Zyrian, Erzya, Moksha, Sami, etc.) and others.

Runs universally on **Server (Node.js)** and **Client (modern Web Browsers & Web Workers)** using Dr Jack Rueter's [**hfst-js**](https://www.npmjs.com/package/hfst-js) for pure JavaScript HFST optimized-lookup transducer operations without binary dependencies.

---

## Features

- **Universal Support**: Works seamlessly in **Node.js** (CommonJS & ESM) and in **Web Browsers** via modern bundlers or a single `<script>` tag.
- **Pure JavaScript HFST**: Uses `hfst-js` for fast transducer execution.
- **CG3 Disambiguation**: Uses `@rueter/jscg3` to apply each language's
  `disambiguator.cg3` grammar in Node.js and browsers.
- **Server vs Client Model Storage**:
  - **Server (Node.js)**: Stores language models on disk (following Python UralicNLP logic: checks package models, `~/.uralicnlp`, and custom folders).
  - **Client (Browser)**: Stores binary language models persistently in the browser's **IndexedDB**, eliminating repeated downloads and bypassing localStorage size limits.
- **Built-in Tokenizer**: Fast, rule-based sentence splitting and word tokenization bundled with full UralicNLP abbreviation lists.
- **Full API Parity**: Supports both JavaScript-friendly option objects and Python-style positional arguments.

---

## Installation

### 1. NPM Package (Node.js or Frontend Bundlers)

```bash
npm install uralicnlp
```

### 2.1 Standalone Browser Script (Non-Node Projects)

For client-side projects without Node.js or bundlers, include the single minified bundle:

```html
<script src="dist/uralicnlp.min.js"></script>
```

This registers `window.uralicNLP` globally with zero dependencies.

### 2.2 Standalone Browser Script CDN

```html
 <script src="https://cdn.jsdelivr.net/npm/uralicnlp@1.0.2/dist/uralicnlp.min.js"></script>
```

---

## Quick Start

### Node.js (ES Modules)

```javascript
import {
  lemmatize,
  analyze,
  generate,
  segment,
  get_translation,
  Cg3,
  tokenizer,
} from 'uralicnlp';

// 1. Tokenizer (Runs synchronously, 0 network requests)
const sentences = tokenizer.sentences('Tämä on testi. Esim. tämä on toinen lause!');
console.log(sentences);
// ['Tämä on testi.', 'Esim. tämä on toinen lause!']

const tokens = tokenizer.tokenize('Ostin 1.5 kg omenoita.');
console.log(tokens);
// [['Ostin', '1.5', 'kg', 'omenoita', '.']]

// 2. Morphological Analysis
const analyses = await analyze('лыддьыны', 'kpv');
console.log(analyses);
// [['лыддьыны+V+TV+ConNeg+Pl3', 0], ['лыддьыны+V+TV+Inf', 0]]

// 3. Lemmatization
const lemmas = await lemmatize('лыддьыны', 'kpv');
console.log(lemmas);
// ['лыддьыны']

// 4. Generation
const forms = await generate('лыддьыны+V+Ind+Prs+Sg1', 'kpv');
console.log(forms);
// [['лыддя', 0]]

// 5. Segmentation
const morphemes = await segment('лыддьыны', 'kpv');
console.log(morphemes);
// [['лыддьы', 'ны'], ['лыддьы', 'ны']]

// 6. Constraint Grammar disambiguation
const cg = new Cg3('fin');
const disambiguated = await cg.disambiguate(['Kissa', 'voi', 'nauraa', '.']);
// [['Kissa', [CgWord, ...]], ...]
```

### Node.js (CommonJS)

```javascript
const {
  lemmatize,
  analyze,
  generate,
  segment,
  get_translation,
  tokenizer,
} = require('uralicnlp');
```

---

## Client-Side Browser Usage (Non-Node Projects)

In a web browser, models cannot be written to a local filesystem folder like `~/.uralicnlp`. Instead, UralicNLP-JS automatically stores and caches binary transducer models in **IndexedDB** (`uralicnlp_models`).

```html
<!DOCTYPE html>
<html>
<head>
  <script src="uralicnlp.min.js"></script>
</head>
<body>
  <script>
    async function run() {
      // 1. Tokenize (instant, synchronous)
      const words = uralicNLP.tokenizer.words('Kissa ja koira!');
      console.log(words); // ['Kissa', 'ja', 'koira', '!']

      // 2. Download language model into browser IndexedDB if needed
      if (!(await uralicNLP.is_language_installed('kpv'))) {
        console.log('Downloading model to browser IndexedDB...');
        await uralicNLP.download('kpv');
      }

      // 3. Analyze wordform
      const result = await uralicNLP.analyze('лыддьыны', 'kpv');
      console.log(result);

      // 4. Lemmatize
      const lemmas = await uralicNLP.lemmatize('лыддьыны', 'kpv');
      console.log(lemmas); // ['лыддьыны']
    }

    run();
  </script>
</body>
</html>
```

---

## API Reference

### Tokenizer

The tokenizer runs synchronously in memory with zero dependencies and zero network requests.

#### `tokenizer.sentences(text: string): string[]`
Splits text into sentences, taking abbreviations, numbers, decimals, and punctuation into account.

#### `tokenizer.words(text: string): string[]`
Splits a sentence into word and punctuation tokens.

#### `tokenizer.tokenize(text: string): string[][]`
Convenience method that splits text into sentences and each sentence into words: `sentences(text).map(s => words(s))`.

---

### Morphology & Translation

#### `analyze(query, language, options?): Promise<Array<[string, number]>>`
Returns morphological analysis for a given word.
- `options.descriptive` *(boolean, default `true`)*: Use descriptive instead of normative analyzer.
- `options.removeSymbols` *(boolean, default `true`)*: Strip internal flag diacritics (`@...@`).
- `options.languageFlags` *(boolean, default `false`)*: Append `+<language>` to output strings.
- `options.dictionaryForms` *(boolean, default `false`)*: Use dictionary form analyzer.
- `options.filename` *(string | Uint8Array | null)*: Custom transducer path or buffer.
- `options.timeCutoff` *(number, default `0`)*: Lookup timeout cutoff.

#### `generate(query, language, options?): Promise<Array<[string, number]>>`
Generates surface wordforms from morphological analysis tags.
- `options.descriptive` *(boolean, default `false`)*: Use descriptive generator.
- `options.dictionaryForms` *(boolean, default `false`)*: Use dictionary form generator.
- `options.removeSymbols` *(boolean, default `true`)*: Strip internal flag diacritics.

#### `lemmatize(word, language, options?): Promise<string[]>`
Extracts base dictionary lemma(s) from a surface wordform.
- `options.wordBoundaries` *(boolean, default `false`)*: Preserve compound word boundaries with `|`.
- `options.descriptive` *(boolean, default `true`)*: Use descriptive analysis.
- `options.dictionaryForms` *(boolean, default `false`)*: Use dictionary forms.

#### `segment(query, language, options?): Promise<string[][]>`
Segments a wordform into morphemes using the morpher transducer.

#### `get_translation(lemma, lang, trans_lang?, options?): Promise<string[] | Record<string, string[]>>`
Looks up translations for a lemma from the dictionary transducers.
- If `trans_lang` is specified (e.g. `'fin'`), returns `string[]` of translations.
- If omitted, returns a mapping `{ [langCode]: string[] }`.

#### `new Cg3(language, morphologyLanguages?)`
Loads the language's `disambiguator.cg3` model and applies it with
`@rueter/jscg3`. `disambiguate(words, options?)` returns pairs of the input
word and its remaining `CgWord` readings. The grammar downloads on first use;
download it ahead of time with `download(language, { models: ['cg3'] })`.

When `morphologyLanguages` contains several language codes, analyses from all
of them are considered for each word. Pass `options.morphologies` (one
`Array<[analysis, weight]>` per word) to use precomputed analyses instead.

#### `new Cg3Pipe(...cgs)`
Runs `Cg3` instances sequentially, passing surviving analyses from each stage
to the next, like a CG3 command-line pipeline.

---

### Model Management & Storage

#### `download(language: string, options?: DownloadOptions): Promise<void>`
Downloads language models from the model server (`http://models.uralicnlp.com/nightly/`).
- In **Node.js**: saves to `~/.uralicnlp/<language>/`.
- In **Browser**: saves binary `Uint8Array` files into **IndexedDB**.
- `options.models`: list of specific model types to download (default: all HFST models).
- `options.onProgress`: callback `({ language, model, status }) => void`.

Downloading now evicts that language's in-memory transducers automatically, so
the next analysis uses the newly saved model files.

#### `is_language_installed(language: string): Promise<boolean>`
Checks if models for the language are installed locally (on disk or in IndexedDB).

#### `supported_languages(): Promise<string[]>`
Queries the model server for the list of supported language codes.

#### `uninstall(language: string): Promise<void>`
Removes the language models from storage (disk or IndexedDB) and clears memory cache.

#### `clearCache(language?): void`
Removes loaded analyzer and generator objects from memory without deleting local
model files. Pass a language code to clear only that language, or omit it to
clear all loaded models. `clear_cache` is a snake-case alias.

#### `deleteLanguage(language): Promise<void>`
Permanently removes all local files/IndexedDB entries for one language and
clears its in-memory models. This is an explicit alias for `uninstall`; use
`delete_language` for the snake-case form. To force a clean replacement:

```javascript
await deleteLanguage('fin');
await download('fin');
```

---

## Storage Architecture: Server vs. Client

| Feature | Server (Node.js) | Client (Browser) |
| :--- | :--- | :--- |
| **Storage Engine** | File System (`node:fs`) | IndexedDB (`uralicnlp_models`) |
| **Storage Path** | `~/.uralicnlp/<language>/` | Object store `models` |
| **Binary Model Loading** | Direct file stream / buffer | `Uint8Array` from IndexedDB |
| **Download Target** | Written to local disk | Put into IndexedDB store |
| **In-Memory Cache** | `Map<string, Hfst>` | `Map<string, Hfst>` |

Custom storage backends can be registered via `setStorage(customStorage)`.

---

## Building & Testing

```bash
# Install dependencies
npm install

# Run build (produces CJS, ESM, and standalone browser bundle in dist/)
npm run build

# Run unit tests
npm test
```

---
# Cite

If you use UralicNLP in an academic publication, please cite it as follows:

Hämäläinen, Mika. (2019). UralicNLP: An NLP Library for Uralic Languages. Journal of open source software, 4(37), [1345]. https://doi.org/10.21105/joss.01345

    @article{uralicnlp_2019, 
        title={{UralicNLP}: An {NLP} Library for {U}ralic Languages},
        DOI={10.21105/joss.01345}, 
        journal={Journal of Open Source Software}, 
        author={Mika Hämäläinen}, 
        year={2019}, 
        volume={4},
        number={37},
        pages={1345}
    }
