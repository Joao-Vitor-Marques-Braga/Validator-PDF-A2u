import { describe, it, expect } from 'vitest';
import { PdfValidatorService } from '../services/pdf-validator.service';
import {
  createValidPdfa2uSample,
  createInvalidNameMultipleDotsSample,
  createInvalidProfilePdf17StandardSample,
  createInvalidProfilePdfa1bSample,
  createInvalidSizeLargePdfSample,
} from '../utils/pdf-sample-generator.util';

describe('Service: PdfValidatorService (Pipeline Integration)', () => {
  it('should validate and approve a valid PDF/A-2u file with valid name', async () => {
    const validFile = createValidPdfa2uSample();
    const report = await PdfValidatorService.validate(validFile);

    expect(report.isValid).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.detectedProfile).toBe('PDF/A-2u');
    expect(report.checks.every((c) => c.passed)).toBe(true);
    const sizeCheck = report.checks.find((c) => c.category === 'FILE_SIZE');
    expect(sizeCheck?.passed).toBe(true);
  });

  it('should reject a file exceeding the 10MB limit', async () => {
    const largeFile = createInvalidSizeLargePdfSample();
    const report = await PdfValidatorService.validate(largeFile);

    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes('10 MB'))).toBe(true);
    const sizeCheck = report.checks.find((c) => c.category === 'FILE_SIZE');
    expect(sizeCheck).toBeDefined();
    expect(sizeCheck?.passed).toBe(false);
    expect(sizeCheck?.severity).toBe('error');
  });

  it('should reject a file with multiple dots even if internal XMP is valid', async () => {
    const invalidNameFile = createInvalidNameMultipleDotsSample();
    const report = await PdfValidatorService.validate(invalidNameFile);

    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes('pontos'))).toBe(true);
    const nameCheck = report.checks.find((c) => c.category === 'FILE_NAME');
    expect(nameCheck?.passed).toBe(false);
  });

  it('should reject standard PDF 1.7 file and explain detected vs expected profile', async () => {
    const pdf17File = createInvalidProfilePdf17StandardSample();
    const report = await PdfValidatorService.validate(pdf17File);

    expect(report.isValid).toBe(false);
    expect(report.detectedProfile).toBe('PDF Padrão');
    expect(report.expectedProfile).toContain('PDF/A-2u');
    expect(report.errors.some((e) => e.includes('PDF Padrão') || e.includes('PDF/A'))).toBe(true);
  });

  it('should reject PDF/A-1b and report PDF/A-1b detected', async () => {
    const pdfa1bFile = createInvalidProfilePdfa1bSample();
    const report = await PdfValidatorService.validate(pdfa1bFile);

    expect(report.isValid).toBe(false);
    expect(report.detectedProfile).toBe('PDF/A-1b');
    expect(report.errors.some((e) => e.includes('PDF/A-1b'))).toBe(true);
  });
});
