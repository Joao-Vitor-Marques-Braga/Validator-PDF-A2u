import { Result } from '../../types/result.type';
import type { ValidationCheckItem } from '../../types/validator.types';
import { inspectFontEmbedding } from '../../utils/font-inspector.util';

export const UNEMBEDDED_FONTS_WARNING_MESSAGE =
  'Este documento foi gerado sem incorporar as fontes (ex: Verdana, Times New Roman). O validador do TCM/Centi exige fontes embutidas. Para resolver, reexporte o arquivo no seu software original (Word/Impressora) marcando a opção "Incorporar Fontes" ou "Salvar como PDF/A".';

export interface FontEmbeddingSuccess {
  readonly checkItem: ValidationCheckItem;
  readonly unembeddedFontNames: readonly string[];
}

export interface FontEmbeddingError {
  readonly checkItem: ValidationCheckItem;
  readonly unembeddedFontNames: readonly string[];
  readonly message: string;
}

/**
 * Validates that all fonts in the PDF are physically embedded according to ISO 19005-2 Clause 6.2.11.
 */
export function validateFontEmbedding(
  pdfBytes: Uint8Array | ArrayBuffer
): Result<FontEmbeddingSuccess, FontEmbeddingError> {
  const { hasUnembedded, unembeddedFontNames } = inspectFontEmbedding(pdfBytes);

  if (!hasUnembedded) {
    return Result.ok({
      unembeddedFontNames: [],
      checkItem: {
        id: 'font-embedding-check',
        category: 'FONT_EMBEDDING',
        label: 'Incorporação Física de Fontes',
        passed: true,
        expected: 'Fontes 100% incorporadas (/FontFile, /FontFile2 ou /FontFile3)',
        detected: 'Todas as fontes embutidas',
        message:
          'Todas as fontes do documento estão fisicamente embutidas no arquivo, atendendo à ISO 19005-2 Cláusula 6.2.11.',
        severity: 'info',
      },
    });
  }

  const detectedList = unembeddedFontNames.join(', ') || 'Fontes não embutidas';
  const customMessage = unembeddedFontNames.length > 0
    ? `Este documento foi gerado sem incorporar as fontes (ex: ${unembeddedFontNames.slice(0, 3).join(', ')}). O validador do TCM/Centi exige fontes embutidas. Para resolver, reexporte o arquivo no seu software original (Word/Impressora) marcando a opção "Incorporar Fontes" ou "Salvar como PDF/A".`
    : UNEMBEDDED_FONTS_WARNING_MESSAGE;

  return Result.fail({
    unembeddedFontNames,
    message: customMessage,
    checkItem: {
      id: 'font-embedding-check',
      category: 'FONT_EMBEDDING',
      label: 'Incorporação Física de Fontes',
      passed: false,
      expected: 'Fontes 100% incorporadas (/FontFile, /FontFile2 ou /FontFile3)',
      detected: detectedList,
      message: customMessage,
      severity: 'warning',
    },
  });
}
