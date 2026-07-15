import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { BabelAstAnalyzer } from '../src/infrastructure/ast/BabelAstAnalyzer.js';

const fixtureDirectory = path.dirname(fileURLToPath(import.meta.url));
const loadFixture = (name: string) => readFile(path.join(fixtureDirectory, 'fixtures', name), 'utf8');

describe('BabelAstAnalyzer', () => {
  it('detects a parameter rename and an added validation', async () => {
    const [baseCode, oursCode, theirsCode] = await Promise.all([
      loadFixture('base.js'),
      loadFixture('ours.js'),
      loadFixture('theirs.js'),
    ]);
    const changes = new BabelAstAnalyzer().analyze({ baseCode, oursCode, theirsCode, filePath: 'carrito.js' });

    expect(changes).toContainEqual({
      branch: 'ours',
      nodeType: 'parameter',
      summary: 'Parameter "monto" was renamed to "subtotal" in calcularTotal.',
    });
    expect(changes).toContainEqual({
      branch: 'theirs',
      nodeType: 'validation',
      summary: 'Validation "monto < 0" was added in calcularTotal.',
    });
  });

  it('rejects invalid JavaScript', () => {
    expect(() => new BabelAstAnalyzer().analyze({
      baseCode: 'function total() {}',
      oursCode: 'function total( {',
      theirsCode: 'function total() {}',
      filePath: 'invalid.js',
    })).toThrow();
  });
});
