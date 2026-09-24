import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeStorage } from '../src/storage/node-storage.js';
import { BrowserStorage } from '../src/storage/browser-storage.js';
import { MemoryStorage } from '../src/storage/memory-storage.js';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

// NodeStorage tests
test('NodeStorage finds base folders and installed languages', async () => {
  const storage = new NodeStorage();
  const folders = storage.getBaseFolders();
  assert.ok(folders.length > 0);

  const kpvInstalled = await storage.isLanguageInstalled('kpv');
  assert.strictEqual(kpvInstalled, true);

  const modelPath = await storage.getModel('kpv', 'analyser');
  assert.ok(modelPath && modelPath.includes('analyser'));

  const nonExistent = await storage.getModel('nonexistent_lang', 'analyser');
  assert.strictEqual(nonExistent, null);
});

// BrowserStorage tests
test('BrowserStorage stores and retrieves binary models using IndexedDB', async () => {
  globalThis.indexedDB = indexedDB;
  globalThis.IDBKeyRange = IDBKeyRange;

  const storage = new BrowserStorage('test_browser_db_' + Date.now());

  // Check language not installed
  let installed = await storage.isLanguageInstalled('fin');
  assert.strictEqual(installed, false);

  // Save model data
  const testBytes = new Uint8Array([10, 20, 30, 40]);
  await storage.saveModel('fin', 'analyser', testBytes);

  // Check language is installed
  installed = await storage.isLanguageInstalled('fin');
  assert.strictEqual(installed, true);

  // Retrieve model
  const loaded = await storage.getModel('fin', 'analyser');
  assert.ok(loaded instanceof Uint8Array);
  assert.deepEqual(Array.from(loaded), [10, 20, 30, 40]);

  // Check hasModel
  assert.strictEqual(await storage.hasModel('fin', 'analyser'), true);
  assert.strictEqual(await storage.hasModel('fin', 'generator'), false);

  // Metadata
  await storage.saveMetadata('fin', { authors: ['Mika Hämäläinen'] });
  const meta = await storage.getMetadata('fin');
  assert.deepEqual(meta, { authors: ['Mika Hämäläinen'] });

  // List languages
  const langs = await storage.listInstalledLanguages();
  assert.ok(langs.includes('fin'));

  // Uninstall
  await storage.uninstall('fin');
  assert.strictEqual(await storage.isLanguageInstalled('fin'), false);
  assert.strictEqual(await storage.getModel('fin', 'analyser'), null);
});

// MemoryStorage tests
test('MemoryStorage saves and retrieves models in-memory', async () => {
  const storage = new MemoryStorage();

  assert.strictEqual(await storage.isLanguageInstalled('sme'), false);

  const bytes = new Uint8Array([1, 2, 3]);
  await storage.saveModel('sme', 'analyser', bytes);

  assert.strictEqual(await storage.isLanguageInstalled('sme'), true);
  assert.strictEqual(await storage.hasModel('sme', 'analyser'), true);

  const loaded = await storage.getModel('sme', 'analyser');
  assert.deepEqual(loaded, bytes);

  await storage.uninstall('sme');
  assert.strictEqual(await storage.isLanguageInstalled('sme'), false);
});
