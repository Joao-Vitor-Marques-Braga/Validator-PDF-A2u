import type { PdfProfile } from '../types/validator.types';
import { sanitizeXmpXml } from '../utils/xml-cleaner.util';

export interface XmpParseResult {
  readonly hasXmp: boolean;
  readonly pdfaPart: string | null;
  readonly pdfaConformance: string | null;
  readonly pdfaAmendment?: string | null;
  readonly detectedProfile: PdfProfile;
  readonly detectedProfileDescription: string;
  readonly title?: string;
  readonly author?: string;
  readonly creatorTool?: string;
  readonly creationDate?: string;
  readonly modificationDate?: string;
  readonly rawXmp: string | null;
}

/**
 * Maps pdfaid part and conformance to a user-friendly profile name and description
 */
export function resolvePdfaProfile(
  pdfaPart: string | null,
  pdfaConformance: string | null,
  pdfHeaderVersion: string | null
): { profile: PdfProfile; description: string } {
  if (pdfaPart) {
    const part = pdfaPart.trim();
    const conf = (pdfaConformance || '').trim().toUpperCase();

    if (part === '2' && conf === 'U') {
      return {
        profile: 'PDF/A-2u',
        description: 'PDF/A-2 Unicode (ISO 19005-2, Conformance Level U)',
      };
    }
    if (part === '2' && conf === 'A') {
      return {
        profile: 'PDF/A-2a',
        description: 'PDF/A-2 Accessible (ISO 19005-2, Conformance Level A)',
      };
    }
    if (part === '2' && conf === 'B') {
      return {
        profile: 'PDF/A-2b',
        description: 'PDF/A-2 Basic (ISO 19005-2, Conformance Level B)',
      };
    }
    if (part === '1' && conf === 'A') {
      return {
        profile: 'PDF/A-1a',
        description: 'PDF/A-1 Accessible (ISO 19005-1, Conformance Level A)',
      };
    }
    if (part === '1' && conf === 'B') {
      return {
        profile: 'PDF/A-1b',
        description: 'PDF/A-1 Basic (ISO 19005-1, Conformance Level B)',
      };
    }
    if (part === '3' && conf === 'U') {
      return {
        profile: 'PDF/A-3u',
        description: 'PDF/A-3 Unicode (ISO 19005-3, Conformance Level U)',
      };
    }
    if (part === '3' && conf === 'A') {
      return {
        profile: 'PDF/A-3a',
        description: 'PDF/A-3 Accessible (ISO 19005-3, Conformance Level A)',
      };
    }
    if (part === '3' && conf === 'B') {
      return {
        profile: 'PDF/A-3b',
        description: 'PDF/A-3 Basic (ISO 19005-3, Conformance Level B)',
      };
    }

    // Generic PDF/A with non-standard conformance
    return {
      profile: 'PDF Padrão',
      description: `PDF com metadados PDF/A não padronizados (Parte ${part}, Conformidade ${conf || 'N/A'})`,
    };
  }

  if (pdfHeaderVersion) {
    return {
      profile: 'PDF Padrão',
      description: `PDF Padrão versão ${pdfHeaderVersion} (sem conformidade PDF/A detectada)`,
    };
  }

  return {
    profile: 'Arquivo Não-PDF / Corrompido',
    description: 'Não foi possível detectar a assinatura ou metadados de PDF no arquivo.',
  };
}

/**
 * Service to parse XMP packet strings and extract PDF/A identification schema
 */
