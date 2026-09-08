/**
 * Utility to load and cache the conforming TrueType font for PDF/A-2u text layers.
 * Liberation Sans is metric-compatible with Arial/Helvetica and supports all Portuguese diacritics.
 */

let cachedFontBytes: Uint8Array | null = null;

export async function loadConformingTrueTypeFontBytes(): Promise<Uint8Array> {
  if (cachedFontBytes) {
    return cachedFontBytes;
  }

  // 1. Browser environment: Fetch from public/fonts
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    try {
      const response = await window.fetch('/fonts/LiberationSans-Regular.ttf');
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        cachedFontBytes = new Uint8Array(buffer);
        return cachedFontBytes;
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
      const fontPath = path.resolve(process.cwd(), 'public/fonts/LiberationSans-Regular.ttf');
      if (fs.existsSync(fontPath)) {
        const buffer = fs.readFileSync(fontPath);
        cachedFontBytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        return cachedFontBytes;
      }
    } catch {
      // Fall through
    }
  }

  throw new Error(
    'Não foi possível carregar a fonte TrueType para conformidade PDF/A-2u (/fonts/LiberationSans-Regular.ttf).'
  );
}
