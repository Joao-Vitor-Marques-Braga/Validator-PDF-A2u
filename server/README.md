# 🚀 Microserviço de Conversão PDF/A-2u (Ghostscript Engine)

Microserviço de alta fidelidade para conversão estrita de PDFs legados para o padrão **PDF/A-2u (ISO 19005-2 Unicode)** exigido pelo **Colare (TCM-GO)** e **Centi**.

Este serviço utiliza o motor nativo do **Ghostscript** com decodificadores completos em C++ (`jbig2dec` + `FreeType` + `pdfwrite`), realizando **exatamente o mesmo processo que o ABBYY FineReader realiza**:
- Compilação e embutimento físico de subsets de fontes (`Type0 / CIDFontType2`).
- Preservação 100% vetorial de páginas e textos (sem páginas em branco, sem rasterização de baixa qualidade).
- Sincronização rigorosa de metadados XMP e dicionário `/Info`.
- Injeção de perfil de cores oficial sRGB v2.1 OutputIntent.

---

## 🛠️ Opção 1: Executar com Docker (Recomendado - 1 comando)

Se você possui o [Docker Desktop](https://www.docker.com/) instalado:

```bash
cd server
docker compose up -d
```

O container já baixa e configura o Ghostscript, as fontes e sobe a API em `http://localhost:3001`.

---

## 💻 Opção 2: Executar Localmente no Windows / Linux

### 1. Instalar o Ghostscript no seu sistema operacional:
- **Windows:** Baixe o instalador oficial de 64 bits do Ghostscript em [ghostscript.com/releases.html](https://ghostscript.com/releases.html) (ou via `winget install ArtifexSoftware.Ghostscript`).
- **Linux (Ubuntu/Debian):** `sudo apt install ghostscript`

### 2. Instalar dependências e iniciar:
```bash
cd server
npm install
npm start
```

---

## 📡 Endpoints da API

### 1. Health Check
`GET http://localhost:3001/api/health`
Retorna se o Ghostscript está instalado e disponível:
```json
{
  "status": "ok",
  "ghostscriptAvailable": true,
  "ghostscriptBinary": "gswin64c",
  "ghostscriptVersion": "10.03.0"
}
```

### 2. Conversão para PDF/A-2u
`POST http://localhost:3001/api/convert`
- **Body:** `multipart/form-data` com o campo `file` contendo o arquivo PDF.
- **Resposta:** O arquivo binário do PDF convertido com cabeçalho `Content-Type: application/pdf` e nome ajustado no padrão do tribunal (sem parênteses).
