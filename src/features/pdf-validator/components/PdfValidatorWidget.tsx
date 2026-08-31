import React, { useState } from 'react';
import { usePdfValidator } from '../hooks/usePdfValidator';
import { FileDropzone } from './FileDropzone/FileDropzone';
import { ValidationReport } from './ValidationReport/ValidationReport';
import { MetadataViewer } from './MetadataViewer/MetadataViewer';
import { CheckCircle, XCircle, Trash2 } from 'lucide-react';
import styles from './PdfValidatorWidget.module.css';

export const PdfValidatorWidget: React.FC = () => {
  const {
    status,
    report,
    currentFileName,
    progress,
    validateFile,
    reset,
    history,
    clearHistory,
  } = usePdfValidator();

  const [isMetadataOpen, setIsMetadataOpen] = useState(false);

  const handleFileSelected = (file: File) => {
    setIsMetadataOpen(false);
    validateFile(file);
  };

  return (
    <div className={styles.widgetContainer}>
      {/* File Dropzone */}
      <FileDropzone
        onFileSelected={handleFileSelected}
        status={status}
        progress={progress}
        currentFileName={currentFileName}
      />

      {/* Validation Result Report (when validated) */}
      {report && (
        <>
          <ValidationReport
            report={report}
            onReset={reset}
            onToggleMetadata={() => setIsMetadataOpen((prev) => !prev)}
            isMetadataOpen={isMetadataOpen}
          />

          {/* Metadata Inspector Drawer */}
          {isMetadataOpen && report.metadata && (
            <MetadataViewer metadata={report.metadata} />
          )}
        </>
      )}

      {/* History section (if history exists) */}
      {history.length > 1 && (
        <div className={styles.historySection}>
          <div className={styles.historyHeader}>
            <span className={styles.historyTitle}>Histórico de Validações Recentes ({history.length})</span>
            <button onClick={clearHistory} className={styles.clearBtn} title="Limpar histórico">
              <Trash2 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Limpar
            </button>
          </div>
          <div className={styles.historyList}>
            {history.map((item, idx) => (
              <div key={idx} className={styles.historyItem}>
                <span className={styles.historyName}>{item.file.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {item.detectedProfile}
                  </span>
                  <span
                    className={styles.historyStatusBadge}
                    style={{
                      backgroundColor: item.isValid ? 'var(--success-bg)' : 'var(--danger-bg)',
                      color: item.isValid ? 'var(--success-text)' : 'var(--danger-text)',
                      border: `1px solid ${item.isValid ? 'var(--success-border)' : 'var(--danger-border)'}`,
                    }}
                  >
                    {item.isValid ? (
                      <CheckCircle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
                    ) : (
                      <XCircle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
                    )}
                    {item.isValid ? 'Aprovado' : 'Reprovado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
