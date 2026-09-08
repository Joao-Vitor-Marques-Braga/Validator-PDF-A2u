import { describe, it, expect } from 'vitest';
import { PdfConverterService, sanitizeToSingleDotPdfName } from '../services/pdf-converter.service';
import { PdfValidatorService } from '../services/pdf-validator.service';
import {
  createInvalidProfilePdf17StandardSample,
  createInvalidNameMultipleDotsSample,
  createInvalidProfilePdfa1bSample,
  createInvalidSizeLargePdfSample,
} from '../utils/pdf-sample-generator.util';

describe('Service: PdfConverterService', () => {
  it('should sanitize filename to have strictly one dot', () => {
    expect(sanitizeToSingleDotPdfName('documento.v1.2.pdf')).toBe('documento_v1_2_pdfa2u.pdf');
    expect(sanitizeToSingleDotPdfName('relatorio.final.pdf')).toBe('relatorio_final_pdfa2u.pdf');
    expect(sanitizeToSingleDotPdfName('contrato.pdf')).toBe('contrato_pdfa2u.pdf');
    expect(sanitizeToSingleDotPdfName('arquivo_pdfa2u.pdf')).toBe('arquivo_pdfa2u.pdf');
  });

  it('should convert standard PDF 1.7 to valid PDF/A-2u file passing all validations', async () => {
    const originalFile = createInvalidProfilePdf17StandardSample();

    // Verify it originally fails validation
    const initialReport = await PdfValidatorService.validate(originalFile);
    expect(initialReport.isValid).toBe(false);
    expect(initialReport.detectedProfile).toBe('PDF Padrão');

    // Convert
    const conversionResult = await PdfConverterService.convertToPdfa2u(originalFile);
    expect(conversionResult.file).toBeDefined();
    expect(conversionResult.file.name).toBe('relatorio_padrao_pdf17_pdfa2u.pdf');

    // Validate converted file
    const convertedReport = await PdfValidatorService.validate(conversionResult.file);
    expect(convertedReport.isValid).toBe(true);
    expect(convertedReport.detectedProfile).toBe('PDF/A-2u');
    expect(convertedReport.errors).toHaveLength(0);
    expect(convertedReport.checks.every((c) => c.passed)).toBe(true);
  });

  it('should fix multiple-dot filenames and inject PDF/A-2u compliance', async () => {
    const invalidNameFile = createInvalidNameMultipleDotsSample();

    // Verify it fails originally due to dots
    const initialReport = await PdfValidatorService.validate(invalidNameFile);
    expect(initialReport.isValid).toBe(false);

    // Convert
    const result = await PdfConverterService.convertToPdfa2u(invalidNameFile);
    expect(result.file.name).toBe('documento_v1_2_final_pdfa2u.pdf');

    // Validate converted file
    const convertedReport = await PdfValidatorService.validate(result.file);
    expect(convertedReport.isValid).toBe(true);
    expect(convertedReport.detectedProfile).toBe('PDF/A-2u');
  });

  it('should convert PDF/A-1b to PDF/A-2u', async () => {
    const pdfa1bFile = createInvalidProfilePdfa1bSample();

    const result = await PdfConverterService.convertToPdfa2u(pdfa1bFile);
    const convertedReport = await PdfValidatorService.validate(result.file);

    expect(convertedReport.isValid).toBe(true);
    expect(convertedReport.detectedProfile).toBe('PDF/A-2u');
  });

  it('should handle large file (>10MB) with compression and produce valid PDF/A-2u', async () => {
    const largeFile = createInvalidSizeLargePdfSample();
    expect(largeFile.size).toBeGreaterThan(10 * 1024 * 1024);

    const result = await PdfConverterService.convertToPdfa2u(largeFile);
    expect(result.wasCompressed).toBe(true);
    expect(result.file.size).toBeLessThanOrEqual(10 * 1024 * 1024);

    const convertedReport = await PdfValidatorService.validate(result.file);
    expect(convertedReport.isValid).toBe(true);
    expect(convertedReport.detectedProfile).toBe('PDF/A-2u');
  });
});
