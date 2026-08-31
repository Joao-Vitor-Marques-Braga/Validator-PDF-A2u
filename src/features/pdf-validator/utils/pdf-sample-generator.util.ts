/**
 * Utility to generate synthetic valid and invalid PDF blobs in memory
 * for testing and demonstration purposes.
 */

function buildMinimalPdf(options: {
  version?: string;
  xmpXml?: string;
}): Blob {
  const version = options.version || '1.7';
  const xmp = options.xmpXml || '';

  // Minimal valid PDF structure with optional XMP Metadata stream
  let pdfContent = `%PDF-${version}
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R`;

  if (xmp) {
    pdfContent += `\n  /Metadata 4 0 R`;
  }

  pdfContent += `
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Contents 5 0 R
>>
endobj`;

  if (xmp) {
    const xmpBytes = new TextEncoder().encode(xmp);
    pdfContent += `
4 0 obj
<<
  /Type /Metadata
  /Subtype /XML
  /Length ${xmpBytes.length}
>>
stream
${xmp}
endstream
endobj`;
  }

  pdfContent += `
5 0 obj
<<
  /Length 44
>>
stream
BT
/F1 12 Tf
72 712 Td
(PDF Test Document) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000142 00000 n 
`;

  if (xmp) {
    pdfContent += `0000000230 00000 n \n`;
  }

  pdfContent += `trailer
<<
  /Size 6
  /Root 1 0 R
>>
startxref
500
%%EOF
`;

  return new Blob([pdfContent], { type: 'application/pdf' });
}

export function createValidPdfa2uSample(): File {
  const xmp = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <pdfaid:part>2</pdfaid:part>
      <pdfaid:conformance>U</pdfaid:conformance>
      <dc:title>Documento Conforme PDF/A-2u</dc:title>
      <dc:creator>Engenharia de Software</dc:creator>
      <xmp:CreatorTool>Validador PDF/A-2u Engine</xmp:CreatorTool>
      <xmp:CreateDate>2026-08-31T08:00:00Z</xmp:CreateDate>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const blob = buildMinimalPdf({ version: '1.7', xmpXml: xmp });
  return new File([blob], 'documento_conforme_pdfa2u.pdf', { type: 'application/pdf' });
}

export function createInvalidNameMultipleDotsSample(): File {
  const xmp = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>2</pdfaid:part>
      <pdfaid:conformance>U</pdfaid:conformance>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const blob = buildMinimalPdf({ version: '1.7', xmpXml: xmp });
  return new File([blob], 'documento.v1.2.final.pdf', { type: 'application/pdf' });
}

export function createInvalidProfilePdf17StandardSample(): File {
  // Standard PDF 1.7 without PDF/A XMP metadata
  const blob = buildMinimalPdf({ version: '1.7' });
  return new File([blob], 'relatorio_padrao_pdf17.pdf', { type: 'application/pdf' });
}

export function createInvalidProfilePdfa1bSample(): File {
  const xmp = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>1</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const blob = buildMinimalPdf({ version: '1.4', xmpXml: xmp });
  return new File([blob], 'arquivo_invalido_pdfa1b.pdf', { type: 'application/pdf' });
}

export function createInvalidProfilePdfa2bSample(): File {
  const xmp = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>2</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const blob = buildMinimalPdf({ version: '1.7', xmpXml: xmp });
  return new File([blob], 'arquivo_invalido_pdfa2b.pdf', { type: 'application/pdf' });
}
