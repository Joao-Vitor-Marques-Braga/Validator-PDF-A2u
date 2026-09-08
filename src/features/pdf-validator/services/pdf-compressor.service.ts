import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { MAX_FILE_SIZE_BYTES } from '../domain/rules/file-size.rule';
import { OcrService } from './ocr.service';

// Configure pdfjs worker if in browser
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    // Fallback gracefully to fake worker
  }
}

export interface CompressionProgress {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly quality: number;
  readonly message: string;
}

export interface CompressionOptions {
  readonly initialQuality?: number; // 0.1 to 1.0 (default 0.70)
  readonly minQuality?: number; // default 0.35
  readonly maxSizeBytes?: number; // default 10MB
  readonly scale?: number; // default 1.2
  readonly enableOcr?: boolean; // default true
  readonly ocrLang?: string; // default 'por'
  readonly onProgress?: (progress: CompressionProgress) => void;
}

export class PdfCompressorService {
  /**
   * Compresses a PDF file by rendering pages to canvas with adaptive JPEG re-encoding
   */
  public static async compress(
    file: File,
    options: CompressionOptions = {}
  ): Promise<Uint8Array> {
    const {
      initialQuality = 0.70,
      minQuality = 0.35,
      maxSizeBytes = MAX_FILE_SIZE_BYTES,
      scale = 1.2,
      onProgress,
    } = options;

    const arrayBuffer = await file.arrayBuffer();

    // Check if canvas rendering context is supported (e.g. in real browser)
    const isCanvasSupported =
      typeof document !== 'undefined' &&
      !!document.createElement('canvas').getContext?.('2d');

    if (!isCanvasSupported) {
      // In test/headless environments without native Canvas, simulate compression
      // by rebuilding the PDF with pdf-lib
      try {
        const loadedDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        return await loadedDoc.save({ useObjectStreams: true });
      } catch {
        return new Uint8Array(arrayBuffer);
      }
    }

    // Load source PDF with pdfjs
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;

    let currentQuality = initialQuality;
    let finalBytes: Uint8Array | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      const newPdfDoc = await PDFDocument.create();

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        if (onProgress) {
          onProgress({
            currentPage: pageNum,
            totalPages,
            quality: currentQuality,
            message: `Otimizando página ${pageNum} de ${totalPages} (${Math.round(currentQuality * 100)}% qualidade)...`,
          });
        }

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          throw new Error('Não foi possível obter o contexto 2D do Canvas.');
        }

        // Fill white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render PDF page to canvas
        const renderContext = {
          canvasContext: ctx,
          canvas,
          viewport,
        };

        await page.render(renderContext).promise;

