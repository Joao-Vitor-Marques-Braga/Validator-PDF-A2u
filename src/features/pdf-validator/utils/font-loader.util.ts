const FONT_NAME_FILE_MAP: Record<string, string> = {
  'verdana-bold': 'verdanab.ttf',
  'verdana': 'verdana.ttf',
  'timesnewromanpsmt': 'times.ttf',
  'timesnewromanps-boldmt': 'timesbd.ttf',
  'timesnewromanps-italicmt': 'timesi.ttf',
  'timesnewromanps-bolditalicmt': 'timesbi.ttf',
  'arialmt': 'arial.ttf',
  'arial-boldmt': 'arialbd.ttf',
};

const fontBytesCache = new Map<string, Uint8Array>();

/**
 * Loads font bytes for a specific font name matching its exact PostScript name,
 * or falls back to LiberationSans-Regular.ttf.
 */
export async function loadMatchingTrueTypeFontBytes(rawFontName?: string): Promise<Uint8Array> {
  const normalized = (rawFontName || '')
    .toLowerCase()
    .replace(/^.*[+/]/, '') // remove subset tag like GLYPHS+ or slash
    .trim();

  const fileName = FONT_NAME_FILE_MAP[normalized] || 'LiberationSans-Regular.ttf';

  if (fontBytesCache.has(fileName)) {
    return fontBytesCache.get(fileName)!;
  }

  // 1. Browser environment: Fetch from public/fonts
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    try {
      const response = await window.fetch(`/fonts/${fileName}`);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        fontBytesCache.set(fileName, bytes);
        return bytes;
      }
    } catch {
      // Fall through to fallback
    }
  }

  // 2. Node.js / Vitest environment: Read from filesystem
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const fontPath = path.resolve(process.cwd(), `public/fonts/${fileName}`);
      if (fs.existsSync(fontPath)) {
        const buffer = fs.readFileSync(fontPath);
        const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        fontBytesCache.set(fileName, bytes);
        return bytes;
      }
    } catch {
      // Fall through
    }
  }

  // Fallback to default LiberationSans if specific file not found
  if (fileName !== 'LiberationSans-Regular.ttf') {
    return loadConformingTrueTypeFontBytes();
  }

  throw new Error(
    `Não foi possível carregar a fonte TrueType para conformidade PDF/A-2u (/fonts/${fileName}).`
  );
}

export async function loadConformingTrueTypeFontBytes(): Promise<Uint8Array> {
  return loadMatchingTrueTypeFontBytes('LiberationSans-Regular');
}

