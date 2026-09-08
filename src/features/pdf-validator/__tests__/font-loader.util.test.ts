import { describe, it, expect } from 'vitest';
import { loadConformingTrueTypeFontBytes } from '../utils/font-loader.util';

describe('Util: font-loader', () => {
  it('loads TrueType font bytes', async () => {
    const bytes = await loadConformingTrueTypeFontBytes();
    expect(bytes).toBeDefined();
    expect(bytes.length).toBeGreaterThan(100000);
  });
});
