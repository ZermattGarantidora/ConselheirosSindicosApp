# ADR 0008 — Extração local de texto com PDF.js

**Status:** aceito
**Data:** 2026-09-02

## Contexto

O B3 precisa extrair texto de PDFs textuais por página, sem enviar documentos sintéticos a terceiros. Os arquivos são dados não confiáveis e a extração deve preservar a numeração humana para citações posteriores.

## Decisão

Usar o pacote `pdfjs-dist`, a distribuição oficial do PDF.js, como adaptador local de leitura de PDFs no worker Node. A versão exata fica travada no `pnpm-lock.yaml`.

O adaptador recebe somente o `Buffer` previamente validado e retorna páginas em ordem, cada uma com `pageIndex` interno zero-based, `pageNumber` humano one-based e texto extraído. Nenhum conteúdo é registrado em logs. Nesta etapa, erro de parser resulta em falha recuperável; OCR continua isolado na T304.

## Consequências

- A extração continua local e compatível com a política de dados sintéticos.
- O processamento permanece assíncrono e não entra no ciclo da requisição de upload.
- A dependência passa a integrar o lockfile, auditoria de dependências e testes com PDFs sintéticos.
- PDFs sem texto utilizável não serão publicados como prontos: a próxima etapa os encaminhará para OCR ou revisão.

## Alternativas rejeitadas

### Parser próprio ou extração por expressão regular

Rejeitado por não interpretar com segurança a estrutura de PDF nem preservar páginas de modo confiável.

### Serviço externo de OCR ou parsing

Adiado pelo ADR 0006: exigiria avaliação de privacidade, custo, qualidade e política de dados antes de qualquer uso fora do ambiente local.

## Referência

A documentação oficial do projeto PDF.js indica `pdfjs-dist` como distribuição instalável via npm e fornece exemplo de uso em Node.
