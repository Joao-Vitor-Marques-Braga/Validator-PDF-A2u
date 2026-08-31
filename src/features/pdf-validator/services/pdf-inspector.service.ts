import type { PdfMetadata } from '../types/validator.types';
import { extractPdfHeaderVersion, extractRawXmpPacket } from '../utils/binary-reader.util';
import { XmpParserService } from './xmp-parser.service';

export class PdfInspectorService {
  /**
   * Reads a File or ArrayBuffer and returns complete extracted PDF metadata and detected profile
   */
  public static async inspect(file: File): Promise<PdfMetadata> {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // 1. Extract PDF header version (%PDF-1.x)
    const headerVersion = extractPdfHeaderVersion(uint8Array);

    // 2. Extract XMP metadata packet
    const rawXmp = extractRawXmpPacket(uint8Array);

    // 3. Parse XMP and resolve profile
    const xmpResult = XmpParserService.parse(rawXmp, headerVersion);

    return {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/pdf',
      pdfHeaderVersion: headerVersion,
      hasXmpMetadata: xmpResult.hasXmp,
      rawXmpText: xmpResult.rawXmp,
      pdfaPart: xmpResult.pdfaPart,
      pdfaConformance: xmpResult.pdfaConformance,
      pdfaAmendment: xmpResult.pdfaAmendment,
      detectedProfile: xmpResult.detectedProfile,
      detectedProfileDescription: xmpResult.detectedProfileDescription,
      title: xmpResult.title,
      author: xmpResult.author,
      creatorTool: xmpResult.creatorTool,
      creationDate: xmpResult.creationDate,
      modificationDate: xmpResult.modificationDate,
    };
  }
}
