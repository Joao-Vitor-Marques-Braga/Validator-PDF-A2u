import { PDFDocument, PDFName } from 'pdf-lib';
import { MAX_FILE_SIZE_BYTES } from '../domain/rules/file-size.rule';
import { PdfCompressorService } from './pdf-compressor.service';
import type { CompressionProgress } from './pdf-compressor.service';

export interface ConvertPdfOptions {
  readonly autoCompress?: boolean; // default true if > 10MB
  readonly forceCompress?: boolean; // force compression regardless of size
  readonly qualityPreset?: 'balanced' | 'high-compression' | 'maximum-fidelity';
  readonly onProgress?: (progress: CompressionProgress) => void;
}

export interface ConversionResult {
  readonly file: File;
  readonly originalSize: number;
  readonly convertedSize: number;
  readonly wasCompressed: boolean;
  readonly reductionPercentage: number;
}

/**
 * Sanitizes a filename so that it contains strictly one dot (the one for .pdf)
 * e.g. "documento.v1.2.pdf" -> "documento_v1_2_pdfa2u.pdf"
 */
export function sanitizeToSingleDotPdfName(rawFileName: string, suffix = '_pdfa2u'): string {
  const trimmed = rawFileName.trim() || 'documento.pdf';
  const lastDot = trimmed.lastIndexOf('.');
  const base = lastDot !== -1 ? trimmed.substring(0, lastDot) : trimmed;
  // Replace internal dots with underscores
  const cleanBase = base.replace(/\./g, '_').trim();
  const finalBase = cleanBase.endsWith(suffix) ? cleanBase : `${cleanBase}${suffix}`;
  return `${finalBase}.pdf`;
}

/**
 * Constructs an ISO 19005-2 (PDF/A-2u Unicode) conforming XMP metadata packet XML
 */
export function buildPdfa2uXmpMetadata(title?: string): string {
  const now = new Date().toISOString();
  const safeTitle = (title || 'Documento Conforme PDF/A-2u').replace(/[<>&'"]/g, '');

  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:xmp="http://ns.adobe.com/xap/1.0/"
        xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdfaid:part>2</pdfaid:part>
      <pdfaid:conformance>U</pdfaid:conformance>
      <dc:format>application/pdf</dc:format>
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${safeTitle}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <xmp:CreatorTool>PDF/A-2u Guard Converter</xmp:CreatorTool>
      <xmp:CreateDate>${now}</xmp:CreateDate>
      <xmp:ModifyDate>${now}</xmp:ModifyDate>
      <pdf:Producer>PDF/A-2u Guard Engine</pdf:Producer>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

export class PdfConverterService {
  /**
   * Converts any PDF file into strict PDF/A-2u conformance with single-dot naming,
   * automatically compressing it if size exceeds 10MB.
   */
  public static async convertToPdfa2u(
    file: File,
    options: ConvertPdfOptions = {}
  ): Promise<ConversionResult> {
    const originalSize = file.size;
    const shouldCompress =
      options.forceCompress || (options.autoCompress !== false && originalSize > MAX_FILE_SIZE_BYTES);

    let workingBytes: Uint8Array;
    let wasCompressed = false;

    if (shouldCompress) {
      const qualityMap = {
        'balanced': 0.70,
        'high-compression': 0.50,
        'maximum-fidelity': 0.85,
      };
      const initialQuality = options.qualityPreset ? qualityMap[options.qualityPreset] : 0.70;

      workingBytes = await PdfCompressorService.compress(file, {
        initialQuality,
        onProgress: options.onProgress,
      });
      wasCompressed = true;
    } else {
      const buffer = await file.arrayBuffer();
      workingBytes = new Uint8Array(buffer);
    }

    // Load working document with pdf-lib to inject PDF/A-2u metadata
    const pdfDoc = await PDFDocument.load(workingBytes, { ignoreEncryption: true });

    // Inject strict PDF/A-2u XMP metadata packet
    const xmpXml = buildPdfa2uXmpMetadata(file.name);

    const metadataStream = pdfDoc.context.stream(xmpXml, {
      Type: 'Metadata',
      Subtype: 'XML',
    });

    const metadataRef = pdfDoc.context.register(metadataStream);
    pdfDoc.catalog.set(PDFName.of('Metadata'), metadataRef);

    // Save final document
    const finalBytes = await pdfDoc.save({ useObjectStreams: true });

    // Sanitize output filename to strictly 1 dot
    const outputFileName = sanitizeToSingleDotPdfName(file.name);
    const convertedFile = new File([finalBytes as BlobPart], outputFileName, {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    const convertedSize = convertedFile.size;
    const reductionPercentage =
      originalSize > 0 && convertedSize < originalSize
        ? Math.round(((originalSize - convertedSize) / originalSize) * 100)
        : 0;

    return {
      file: convertedFile,
      originalSize,
      convertedSize,
      wasCompressed,
      reductionPercentage,
    };
  }
}
