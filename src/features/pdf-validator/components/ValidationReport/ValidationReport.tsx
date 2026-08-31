import React from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Code2,
  FileText,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { ValidationReport as IValidationReport } from '../../types/validator.types';
import styles from './ValidationReport.module.css';

interface ValidationReportProps {
  report: IValidationReport;
  onReset: () => void;
  onToggleMetadata?: () => void;
  isMetadataOpen?: boolean;
}

export const ValidationReport: React.FC<ValidationReportProps> = ({
  report,
  onReset,
  onToggleMetadata,
  isMetadataOpen = false,
}) => {
  const { isValid, file, detectedProfile, detectedProfileDescription, expectedProfile, checks, errors } = report;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className={styles.reportContainer}>
      {/* Header Status */}
      <div className={styles.statusHeader}>
        <div className={styles.statusInfo}>
          <div
            className={`${styles.statusIconWrapper} ${isValid ? styles.statusSuccessIcon : styles.statusErrorIcon}`}
          >
            {isValid ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
          </div>
          <div>
            <h2
              className={`${styles.statusTitle} ${isValid ? styles.statusSuccessTitle : styles.statusErrorTitle}`}
            >
              {isValid ? 'Arquivo Aprovado: PDF/A-2u Válido' : 'Arquivo Reprovado na Validação'}
            </h2>
            <p className={styles.statusSubtitle}>
              <strong>{file.name}</strong> • {formatFileSize(file.size)} • Inspecionado em{' '}
              {new Date(report.validatedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className={styles.actionButtons}>
          {onToggleMetadata && report.metadata && (
            <button
              onClick={onToggleMetadata}
              className={`${styles.btn} ${styles.btnSecondary}`}
              title="Visualizar metadados brutos XMP e cabeçalhos"
            >
              <Code2 size={16} />
              {isMetadataOpen ? 'Ocultar Metadados' : 'Ver Metadados'}
            </button>
          )}
          <button
            onClick={onReset}
            className={`${styles.btn} ${styles.btnPrimary}`}
            title="Validar outro arquivo"
          >
            <RotateCcw size={16} />
            Validar Outro
          </button>
        </div>
      </div>

      {/* Comparison Grid (Detected vs Expected) */}
      <div className={styles.comparisonBox}>
        <div className={styles.comparisonCard}>
          <span className={styles.comparisonLabel}>Formato / Perfil Detectado</span>
          <span
            className={`${styles.comparisonValueDetected} ${isValid ? styles.detectedSuccess : styles.detectedError}`}
          >
            {detectedProfile}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {detectedProfileDescription}
          </span>
        </div>

        <div className={styles.comparisonCard}>
          <span className={styles.comparisonLabel}>Formato Obrigatório Exigido</span>
          <span className={styles.comparisonValueExpected}>
            {expectedProfile}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            ISO 19005-2 (PDF/A-2 Conformance Level U - Unicode)
          </span>
        </div>
      </div>

      {/* Summary Rejection Alert if Invalid */}
      {!isValid && errors.length > 0 && (
        <div className={`${styles.summaryAlert} ${styles.summaryAlertError}`}>
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Motivo(s) de Reprovação:</strong>
            <ul style={{ marginTop: '0.35rem', paddingLeft: '1.2rem' }}>
              {errors.map((err, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>
                  {err}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Validation Checks Checklist */}
      <div className={styles.checksSection}>
        <h3 className={styles.sectionTitle}>
          <FileText size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
          Critérios de Validação Auditados ({checks.filter((c) => c.passed).length}/{checks.length})
        </h3>

        <div className={styles.checkList}>
          {checks.map((check) => (
            <div
              key={check.id}
              className={`${styles.checkCard} ${check.passed ? styles.checkCardSuccess : styles.checkCardError}`}
            >
              <div className={`${styles.checkIcon} ${check.passed ? styles.checkIconSuccess : styles.checkIconError}`}>
                {check.passed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              </div>
              <div className={styles.checkContent}>
                <div className={styles.checkHeader}>
                  <span className={styles.checkLabel}>{check.label}</span>
                  <span
                    className={`${styles.checkBadge} ${check.passed ? styles.badgeSuccess : styles.badgeError}`}
                  >
                    {check.passed ? 'CONFORME' : 'NÃO CONFORME'}
                  </span>
                </div>
                <p className={styles.checkMessage}>{check.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isValid && (
        <div className={`${styles.summaryAlert} ${styles.summaryAlertSuccess}`}>
          <Info size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Arquivo 100% Conforme:</strong> O documento atende a todos os critérios de preservação a longo prazo da norma PDF/A-2u, incluindo suporte a Unicode e nomenclatura padronizada com ponto único.
          </div>
        </div>
      )}
    </div>
  );
};
