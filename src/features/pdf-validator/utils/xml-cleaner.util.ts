/**
 * XML Sanitization utility for XMP packets
 */

/**
 * Extracts and cleans the XML content from a raw XMP packet,
 * removing xpacket processing instructions if necessary.
 */
export function sanitizeXmpXml(rawXmp: string): string {
  let cleaned = rawXmp;

  // Remove <?xpacket begin=...?>
  cleaned = cleaned.replace(/<\?xpacket\s+begin=[^>]*\?>/gi, '');
  // Remove <?xpacket end=...?>
  cleaned = cleaned.replace(/<\?xpacket\s+end=[^>]*\?>/gi, '');

  return cleaned.trim();
}

/**
 * Helper to safely extract text content or attribute value from XML DOM node
 */
export function getElementTextByLocalName(doc: Document | Element, localName: string): string | null {
  // Try getElementsByTagNameNS with wildcard or local name lookup
  const elements = doc.getElementsByTagName('*');
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.localName.toLowerCase() === localName.toLowerCase()) {
      return el.textContent?.trim() || null;
    }
  }

  return null;
}

/**
 * Helper to safely search for an attribute value regardless of namespace prefix
 */
export function getAttributeByLocalName(doc: Document | Element, attrLocalName: string): string | null {
  const elements = doc.getElementsByTagName('*');
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    for (let j = 0; j < el.attributes.length; j++) {
      const attr = el.attributes[j];
      if (attr.localName.toLowerCase() === attrLocalName.toLowerCase()) {
        return attr.value.trim();
      }
    }
  }
  return null;
}
