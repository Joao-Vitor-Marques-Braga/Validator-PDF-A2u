import { Result } from '../types/result.type';
import type {
  ValidationReport,
  ValidationCheckItem,
  PdfMetadata,
} from '../types/validator.types';
import { validateFileName } from '../domain/rules/file-name.rule';
import { validatePdfa2uConformance, EXPECTED_PDFA2U_LABEL } from '../domain/rules/pdfa2u-conformance.rule';
import { PdfInspectorService } from './pdf-inspector.service';

export class PdfValidatorService {
  /**
   * Runs the complete strict validation pipeline on a PDF file
   */
  public static async validate(file: File): Promise<ValidationReport> {
    const checks: ValidationCheckItem[] = [];
    const errors: string[] = [];
    let isValid = true;
    let metadata: PdfMetadata | null = null;

    // Step 1: Validate File Name Rules (Strictly 1 dot before .pdf)
    const fileNameResult = validateFileName(file.name);
    if (Result.isOk(fileNameResult)) {
      checks.push({
        id: 'file-name-syntax',
        category: 'FILE_NAME',
        label: 'Nomenclatura do Arquivo',
        passed: true,
        expected: 'Nome com apenas 1 ponto e extensão .pdf',
        detected: file.name,
        message: `O nome do arquivo '${file.name}' está em conformidade com as regras de nomenclatura (contém apenas 1 ponto delimitador).`,
        severity: 'info',
      });
    } else {
      isValid = false;
      checks.push(fileNameResult.error.checkItem);
      errors.push(fileNameResult.error.message);
    }

    // Step 2: Binary Inspection and XMP Extraction
    try {
      metadata = await PdfInspectorService.inspect(file);
    } catch (err) {
      isValid = false;
      const readErrorMsg = `Falha na leitura binária do arquivo: ${err instanceof Error ? err.message : 'Erro desconhecido'}`;
      checks.push({
        id: 'pdf-binary-read',
        category: 'PDF_HEADER',
        label: 'Estrutura Binária do PDF',
        passed: false,
        expected: 'Arquivo PDF válido e legível',
        detected: 'Erro de decodificação binária',
        message: readErrorMsg,
        severity: 'error',
      });
      errors.push(readErrorMsg);

      return {
        isValid: false,
        file: {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
        },
        detectedProfile: 'Arquivo Não-PDF / Corrompido',
        detectedProfileDescription: 'Não foi possível ler a estrutura binária do arquivo.',
        expectedProfile: EXPECTED_PDFA2U_LABEL,
        checks,
        errors,
        metadata: null,
        validatedAt: new Date(),
      };
    }

    // Step 3: PDF Header Validation
    if (metadata.pdfHeaderVersion) {
      checks.push({
        id: 'pdf-header-version',
        category: 'PDF_HEADER',
        label: 'Assinatura do Cabeçalho PDF',
        passed: true,
        expected: 'Assinatura %PDF-1.x válida',
        detected: `%PDF-${metadata.pdfHeaderVersion}`,
        message: `Cabeçalho válido detectado: Versão PDF ${metadata.pdfHeaderVersion}.`,
        severity: 'info',
      });
    } else {
      isValid = false;
      const headerError = 'Assinatura de cabeçalho PDF (%PDF-) não encontrada. O arquivo pode estar corrompido ou não ser um PDF autêntico.';
      checks.push({
        id: 'pdf-header-version',
        category: 'PDF_HEADER',
        label: 'Assinatura do Cabeçalho PDF',
        passed: false,
        expected: 'Assinatura %PDF-1.x válida',
        detected: 'Ausente',
        message: headerError,
        severity: 'error',
      });
      errors.push(headerError);
    }

    // Step 4: Strict PDF/A-2u Conformance Validation
    const conformanceResult = validatePdfa2uConformance(metadata);
    if (Result.isOk(conformanceResult)) {
      checks.push(conformanceResult.value.checkItem);
    } else {
      isValid = false;
      checks.push(conformanceResult.error.checkItem);
      errors.push(conformanceResult.error.message);
    }

    return {
      isValid,
      file: {
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
      },
      detectedProfile: metadata.detectedProfile,
      detectedProfileDescription: metadata.detectedProfileDescription,
      expectedProfile: EXPECTED_PDFA2U_LABEL,
      checks,
      errors,
      metadata,
      validatedAt: new Date(),
    };
  }
}
