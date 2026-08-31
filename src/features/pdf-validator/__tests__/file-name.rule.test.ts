import { describe, it, expect } from 'vitest';
import { validateFileName } from '../domain/rules/file-name.rule';
import { Result } from '../types/result.type';

describe('Domain Rule: validateFileName', () => {
  it('should accept valid file names with strictly one dot for .pdf extension', () => {
    const validNames = [
      'documento.pdf',
      'documento_v1.pdf',
      'contrato-2024_assinado.pdf',
      'relatorio_mensal_setembro.pdf',
      'FOLHA_DE_PAGAMENTO.PDF',
    ];

    validNames.forEach((name) => {
      const result = validateFileName(name);
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.dotCount).toBe(1);
        expect(result.value.extension).toBe('.pdf');
      }
    });
  });

  it('should reject file names with multiple dots', () => {
    const invalidNames = [
      'documento.v1.pdf',
      'contrato.final.assinado.pdf',
      'relatorio..pdf',
      'teste.1.2.3.pdf',
      '.hidden_file.pdf',
    ];

    invalidNames.forEach((name) => {
      const result = validateFileName(name);
      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error.code).toBe('MULTIPLE_DOTS');
        expect(result.error.message).toContain('pontos');
        expect(result.error.details.dotCount).toBeGreaterThan(1);
      }
    });
  });

  it('should reject file names with invalid or missing extension', () => {
    const invalidExtensions = [
      'documento.docx',
      'arquivo.png',
      'sem_extensao',
      'arquivo.',
    ];

    invalidExtensions.forEach((name) => {
      const result = validateFileName(name);
      expect(Result.isFail(result)).toBe(true);
    });
  });

  it('should reject empty or whitespace-only file names', () => {
    const emptyResult = validateFileName('');
    expect(Result.isFail(emptyResult)).toBe(true);
    if (Result.isFail(emptyResult)) {
      expect(emptyResult.error.code).toBe('EMPTY_FILENAME');
    }
  });
});