        // Convert canvas to JPEG blob
        const jpegBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Falha ao exportar frame de página do Canvas.'));
            },
            'image/jpeg',
            currentQuality
          );
        });

        const jpegBuffer = await jpegBlob.arrayBuffer();
        const embeddedImage = await newPdfDoc.embedJpg(jpegBuffer);

        // Standard PDF points (72 DPI) dimension
        const originalViewport = page.getViewport({ scale: 1.0 });
        const newPage = newPdfDoc.addPage([originalViewport.width, originalViewport.height]);
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: originalViewport.width,
          height: originalViewport.height,
        });

        // Embed standard Helvetica font (with ToUnicode CMap) for searchable text layer
        const font = await newPdfDoc.embedFont(StandardFonts.Helvetica);

        // 1. Try extracting native text content first (instant & exact)
        let hasNativeText = false;
        try {
          const textContent = await page.getTextContent();
          if (textContent && textContent.items && textContent.items.length > 0) {
            for (const item of textContent.items) {
              if ('str' in item && item.str && item.str.trim()) {
                hasNativeText = true;
                const tx = item.transform[4];
                const ty = item.transform[5];
                const fontSize = Math.max(6, Math.hypot(item.transform[0], item.transform[1]));
                try {
                  newPage.drawText(item.str, {
                    x: Math.max(0, Math.min(originalViewport.width - 10, tx)),
                    y: Math.max(0, Math.min(originalViewport.height - 10, ty)),
                    size: fontSize,
                    font,
                    opacity: 0,
                  });
                } catch {
                  // Ignore unsupported character glyphs
                }
              }
            }
          }
        } catch {
          // Ignore text extraction error
        }

        // 2. If page has no native text and OCR is enabled, perform OCR on canvas
        if (!hasNativeText && options.enableOcr !== false) {
          if (onProgress) {
            onProgress({
              currentPage: pageNum,
              totalPages,
              quality: currentQuality,
              message: `Executando OCR na página ${pageNum} de ${totalPages}...`,
            });
          }

          try {
            const words = await OcrService.recognizeCanvas(
              canvas,
              options.ocrLang || 'por',
              (pct) => {
                if (onProgress) {
                  onProgress({
                    currentPage: pageNum,
                    totalPages,
                    quality: currentQuality,
                    message: `Executando OCR na página ${pageNum} de ${totalPages} (${pct}%)...`,
                  });
                }
              }
            );

            for (const word of words) {
              const pdfX = word.x * (originalViewport.width / canvas.width);
              const pdfY = originalViewport.height - (word.y * (originalViewport.height / canvas.height));
              const fontSize = Math.max(6, Math.round(word.height * (originalViewport.height / canvas.height)));
              const cleanText = word.text.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');

              try {
                newPage.drawText(cleanText, {
                  x: Math.max(0, pdfX),
                  y: Math.max(0, pdfY - fontSize),
                  size: fontSize,
                  font,
                  opacity: 0,
                });
              } catch {
                // Ignore glyph encode errors
              }
            }
          } catch {
            // Ignore OCR error
          }
        }

        // Clean up canvas
        canvas.width = 0;
        canvas.height = 0;
      }

      finalBytes = await newPdfDoc.save({ useObjectStreams: true });

      // Check if size is within target
      if (finalBytes.length <= maxSizeBytes || currentQuality <= minQuality) {
        break;
      }

      // If still too large, step down quality and retry
      currentQuality = Math.max(minQuality, currentQuality - 0.20);
    }

    // Terminate OCR worker to free resources
    await OcrService.terminateWorker();

    return finalBytes || new Uint8Array(arrayBuffer);
  }

  /**
   * Processes OCR on an existing PDF WITHOUT compressing or altering original pages/images.
   * Renders pages to memory canvas solely to recognize text, then draws an invisible text
   * layer (opacity: 0) directly on the existing PDF pages that lack native text.
   */
  public static async processOcrOnly(
    file: File,
    options: {
      readonly ocrLang?: string;
      readonly onProgress?: (progress: CompressionProgress) => void;
    } = {}
  ): Promise<Uint8Array> {
    const { ocrLang = 'por', onProgress } = options;
    const arrayBuffer = await file.arrayBuffer();

    const isCanvasSupported =
      typeof document !== 'undefined' &&
      !!document.createElement('canvas').getContext?.('2d');

    if (!isCanvasSupported) {
      try {
        const loadedDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        return await loadedDoc.save({ useObjectStreams: true });
      } catch {
        return new Uint8Array(arrayBuffer);
      }
    }

    try {
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
      });
      const pdfjsDoc = await loadingTask.promise;
      const totalPages = pdfDoc.getPageCount();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const existingPage = pdfDoc.getPage(pageNum - 1);
        const pageSize = existingPage.getSize();
        const page = await pdfjsDoc.getPage(pageNum);

        // Check if page already has substantive native digital text
        let hasNativeText = false;
        try {
          const textContent = await page.getTextContent();
          const validItems = textContent.items.filter(
            (item) => 'str' in item && Boolean(item.str && item.str.trim().length > 0)
          );
          hasNativeText = validItems.length >= 5;
        } catch {
          hasNativeText = false;
        }

        if (!hasNativeText) {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);

          const ctx = canvas.getContext('2d', { alpha: false });
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({
              canvasContext: ctx,
              canvas,
              viewport,
            }).promise;

            if (onProgress) {
              onProgress({
                currentPage: pageNum,
                totalPages,
                quality: 1.0,
                message: `Executando OCR na página ${pageNum} de ${totalPages}...`,
              });
            }

            const words = await OcrService.recognizeCanvas(
              canvas,
              ocrLang,
              (pct) => {
                if (onProgress) {
                  onProgress({
                    currentPage: pageNum,
                    totalPages,
                    quality: 1.0,
                    message: `Executando OCR na página ${pageNum} de ${totalPages} (${pct}%)...`,
                  });
                }
              }
            );

            for (const word of words) {
              const pdfX = word.x * (pageSize.width / canvas.width);
              const pdfY = pageSize.height - (word.y * (pageSize.height / canvas.height));
              const fontSize = Math.max(6, Math.round(word.height * (pageSize.height / canvas.height)));
              const cleanText = word.text.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');

              try {
                existingPage.drawText(cleanText, {
                  x: Math.max(0, pdfX),
                  y: Math.max(0, pdfY - fontSize),
                  size: fontSize,
                  font,
                  opacity: 0,
                });
              } catch {
                // Ignore glyph encode errors
              }
            }

            canvas.width = 0;
            canvas.height = 0;
          }
        } else if (onProgress) {
          onProgress({
            currentPage: pageNum,
            totalPages,
            quality: 1.0,
            message: `Página ${pageNum} de ${totalPages}: texto digital nativo preservado.`,
          });
        }
      }

      await OcrService.terminateWorker();
      return await pdfDoc.save({ useObjectStreams: true });
    } catch (err) {
      console.warn('Falha no processamento de OCR direto, mantendo original:', err);
      return new Uint8Array(arrayBuffer);
    }
  }
}

