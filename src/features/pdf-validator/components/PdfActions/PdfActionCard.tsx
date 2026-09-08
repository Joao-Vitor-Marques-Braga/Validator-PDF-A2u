import React, { useState } from 'react';
import {
  Wand2,
  HardDrive,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type { ValidationReport } from '../../types/validator.types';
import { PdfConverterService } from '../../services/pdf-converter.service';
import type { ConversionResult } from '../../services/pdf-converter.service';
import { formatFileSize, MAX_FILE_SIZE_BYTES } from '../../domain/rules/file-size.rule';
import styles from './PdfActionCard.module.css';

interface PdfActionCardProps {
  report: ValidationReport;
  originalFile?: File | null;
  onValidateConverted: (file: File) => void;
}

export const PdfActionCard: React.FC<PdfActionCardProps> = ({
  report,
  originalFile,
  onValidateConverted,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [preset, setPreset] = useState<'balanced' | 'high-compression' | 'maximum-fidelity'>('balanced');

  const isOverSizeLimit = report.file.size > MAX_FILE_SIZE_BYTES;

  const handleConvert = async () => {
    // If we don't have the original File object (e.g. state reset), we can't proceed
    if (!originalFile) {
      setErrorMsg('Arquivo original não disponível para processamento. Por favor, reenvie o arquivo.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setProgressMsg('Iniciando conversão...');
    setProgressPct(10);

    try {
      const convResult = await PdfConverterService.convertToPdfa2u(originalFile, {
        qualityPreset: preset,
        autoCompress: true,
        forceCompress: isOverSizeLimit,
        onProgress: (prog) => {
          const pct = Math.round((prog.currentPage / prog.totalPages) * 80) + 10;
          setProgressPct(pct);
          setProgressMsg(prog.message);
        },
      });

      setProgressPct(100);
      setProgressMsg('Documento finalizado com sucesso!');
      setResult(convResult);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Falha ao processar e converter o documento.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleValidateNow = () => {
    if (!result) return;
    onValidateConverted(result.file);
  };

  return (
    <div className={styles.actionCard}>
      <div className={styles.cardHeader}>
        <div className={styles.headerIcon}>
          {isOverSizeLimit ? <HardDrive size={22} /> : <Wand2 size={22} />}
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>
            {isOverSizeLimit
              ? 'Compactar e Adequar para PDF/A-2u'
              : 'Converter Arquivo para PDF/A-2u'}
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-primary)' }}>
              100% Client-Side
            </span>
          </h3>
          <p className={styles.subtitle}>
            {isOverSizeLimit
              ? 'O arquivo excede o limite de 10MB. O sistema aplicará compactação inteligente com redução de qualidade para adequá-lo ao tamanho e injetará os metadados de conformidade ISO 19005-2 Unicode.'
              : 'O arquivo não cumpre estritamente os padrões PDF/A-2u. Converta agora mantendo a fidelidade documental e gerando os metadados XMP estritos e nomenclatura com ponto único.'}
          </p>
        </div>
      </div>

      {/* Preset selector when size is exceeded */}
      {isOverSizeLimit && !result && (
        <div className={styles.optionsSection}>
          <span className={styles.optionsLabel}>Selecione o Nível de Compressão</span>
          <div className={styles.presetGrid}>
            <button
              type="button"
              className={`${styles.presetBtn} ${preset === 'balanced' ? styles.presetBtnActive : ''}`}
              onClick={() => setPreset('balanced')}
              disabled={isProcessing}
            >
              <span className={styles.presetName}>Equilibrada (~70%)</span>
              <span className={styles.presetDesc}>Ótima nitidez visual e redução substancial de tamanho.</span>
            </button>

            <button
              type="button"
              className={`${styles.presetBtn} ${preset === 'high-compression' ? styles.presetBtnActive : ''}`}
              onClick={() => setPreset('high-compression')}
              disabled={isProcessing}
            >
              <span className={styles.presetName}>Alta Compressão (~50%)</span>
              <span className={styles.presetDesc}>Redução agressiva ideal para PDFs muito pesados.</span>
            </button>

            <button
              type="button"
              className={`${styles.presetBtn} ${preset === 'maximum-fidelity' ? styles.presetBtnActive : ''}`}
              onClick={() => setPreset('maximum-fidelity')}
              disabled={isProcessing}
            >
              <span className={styles.presetName}>Alta Fidelidade (~85%)</span>
              <span className={styles.presetDesc}>Compressão leve priorizando máxima nitidez de detalhes.</span>
            </button>
          </div>
        </div>
      )}

      {/* Action button if not yet completed */}
      {!result && (
        <div className={styles.actionsBar}>
          <button
            type="button"
            onClick={handleConvert}
            disabled={isProcessing || !originalFile}
            className={styles.convertBtn}
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className={styles.spinAnimation} />
                Processando...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                {isOverSizeLimit ? 'Compactar e Converter para PDF/A-2u' : 'Converter para PDF/A-2u'}
              </>
            )}
          </button>
        </div>
      )}

      {/* Progress Bar when processing */}
      {isProcessing && (
        <div className={styles.progressContainer}>
          <div className={styles.progressHeader}>
            <span>{progressMsg}</span>
            <span>{progressPct}%</span>
          </div>
          <div className={styles.progressBarTrack}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Error display */}
      {errorMsg && (
        <div className={styles.errorBox}>
          <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          {errorMsg}
        </div>
      )}

      {/* Conversion Success Result */}
      {result && (
        <div className={styles.resultBox}>
          <div className={styles.resultTitle}>
            <CheckCircle2 size={20} />
            Documento Convertido para PDF/A-2u com Sucesso!
          </div>

          <div className={styles.resultStats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Arquivo Gerado</span>
              <span className={styles.statValue}>{result.file.name}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Tamanho Original</span>
              <span className={styles.statValue}>{formatFileSize(result.originalSize)}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Novo Tamanho</span>
              <span className={styles.statValue}>{formatFileSize(result.convertedSize)}</span>
            </div>
            {result.reductionPercentage > 0 && (
              <div className={styles.reductionBadge}>
                -{result.reductionPercentage}% de redução
              </div>
            )}
          </div>

          <div className={styles.resultActions}>
            <button
              type="button"
              onClick={handleDownload}
              className={styles.downloadBtn}
              title="Baixar arquivo PDF/A-2u gerado"
            >
              <Download size={16} />
              Baixar PDF/A-2u
            </button>

            <button
              type="button"
              onClick={handleValidateNow}
              className={styles.validateNowBtn}
              title="Validar imediatamente o arquivo gerado no sistema"
            >
              <CheckCircle2 size={16} />
              Validar Documento Gerado
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
