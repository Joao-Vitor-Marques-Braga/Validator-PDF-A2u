<div align="center">

# 🛡️ Validador Estrito de PDF/A-2u

**Sistema de inspeção binária e validação rigorosa de conformidade PDF/A-2u (ISO 19005-2 Unicode) e nomenclatura de arquivos.**

[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Tests-Vitest-FCC72B?style=for-the-badge&logo=vitest&logoColor=black)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## 📌 Visão Geral

O **Validador de PDF/A-2u** é uma solução *front-end* desenvolvida em **React** e **TypeScript** focada na auditoria e preservação documental a longo prazo. 

A aplicação opera **100% no lado do cliente (client-side)**, realizando a leitura de *ArrayBuffers* e extração de metadados XMP estruturados sem enviar qualquer dado a servidores externos, garantindo total privacidade e conformidade com a LGPD/GDPR.

---

## ⚡ Principais Funcionalidades & Regras de Negócio

### 1. 📝 Validação Rigorosa de Nomenclatura
- **Ponto Único:** O nome do arquivo pode conter **exatamente um único ponto (`.`)**, que deve ser o separador imediato da extensão `.pdf`.
- **Exemplos Válidos:** `documento_v1.pdf`, `contrato-2026.pdf`, `relatorio_anual.pdf`.
- **Exemplos Inválidos:** `documento.v1.pdf`, `contrato.final.assinado.pdf`, `arquivo..pdf`.
- **Feedback Amigável:** Identificação dos pontos excedentes e sugestão de substituição por sublinhados (`_`) ou hífens (`-`).

### 2. 📦 Limite de Tamanho de Arquivo (Máx. 10MB)
- **Tamanho Máximo Permitido:** O arquivo não pode exceder **10 MB (10.485.760 bytes)**.
- **Auditoria Instantânea:** A validação ocorre no fluxo client-side, reprovando imediatamente arquivos excedentes.
- **Diagnóstico Preciso:** Exibe o tamanho real detectado formatado em MB/bytes versus a cota máxima de 10 MB.

### 3. 🔍 Inspeção de Metadados XMP & Conformidade PDF/A-2u
- **Padrão Estrito:** Aceita unicamente arquivos no perfil **PDF/A-2u** (ISO 19005-2 com nível de conformidade **U - Unicode**).
- **Rejeição com Diagnóstico Comparativo:** Caso o arquivo não atenda à norma, informa detalhadamente:
  - **Formato/Perfil Detectado:** (ex.: `PDF padrão 1.7`, `PDF/A-1b`, `PDF/A-2b`, `PDF/A-3u`).
  - **Formato Esperado:** `PDF/A-2u (PDF/A-2 Unicode)`.
- **Inspeção de Cabeçalho:** Verificação da assinatura binária `%PDF-1.x`.

### 4. ⚡ Conversão Automática para PDF/A-2u & Nomenclatura Padronizada
- **Resolução em 1 Clique:** Caso o arquivo não seja PDF/A-2u ou possua múltiplos pontos no nome, um card de ação inteligente permite convertê-lo instantaneamente direto no navegador.
- **Injeção Rigorosa de Metadados:** Constrói e anexa o pacote XMP em conformidade estrita com a ISO 19005-2 (Nível U - Unicode), vinculando-o ao catálogo (`/Catalog`) do PDF.
- **Saneamento de Nomenclatura:** Ajusta nomes com múltiplos pontos (ex.: `documento.v1.pdf` $\rightarrow$ `documento_v1_pdfa2u.pdf`), garantindo aprovação na regra de ponto único.

### 5. 🗜️ Compactação Inteligente com Redução de Qualidade (< 10MB)
- **Adequação Automática de Tamanho:** Para arquivos com mais de 10MB, o sistema oferece compactação adaptativa via Canvas e re-encoding JPEG.
- **Níveis de Qualidade Selecionáveis:** Predefinições Equilibrada (~70%), Alta Compressão (~50%) ou Alta Fidelidade (~85%), garantindo que o arquivo final fique abaixo do teto de 10MB.
- **Métricas de Redução em Tempo Real:** Exibe comparativo de tamanho antes/depois (ex.: `14.8 MB` $\rightarrow$ `5.9 MB` `-60%`) e botão de validação imediata no sistema.

### 6. 👁️ Reconhecimento Óptico de Caracteres (OCR) & Camada de Texto Invisível
- **Motor Tesseract.js Nativo no Navegador:** Para PDFs digitalizados ou escaneados (imagens puras), o sistema executa OCR localmente (suporte a Português e Inglês com download sob demanda de modelos treinados).
- **Camada de Texto Pesquisável e Selecionável:** Reconhece palavras com coordenadas precisas e injeta uma camada de texto invisível (`opacity: 0`) com mapeamento Unicode (`ToUnicode`), permitindo busca e seleção textual sem alterar o aspecto visual do documento.
- **Extração Híbrida Inteligente:** Se a página já contiver texto digital vetorial nativo, ele é preservado sem necessidade de reprocessamento por OCR.

