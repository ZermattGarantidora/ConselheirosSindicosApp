# ADR 0017 — Originais documentais no PostgreSQL

**Status:** aceito
**Data:** 2026-10-05

## Contexto

O adaptador inicial usava filesystem privado apenas para desenvolvimento local, conforme ADR 0006.
No ambiente persistente, isso separava os metadados protegidos no PostgreSQL do PDF original e
impedia uma visualização confiável após reinício ou troca de instância.

## Decisão

- PDFs originais de até 25 MB serão persistidos como `bytea` em
  `app.document_original_contents`, escopados por `condominium_id` e `storage_object_id`.
- RLS permite escrita e leitura ao runtime somente no contexto de associação autorizada; o worker
  lê apenas no papel restrito `app_worker` e no condomínio atribuído ao job.
- A API continua a validar autorização e versão antes de solicitar o binário; o navegador não recebe
  acesso direto ao banco.
- A migração local verifica hash e conteúdo persistido antes de apagar cada cópia em disco. Arquivos
  sem metadados correspondentes não são apagados automaticamente.

## Consequências

- O servidor e o worker não dependem de diretório local para processar ou visualizar PDFs
  persistidos.
- Backups, retenção e exclusão do PostgreSQL passam a incluir os originais, sujeitos ao gate de
  produção do ADR 0012 e às decisões de LGPD ainda pendentes.
- Para documentos maiores ou custos incompatíveis, um storage privado remoto poderá substituir este
  adaptador atrás do mesmo contrato, exigindo ADR e revisão de retenção próprios.
