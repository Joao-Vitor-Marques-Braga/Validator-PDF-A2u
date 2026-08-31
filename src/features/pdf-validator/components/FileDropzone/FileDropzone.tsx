import React, { useRef, useState } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileCheck, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import type { ValidationStatus } from '../../types/validator.types';
import styles from './FileDropzone.module.css';

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  status: ValidationStatus;
  progress?: number;
  currentFileName?: string | null;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileSelected,
  status,
  progress = 0,
  currentFileName,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (status !== 'validating') {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (status === 'validating') return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileSelected(file);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileSelected(file);
      // Reset input value to allow selecting the same file again if desired
      e.target.value = '';
    }
  };

  const handleClick = () => {
    if (status !== 'validating' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const isValidating = status === 'validating';

  return (
    <div
      className={`${styles.dropzoneContainer} ${isDragOver ? styles.dropzoneActive : ''} ${isValidating ? styles.dropzoneValidating : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Área de upload para validação de arquivo PDF/A-2u"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className={styles.hiddenInput}
        onChange={handleFileInputChange}
      />

      <div className={styles.iconWrapper}>
        {isValidating ? (
          <Loader2 className={`${styles.spinAnimation}`} size={36} />
        ) : (
          <UploadCloud size={36} />
        )}
      </div>

      {isValidating ? (
        <>
          <h3 className={styles.title}>Inspecionando Metadados XMP e Assinatura...</h3>
          <p className={styles.subtitle}>
            Analisando estrutura binária e conformidade do arquivo{' '}
            <span className={styles.highlightText}>{currentFileName}</span>
          </p>
          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <h3 className={styles.title}>
            Arraste seu arquivo PDF aqui ou <span className={styles.highlightText}>clique para selecionar</span>
          </h3>
          <p className={styles.subtitle}>
            O arquivo será inspecionado estritamente no seu navegador quanto à nomenclatura e conformidade com a norma <strong>PDF/A-2u</strong>.
          </p>

          <div className={styles.rulesBadgeContainer}>
            <span className={styles.ruleBadge}>
              <Sparkles size={13} /> Apenas 1 ponto no nome (.pdf)
            </span>
            <span className={styles.ruleBadge}>
              <FileCheck size={13} /> Padrão Estrito PDF/A-2u
            </span>
            <span className={styles.ruleBadge}>
              <AlertCircle size={13} /> Client-side seguro
            </span>
          </div>
        </>
      )}
    </div>
  );
};
