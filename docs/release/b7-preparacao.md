# Preparação da B7 — Piloto sintético controlado

**Status:** B6, piloto sintético e revisão humana executados; liberação externa pendente
**Atualizado em:** 2026-09-10

## Regra de dados

Todo teste, eval, benchmark e exercício de piloto desta etapa deve usar somente
dados sintéticos. Documentos, perguntas, identificadores e cenários reais,
mesmo anonimizados, não entram em fixtures, corpus, logs, prompts, serviços
externos ou ambientes de integração.

O piloto previsto nesta preparação é fechado e controlado. Ele não autoriza
dados reais de condomínios, retenção de dados de clientes, produção ou contato
comercial automático.

## Pré-condições para liberação externa

As caixas abaixo são requisitos para qualquer piloto com usuários, dados de
clientes ou infraestrutura persistente. A conclusão sintética de T601–T607 não
libera esses usos nem substitui a revisão humana e as aprovações de ambiente.

- [x] T601–T607 concluídas no escopo sintético/local, com feedback, auditoria
      minimizada, adapter de eval, corpus sintético, baseline e thresholds
      registrados.
- [ ] Todos os cenários P0 de `acceptance.md` passam no commit avaliado.
- [ ] Política específica do ambiente de piloto sintético aprovada, incluindo
      retenção curta, purge, exportação, revogação, backups e responsáveis.
- [ ] Ambiente do piloto separado do Neon de integração sintética e identificado
      como tal; nenhum banco marcado `synthetic-only` deve ser reutilizado para
      outra finalidade.

## Sequência de execução

### T701 — Threat model, upload malicioso e prompt injection

- [x] Consultar o registro da revisão em
      `docs/security/b7-threat-model-review.md`.
- [x] Revisar as fronteiras de confiança reais e todos os caminhos que carregam
      `condominium_id`.
- [x] Testar assinatura, tamanho, parser, limites de recurso, limpeza de
      temporários e falhas recuperáveis de PDF/OCR.
- [x] Testar instruções maliciosas dentro de documentos, sem permitir alteração
      de permissões, uso de ferramentas, revelação de segredos ou mudança do
      formato de resposta.
- [x] Testar isolamento em banco, storage, jobs, retrieval, cache, prompts,
      respostas e logs com canários sintéticos.
- [x] Registrar riscos residuais e responsáveis.

**Gate:** nenhum achado crítico/alto não aceito para o escopo sintético, nenhum
P0/P1 pendente e zero vazamentos entre condomínios.

### T702 — Ciclo de vida e revogação

- [x] Enumerar originais, páginas, chunks, embeddings, perguntas, respostas,
      feedback, caches, jobs, auditoria, exports e backups.
- [x] Verificar exportação e purge completos no exercício sintético, sem usar
      soft delete como substituto.
- [x] Testar revogação de acesso e preservação do segundo tenant no exercício;
      expiração de links e invalidação de cache permanecem pré-condições de
      infraestrutura real; a revogação de membership durante uma sessão é
      coberta pela suíte E2E existente.
- [x] Registrar comprovante minimizado de exclusão, sem conteúdo do corpus.

**Gate:** exportação, exclusão, retenção sintética e revogação exercitadas com dados
sintéticos; backup/restore real permanece bloqueado para dados de clientes.

### T703 — Incidente e correção

- [x] Preparar runbook com severidade, responsáveis, contenção, desativação de
      condomínio/usuário, rotação de segredos e comunicação.
- [x] Definir preservação mínima de evidências, sem copiar conteúdo sintético
      desnecessário para logs ou tickets.
- [x] Definir quando usar rollback e quando usar forward-fix, preservando a
      trilha de auditoria.
- [x] Executar exercício simulado de vazamento, prompt injection ou corrupção de
      processamento.

**Gate:** runbook aprovado, exercício concluído e caminho de interrupção
simulado.

### T704 — Corpus sintético e revisão humana

- [x] Selecionar documentos sintéticos representativos de convenção, regimento,
      atas, contratos, versões, vigências e OCR fraco.
- [x] Incluir casos sintéticos de evidência ausente, conflito, alto risco,
      citação insuficiente, prompt injection e acesso cruzado.
- [x] Revisar humanamente cada caso quanto a resposta, citação, abstenção, conflito,
      especialista e próximo passo.
- [x] Preparar o pacote caso a caso em
      `docs/reviews/b7-corpus-human-review-2026-09-10.md`, com os 100 IDs,
      critérios e campos de decisão; a tela guiada está disponível em
      `http://localhost:5173/?mode=synthetic-review` e o arquivo exportado registra
      100 aprovações, 0 pendências e 0 reprovações.
- [x] Ampliar os 20 casos iniciais para pelo menos 100 casos sintéticos
      representativos para o exercício técnico; a seleção de modelo definitivo
      permanece bloqueada.
- [x] Registrar como limitação que não houve validação com dados reais.

**Gate sintético:** corpus versionado, artificial e sem dados reais ou pessoais; o
piloto automatizado executou 100/100 casos e a revisão humana registrou 100
aprovados, 0 para revisar e 0 reprovados. O resultado pode ser usado como baseline
do exercício sintético, mas não libera dados reais, rollout externo, armazenamento
remoto ou contato comercial.

### T705 — Release checklist

- [x] Revisar o diff completo com foco em correção, segurança, isolamento,
      privacidade, escopo e coerência documental.
- [x] Atualizar a matriz de rastreabilidade e o registro de revisão.
- [x] Executar os gates de qualidade e segurança aplicáveis no commit atual.
- [x] Confirmar que nenhuma ação externa, contato comercial ou automação
      irreversível está habilitada.

## Critérios de entrada do piloto sintético

O exercício sintético foi iniciado após T601–T607 e T701–T703 terem evidências,
os gates P0 estarem verdes, haver limite de uso, critério de interrupção e
métricas de citação, abstenção, latência e custo. A revisão humana concluiu o
corpus sintético; qualquer baseline de produto, piloto externo ou produção ainda
exige os gates de ambiente, proteção de branch e decisão específica de dados.

Qualquer convite relacionado à Zermatt deve ser separado da orientação da IA,
opcional, explícito e sem uso do conteúdo documental para qualificação.

## Definition of Done do exercício sintético B7

- T601–T607, T701–T703 e T705 concluídas e rastreáveis para o exercício sintético;
- 100 casos executáveis produzidos em corpus exclusivamente fictício;
- T704 concluída no escopo sintético: 100 casos revisados, 100 aprovados, 0 pendentes;
- nenhum P0/P1 ou achado crítico/alto não aceito;
- testes aplicáveis aprovados e cobertura unitária mínima de 80% em statements,
  branches, functions e lines;
- corpus, prompts, modelos, índices e métricas versionados;
- incidente, purge, exportação, revogação e rollback/forward-fix exercitados em
  cenários sintéticos;
- diff completo revisado e aprovado;
- limitação de validação exclusivamente sintética registrada;
- documentação, contratos, código e rastreabilidade coerentes.
