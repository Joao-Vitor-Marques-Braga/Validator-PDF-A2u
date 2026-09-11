import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { exec, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for frontend
app.use(cors());

// Configure temporary upload storage
const upload = multer({
  dest: path.join(__dirname, 'temp_uploads'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// Ensure temp directories exist
const tempUploadsDir = path.join(__dirname, 'temp_uploads');
const tempOutputsDir = path.join(__dirname, 'temp_outputs');
if (!fs.existsSync(tempUploadsDir)) fs.mkdirSync(tempUploadsDir, { recursive: true });
if (!fs.existsSync(tempOutputsDir)) fs.mkdirSync(tempOutputsDir, { recursive: true });

/**
 * Resolves the available Ghostscript binary on the host system (Linux, Docker, or Windows)
 */
function resolveGhostscriptBinary() {
  const candidates = [
    'gs',
    'gswin64c',
    'gswin32c',
  ];

  for (const bin of candidates) {
    try {
      execSync(`${bin} --version`, { stdio: 'ignore' });
      return bin;
    } catch {
      // Continue searching
    }
  }

  // Windows standard installation paths
  if (process.platform === 'win32') {
    const programFiles = [process.env['ProgramFiles'], process.env['ProgramFiles(x86)']];
    for (const pf of programFiles) {
      if (!pf) continue;
      const gsDir = path.join(pf, 'gs');
      if (fs.existsSync(gsDir)) {
        const versions = fs.readdirSync(gsDir);
        for (const ver of versions) {
          const exe64 = path.join(gsDir, ver, 'bin', 'gswin64c.exe');
          if (fs.existsSync(exe64)) return `"${exe64}"`;
          const exe32 = path.join(gsDir, ver, 'bin', 'gswin32c.exe');
          if (fs.existsSync(exe32)) return `"${exe32}"`;
        }
      }
    }
  }

  return null;
}

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  const gsBin = resolveGhostscriptBinary();
  let gsVersion = null;
  if (gsBin) {
    try {
      gsVersion = execSync(`${gsBin} --version`).toString().trim();
    } catch {
      // ignore
    }
  }

  res.json({
    status: 'ok',
    ghostscriptAvailable: Boolean(gsBin),
    ghostscriptBinary: gsBin,
    ghostscriptVersion: gsVersion,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Strict PDF/A-2u Conversion Endpoint
 */
app.post('/api/convert', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const gsBin = resolveGhostscriptBinary();
  if (!gsBin) {
    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(500).json({
      error: 'Ghostscript não encontrado no servidor. Certifique-se de que o Ghostscript está instalado ou utilize o container Docker.',
    });
  }

  const inputPath = path.resolve(req.file.path);
  const outputFileName = `converted_${Date.now()}_${path.basename(req.file.originalname, path.extname(req.file.originalname))}_pdfa2u.pdf`;
  const outputPath = path.resolve(tempOutputsDir, outputFileName);
  const pdfaDefPath = path.resolve(__dirname, 'PDFA_def.ps');

  // Command arguments for strict ISO 19005-2 (PDF/A-2u)
  // Recompiles all fonts to Type0/CIDFontType2 and embeds full subsets exactly like ABBYY FineReader
  const command = `${gsBin} -dPDFA=2 -dBATCH -dNOPAUSE -dNOOUTERSAVE -dCompatibilityLevel=1.7 -dPDFACompatibilityPolicy=1 -dEmbedAllFonts=true -sColorConversionStrategy=RGB -sDEVICE=pdfwrite -sOutputFile="${outputPath}" "${pdfaDefPath}" "${inputPath}"`;

  console.log(`[Ghostscript] Executando conversão para ${req.file.originalname}...`);

  exec(command, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
    // Delete temporary input
    try { fs.unlinkSync(inputPath); } catch {}

    if (err || !fs.existsSync(outputPath)) {
      console.error('[Ghostscript] Erro na conversão:', err, stderr);
      return res.status(500).json({
        error: 'Falha no processamento pelo motor Ghostscript.',
        details: stderr || err?.message,
      });
    }

    const outputStats = fs.statSync(outputPath);
    console.log(`[Ghostscript] Conversão concluída com sucesso! Tamanho final: ${outputStats.size} bytes`);

    // Clean filename for Colare / Centi single-dot rule
    const rawOriginal = req.file.originalname || 'documento.pdf';
    const base = path.basename(rawOriginal, path.extname(rawOriginal)).replace(/[.\s()]/g, '_');
    const downloadName = `${base}_pdfa2u.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('X-Original-Size', String(req.file.size));
    res.setHeader('X-Converted-Size', String(outputStats.size));

    const readStream = fs.createReadStream(outputPath);
    readStream.pipe(res);

    readStream.on('close', () => {
      // Delete temporary output after serving
      try { fs.unlinkSync(outputPath); } catch {}
    });
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Microserviço PDF/A-2u Ghostscript ativo na porta ${PORT}`);
  console.log(`📡 URL Health: http://localhost:${PORT}/api/health`);
  console.log(`📥 Endpoint Conversão: POST http://localhost:${PORT}/api/convert`);
  const gsBin = resolveGhostscriptBinary();
  console.log(`⚙️ Ghostscript detectado: ${gsBin ? `SIM (${gsBin})` : 'NÃO (instale o Ghostscript ou use Docker)'}`);
  console.log(`====================================================`);
});
