import { createWorker } from 'tesseract.js';
import type { Worker } from 'tesseract.js';

export interface OcrWord {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly confidence: number;
}

export class OcrService {
  private static workerInstance: Worker | null = null;
  private static currentLang: string | null = null;
  private static isInitializing = false;

  /**
   * Initializes or returns the cached Tesseract worker
   */
  public static async getWorker(
    lang = 'por',
    onProgress?: (progress: number) => void
  ): Promise<Worker | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    if (this.workerInstance && this.currentLang === lang) {
      return this.workerInstance;
    }

    if (this.isInitializing) {
      // Wait for existing initialization
      while (this.isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (this.workerInstance && this.currentLang === lang) {
        return this.workerInstance;
      }
    }

    this.isInitializing = true;

    try {
      if (this.workerInstance) {
        await this.terminateWorker();
      }

      // Initialize Tesseract worker with language
      const worker = await createWorker(lang, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress && typeof m.progress === 'number') {
            onProgress(Math.round(m.progress * 100));
          }
        },
      });

      this.workerInstance = worker;
      this.currentLang = lang;
      return worker;
    } catch (err) {
      console.warn('Aviso: Não foi possível carregar o worker Tesseract OCR:', err);
      return null;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Terminates the active worker to free memory
   */
  public static async terminateWorker(): Promise<void> {
    if (this.workerInstance) {
      try {
        await this.workerInstance.terminate();
      } catch {
        // ignore
      }
      this.workerInstance = null;
      this.currentLang = null;
    }
  }

  /**
   * Runs OCR on a canvas element and returns detected words with bounding boxes
   */
  public static async recognizeCanvas(
    canvas: HTMLCanvasElement,
    lang = 'por',
    onProgress?: (progress: number) => void
  ): Promise<OcrWord[]> {
    if (typeof window === 'undefined' || !canvas || typeof canvas.getContext !== 'function') {
      return [];
    }

    const worker = await this.getWorker(lang, onProgress);
    if (!worker) {
      return [];
    }

    try {
      const ret = await worker.recognize(canvas);
      const pageData = ret?.data as unknown as {
        words?: Array<{
          text: string;
          bbox: { x0: number; y0: number; x1: number; y1: number };
          confidence: number;
        }>;
      };

      if (!pageData?.words) {
        return [];
      }

      return pageData.words
        .filter((w) => Boolean(w.text && w.text.trim().length > 0))
        .map((w) => ({
          text: w.text.trim(),
          x: w.bbox.x0,
          y: w.bbox.y0,
          width: w.bbox.x1 - w.bbox.x0,
          height: w.bbox.y1 - w.bbox.y0,
          confidence: w.confidence,
        }));
    } catch (err) {
      console.warn('Erro ao executar OCR na imagem da página:', err);
      return [];
    }
  }
}
