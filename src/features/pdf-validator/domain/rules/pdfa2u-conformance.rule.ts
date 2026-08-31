import { Result } from '../../types/result.type';
import type { PdfMetadata, ValidationCheckItem } from '../../types/validator.types';

export interface Pdfa2uConformanceSuccess {
  readonly conforms: true;
  readonly part: string;
  readonly conformance: string;
  readonly checkItem: ValidationCheckItem;
}

export interface Pdfa2uConformanceError {
  readonly conforms: false;
  readonly detectedProfile: string;
  readonly detectedProfileDescription: string;
  readonly expectedProfile: string;
  readonly message: string;
  readonly checkItem: ValidationCheckItem;
}

export const EXPECTED_PDFA2U_LABEL = 'PDF/A-2u (PDF/A-2 Unicode)';

/**
 * Validates strictly that the PDF complies with PDF/A-2u (ISO 19005-2, Conformance Level U)
 */
export function validatePdfa2uConformance(
  metadata: PdfMetadata
): Result<Pdfa2uConformanceSuccess, Pdfa2uConformanceError> {
  const isPart2 = metadata.pdfaPart === '2';
  const isConformanceU = (metadata.pdfaConformance || '').toUpperCase() === 'U';
  const isPdfa2u = isPart2 && isConformanceU;

  if (isPdfa2u) {
    const successItem: ValidationCheckItem = {
      id: 'pdfa2u-conformance-check',
      category: 'PDFA_CONFORMANCE',
      label: 'Conformidade com Norma PDF/A-2u',
      passed: true,
      expected: EXPECTED_PDFA2U_LABEL,
      detected: `${metadata.detectedProfile} (${metadata.detectedProfileDescription})`,
      message: 'O arquivo atende estritamente aos requisitos da norma PDF/A-2u (ISO 19005-2, Nível de Conformidade U - Unicode).',
      severity: 'info',
    };

    return Result.ok({
      conforms: true,
      part: metadata.pdfaPart!,
      conformance: metadata.pdfaConformance!,
      checkItem: successItem,
    });
  }

  // Construct clear rejection message
  const detected = metadata.detectedProfile !== 'Arquivo Não-PDF / Corrompido'
    ? metadata.detectedProfileDescription
    : 'Arquivo não reconhecido como PDF válido';

  const reasonMessage = !metadata.hasXmpMetadata
    ? `O arquivo não possui o bloco de metadados XMP obrigatório com o esquema de identificação PDF/A (pdfaid). Formato detectado: ${metadata.detectedProfileDescription}.`
    : `O arquivo possui metadados com perfil diferente do exigido. Parte PDF/A: ${metadata.pdfaPart || 'Não informada'}, Conformidade: ${metadata.pdfaConformance || 'Não informada'}. Formato detectado: ${metadata.detectedProfileDescription}.`;

  const fullMessage = `Incompatibilidade de formato detectada.\n• Formato/perfil detectado: ${metadata.detectedProfile} (${detected})\n• Formato esperado: ${EXPECTED_PDFA2U_LABEL}`;

  const failureItem: ValidationCheckItem = {
    id: 'pdfa2u-conformance-check',
    category: 'PDFA_CONFORMANCE',
    label: 'Conformidade com Norma PDF/A-2u',
    passed: false,
    expected: EXPECTED_PDFA2U_LABEL,
    detected: metadata.detectedProfile,
    message: `${reasonMessage} ${fullMessage}`,
    severity: 'error',
  };

  return Result.fail({
    conforms: false,
    detectedProfile: metadata.detectedProfile,
    detectedProfileDescription: metadata.detectedProfileDescription,
    expectedProfile: EXPECTED_PDFA2U_LABEL,
    message: fullMessage,
    checkItem: failureItem,
  });
}
