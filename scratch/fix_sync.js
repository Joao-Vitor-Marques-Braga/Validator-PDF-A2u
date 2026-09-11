const fs = require('fs');
const { PDFDocument, PDFName } = require('pdf-lib');

async function fixSync() {
  const bytes = fs.readFileSync('public/test_fixed_preflight.pdf');
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const now = new Date();
  const isoDate = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const safeTitle = 'PD_130373__RETORNO_ATIVIDADE_ALCENOR_DE_SALES_GOMES_JUNIOR.PDF';
  const producerName = 'pdf-lib (https://github.com/Hopding/pdf-lib)';
  const creatorName = 'PDF/A-2u Guard Converter (COLARE TCM-GO)';

  pdfDoc.setTitle(safeTitle);
  pdfDoc.setCreator(creatorName);
  pdfDoc.setProducer(producerName);
  pdfDoc.setCreationDate(now);
  pdfDoc.setModificationDate(now);

  const xmp = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:xmp="http://ns.adobe.com/xap/1.0/"
        xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/"
        xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdfaid:part>2</pdfaid:part>
      <pdfaid:conformance>U</pdfaid:conformance>
      <dc:format>application/pdf</dc:format>
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${safeTitle}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <xmp:CreatorTool>${creatorName}</xmp:CreatorTool>
      <xmp:CreateDate>${isoDate}</xmp:CreateDate>
      <xmp:ModifyDate>${isoDate}</xmp:ModifyDate>
      <xmpMM:DocumentID>uuid:32145678-9012-3456-7890-123456789012</xmpMM:DocumentID>
      <pdf:Producer>${producerName}</pdf:Producer>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const metadataStream = pdfDoc.context.stream(xmp, {
    Type: 'Metadata',
    Subtype: 'XML',
  });
  pdfDoc.catalog.set(PDFName.of('Metadata'), pdfDoc.context.register(metadataStream));

  const saved = await pdfDoc.save({ useObjectStreams: false });
  fs.writeFileSync('public/test_fixed_preflight.pdf', saved);
  console.log('Synchronized /Info and XMP successfully!');
}

fixSync();
