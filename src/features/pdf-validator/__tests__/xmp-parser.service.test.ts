import { describe, it, expect } from 'vitest';
import { XmpParserService, resolvePdfaProfile } from '../services/xmp-parser.service';

describe('Service: XmpParserService', () => {
  it('should correctly identify PDF/A-2u from standard XMP XML tags', () => {
    const xmp = `
      <x:xmpmeta xmlns:x="adobe:ns:meta/">
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
          <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
            <pdfaid:part>2</pdfaid:part>
            <pdfaid:conformance>U</pdfaid:conformance>
          </rdf:Description>
        </rdf:RDF>
      </x:xmpmeta>
    `;

    const parsed = XmpParserService.parse(xmp, '1.7');
    expect(parsed.hasXmp).toBe(true);
    expect(parsed.pdfaPart).toBe('2');
    expect(parsed.pdfaConformance).toBe('U');
    expect(parsed.detectedProfile).toBe('PDF/A-2u');
  });

  it('should correctly identify PDF/A-1b from XMP attributes', () => {
    const xmp = `
      <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
        <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
          pdfaid:part="1"
          pdfaid:conformance="B" />
      </rdf:RDF>
    `;

    const parsed = XmpParserService.parse(xmp, '1.4');
    expect(parsed.pdfaPart).toBe('1');
    expect(parsed.pdfaConformance).toBe('B');
    expect(parsed.detectedProfile).toBe('PDF/A-1b');
  });

  it('should correctly identify PDF/A-2b', () => {
    const xmp = `
      <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
        <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
          <pdfaid:part>2</pdfaid:part>
          <pdfaid:conformance>B</pdfaid:conformance>
        </rdf:Description>
      </rdf:RDF>
    `;

    const parsed = XmpParserService.parse(xmp, '1.7');
    expect(parsed.detectedProfile).toBe('PDF/A-2b');
  });

  it('should fallback to standard PDF profile when XMP is absent', () => {
    const parsed = XmpParserService.parse(null, '1.7');
    expect(parsed.hasXmp).toBe(false);
    expect(parsed.detectedProfile).toBe('PDF Padrão');
    expect(parsed.detectedProfileDescription).toContain('1.7');
  });

  it('should resolve corrupt/non-pdf when neither header nor XMP is present', () => {
    const { profile } = resolvePdfaProfile(null, null, null);
    expect(profile).toBe('Arquivo Não-PDF / Corrompido');
  });
});
