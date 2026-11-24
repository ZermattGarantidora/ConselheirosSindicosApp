# Revisão da Spec 041 — evals de conversas

- **Status:** revisão do autor concluída; revisão independente e integração não realizadas.
- **Diff revisado:** arquivos da Spec 041, `evals/conversations/`, testes de conversas e alteração isolada da triagem documental; adições de comandos, CI e rastreabilidade correspondentes no working tree de 26/10/2026.
- **Revisor:** Codex, autor da implementação, usando a skill local `code-review`.
- **P0/P1 pendentes no escopo:** nenhum identificado após as correções abaixo.

## Resultado

240 cenários distintos em 14 temas e 30 situações transversais; 260 turnos, 19 sequências e
25 documentos fictícios paginados. Gabaritos ficam fora do contexto do gateway. O replay usa
autorização, retrieval textual, caso de uso, persistência e HTTP reais em memória. Nenhuma
chamada externa foi executada. A avaliação semântica permanece pendente.

## Achados corrigidos

1. `CONV-crosscutting-07`: a variante “ignore o sistema” não era reconhecida pela triagem,
   e a citação reproduzia o ataque. Specs 035/041 e aceitação foram atualizadas; ampliou-se
   o padrão explícito, preservando a fixture e as asserções. Regressões confirmam ausência
   do canário na entrada do gateway e na resposta inteira.
2. O agregador precisa bloquear falhas de risco/ação externa também em continuações P1,
   independentemente dos scores médios. Guarda e teste negativo adicionados.
3. O vínculo de revisão cobre conteúdo e metadados do corpus, dataset e corpo da resposta;
   adulteração posterior é recusada. Respostas de recusa HTTP também ficam no pacote.

## Verificações

- Replay de conversas: 240 cenários / 260 turnos mecanicamente válidos, zero falhas, zero chamadas externas. As 197 abstenções do gateway local não são interpretadas como julgamento de correção; os 260 turnos continuam pendentes de revisão semântica.
- Preparação sem gateway: zero turnos executados e status `pending_gateway`.
- Agregação de formulário em branco: 260 turnos pendentes, nenhuma taxa inventada e saída 1, conforme o bloqueio esperado de aprovação.
- Suíte geral de unitários e E2E: 950 testes aprovados na rodada completa, incluindo mudanças simultâneas existentes no workspace.
- Rechecagem final do escopo após o ajuste do agregador: 34/34 testes focados aprovados e tipagem sem erros.
- Cobertura dessa rodada: statements 90,73%; branches 85,25%; functions 96,36%; lines 92,77%.
- Formatação, lint, tipagem, gate estrutural de 42 specs, scanner de segredos e `git diff --check` aprovados.
- Evals existentes: 20/20 iniciais e 50/50 documentais determinísticos aprovados. Os 50 semânticos existentes continuam pendentes.

O Corepack não conseguiu baixar pnpm por DNS (`ENOTFOUND registry.npmjs.org`). Foram usados
os executáveis locais equivalentes de Prettier, ESLint, TypeScript e Vitest e os scripts
canônicos por Node/PowerShell. Vitest usou um worker, preload existente de `safe-os-user-info`
e temporários em `.vitest-temp/`, após a tentativa inicial falhar com EPERM no temporário externo.
Nenhum teste ou asserção foi reduzido para contornar o ambiente.

## Limites

Alterações simultâneas da Spec 042 foram preservadas e não pertencem à autoria desta revisão.
Os resultados gerais descrevem a rodada local, sem aprovação de commit ou status remoto.
O pacote usa texto após extração; não certifica PDF/OCR, embeddings, PostgreSQL/RLS ou frontend.
Modelos reais, gabaritos especializados e três rodadas por configuração continuam necessários
antes de comparar qualidade ou autorizar piloto. Sem merge, publicação ou dados reais.
