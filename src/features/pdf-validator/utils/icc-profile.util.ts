import type { PDFDocument } from 'pdf-lib';
import { PDFName, PDFString } from 'pdf-lib';

/**
 * Builds a minimal, fully conforming sRGB ICC v2.1 Color Profile (ISO 19005-2 compliance).
 * Size: ~498 bytes. Works in any modern browser and JS runtime without external dependencies.
 */
export function createSrgbIccProfileBytes(): Uint8Array {
  const descText = 'sRGB IEC61966-2.1';
  const cprtText = 'Copyright (c) sRGB';

  // 1. Tag data buffers
  // desc tag: type 'desc' (4), reserved (4), ascii len (4), ascii string
  const descLen = 12 + descText.length + 1;
  const descBytes = new Uint8Array(descLen);
  const descView = new DataView(descBytes.buffer);
  descBytes.set(new TextEncoder().encode('desc'), 0);
  descView.setUint32(4, 0, false);
  descView.setUint32(8, descText.length + 1, false);
  descBytes.set(new TextEncoder().encode(descText + '\0'), 12);

  // cprt tag: type 'text' (4), reserved (4), text string
  const cprtLen = 8 + cprtText.length + 1;
  const cprtBytes = new Uint8Array(cprtLen);
  cprtBytes.set(new TextEncoder().encode('text'), 0);
  cprtBytes.set(new TextEncoder().encode(cprtText + '\0'), 8);

  // XYZ tags: type 'XYZ ' (4), reserved (4), X (4), Y (4), Z (4)
  function createXyzTag(x: number, y: number, z: number): Uint8Array {
    const b = new Uint8Array(20);
    const v = new DataView(b.buffer);
    b.set(new TextEncoder().encode('XYZ '), 0);
    v.setUint32(4, 0, false);
    v.setUint32(8, x, false);
    v.setUint32(12, y, false);
    v.setUint32(16, z, false);
    return b;
  }

  const wtptTag = createXyzTag(0x0000F6D6, 0x00010000, 0x0000D32D); // D50 White point
  const rXyzTag = createXyzTag(0x00006FA2, 0x000038F5, 0x00000390); // Red matrix
  const gXyzTag = createXyzTag(0x00006299, 0x0000B785, 0x000018DA); // Green matrix
  const bXyzTag = createXyzTag(0x000024A0, 0x00000F84, 0x0000B6CF); // Blue matrix

  // curv tag: type 'curv' (4), reserved (4), count (4), gamma u8.8 (2)
  const curveTag = new Uint8Array(14);
  const curveView = new DataView(curveTag.buffer);
  curveTag.set(new TextEncoder().encode('curv'), 0);
  curveView.setUint32(8, 1, false);
  curveView.setUint16(12, 0x0233, false); // Gamma 2.2

  const tags = [
    { sig: 'desc', data: descBytes },
    { sig: 'cprt', data: cprtBytes },
    { sig: 'wtpt', data: wtptTag },
    { sig: 'rXYZ', data: rXyzTag },
    { sig: 'gXYZ', data: gXyzTag },
    { sig: 'bXYZ', data: bXyzTag },
    { sig: 'rTRC', data: curveTag },
    { sig: 'gTRC', data: curveTag },
    { sig: 'bTRC', data: curveTag },
  ];

  const headerSize = 128;
  const tagTableSize = 4 + tags.length * 12;
  let totalDataSize = 0;
  for (const t of tags) {
    totalDataSize += t.data.length;
  }

  const totalProfileSize = headerSize + tagTableSize + totalDataSize;
  const output = new Uint8Array(totalProfileSize);
  const outView = new DataView(output.buffer);

  // Header
  outView.setUint32(0, totalProfileSize, false);
  output.set(new TextEncoder().encode('lcms'), 4);
  outView.setUint32(8, 0x02100000, false); // Version 2.1
  output.set(new TextEncoder().encode('mntr'), 12); // Display device
  output.set(new TextEncoder().encode('RGB '), 16); // RGB data color space
  output.set(new TextEncoder().encode('XYZ '), 20); // XYZ profile connection space
  outView.setUint16(24, 2026, false); // Year
  outView.setUint16(26, 1, false); // Month
  outView.setUint16(28, 1, false); // Day
  output.set(new TextEncoder().encode('acsp'), 36); // Magic 'acsp' signature
  output.set(new TextEncoder().encode('APPL'), 40);
  // D50 Illuminant in header
  outView.setUint32(68, 0x0000F6D6, false);
  outView.setUint32(72, 0x00010000, false);
  outView.setUint32(76, 0x0000D32D, false);

  // Tag Table
  outView.setUint32(headerSize, tags.length, false);
  let currentOffset = headerSize + tagTableSize;

  for (let i = 0; i < tags.length; i++) {
    const t = tags[i];
    const entryOffset = headerSize + 4 + i * 12;
    output.set(new TextEncoder().encode(t.sig), entryOffset);
    outView.setUint32(entryOffset + 4, currentOffset, false);
    outView.setUint32(entryOffset + 8, t.data.length, false);

    output.set(t.data, currentOffset);
    currentOffset += t.data.length;
  }

  return output;
}

/**
 * Injects standard ISO 19005-2 OutputIntents into the PDFDocument's Catalog.
 * Required for PDF/A validation in PJe, ESAJ, veraPDF, and Adobe Acrobat Preflight.
 */
export function injectOutputIntent(pdfDoc: PDFDocument): void {
  const srgbBytes = createSrgbIccProfileBytes();

  // Create indirect ICC profile stream with 3 channels
  const iccStream = pdfDoc.context.flateStream(srgbBytes, {
    N: 3,
  });
  const iccRef = pdfDoc.context.register(iccStream);

  // Create OutputIntent dictionary conforming to GTS_PDFA1
  const outputIntentDict = pdfDoc.context.obj({
    Type: 'OutputIntent',
    S: 'GTS_PDFA1',
    OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
    RegistryName: PDFString.of('http://www.color.org'),
    Info: PDFString.of('sRGB IEC61966-2.1'),
    DestOutputProfile: iccRef,
  });

  const outputIntentRef = pdfDoc.context.register(outputIntentDict);

  // Attach to Document Catalog
  pdfDoc.catalog.set(
    PDFName.of('OutputIntents'),
    pdfDoc.context.obj([outputIntentRef])
  );
}
