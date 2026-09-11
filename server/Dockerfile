# Dockerfile para Microserviço de Conversão Estrita PDF/A-2u com Ghostscript
FROM node:20-alpine

# Instala Ghostscript nativo, decodificador JBIG2, fontes padrão e dependências essenciais
RUN apk add --no-cache \
    ghostscript \
    ghostscript-fonts \
    msttcorefonts-installer \
    fontconfig \
    && update-ms-fonts \
    && fc-cache -f

WORKDIR /app

# Instala dependências do Node
COPY package.json ./
RUN npm install --production

# Copia código-fonte e perfis de conformidade
COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
