import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';
import { Result } from '../types/result.type';
import { hasUnembeddedFonts, inspectFontEmbedding } from '../utils/font-inspector.util';
import { validateFontEmbedding } from '../domain/rules/font-embedding.rule';
import { PdfConverterService } from '../services/pdf-converter.service';
import { PdfValidatorService } from '../services/pdf-validator.service';

describe('Auditoria Técnica: Diretrizes de Conversão e Validação PDF/A-2u', () => {
  const joaoPath = path.resolve(process.cwd(), 'public/JOAO_VIEIRA_DA_SILVA.PDF');
  const alcenorPath = path.resolve(
    process.cwd(),
    'public/PD_130373__RETORNO_ATIVIDADE_ALCENOR_DE_SALES_GOMES_JUNIOR.PDF'
  );

  describe('1. Diagnóstico de Incorporação de Fontes (Pré-Conversão)', () => {
    it('detecta fontes 100% embutidas em JOAO_VIEIRA_DA_SILVA.PDF', () => {
      const buffer = new Uint8Array(fs.readFileSync(joaoPath));

      const result = inspectFontEmbedding(buffer);
      expect(result.hasUnembedded).toBe(false);
      expect(result.unembeddedFontNames).toHaveLength(0);
      expect(hasUnembeddedFonts(buffer)).toBe(false);

      const validation = validateFontEmbedding(buffer);
      expect(Result.isOk(validation)).toBe(true);
      if (Result.isOk(validation)) {
        expect(validation.value.checkItem.passed).toBe(true);
        expect(validation.value.checkItem.category).toBe('FONT_EMBEDDING');
      }
    });

    it('detecta fontes desincorporadas em PD_130373... e emite aviso preventivo claro', () => {
      const buffer = new Uint8Array(fs.readFileSync(alcenorPath));

      const result = inspectFontEmbedding(buffer);
      expect(result.hasUnembedded).toBe(true);
      expect(result.unembeddedFontNames.length).toBeGreaterThan(0);
      expect(result.unembeddedFontNames).toContain('ArialMT');

      const validation = validateFontEmbedding(buffer);
      expect(Result.isFail(validation)).toBe(true);
      if (Result.isFail(validation)) {
        expect(validation.error.checkItem.passed).toBe(false);
        expect(validation.error.checkItem.category).toBe('FONT_EMBEDDING');
        expect(validation.error.checkItem.severity).toBe('warning');
        // Mensagem preventiva clara exigida pela diretriz Centi / TCM-GO
        expect(validation.error.message).toContain('Este documento foi gerado sem incorporar as fontes');
        expect(validation.error.message).toContain(
          'Para resolver, reexporte o arquivo no seu software original (Word/Impressora) marcando a opção "Incorporar Fontes" ou "Salvar como PDF/A"'
        );
      }
    });

    it('identifica fontes Standard 14 Type 1 sem FontDescriptor', () => {
      const syntheticPdfText = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length 44 >> stream
BT /F1 12 Tf 100 700 Td (Hello) Tj ET
endstream endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000224 00000 n 
0000000295 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
389
%%EOF`;
      const bytes = new TextEncoder().encode(syntheticPdfText);
      const result = inspectFontEmbedding(bytes);
      expect(result.hasUnembedded).toBe(true);
      expect(result.unembeddedFontNames).toContain('Helvetica');
    });
  });

  describe('2. Veto a Rasterização e Proteção de Conversão Vetorial Lossless (<= 10MB)', () => {
    it('mantém conversão vetorial estrita (wasCompressed === false) para JOAO_VIEIRA_DA_SILVA.PDF', async () => {
      const buffer = new Uint8Array(fs.readFileSync(joaoPath));
      const file = new File([buffer], 'JOAO_VIEIRA_DA_SILVA.PDF', { type: 'application/pdf' });

      const result = await PdfConverterService.convertToPdfa2u(file);
      expect(result.wasCompressed).toBe(false);
      expect(result.file.name).toBe('JOAO_VIEIRA_DA_SILVA_pdfa2u.pdf');

      // Validação do arquivo resultante
      const report = await PdfValidatorService.validate(result.file);
      expect(report.isValid).toBe(true);
      expect(report.detectedProfile).toBe('PDF/A-2u');
    });

    it('garante que PD_130373... (< 10MB) NÃO seja rasterizado, operando em modo vetorial nativo', async () => {
      const buffer = new Uint8Array(fs.readFileSync(alcenorPath));
      const file = new File(
        [buffer],
        'PD_130373__RETORNO_ATIVIDADE_ALCENOR_DE_SALES_GOMES_JUNIOR.PDF',
        { type: 'application/pdf' }
      );

      expect(file.size).toBeLessThan(10 * 1024 * 1024);

      const result = await PdfConverterService.convertToPdfa2u(file);

      // VETO À RASTERIZAÇÃO: deve ser mantido no modo vetorial lossless!
      expect(result.wasCompressed).toBe(false);
      expect(result.file.name).toBe(
        'PD_130373__RETORNO_ATIVIDADE_ALCENOR_DE_SALES_GOMES_JUNIOR_pdfa2u.pdf'
      );

      // As páginas vetoriais continuam intactas
      const convertedBytes = new Uint8Array(await result.file.arrayBuffer());
      fs.writeFileSync(
        path.resolve(process.cwd(), 'public/PD_130373__RETORNO_ATIVIDADE_ALCENOR_DE_SALES_GOMES_JUNIOR_pdfa2u.pdf'),
        convertedBytes
      );
      const pdfDoc = await PDFDocument.load(convertedBytes, { updateMetadata: false });
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);

      // O validador confirma a conformidade PDF/A-2u com fontes incorporadas com sucesso
      const report = await PdfValidatorService.validate(result.file);
      expect(report.isValid).toBe(true);
      expect(report.detectedProfile).toBe('PDF/A-2u');
      const fontCheck = report.checks.find((c) => c.id === 'font-embedding-check');
      expect(fontCheck).toBeDefined();
      expect(fontCheck?.passed).toBe(true);
      expect(fontCheck?.detected).toContain('Todas as fontes embutidas');
    });
  });
});