export class XmpParserService {
  public static parse(rawXmp: string | null, pdfHeaderVersion: string | null): XmpParseResult {
    if (!rawXmp) {
      const { profile, description } = resolvePdfaProfile(null, null, pdfHeaderVersion);
      return {
        hasXmp: false,
        pdfaPart: null,
        pdfaConformance: null,
        detectedProfile: profile,
        detectedProfileDescription: description,
        rawXmp: null,
      };
    }

    const cleanedXml = sanitizeXmpXml(rawXmp);
    let part: string | null = null;
    let conformance: string | null = null;
    let amendment: string | null = null;
    let title: string | undefined;
    let author: string | undefined;
    let creatorTool: string | undefined;
    let creationDate: string | undefined;
    let modificationDate: string | undefined;

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(cleanedXml, 'text/xml');

      // Strategy 1: Search DOM nodes by tag name or localName
      const allElements = xmlDoc.getElementsByTagName('*');
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        const local = (el.localName || el.nodeName).toLowerCase();

        if (local === 'part' || local.endsWith(':part')) {
          if (!part && el.textContent) part = el.textContent.trim();
        }
        if (local === 'conformance' || local.endsWith(':conformance')) {
          if (!conformance && el.textContent) conformance = el.textContent.trim().toUpperCase();
        }
        if (local === 'amd' || local.endsWith(':amd')) {
          if (!amendment && el.textContent) amendment = el.textContent.trim();
        }
        if (local === 'title' || local.endsWith(':title')) {
          if (!title && el.textContent) title = el.textContent.trim();
        }
        if (local === 'creator' || local.endsWith(':creator') || local === 'author') {
          if (!author && el.textContent) author = el.textContent.trim();
        }
        if (local === 'creatortool' || local.endsWith(':creatortool')) {
          if (!creatorTool && el.textContent) creatorTool = el.textContent.trim();
        }
        if (local === 'createdate' || local.endsWith(':createdate')) {
          if (!creationDate && el.textContent) creationDate = el.textContent.trim();
        }
        if (local === 'modifydate' || local.endsWith(':modifydate')) {
          if (!modificationDate && el.textContent) modificationDate = el.textContent.trim();
        }

        // Check attributes on the element (e.g., pdfaid:part="2" pdfaid:conformance="U")
        for (let j = 0; j < el.attributes.length; j++) {
          const attr = el.attributes[j];
          const attrName = (attr.localName || attr.name).toLowerCase();
          if (attrName === 'part' || attrName.endsWith(':part')) {
            if (!part) part = attr.value.trim();
          }
          if (attrName === 'conformance' || attrName.endsWith(':conformance')) {
            if (!conformance) conformance = attr.value.trim().toUpperCase();
          }
          if (attrName === 'amd' || attrName.endsWith(':amd')) {
            if (!amendment) amendment = attr.value.trim();
          }
        }
      }
    } catch {
      // If DOMParser fails on malformed XML, fallback to regex extraction
    }

    // Strategy 2: Robust Regex Fallback if DOMParser missed anything
    if (!part) {
      const partMatch = cleanedXml.match(/<[^:]*:?part[^>]*>([^<]+)<\/[^:]*:?part>/i) ||
                         cleanedXml.match(/pdfaid:part=["']([^"']+)["']/i);
      if (partMatch) part = partMatch[1].trim();
    }

    if (!conformance) {
      const confMatch = cleanedXml.match(/<[^:]*:?conformance[^>]*>([^<]+)<\/[^:]*:?conformance>/i) ||
                         cleanedXml.match(/pdfaid:conformance=["']([^"']+)["']/i);
      if (confMatch) conformance = confMatch[1].trim().toUpperCase();
    }

    if (!amendment) {
      const amdMatch = cleanedXml.match(/<[^:]*:?amd[^>]*>([^<]+)<\/[^:]*:?amd>/i) ||
                        cleanedXml.match(/pdfaid:amd=["']([^"']+)["']/i);
      if (amdMatch) amendment = amdMatch[1].trim();
    }

    const { profile, description } = resolvePdfaProfile(part, conformance, pdfHeaderVersion);

    return {
      hasXmp: true,
      pdfaPart: part,
      pdfaConformance: conformance,
      pdfaAmendment: amendment,
      detectedProfile: profile,
      detectedProfileDescription: description,
      title,
      author,
      creatorTool,
      creationDate,
      modificationDate,
      rawXmp: cleanedXml,
    };
  }
}
