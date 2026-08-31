import { describe, it, expect } from 'vitest';
import { validatePdfa2uConformance, EXPECTED_PDFA2U_LABEL } from '../domain/rules/pdfa2u-conformance.rule';
import type { PdfMetadata } from '../types/validator.types';
import { Result } from '../types/result.type';

describe('Domain Rule: validatePdfa2uConformance', () => {
  const baseMetadata: PdfMetadata = {
    fileName: 'doc.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    pdfHeaderVersion: '1.7',
    hasXmpMetadata: true,
    rawXmpText: '<xml></xml>',
    pdfaPart: '2',
    pdfaConformance: 'U',
    detectedProfile: 'PDF/A-2u',
    detectedProfileDescription: 'PDF/A-2 Unicode (ISO 19005-2, Conformance Level U)',
  };

  it('should approve strictly conforming PDF/A-2u files', () => {
    const result = validatePdfa2uConformance(baseMetadata);
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.conforms).toBe(true);
      expect(result.value.part).toBe('2');
      expect(result.value.conformance).toBe('U');
      expect(result.value.checkItem.passed).toBe(true);
    }
  });

  it('should reject PDF/A-1b files with clear detected vs expected messages', () => {
    const metaPdfa1b: PdfMetadata = {
      ...baseMetadata,
      pdfaPart: '1',
      pdfaConformance: 'B',
      detectedProfile: 'PDF/A-1b',
      detectedProfileDescription: 'PDF/A-1 Basic (ISO 19005-1, Conformance Level B)',
    };

    const result = validatePdfa2uConformance(metaPdfa1b);
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error.detectedProfile).toBe('PDF/A-1b');
      expect(result.error.expectedProfile).toBe(EXPECTED_PDFA2U_LABEL);
      expect(result.error.message).toContain('PDF/A-1b');
      expect(result.error.message).toContain(EXPECTED_PDFA2U_LABEL);
    }
  });

  it('should reject standard non-PDF/A files', () => {
    const metaStandard: PdfMetadata = {
      ...baseMetadata,
      hasXmpMetadata: false,
      pdfaPart: null,
      pdfaConformance: null,
      detectedProfile: 'PDF Padrão',
      detectedProfileDescription: 'PDF Padrão versão 1.7 (sem conformidade PDF/A detectada)',
    };

    const result = validatePdfa2uConformance(metaStandard);
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error.detectedProfile).toBe('PDF Padrão');
      expect(result.error.message).toContain('PDF Padrão');
    }
  });
});
