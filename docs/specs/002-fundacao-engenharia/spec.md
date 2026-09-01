# Spec 002 — Fundação local de engenharia

**Status:** aprovada para implementação local  
**Responsável:** time do produto  
**Atualizado em:** 2026-08-31

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Produto útil e custo sustentável | §1, §15 | Uma base modular, reproduzível e com limites de custo permite aprender sem criar operação excessiva. |
| Confiança na resposta documental | §4, §21 | Testes, contratos e gates tornam verificáveis as futuras citações, fontes e abstenções. |
| Privacidade, LGPD e segurança | §12, §22 | Segredos fora do repositório, scanner local, logs minimizados e isolamento por padrão reduzem risco desde o início. |
| MVP web e evolução segura | §14, §17, §22 | O monólito modular e o worker previstos ganham convenções, qualidade e observabilidade sem antecipar funcionalidades. |
| Validação por evals | §15, §16 | O fluxo local inclui validação de specs, testes e espaço versionado para evals. |

### Limites respeitados

- Não implementa autenticação, upload, OCR, busca, IA, respostas, dados reais de condomínios ou interface de usuário.
- Não escolhe provedor de IA, banco, storage, fila, serviço de observabilidade ou infraestrutura de produção.
- Não cria integração com GitHub, repositório remoto, pull requests ou deploy em nuvem nesta fase.
- Mantém a Spec 001 como a primeira fatia de produto; esta é somente a capacidade de construí-la com segurança.

### Divergências da visão

`Nenhuma`.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Disponibilizar um ambiente local reproduzível que impeça a integração de código sem revisão registrada, testes aprovados, cobertura unitária mínima e verificações básicas de segurança, preservando a arquitetura do MVP para a implementação da Spec 001.

## 2. Promessa testada

> Uma alteração pequena pode ser implementada, testada e revisada localmente com evidência objetiva antes de ser integrada ao histórico Git.

## 3. Usuário primário

Pessoas desenvolvedoras e revisoras que constroem o MVP documental para síndicos, administradoras e conselheiros.

## 4. Escopo

- Repositório Git local, convenções de edição e hooks locais.
- Projeto TypeScript modular com primitives de segurança que possam ser reutilizadas pela Spec 001.
- Comandos canônicos de formatação, lint, typecheck, testes, cobertura, validação de specs e scanner de segredos.
- Cobertura mínima de 80% em statements, branches, functions e lines aplicada automaticamente.
- Modelo de evidência de review local e comando que executa os gates antes de uma integração.
- Contrato HTTP inicial, ambiente por variáveis, política de dependências, logs e flags de release documentados.
- Registro explícito de GitHub como etapa posterior, sem bloquear o desenvolvimento local.

## 5. Fora do escopo

- Proteção remota de branch, status checks hospedados e automação de pull request.
- Instalação de banco, fila, Docker ou serviços externos.
- Funcionalidade de produto da Spec 001.
- Varredura dinâmica, pentest ou certificação de conformidade.

## 6. Pré-condições

- Node.js 24 e pnpm 11 disponíveis no ambiente de desenvolvimento.
- Git instalado localmente.
- Dependências bloqueadas pelo lockfile após a instalação inicial.

## 7. Requisitos funcionais

### RQ-201 — Gate único local

O comando `pnpm run check` deve executar lint, typecheck, testes unitários com cobertura, validação das specs e scanner de segredos. Uma falha deve encerrar o comando com código diferente de zero.

### RQ-202 — Cobertura exigida

Os testes unitários devem falhar abaixo de 80% em statements, branches, functions ou lines para os módulos de produção cobertos pela configuração.

### RQ-203 — Escopo de condomínio seguro

O núcleo deve fornecer um identificador de condomínio validado e uma operação que exija esse escopo, impedindo valores vazios ou troca de escopo acidental.

### RQ-204 — Revisão rastreável

Antes de uma integração local, a pessoa integradora deve registrar o commit/diff revisado, revisor independente, comandos e achados em um arquivo de review. O verificador deve recusar evidência sem aprovação ou com P0/P1 aberto.

### RQ-205 — Segredos e configuração

Valores sensíveis não podem ser versionados; um exemplo de variáveis e um scanner local devem detectar padrões de tokens/chaves conhecidos em arquivos rastreados.

## 8. Contratos

- `CondominiumId`: string não vazia, normalizada e opaca fora do módulo `src/core`.
- `withCondominiumScope`: recebe um `CondominiumId` válido e devolve uma operação com o escopo explícito.
- `contracts/http/health.openapi.json`: contrato versionado do endpoint de saúde; mudanças incompatíveis exigem nova spec ou ADR.
- `docs/reviews/TEMPLATE.md`: evidência mínima para liberar uma integração local.

## 9. Requisitos não funcionais

- `pnpm run check` deve ser reprodutível a partir do lockfile e falhar de modo determinístico.
- Nenhuma variável sensível possui valor real em arquivos versionados.
- Logs futuros devem usar IDs pseudonimizados e nunca conteúdo de documentos, perguntas ou respostas sem necessidade operacional.
- Dependências de produção devem passar por auditoria antes de um release; achados altos/críticos bloqueiam o release até tratamento registrado.

## 10. Critérios de sucesso

- Qualquer clone local consegue instalar as dependências e executar todos os gates com um comando documentado.
- O gate prova cobertura mínima de 80% nas quatro métricas.
- Uma tentativa de review sem aprovação, com P0/P1 ou sem comandos exigidos é recusada.
- A primeira implementação da Spec 001 pode reutilizar o escopo de condomínio e os comandos sem criar um segundo fluxo de qualidade.

## 11. Questões em aberto

- Qual provedor Git hospedará os checks obrigatórios quando a equipe adotar colaboração remota?
- Qual banco, storage, fila e plataforma de observabilidade atendem melhor ao piloto após a decisão de infraestrutura?
- Quais ferramentas de SAST, DAST e SBOM serão usadas no pipeline remoto?

## Gate para mudar o status

Esta spec só é considerada entregue quando os comandos documentados passarem localmente, o Git local estiver configurado e a documentação da etapa futura de GitHub estiver registrada.
