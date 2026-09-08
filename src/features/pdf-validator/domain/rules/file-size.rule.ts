import { Result } from '../../types/result.type';
import type { ValidationCheckItem } from '../../types/validator.types';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB = 10,485,760 bytes
export const MAX_FILE_SIZE_LABEL = '10 MB';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return Number.isInteger(kb) ? `${kb} KB` : `${kb.toFixed(1)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(2)} MB`;
}

export interface FileSizeValidationDetails {
  readonly fileSize: number;
  readonly maxSizeBytes: number;
  readonly formattedSize: string;
  readonly formattedMaxSize: string;
}

export interface FileSizeValidationSuccess {
  readonly details: FileSizeValidationDetails;
  readonly checkItem: ValidationCheckItem;
}

export interface FileSizeValidationError {
  readonly code: 'FILE_TOO_LARGE';
  readonly message: string;
  readonly details: FileSizeValidationDetails;
  readonly checkItem: ValidationCheckItem;
}

/**
 * Validates that the file size does not exceed the maximum allowed limit (10MB).
 */
export function validateFileSize(
  fileSize: number,
  maxBytes: number = MAX_FILE_SIZE_BYTES
): Result<FileSizeValidationSuccess, FileSizeValidationError> {
  const formattedSize = formatFileSize(fileSize);
  const formattedMaxSize = formatFileSize(maxBytes);

  const details: FileSizeValidationDetails = {
    fileSize,
    maxSizeBytes: maxBytes,
    formattedSize,
    formattedMaxSize,
  };

  if (fileSize > maxBytes) {
    const message = `O arquivo possui ${formattedSize} (${fileSize.toLocaleString('pt-BR')} bytes) e excede o limite máximo permitido de ${formattedMaxSize} (${maxBytes.toLocaleString('pt-BR')} bytes).`;

    return Result.fail({
      code: 'FILE_TOO_LARGE',
      message,
      details,
      checkItem: {
        id: 'file-size-limit',
        category: 'FILE_SIZE',
        label: 'Tamanho Máximo do Arquivo',
        passed: false,
        expected: `Até ${formattedMaxSize} (${maxBytes.toLocaleString('pt-BR')} bytes)`,
        detected: `${formattedSize} (${fileSize.toLocaleString('pt-BR')} bytes)`,
        message,
        severity: 'error',
      },
    });
  }

  return Result.ok({
    details,
    checkItem: {
      id: 'file-size-limit',
      category: 'FILE_SIZE',
      label: 'Tamanho Máximo do Arquivo',
      passed: true,
      expected: `Até ${formattedMaxSize} (${maxBytes.toLocaleString('pt-BR')} bytes)`,
      detected: `${formattedSize} (${fileSize.toLocaleString('pt-BR')} bytes)`,
      message: `O tamanho do arquivo (${formattedSize}) está dentro do limite máximo estabelecido de ${formattedMaxSize}.`,
      severity: 'info',
    },
  });
}
