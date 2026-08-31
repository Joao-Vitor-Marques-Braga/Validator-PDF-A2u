import { useState, useCallback, useRef } from 'react';
import type {
  ValidationReport,
  ValidationStatus,
  UsePdfValidatorState,
} from '../types/validator.types';
import { PdfValidatorService } from '../services/pdf-validator.service';

export interface UsePdfValidatorReturn extends UsePdfValidatorState {
  validateFile: (file: File) => Promise<ValidationReport>;
  reset: () => void;
  history: readonly ValidationReport[];
  clearHistory: () => void;
}

const initialState: UsePdfValidatorState = {
  status: 'idle',
  report: null,
  errorMessage: null,
  currentFileName: null,
  progress: 0,
};

/**
 * Custom React Hook to manage PDF validation lifecycle, states, and history
 */
export function usePdfValidator(): UsePdfValidatorReturn {
  const [state, setState] = useState<UsePdfValidatorState>(initialState);
  const [history, setHistory] = useState<ValidationReport[]>([]);
  const isCancelledRef = useRef(false);

  const reset = useCallback(() => {
    isCancelledRef.current = true;
    setState(initialState);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const validateFile = useCallback(async (file: File): Promise<ValidationReport> => {
    isCancelledRef.current = false;

    // Transition to validating state
    setState({
      status: 'validating',
      report: null,
      errorMessage: null,
      currentFileName: file.name,
      progress: 15,
    });

    try {
      // Artificial smooth step for great UX feedback
      await new Promise((resolve) => setTimeout(resolve, 80));

      if (isCancelledRef.current) {
        throw new Error('Validação cancelada');
      }

      setState((prev) => ({ ...prev, progress: 45 }));

      // Run domain validation service
      const report = await PdfValidatorService.validate(file);

      if (isCancelledRef.current) {
        throw new Error('Validação cancelada');
      }

      setState((prev) => ({ ...prev, progress: 90 }));
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Final state transition
      const nextStatus: ValidationStatus = report.isValid ? 'success' : 'error';
      const firstErrorMessage = report.errors.length > 0 ? report.errors[0] : null;

      setState({
        status: nextStatus,
        report,
        errorMessage: firstErrorMessage,
        currentFileName: file.name,
        progress: 100,
      });

      // Append to history
      setHistory((prev) => [report, ...prev.slice(0, 19)]); // keep last 20

      return report;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ocorreu um erro inesperado durante a validação.';
      setState({
        status: 'error',
        report: null,
        errorMessage: errorMsg,
        currentFileName: file.name,
        progress: 0,
      });

      // Construct a fallback report for safety
      const fallbackReport: ValidationReport = {
        isValid: false,
        file: {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
        },
        detectedProfile: 'Arquivo Não-PDF / Corrompido',
        detectedProfileDescription: 'Erro durante o processamento',
        expectedProfile: 'PDF/A-2u (PDF/A-2 Conformance U - Unicode)',
        checks: [],
        errors: [errorMsg],
        metadata: null,
        validatedAt: new Date(),
      };

      return fallbackReport;
    }
  }, []);

  return {
    ...state,
    validateFile,
    reset,
    history,
    clearHistory,
  };
}
