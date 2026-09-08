import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { MAX_FILE_SIZE_BYTES } from '../domain/rules/file-size.rule';

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

    return finalBytes || new Uint8Array(arrayBuffer);
  }
}
