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
  const [ocrLang, setOcrLang] = useState<'por' | 'eng'>('por');
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);

  React.useEffect(() => {
    let isMounted = true;
    const checkBackend = async () => {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 1200);
        const res = await fetch('http://localhost:3001/api/health', { signal: controller.signal });
        clearTimeout(t);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.ghostscriptAvailable) {
            setIsBackendOnline(true);
          }
        }
      } catch {
        if (isMounted) setIsBackendOnline(false);
      }
    };
    checkBackend();
    return () => {
      isMounted = false;
    };
  }, []);

  const isOverSizeLimit = report.file.size > MAX_FILE_SIZE_BYTES;

  const fontEmbeddingCheck = report.checks.find((c) => c.id === 'font-embedding-check');
  const hasUnembeddedFonts =
    Boolean(report.metadata?.unembeddedFonts && report.metadata.unembeddedFonts.length > 0) ||
    Boolean(fontEmbeddingCheck && !fontEmbeddingCheck.passed);
  const unembeddedList =
    report.metadata?.unembeddedFonts ||
    (fontEmbeddingCheck?.detected ? [fontEmbeddingCheck.detected] : []);

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
        autoCompress: isOverSizeLimit,
        forceCompress: false,
        enableOcr: true, // OCR SEMPRE DEVE SER PASSADO NAS CONVERSÕES
        ocrLang,
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
              ? 'Compactar e Converter para PDF/A-2u (COLARE TCM-GO)'
              : 'Converter para PDF/A-2u (Modo Vetorial Nativo)'}
            {isBackendOnline ? (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                🟢 Motor Ghostscript Nativo Ativo (Nível ABBYY)
              </span>
            ) : (
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-primary)' }}>
                🔵 Modo Client-Side (Navegador)
              </span>
            )}
          </h3>
          <p className={styles.subtitle}>
            {isOverSizeLimit
              ? 'O arquivo excede o limite de 10MB do COLARE. O sistema reconstrói as páginas, aplica compactação adaptativa, embutimento real de fontes TrueType (ToUnicode), OCR em modo invisível 3 Tr e perfil sRGB oficial para aprovação direta no TCM-GO / Centi.'
              : 'Converte o documento em Modo Vetorial Nativo (Lossless / Sem Rasterização), preservando 100% da nitidez vetorial, texto, layout e assinaturas digitais, aplicando perfil sRGB oficial, metadados ISO 19005-2 e regra de ponto único no nome.'}
          </p>
        </div>
      </div>

      {/* Automatic Font Embedding Information */}
      {hasUnembeddedFonts && !result && (
        <div className={styles.preventiveWarningBox}>
          <Sparkles size={22} className={styles.preventiveWarningIcon} />
          <div className={styles.preventiveWarningContent}>
            <div className={styles.preventiveWarningTitle}>
              Incorporação Automática de Fontes Ativa (Modo Vetorial)
            </div>
            <div className={styles.preventiveWarningText}>
              Este documento foi gerado sem incorporar as fontes (ex:{' '}
              <strong>{unembeddedList.slice(0, 3).join(', ') || 'Verdana, Times New Roman'}</strong>). 
              O conversor injetará automaticamente o arquivo da fonte TrueType (<code>/FontFile2</code>) diretamente nos descritores do documento em <strong>modo vetorial nativo</strong>, sem necessidade de outros aplicativos e sem páginas em branco.
            </div>
            <div className={styles.preventiveWarningRecommendation}>
              <strong>Conformidade ISO 19005-2 (Cláusula 6.2.11):</strong> Ao clicar em converter abaixo, o arquivo terá todas as fontes fisicamente incorporadas, garantindo aprovação direta no validador do Centi / TCM-GO.
            </div>
          </div>
        </div>
      )}

      {/* Preset selector only when size is exceeded */}
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

      {/* OCR Mandatory Layer Status & Language Option - only shown when compressing/reconstructing */}
      {isOverSizeLimit && !result && (
        <div className={styles.ocrOptionRow}>
          <div className={styles.ocrMandatoryBadge}>
            <CheckCircle2 size={18} className={styles.ocrActiveIcon} />
            <div>
              <strong style={{ fontSize: '0.88rem' }}>OCR e Camada de Texto Pesquisável (Ativo Obrigatório)</strong>
              <span className={styles.ocrNote}>
                O reconhecimento óptico de caracteres é executado em todas as compressões para garantir conformidade estrita com a norma ISO 19005-2 Unicode e preservação de busca.
              </span>
            </div>
          </div>
          <div className={styles.langSelectGroup}>
            <label htmlFor="ocr-lang-select" className={styles.langLabel}>Idioma do OCR:</label>
            <select
              id="ocr-lang-select"
              value={ocrLang}
              onChange={(e) => setOcrLang(e.target.value as 'por' | 'eng')}
              disabled={isProcessing}
              className={styles.langSelect}
            >
              <option value="por">Português (Brasil)</option>
              <option value="eng">Inglês (English)</option>
            </select>
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
                Processando em Modo Vetorial...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                {isOverSizeLimit
                  ? 'Compactar e Converter para PDF/A-2u'
                  : 'Converter para PDF/A-2u (Modo Vetorial Nativo)'}
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

          <div className={styles.featureBadgesList}>
            <span className={styles.featureBadge}>
              <CheckCircle2 size={13} /> Compatível COLARE (TCM-GO / Centi)
            </span>
            <span className={styles.featureBadge}>
              <CheckCircle2 size={13} /> Norma ISO 19005-2 (PDF/A-2u)
            </span>
            <span className={styles.featureBadge}>
              <CheckCircle2 size={13} /> Fontes TrueType Embutidas (ToUnicode)
            </span>
            <span className={styles.featureBadge}>
              <CheckCircle2 size={13} /> Modo de Texto 3 Tr (Sem Transparência)
            </span>
            <span className={styles.featureBadge}>
              <CheckCircle2 size={13} /> OutputIntent sRGB Oficial
            </span>
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
            {result.wasCompressed && result.reductionPercentage > 0 ? (
              <div className={styles.reductionBadge}>
                -{result.reductionPercentage}% de redução
              </div>
            ) : (
              <div className={styles.noCompressBadge}>
                Qualidade 100% preservada (sem compressão)
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

          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            <strong style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: '0.25rem' }}>
              ℹ️ Orientação Técnica Oficial TCM-GO (Colare):
            </strong>
            Ao assinar este arquivo no <em>Assinador Digital do TCM</em> antes da transmissão, <strong>NÃO deixe a assinatura visível</strong> (utilize assinatura invisível ou formato P7S envelopado). A inserção de carimbos visuais pode desconfigurar os metadados e camadas estritas do PDF/A-2u. O Tribunal também orienta não utilizar o assinador do SERPRO para arquivos PDF/A.
          </div>
        </div>
      )}
    </div>
  );
};
