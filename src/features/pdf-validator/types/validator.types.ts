/**
 * Enum of all detectable PDF profiles/standards
 */
export type PdfProfile =
  | 'PDF/A-2u'
  | 'PDF/A-2a'
  | 'PDF/A-2b'
  | 'PDF/A-1a'
  | 'PDF/A-1b'
  | 'PDF/A-3a'
  | 'PDF/A-3b'
  | 'PDF/A-3u'
  | 'PDF/X'
  | 'PDF/UA'
  | 'PDF Padrão'
  | 'Arquivo Não-PDF / Corrompido';

/**
 * Extracted raw and parsed metadata from the PDF and its XMP block
 */
export interface PdfMetadata {
  readonly fileName: string;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly pdfHeaderVersion: string | null; // e.g. "1.7"
  readonly hasXmpMetadata: boolean;
  readonly rawXmpText: string | null;
  readonly pdfaPart: string | null; // e.g. "2"
  readonly pdfaConformance: string | null; // e.g. "U", "B", "A"
  readonly pdfaAmendment?: string | null;
  readonly detectedProfile: PdfProfile;
  readonly detectedProfileDescription: string;
  readonly title?: string;
  readonly author?: string;
  readonly creatorTool?: string;
  readonly creationDate?: string;
  readonly modificationDate?: string;
}

/**
 * Individual validation check category
 */
export type ValidationCategory = 'FILE_NAME' | 'PDF_HEADER' | 'PDFA_CONFORMANCE';

/**
 * Single validation check result item
 */
export interface ValidationCheckItem {
  readonly id: string;
  readonly category: ValidationCategory;
  readonly label: string;
  readonly passed: boolean;
  readonly expected: string;
  readonly detected: string;
  readonly message: string;
  readonly severity: 'error' | 'warning' | 'info';
}

/**
 * Complete summary of the validation report
 */
export interface ValidationReport {
  readonly isValid: boolean;
  readonly file: {
    readonly name: string;
    readonly size: number;
    readonly lastModified: number;
  };
  readonly detectedProfile: PdfProfile;
  readonly detectedProfileDescription: string;
  readonly expectedProfile: string;
  readonly checks: readonly ValidationCheckItem[];
  readonly errors: readonly string[];
  readonly metadata: PdfMetadata | null;
  readonly validatedAt: Date;
}

/**
 * State of the validation hook
 */
export type ValidationStatus = 'idle' | 'validating' | 'success' | 'error';

export interface UsePdfValidatorState {
  readonly status: ValidationStatus;
  readonly report: ValidationReport | null;
  readonly errorMessage: string | null;
  readonly currentFileName: string | null;
  readonly progress: number; // 0 to 100
}
