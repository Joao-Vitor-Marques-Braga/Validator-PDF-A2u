import React, { useState } from 'react';
import { Database, Copy, Check, Terminal } from 'lucide-react';
import type { PdfMetadata } from '../../types/validator.types';
import styles from './MetadataViewer.module.css';

interface MetadataViewerProps {
  metadata: PdfMetadata;
}

export const MetadataViewer: React.FC<MetadataViewerProps> = ({ metadata }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (metadata.rawXmpText) {
      navigator.clipboard.writeText(metadata.rawXmpText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={styles.metadataContainer}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Database size={18} color="var(--accent-primary)" />
          Metadados Inspecionados do Arquivo
        </h3>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <span className={styles.cardKey}>Versão Cabeçalho PDF</span>
          <span className={styles.cardValue}>{metadata.pdfHeaderVersion ? `%PDF-${metadata.pdfHeaderVersion}` : 'Não detectado'}</span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardKey}>Bloco XMP Presente?</span>
          <span className={styles.cardValue}>{metadata.hasXmpMetadata ? 'Sim (Localizado)' : 'Não'}</span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardKey}>pdfaid:part</span>
          <span className={styles.cardValue}>{metadata.pdfaPart || 'Ausente'}</span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardKey}>pdfaid:conformance</span>
          <span className={styles.cardValue}>{metadata.pdfaConformance || 'Ausente'}</span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardKey}>Título (dc:title)</span>
          <span className={styles.cardValue}>{metadata.title || 'Não definido'}</span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardKey}>Autor / Criador</span>
          <span className={styles.cardValue}>{metadata.author || 'Não definido'}</span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardKey}>Ferramenta Geradora</span>
          <span className={styles.cardValue}>{metadata.creatorTool || 'Não informado'}</span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardKey}>Data de Criação</span>
          <span className={styles.cardValue}>{metadata.creationDate || 'Não informada'}</span>
        </div>
      </div>

      {metadata.rawXmpText && (
        <div className={styles.rawSection}>
          <div className={styles.rawHeader}>
            <span className={styles.rawTitle}>
              <Terminal size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Pacote XML / XMP Bruto Extraído
            </span>
            <button onClick={handleCopy} className={styles.copyBtn}>
              {copied ? <Check size={13} color="var(--success-text)" /> : <Copy size={13} />}
              {copied ? 'Copiado!' : 'Copiar XML'}
            </button>
          </div>
          <pre className={styles.rawCode}>{metadata.rawXmpText}</pre>
        </div>
      )}
    </div>
  );
};
