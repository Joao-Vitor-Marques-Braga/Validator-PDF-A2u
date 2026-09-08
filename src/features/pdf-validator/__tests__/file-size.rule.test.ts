import { describe, it, expect } from 'vitest';
import {
  validateFileSize,
  MAX_FILE_SIZE_BYTES,
  formatFileSize,
} from '../domain/rules/file-size.rule';
import { Result } from '../types/result.type';

describe('Domain Rule: validateFileSize', () => {
  it('should accept file sizes within the 10MB limit', () => {
    const validSizes = [
      0,
      1024, // 1 KB
      500 * 1024, // 500 KB
      5 * 1024 * 1024, // 5 MB
      MAX_FILE_SIZE_BYTES - 1, // Just below 10MB
      MAX_FILE_SIZE_BYTES, // Exactly 10MB (10,485,760 bytes)
    ];

    validSizes.forEach((size) => {
      const result = validateFileSize(size);
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.details.fileSize).toBe(size);
        expect(result.value.checkItem.passed).toBe(true);
        expect(result.value.checkItem.category).toBe('FILE_SIZE');
        expect(result.value.checkItem.severity).toBe('info');
      }
    });
  });

  it('should reject file sizes exceeding 10MB', () => {
    const invalidSizes = [
      MAX_FILE_SIZE_BYTES + 1, // 10MB + 1 byte
      11 * 1024 * 1024, // 11 MB
      25 * 1024 * 1024, // 25 MB
      100 * 1024 * 1024, // 100 MB
    ];

    invalidSizes.forEach((size) => {
      const result = validateFileSize(size);
      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error.code).toBe('FILE_TOO_LARGE');
        expect(result.error.message).toContain('excede o limite máximo permitido de 10 MB');
        expect(result.error.checkItem.passed).toBe(false);
        expect(result.error.checkItem.category).toBe('FILE_SIZE');
        expect(result.error.checkItem.severity).toBe('error');
      }
    });
  });

  it('should correctly format file sizes into human-readable strings', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(2048 * 1024)).toBe('2 MB');
    expect(formatFileSize(MAX_FILE_SIZE_BYTES)).toBe('10 MB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.50 MB');
  });
});
