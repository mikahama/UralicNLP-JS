import test from 'node:test';
import assert from 'node:assert/strict';
import { Cg3, Cg3Pipe, MemoryStorage, setStorage } from '../src/index.js';

const encoder = new TextEncoder();

const selectVerb = `
DELIMITERS = "<$.>" ;
LIST Verb = V ;
SECTION
SELECT Verb (0 Verb) ;
`;

const mapVerbToFinite = `
DELIMITERS = "<$.>" ;
LIST Verb = V ;
LIST Finite = Fin ;
SECTION
MAP Fin TARGET Verb ;
`;

test('Cg3 loads a stored grammar and disambiguates supplied analyses', async () => {
  const storage = new MemoryStorage();
  await storage.saveModel('test', 'cg3', encoder.encode(selectVerb));
  setStorage(storage);

  const cg = new Cg3('test');
  const result = await cg.disambiguate(['run'], {
    morphologies: [[['run+N', 1], ['run+V', 0]]],
  });

  assert.equal(result[0][0], 'run');
  assert.equal(result[0][1].length, 1);
  assert.equal(result[0][1][0].lemma, 'run');
  assert.deepEqual(result[0][1][0].tags, ['V']);
  assert.deepEqual(cg.toMorphologies(result), [[['run+V', 0]]]);
});

test('Cg3Pipe passes surviving analyses to the next grammar', async () => {
  const storage = new MemoryStorage();
  await storage.saveModel('first', 'cg3', encoder.encode(selectVerb));
  await storage.saveModel('second', 'cg3', encoder.encode(mapVerbToFinite));
  setStorage(storage);

  const pipe = new Cg3Pipe(new Cg3('first'), new Cg3('second'));
  const result = await pipe.disambiguate(['run'], {
    morphologies: [[['run+N', 1], ['run+V', 0]]],
  });

  assert.deepEqual(result[0][1][0].tags, ['V', 'Fin']);
});
