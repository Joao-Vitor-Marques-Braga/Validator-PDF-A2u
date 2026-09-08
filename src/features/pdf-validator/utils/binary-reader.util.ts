/**
 * Binary Reader Utility for PDF and XMP metadata stream inspection
 */

/**
 * Searches for a sequence of bytes (ASCII pattern) inside a Uint8Array.
 * Returns the index of the first match or -1 if not found.
 */
export function findBytesSequence(
  buffer: Uint8Array,
  pattern: string,
  startIndex = 0,
  maxIndex = buffer.length
): number {
  const patternBytes = new TextEncoder().encode(pattern);
  const patternLen = patternBytes.length;
  const searchLimit = Math.min(buffer.length - patternLen, maxIndex);

  for (let i = startIndex; i <= searchLimit; i++) {
    let match = true;
    for (let j = 0; j < patternLen; j++) {
      if (buffer[i + j] !== patternBytes[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      return i;
    }
  }
  return -1;
}

/**
 * Extracts PDF Header version (e.g., %PDF-1.7 -> "1.7")
 */
export function extractPdfHeaderVersion(buffer: Uint8Array): string | null {
  // Look at the first 1024 bytes for standard PDF header
  const maxHeaderSearch = Math.min(buffer.length, 1024);
  const headerIndex = findBytesSequence(buffer, '%PDF-', 0, maxHeaderSearch);

  if (headerIndex === -1) {
    return null;
  }

  const decoder = new TextDecoder('ascii');
  const slice = buffer.subarray(headerIndex, Math.min(buffer.length, headerIndex + 20));
  const text = decoder.decode(slice);

  const match = text.match(/%PDF-(\d+\.\d+)/);
  return match ? match[1] : null;
}

/**
 * Extracts the raw XMP metadata packet XML string from PDF ArrayBuffer
 */
export function extractRawXmpPacket(buffer: Uint8Array): string | null {
  const decoder = new TextDecoder('utf-8');

  // Strategy 1: Look for standard <?xpacket begin ... ?> ... <?xpacket end (latest in file)
  let lastXpacketStart = -1;
  let searchPos = 0;
  while (true) {
    const idx = findBytesSequence(buffer, '<?xpacket begin', searchPos);
    if (idx === -1) break;
    lastXpacketStart = idx;
    searchPos = idx + 15;
  }

  if (lastXpacketStart !== -1) {
    const xpacketEndMarker = '<?xpacket end';
    const xpacketEnd = findBytesSequence(buffer, xpacketEndMarker, lastXpacketStart);
    if (xpacketEnd !== -1) {
      // Find closing tag `?>` after marker
      const closingBracket = findBytesSequence(buffer, '?>', xpacketEnd);
      const endOffset = closingBracket !== -1 ? closingBracket + 2 : xpacketEnd + xpacketEndMarker.length;
      const xmpSlice = buffer.subarray(lastXpacketStart, endOffset);
      return decoder.decode(xmpSlice);
    }
  }

  // Strategy 2: Look for <x:xmpmeta ... </x:xmpmeta> (latest in file)
  let lastXmpmetaStart = -1;
  searchPos = 0;
  while (true) {
    const idx = findBytesSequence(buffer, '<x:xmpmeta', searchPos);
    if (idx === -1) break;
    lastXmpmetaStart = idx;
    searchPos = idx + 10;
  }

  if (lastXmpmetaStart !== -1) {
    const xmpmetaEndMarker = '</x:xmpmeta>';
    const xmpmetaEnd = findBytesSequence(buffer, xmpmetaEndMarker, lastXmpmetaStart);
    if (xmpmetaEnd !== -1) {
      const endOffset = xmpmetaEnd + xmpmetaEndMarker.length;
      const xmpSlice = buffer.subarray(lastXmpmetaStart, endOffset);
      return decoder.decode(xmpSlice);
    }
  }

  // Strategy 3: Look for <rdf:RDF ... </rdf:RDF> (latest in file)
  let lastRdfStart = -1;
  searchPos = 0;
  while (true) {
    const idx = findBytesSequence(buffer, '<rdf:RDF', searchPos);
    if (idx === -1) break;
    lastRdfStart = idx;
    searchPos = idx + 8;
  }

  if (lastRdfStart !== -1) {
    const rdfEndMarker = '</rdf:RDF>';
    const rdfEnd = findBytesSequence(buffer, rdfEndMarker, lastRdfStart);
    if (rdfEnd !== -1) {
      const endOffset = rdfEnd + rdfEndMarker.length;
      const xmpSlice = buffer.subarray(lastRdfStart, endOffset);
      return decoder.decode(xmpSlice);
    }
  }

  return null;
}
