import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenizer, sentences, words, tokenize } from '../src/index.js';

test('tokenizer.sentences splits standard sentences', () => {
  const text = 'Tämä on ensimmäinen lause. Tämä on toinen lause! Onko tämä kolmas?';
  const result = sentences(text);
  assert.deepEqual(result, [
    'Tämä on ensimmäinen lause.',
    'Tämä on toinen lause!',
    'Onko tämä kolmas?',
  ]);
});

test('tokenizer.sentences preserves abbreviations and decimals', () => {
  const text = 'Ostin 1.5 kg omenoita. Esim. omenat maksoivat 2.50€.';
  const result = sentences(text);
  assert.deepEqual(result, [
    'Ostin 1.5 kg omenoita.',
    'Esim. omenat maksoivat 2.50€.',
  ]);
});

test('tokenizer.sentences handles multiple dots and ellipsis', () => {
  const text = 'Maitoa... Se loppui jo. Odotetaan!';
  const result = sentences(text);
  assert.deepEqual(result, [
    'Maitoa...',
    'Se loppui jo.',
    'Odotetaan!',
  ]);
});

test('tokenizer.sentences handles newlines and edge cases', () => {
  assert.deepEqual(sentences(''), []);
  assert.deepEqual(sentences(null), []);
  const textWithBreaks = 'Ensimmäinen lause.\n\nToinen lause.';
  assert.deepEqual(sentences(textWithBreaks), [
    'Ensimmäinen lause.',
    'Toinen lause.',
  ]);
});

test('tokenizer.words tokenizes punctuation and words correctly', () => {
  const s = 'Tämä on testi, esim. koira... ja "kissa"!';
  const result = words(s);
  assert.deepEqual(result, [
    'Tämä',
    'on',
    'testi',
    ',',
    'esim.',
    'koira',
    '...',
    'ja',
    '"',
    'kissa',
    '"',
    '!',
  ]);
});

test('tokenizer.words handles slashes and parentheses', () => {
  const s = 'Kissa ja/tai koira (lemmikit).';
  const result = words(s);
  assert.ok(result.includes('ja'));
  assert.ok(result.includes('/tai'));
  assert.ok(result.includes('('));
  assert.ok(result.includes('lemmikit'));
  assert.ok(result.includes(')'));
  assert.ok(result.includes('.'));
});

test('tokenizer.tokenize produces nested array of sentences and tokens', () => {
  const text = 'Hei maailma! Mitä kuuluu?';
  const result = tokenize(text);
  assert.deepEqual(result, [
    ['Hei', 'maailma', '!'],
    ['Mitä', 'kuuluu', '?'],
  ]);
});

test('tokenizer namespace exports match top-level exports', () => {
  assert.strictEqual(tokenizer.sentences, sentences);
  assert.strictEqual(tokenizer.words, words);
  assert.strictEqual(tokenizer.tokenize, tokenize);
});
