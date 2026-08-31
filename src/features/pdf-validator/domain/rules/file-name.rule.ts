import { Result } from '../../types/result.type';
import type { ValidationCheckItem } from '../../types/validator.types';

export interface FileNameValidationDetails {
  readonly fileName: string;
  readonly baseName: string;
  readonly extension: string;
  readonly dotCount: number;
  readonly dotPositions: readonly number[];
}

export interface FileNameValidationError {
  readonly code: 'MULTIPLE_DOTS' | 'INVALID_EXTENSION' | 'EMPTY_FILENAME' | 'NO_EXTENSION';
  readonly message: string;
  readonly details: FileNameValidationDetails;
  readonly checkItem: ValidationCheckItem;
}

/**
 * Validates that the filename has strictly one dot (the one separating the .pdf extension).
 * e.g., 'documento_v1.pdf' is VALID.
 * 'documento.v1.pdf' is INVALID.
 */
export function validateFileName(rawFileName: string): Result<FileNameValidationDetails, FileNameValidationError> {
  const fileName = rawFileName ? rawFileName.trim() : '';

  if (!fileName) {
    const details: FileNameValidationDetails = {
      fileName: '',
      baseName: '',
      extension: '',
      dotCount: 0,
      dotPositions: [],
    };
    return Result.fail({
      code: 'EMPTY_FILENAME',
      message: 'O nome do arquivo não pode ser vazio.',
      details,
      checkItem: {
        id: 'file-name-empty',
        category: 'FILE_NAME',
        label: 'Nome do Arquivo',
        passed: false,
        expected: 'Nome de arquivo preenchido terminando em .pdf com apenas 1 ponto',
        detected: 'Nome vazio',
        message: 'Nenhum nome de arquivo foi informado.',
        severity: 'error',
      },
    });
  }

  // Count dots and their positions
  const dotPositions: number[] = [];
  for (let i = 0; i < fileName.length; i++) {
    if (fileName[i] === '.') {
      dotPositions.push(i);
    }
  }

  const dotCount = dotPositions.length;
  const lastDotIndex = fileName.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex).toLowerCase() : '';
  const baseName = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;

  const details: FileNameValidationDetails = {
    fileName,
    baseName,
    extension,
    dotCount,
    dotPositions,
  };

  // Check 1: Extension must be .pdf
  if (extension !== '.pdf') {
    return Result.fail({
      code: extension === '' ? 'NO_EXTENSION' : 'INVALID_EXTENSION',
      message: `Extensão inválida detectada (${extension || 'sem extensão'}). O arquivo deve possuir a extensão '.pdf'.`,
      details,
      checkItem: {
        id: 'file-name-extension',
        category: 'FILE_NAME',
        label: 'Extensão do Arquivo',
        passed: false,
        expected: 'Extensão terminada em .pdf',
        detected: extension || 'Sem extensão',
        message: `Extensão '${extension || 'ausente'}' inválida. Esperado '.pdf'.`,
        severity: 'error',
      },
    });
  }

  // Check 2: Strictly one dot allowed (the one before pdf)
  if (dotCount > 1) {
    const extraDots = dotCount - 1;
    const dotPlural = extraDots === 1 ? 'ponto extra encontrado' : 'pontos extras encontrados';
    const explanation = `O nome do arquivo '${fileName}' possui ${dotCount} pontos (${extraDots} ${dotPlural}). Apenas 1 ponto é permitido, exatamente como separador da extensão '.pdf'. Sugestão: substitua os pontos extras por sublinhados ('_') ou hífens ('-'), por exemplo: '${baseName.replace(/\./g, '_')}.pdf'.`;

    return Result.fail({
      code: 'MULTIPLE_DOTS',
      message: explanation,
      details,
      checkItem: {
        id: 'file-name-multiple-dots',
        category: 'FILE_NAME',
        label: 'Estrutura do Nome do Arquivo',
        passed: false,
        expected: 'Apenas 1 ponto no nome (separador da extensão .pdf)',
        detected: `${dotCount} pontos no nome ('${fileName}')`,
        message: explanation,
        severity: 'error',
      },
    });
  }

  if (dotCount === 0) {
    return Result.fail({
      code: 'NO_EXTENSION',
      message: 'O nome do arquivo não possui a extensão .pdf.',
      details,
      checkItem: {
        id: 'file-name-no-dot',
        category: 'FILE_NAME',
        label: 'Estrutura do Nome do Arquivo',
        passed: false,
        expected: 'Extensão .pdf',
        detected: 'Sem separador de extensão',
        message: 'O arquivo precisa conter a extensão .pdf.',
        severity: 'error',
      },
    });
  }

  return Result.ok(details);
}
