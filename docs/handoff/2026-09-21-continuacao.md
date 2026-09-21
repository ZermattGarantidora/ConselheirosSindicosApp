# Continuidade do projeto — 21/09/2026

Este arquivo registra o estado da implementação para que o trabalho possa continuar em outra conta ou sessão sem depender do histórico do chat.

## Prompt para colar na nova conta

```text
Continue o desenvolvimento do projeto Conselheiro Documental para Síndicos.

Repositório: https://github.com/ZermattGarantidora/ConselheirosSindicosApp
Branch com o trabalho mais recente: codex/handoff-app-completo

Antes de alterar qualquer arquivo:
1. Leia AGENTS.md e o BRIEFING_PRODUTO_CONSELHEIRO_SINDICO.md completos.
2. Leia as specs e ADRs relacionados à tarefa.
3. Preserve isolamento por condominium_id, citações verificáveis, abstenção sem evidência, tratamento de documentos como dados não confiáveis e confirmação humana para ações externas.
4. Não coloque chaves, senhas, DATABASE_URL, arquivos .env.local ou documentos reais no Git.

Objetivo atual: deixar o aplicativo funcional de ponta a ponta, desde apresentação, cadastro e login até criação de condomínio, upload/processamento dos documentos e chat documental com histórico, citações, falhas visíveis e boa experiência em desktop e mobile.

O que já está implementado nesta branch:
- cadastro e login reais por e-mail e senha;
- restauração automática de sessão desabilitável para testes, permitindo testar contas diferentes sem aba anônima;
- landing page revisada, sem o texto removido pelo usuário e sem o bloco com aparência de “telinha” no mobile;
- criação de condomínio e upload de PDFs com confirmação de validade persistida;
- worker documental integrado à API no ambiente de teste, sem exigir outro terminal;
- indexação e recuperação de páginas/trechos por condomínio;
- classificação de perguntas factuais como consultas documentais mesmo sem as palavras “ata”, “documento” ou “convenção”;
- respostas com documento, versão, página, trecho e offsets verificáveis;
- fallback documental local somente quando o provedor Gemini estiver indisponível, sem mascarar erros de autorização, busca, evidência ou validação;
- histórico da conversa, limpeza do campo após envio, erro visível e envio por Enter somente no desktop;
- modelo padrão de testes `gemini-3.5-flash-lite`, escolhido por ser a variante estável de menor custo. Só use modelo mais caro quando um eval demonstrar ganho necessário de qualidade;
- as 32 perguntas factuais fornecidas pelo usuário estão cobertas como consultas documentais em `tests/unit/answer-use-case.test.ts`.

Estado verificado em 21/09/2026:
- chamada real mínima ao `gemini-3.5-flash-lite`: HTTP 200;
- `pnpm run check`: aprovado;
- 58 arquivos de teste e 327 testes aprovados;
- cobertura: 88,92% statements, 80,04% branches, 96,23% functions e 90,23% lines;
- gate de alinhamento das 9 specs aprovado;
- scanner de segredos aprovado;
- API em `/health` informou `status: ok`, provedor Gemini e autenticação real.

Configuração local não versionada:
- copie `.env.example` para `.env.local`;
- preencha `GEMINI_API_KEY` e `DATABASE_URL` localmente;
- mantenha `GEMINI_MODEL=gemini-3.5-flash-lite`;
- nunca peça nem imprima os valores das chaves no chat ou nos logs.

Para rodar:
- `pnpm install --frozen-lockfile`
- `pnpm run dev:api`
- em outro terminal, `pnpm run dev:web`
- abra `http://127.0.0.1:5173/`

Antes de concluir qualquer nova mudança, execute `pnpm run check`, revise o diff completo e atualize spec, critérios de aceitação e `docs/quality/traceability.md` quando o comportamento mudar.
```

## O que o GitHub não contém

- `.env.local` e suas credenciais;
- arquivos enviados em `.local/`;
- dados armazenados no PostgreSQL/Neon;
- sessões e cookies do navegador.

Esses itens ficam fora do Git por segurança. Em uma máquina nova, configure as variáveis localmente e reenvie apenas o corpus sintético autorizado para testes.