### 7. 🎯 Conformidade Estrita ISO 19005-2 (OutputIntents & Perfil ICC sRGB)
- **Perfil de Cor Embutido:** O catálogo do PDF (`/Catalog`) recebe um dicionário `/OutputIntents` em conformidade com a cláusula 6.2.2 da ISO 19005-2, com um perfil de cores ICC v2 sRGB real embutido (`/DestOutputProfile`).
- **Aceitação em Tribunais & Validadores Oficiais:** Evita a rejeição por sistemas como PJe, ESAJ, veraPDF e Adobe Acrobat Preflight que exigem a especificação de intenção de saída para PDF/A.

### 8. 🎨 Interface Moderna & Modo Claro/Escuro
- Suporte nativo a **Modo Claro** e **Modo Escuro** com detecção automática do sistema e persistência no `localStorage`.
- Drag and Drop dinâmico com feedbacks visuais nos estados: *idle*, *validating*, *success* e *error*.
- Visualizador de Metadados XMP com suporte à cópia do pacote XML bruto.
- Histórico local das últimas validações da sessão.

---

## 🏛️ Arquitetura do Projeto

O projeto foi estruturado seguindo os princípios de **Clean Architecture**, **Screaming Architecture (Feature-Based)** e tipagem estrita com TypeScript (sem uso de `any`):

```
src/
├── features/
│   └── pdf-validator/                 # Feature autocontida
│       ├── components/                # Componentes de UI da feature
│       │   ├── FileDropzone/          # Área de upload Drag & Drop
│       │   ├── ValidationReport/      # Relatório detalhado com checklist
│       │   ├── MetadataViewer/        # Gaveta de inspeção de metadados XMP
│       │   ├── PdfActions/            # Card de conversão, compactação e OCR
│       │   └── PdfValidatorWidget.tsx # Widget principal da feature
│       ├── domain/                    # Regras de negócio puras
│       │   └── rules/
│       │       ├── file-name.rule.ts           # Regra de ponto único no nome
│       │       ├── file-size.rule.ts           # Regra de limite de tamanho (10MB)
│       │       └── pdfa2u-conformance.rule.ts  # Regra de conformidade PDF/A-2u
│       ├── services/                  # Orquestração e parse binário
│       │   ├── binary-reader.util.ts  # Scanner de buffers e streams
│       │   ├── xmp-parser.service.ts  # Parser de pacotes XML/XMP
│       │   ├── pdf-inspector.service.ts# Extrator de metadados
│       │   ├── pdf-validator.service.ts# Pipeline completo de auditoria
│       │   ├── pdf-compressor.service.ts# Compactação adaptativa de páginas + injeção de texto
│       │   ├── pdf-converter.service.ts# Conversão e injeção XMP PDF/A-2u + OutputIntent
│       │   └── ocr.service.ts         # Motor Tesseract.js e worker pool
│       ├── utils/                     # Utilitários específicos da feature
│       │   └── icc-profile.util.ts    # Gerador de perfil sRGB ICC v2 e injeção de OutputIntent
│       ├── hooks/                     # Custom Hook gerenciador de estado
│       │   └── usePdfValidator.ts     # Hook com ciclo de vida e histórico
│       ├── types/                     # Tipagens fortes e Result pattern
│       │   ├── result.type.ts         # Mônada funcional Result<T, E>
│       │   └── validator.types.ts     # Interfaces de auditoria e perfis
│       ├── __tests__/                 # Suíte de testes unitários
│       └── index.ts                   # Ponto de entrada (Public API)
├── shared/
│   ├── hooks/
│   │   └── useTheme.ts                # Hook de tema Claro/Escuro
│   └── styles/
│       └── design-system.css          # Design System e variáveis CSS
├── App.tsx
└── main.tsx
```

---

## 🛠️ Tecnologias Utilizadas

- **Framework:** [React 19](https://react.dev/)
- **Linguagem:** [TypeScript 5](https://www.typescriptlang.org/)
- **Build Tool:** [Vite 6](https://vitejs.dev/)
- **Estilização:** CSS Modules & CSS Custom Properties (Design System próprio)
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Testes Unitários:** [Vitest](https://vitest.dev/) & [Testing Library](https://testing-library.com/)

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 18 ou superior
- Gerenciador de pacotes `npm` ou `yarn`

### 1. Clonar o repositório
```bash
git clone https://github.com/Joao-Vitor-Marques-Braga/Validator-PDF-A2u.git
cd Validator-PDF-A2u
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Executar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse a aplicação no navegador em `http://localhost:5173`.

### 4. Executar os testes automatizados
```bash
npm test
```

### 5. Gerar build de produção
```bash
npm run build
```

---

## 🧪 Cobertura de Testes Automatizados

O projeto conta com **16 testes unitários** com 100% de aprovação, validando:
- ✅ Nomes de arquivos válidos e rejeição a múltiplos pontos (`.`).
- ✅ Extração e parsing de tags XMP (`pdfaid:part`, `pdfaid:conformance`, metadados Dublin Core e datas).
- ✅ Identificação e rejeição precisa de perfis não compatíveis (`PDF/A-1b`, `PDF/A-2b`, `PDF padrão 1.7`).
- ✅ Pipeline integrado de validação do `PdfValidatorService`.

---

## 📄 Licença

Este projeto está licenciado sob a licença **MIT** - consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">
  Desenvolvido por <strong>João Vitor Marques Braga</strong>
</div>
