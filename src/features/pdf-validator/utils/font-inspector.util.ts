/**
 * Font Inspector Utility for ISO 19005-2 (PDF/A-2u) Conformance
 *
 * Verifies physical embedding of font streams (/FontFile, /FontFile2, /FontFile3)
 * across all font descriptors and fonts within the PDF dictionary graph.
 */

export interface FontInspectionResult {
  readonly hasUnembedded: boolean;
  readonly unembeddedFontNames: readonly string[];
}

/**
 * Parses all PDF dictionary blocks (<< ... >>) from raw PDF bytes,
 * correctly handling comments, literal strings, hex strings, and nesting.
 */
function extractPdfDictionaries(text: string): string[] {
  const dicts: string[] = [];
  const len = text.length;
  let i = 0;

  while (i < len - 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    // Skip single-line comments
    if (char === '%') {
      i++;
      while (i < len && text[i] !== '\r' && text[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Start of dictionary <<
    if (char === '<' && nextChar === '<') {
      const dictStart = i;
      let depth = 1;
      i += 2;

      while (i < len && depth > 0) {
        // Skip comment inside dictionary
        if (text[i] === '%') {
          i++;
          while (i < len && text[i] !== '\r' && text[i] !== '\n') {
            i++;
          }
          continue;
        }

        // Skip literal string (...)
        if (text[i] === '(') {
          i++;
          let parenDepth = 1;
          while (i < len && parenDepth > 0) {
            if (text[i] === '\\') {
              i += 2; // skip escaped character
              continue;
            }
            if (text[i] === '(') parenDepth++;
            else if (text[i] === ')') parenDepth--;
            i++;
          }
          continue;
        }

        // Nested dictionary <<
        if (text[i] === '<' && text[i + 1] === '<') {
          depth++;
          i += 2;
          continue;
        }

        // Closing dictionary >>
        if (text[i] === '>' && text[i + 1] === '>') {
          depth--;
          i += 2;
          if (depth === 0) {
            dicts.push(text.substring(dictStart, i));
            break;
          }
          continue;
        }

        i++;
      }
      continue;
    }

    i++;
  }

  return dicts;
}

/**
 * Extracts clean font name from a dictionary string (e.g. /FontName /Verdana-Bold -> "Verdana-Bold")
 */
function extractNameFromDict(dict: string, key: string): string | null {
  const regex = new RegExp(`/${key}\\s*/([a-zA-Z0-9_-]+)`);
  const match = dict.match(regex);
  return match ? match[1] : null;
}

/**
 * Inspects a PDF byte buffer to check whether it contains any fonts
 * that are NOT physically embedded (/FontFile, /FontFile2, /FontFile3).
 * Returns details including list of unembedded font names.
 */
export function inspectFontEmbedding(pdfBytes: Uint8Array | ArrayBuffer): FontInspectionResult {
  const buffer = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  const textDecoder = new TextDecoder('latin1');
  const text = textDecoder.decode(buffer);

  const dicts = extractPdfDictionaries(text);
  const unembeddedNames: string[] = [];

  for (const dict of dicts) {
    // Check 1: /Type /FontDescriptor dictionary
    if (/\/Type\s*\/FontDescriptor\b/.test(dict)) {
      const hasFontFile = /\/FontFile[23]?\b/.test(dict);
      if (!hasFontFile) {
        const fontName = extractNameFromDict(dict, 'FontName') || 'Fonte Sem Nome';
        if (!unembeddedNames.includes(fontName)) {
          unembeddedNames.push(fontName);
        }
      }
    }

    // Check 2: /Type /Font dictionary
    if (/\/Type\s*\/Font\b/.test(dict)) {
      const isType1 = /\/Subtype\s*\/Type1\b/.test(dict);
      const isTrueType = /\/Subtype\s*\/TrueType\b/.test(dict);
      const isCID = /\/Subtype\s*\/CIDFontType[02]\b/.test(dict);

      if (isType1 || isTrueType || isCID) {
        const hasFontDescriptor = /\/FontDescriptor\b/.test(dict);
        if (!hasFontDescriptor) {
          const baseFont = extractNameFromDict(dict, 'BaseFont') || 'Standard 14 Font';
          if (!unembeddedNames.includes(baseFont)) {
            unembeddedNames.push(baseFont);
          }
        }
      }
    }
  }

  return {
    hasUnembedded: unembeddedNames.length > 0,
    unembeddedFontNames: unembeddedNames,
  };
}

/**
 * Boolean helper returning true if at least one font is unembedded.
 */
export function hasUnembeddedFonts(pdfBytes: Uint8Array | ArrayBuffer): boolean {
  return inspectFontEmbedding(pdfBytes).hasUnembedded;
}
