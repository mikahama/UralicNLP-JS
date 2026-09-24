import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

const require = createRequire(import.meta.url);

test('dist/uralicnlp.cjs loads and executes in CommonJS', async () => {
  const cjs = require('../dist/uralicnlp.cjs');
  assert.strictEqual(typeof cjs.lemmatize, 'function');
  assert.strictEqual(typeof cjs.analyze, 'function');
  assert.strictEqual(typeof cjs.generate, 'function');
  assert.strictEqual(typeof cjs.segment, 'function');
  assert.strictEqual(typeof cjs.get_translation, 'function');
  assert.strictEqual(typeof cjs.tokenizer, 'object');
  assert.strictEqual(typeof cjs.tokenizer.sentences, 'function');
  assert.strictEqual(typeof cjs.tokenizer.words, 'function');
  assert.strictEqual(typeof cjs.tokenizer.tokenize, 'function');

  // Test tokenizer
  const sents = cjs.tokenizer.sentences('Lause yksi. Lause kaksi!');
  assert.deepEqual(sents, ['Lause yksi.', 'Lause kaksi!']);

  // Test morphological analysis with kpv
  const analyses = await cjs.analyze('лыддьыны', 'kpv');
  assert.ok(analyses.length > 0);
  assert.strictEqual(analyses[0][0], 'лыддьыны+V+TV+ConNeg+Pl3');

  // Test lemmatize
  const lemmas = await cjs.lemmatize('лыддьыны', 'kpv');
  assert.deepEqual(lemmas, ['лыддьыны']);

  // Test generate
  const forms = await cjs.generate('лыддьыны+V+Ind+Prs+Sg1', 'kpv');
  assert.deepEqual(forms, [['лыддя', 0]]);

  // Test segment
  const segments = await cjs.segment('лыддьыны', 'kpv');
  assert.deepEqual(segments[0], ['лыддьы', 'ны']);
});

test('dist/uralicnlp.esm.js loads and executes in ESM', async () => {
  const esm = await import('../dist/uralicnlp.esm.js');
  assert.strictEqual(typeof esm.lemmatize, 'function');
  assert.strictEqual(typeof esm.analyze, 'function');
  assert.strictEqual(typeof esm.generate, 'function');
  assert.strictEqual(typeof esm.segment, 'function');
  assert.strictEqual(typeof esm.get_translation, 'function');
  assert.strictEqual(typeof esm.tokenizer, 'object');

  const sents = esm.tokenizer.sentences('Tämä on testi. Toinen lause.');
  assert.deepEqual(sents, ['Tämä on testi.', 'Toinen lause.']);

  const lemmas = await esm.lemmatize('лыддьыны', 'kpv');
  assert.deepEqual(lemmas, ['лыддьыны']);
});

test('dist/uralicnlp.min.js runs as standalone browser bundle with IndexedDB', async () => {
  // Simulate browser environment with window and IndexedDB
  const virtualWindow = {
    indexedDB,
    IDBKeyRange,
  };
  globalThis.window = virtualWindow;
  globalThis.indexedDB = indexedDB;
  globalThis.IDBKeyRange = IDBKeyRange;

  // Read and evaluate browser bundle
  const bundleCode = fs.readFileSync(
    path.resolve('dist/uralicnlp.min.js'),
    'utf-8'
  );
  // Execute bundle script
  new Function('window', 'globalThis', bundleCode)(virtualWindow, virtualWindow);

  assert.ok(virtualWindow.uralicNLP);
  const uNLP = virtualWindow.uralicNLP;

  // Check required methods
  assert.strictEqual(typeof uNLP.lemmatize, 'function');
  assert.strictEqual(typeof uNLP.analyze, 'function');
  assert.strictEqual(typeof uNLP.generate, 'function');
  assert.strictEqual(typeof uNLP.segment, 'function');
  assert.strictEqual(typeof uNLP.get_translation, 'function');
  assert.strictEqual(typeof uNLP.tokenizer, 'object');
  assert.strictEqual(typeof uNLP.tokenizer.sentences, 'function');
  assert.strictEqual(typeof uNLP.tokenizer.words, 'function');
  assert.strictEqual(typeof uNLP.tokenizer.tokenize, 'function');

  // Test tokenizer in browser bundle
  const words = uNLP.tokenizer.words('Kissa ja koira!');
  assert.deepEqual(words, ['Kissa', 'ja', 'koira', '!']);

  // Test storing models in IndexedDB and analyzing through browser bundle
  const storage = new uNLP.BrowserStorage('bundle_test_idb_' + Date.now());
  uNLP.setStorage(storage);

  const kpvAnalyserPath = '/home/mikahama/.local/lib/python3.14/site-packages/uralicNLP/models/kpv/analyser';
  const kpvGenPath = '/home/mikahama/.local/lib/python3.14/site-packages/uralicNLP/models/kpv/generator-norm';
  const kpvMorpherPath = '/home/mikahama/.local/lib/python3.14/site-packages/uralicNLP/models/kpv/morpher-gt-desc.hfstol';

  if (fs.existsSync(kpvAnalyserPath)) {
    await storage.saveModel('kpv', 'analyser', new Uint8Array(fs.readFileSync(kpvAnalyserPath)));
    await storage.saveModel('kpv', 'generator-norm', new Uint8Array(fs.readFileSync(kpvGenPath)));
    await storage.saveModel('kpv', 'morpher-gt-desc.hfstol', new Uint8Array(fs.readFileSync(kpvMorpherPath)));

    const anRes = await uNLP.analyze('лыддьыны', 'kpv');
    assert.ok(anRes.length > 0);
    assert.strictEqual(anRes[0][0], 'лыддьыны+V+TV+ConNeg+Pl3');

    const lemRes = await uNLP.lemmatize('лыддьыны', 'kpv');
    assert.deepEqual(lemRes, ['лыддьыны']);

    const genRes = await uNLP.generate('лыддьыны+V+Ind+Prs+Sg1', 'kpv');
    assert.deepEqual(genRes, [['лыддя', 0]]);

    const segRes = await uNLP.segment('лыддьыны', 'kpv');
    assert.deepEqual(segRes[0], ['лыддьы', 'ны']);
  }
});
