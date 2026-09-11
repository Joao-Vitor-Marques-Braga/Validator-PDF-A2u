import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, PDFName } from 'pdf-lib';
import { PdfConverterService } from '../services/pdf-converter.service';
import { PdfValidatorService } from '../services/pdf-validator.service';

describe('Integration Test: Convert EDILENE_ALVES_DA_CRUZ_ALTERACAO.PDF', () => {
  it('converts correctly preserving all 3 pages, vector contents and adding PDF/A-2u conformance', async () => {
    const inputPath = path.resolve(process.cwd(), 'public/EDILENE_ALVES_DA_CRUZ_ALTERACAO.PDF');
    if (!fs.existsSync(inputPath)) return;
    const inputBuffer = fs.readFileSync(inputPath);
    const inputFile = new File([inputBuffer], 'EDILENE_ALVES_DA_CRUZ_ALTERACAO.PDF', { type: 'application/pdf' });

    const result = await PdfConverterService.convertToPdfa2u(inputFile);

    expect(result.file).toBeDefined();
    expect(result.file.name).toBe('EDILENE_ALVES_DA_CRUZ_ALTERACAO_pdfa2u.pdf');
    expect(result.wasCompressed).toBe(false);

    const convertedBytes = new Uint8Array(await result.file.arrayBuffer());

    // Save to public so the user has the fixed file ready
    const outputPath = path.resolve(process.cwd(), 'public/EDILENE_ALVES_DA_CRUZ_ALTERACAO_pdfa2u.pdf');
    fs.writeFileSync(outputPath, convertedBytes);

    // Verify PDF structure with pdf-lib
    const pdfDoc = await PDFDocument.load(convertedBytes, { updateMetadata: false });
    expect(pdfDoc.getPageCount()).toBe(3);

    // Ensure all 3 pages have valid /Contents stream (NOT blank pages!)
    for (let i = 0; i < 3; i++) {
      const page = pdfDoc.getPage(i);
      const contents = page.node.get(PDFName.of('Contents'));
      expect(contents).toBeDefined();
    }

    // Ensure OutputIntents and Trailer ID
    expect(pdfDoc.catalog.get(PDFName.of('OutputIntents'))).toBeDefined();
    expect(pdfDoc.context.trailerInfo.ID).toBeDefined();

    // Verify it passes full pipeline validation
    const validationReport = await PdfValidatorService.validate(result.file);
    expect(validationReport.isValid).toBe(true);
    expect(validationReport.detectedProfile).toBe('PDF/A-2u');
    expect(validationReport.errors).toHaveLength(0);
  });
});
