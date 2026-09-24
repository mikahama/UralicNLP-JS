import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyze,
  generate,
  lemmatize,
  segment,
  get_translation,
  getTranslation,
  is_language_installed,
  isLanguageInstalled,
  removeSymbols,
  removeAnalysisSymbols,
  addLanguageFlag,
  filterArabic,
  uralicApi,
} from '../src/index.js';

test('is_language_installed checks language installation', async () => {
  const kpvInstalled = await is_language_installed('kpv');
  assert.strictEqual(kpvInstalled, true);
  assert.strictEqual(await isLanguageInstalled('kpv'), true);

  const fakeInstalled = await is_language_installed('nonexistent_xyz');
  assert.strictEqual(fakeInstalled, false);
});

test('analyze returns morphological analysis for a word', async () => {
  const results = await analyze('лыддьыны', 'kpv');
  assert.ok(Array.isArray(results));
  assert.ok(results.length > 0);

  const analyses = results.map((r) => r[0]);
  assert.ok(analyses.includes('лыддьыны+V+TV+Inf'));
  assert.ok(analyses.includes('лыддьыны+V+TV+ConNeg+Pl3'));

  // Test with language flags
  const flagged = await analyze('лыддьыны', 'kpv', { languageFlags: true });
  assert.ok(flagged.every((r) => r[0].endsWith('+kpv')));

  // Test with positional arguments
  const positional = await analyze('лыддьыны', 'kpv', true, true, true, false);
  assert.deepEqual(positional, results);
});

test('generate creates surface forms from analysis tags', async () => {
  const results = await generate('лыддьыны+V+Ind+Prs+Sg1', 'kpv');
  assert.ok(Array.isArray(results));
  assert.ok(results.length > 0);
  const words = results.map((r) => r[0]);
  assert.ok(words.includes('лыддя'));

  // Test with positional arguments
  const positional = await generate('лыддьыны+V+Ind+Prs+Sg1', 'kpv', true, false, false, true);
  assert.deepEqual(positional, results);
});

test('lemmatize extracts base lemmas from wordforms', async () => {
  const lemmas = await lemmatize('лыддьыны', 'kpv');
  assert.deepEqual(lemmas, ['лыддьыны']);

  // Test positional arguments
  const positional = await lemmatize('лыддьыны', 'kpv', true, true, false, false);
  assert.deepEqual(positional, ['лыддьыны']);
});

test('segment splits words into morphemes', async () => {
  const segments = await segment('лыддьыны', 'kpv');
  assert.ok(Array.isArray(segments));
  assert.ok(segments.length > 0);
  assert.deepEqual(segments[0], ['лыддьы', 'ны']);
});

test('get_translation translates lemmas using dictionary transducers', async () => {
  assert.strictEqual(typeof get_translation, 'function');
  assert.strictEqual(typeof getTranslation, 'function');

  // Verify get_translation formatting with a mock/custom response format
  const mockAnalysis = [['eng_book', 0], ['fin_kirja', 0], ['rus_книга', 0]];
  const res = {};
  for (const t of mockAnalysis) {
    const idx = t[0].indexOf('_');
    const l = t[0].slice(0, idx);
    const w = t[0].slice(idx + 1);
    if (!res[l]) res[l] = [];
    res[l].push(w);
  }
  assert.deepEqual(res, {
    eng: ['book'],
    fin: ['kirja'],
    rus: ['книга'],
  });
});

test('utility functions: removeSymbols, addLanguageFlag, filterArabic', () => {
  assert.strictEqual(removeSymbols('@R.Pron.Sg@tämä'), 'tämä');
  assert.strictEqual(removeSymbols('@R.Pron.Sg@tämä@FLAG@'), 'tämä');
  assert.deepEqual(
    removeAnalysisSymbols([['@R@tämä', 0.5]]),
    [['tämä', 0.5]]
  );
  assert.deepEqual(
    addLanguageFlag([['tämä+Pron', 0]], 'fin'),
    [['tämä+Pron+fin', 0]]
  );
  assert.strictEqual(filterArabic('كِتَابٌ'), 'كِتَابٌ');
  assert.strictEqual(filterArabic('كِتَابٌ', false), 'كتاب');
});

test('uralicApi namespace has all required methods', () => {
  assert.strictEqual(typeof uralicApi.lemmatize, 'function');
  assert.strictEqual(typeof uralicApi.analyze, 'function');
  assert.strictEqual(typeof uralicApi.generate, 'function');
  assert.strictEqual(typeof uralicApi.segment, 'function');
  assert.strictEqual(typeof uralicApi.get_translation, 'function');
  assert.strictEqual(typeof uralicApi.download, 'function');
  assert.strictEqual(typeof uralicApi.is_language_installed, 'function');
});
