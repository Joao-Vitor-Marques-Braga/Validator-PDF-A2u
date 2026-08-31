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

  // Strategy 1: Look for standard <?xpacket begin ... ?> ... <?xpacket end
  const xpacketStart = findBytesSequence(buffer, '<?xpacket begin');
  if (xpacketStart !== -1) {
    const xpacketEndMarker = '<?xpacket end';
    const xpacketEnd = findBytesSequence(buffer, xpacketEndMarker, xpacketStart);
    if (xpacketEnd !== -1) {
      // Find closing tag `?>` after marker
      const closingBracket = findBytesSequence(buffer, '?>', xpacketEnd);
      const endOffset = closingBracket !== -1 ? closingBracket + 2 : xpacketEnd + xpacketEndMarker.length;
      const xmpSlice = buffer.subarray(xpacketStart, endOffset);
      return decoder.decode(xmpSlice);
    }
  }

  // Strategy 2: Look for <x:xmpmeta ... </x:xmpmeta>
  const xmpmetaStart = findBytesSequence(buffer, '<x:xmpmeta');
  if (xmpmetaStart !== -1) {
    const xmpmetaEndMarker = '</x:xmpmeta>';
    const xmpmetaEnd = findBytesSequence(buffer, xmpmetaEndMarker, xmpmetaStart);
    if (xmpmetaEnd !== -1) {
      const endOffset = xmpmetaEnd + xmpmetaEndMarker.length;
      const xmpSlice = buffer.subarray(xmpmetaStart, endOffset);
      return decoder.decode(xmpSlice);
    }
  }

  // Strategy 3: Look for <rdf:RDF ... </rdf:RDF>
  const rdfStart = findBytesSequence(buffer, '<rdf:RDF');
  if (rdfStart !== -1) {
    const rdfEndMarker = '</rdf:RDF>';
    const rdfEnd = findBytesSequence(buffer, rdfEndMarker, rdfStart);
    if (rdfEnd !== -1) {
      const endOffset = rdfEnd + rdfEndMarker.length;
      const xmpSlice = buffer.subarray(rdfStart, endOffset);
      return decoder.decode(xmpSlice);
    }
  }

  return null;
}
