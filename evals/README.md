# Evals do conselheiro documental

Esta pasta contém as avaliações sintéticas de comportamento da aplicação. Os 20 casos executam o endpoint real de perguntas e feedback usando o gateway determinístico local e o corpus versionado.

## Objetivo inicial

Avaliar uma promessa visível ao usuário:

> A aplicação responde somente com evidências autorizadas do condomínio selecionado, cita corretamente ou se abstém.

## Arquivos

- `fixtures/synthetic-corpus.yaml`: documentos e trechos fictícios, sem dados de clientes.
- `datasets/consulta-documental.yaml`: 20 casos iniciais de comportamento e regressão.
- `fixtures/synthetic-corpus.ts` e `datasets/consulta-documental.ts`: representação tipada usada pelo adapter.
- `baseline.json`: thresholds aprovados para a primeira execução local.

## Regras

- Nunca adicionar documentos reais, segredos ou dados pessoais.
- Executar os casos contra o caminho usado pela aplicação, não apenas contra o prompt bruto.
- Registrar uma baseline antes de mudar prompt, modelo, chunking, embeddings, reranking ou thresholds.
- Bloquear toda falha P0.
- Separar asserções determinísticas de julgamentos probabilísticos.
- Validar citações deterministicamente sempre que possível.
- Todo bug relevante deve virar um caso sanitizado.

## Tipos de asserção

### Determinísticas

- status HTTP/operação;
- schema da resposta;
- `answerMode`;
- IDs permitidos de evidência;
- existência do trecho na página;
- ausência de tenant ou frase-canário proibidos;
- escalonamento obrigatório;
- persistência de feedback e trilha.

### Probabilísticas

- correção semântica;
- fidelidade/grounding;
- suficiência e clareza;
- qualidade da explicação de conflito;
- utilidade do próximo passo.

Asserções probabilísticas devem combinar rubricas claras com revisão humana periódica. Um avaliador por modelo nunca substitui os bloqueios determinísticos.

## Adapter executável

O adapter atual:

1. configura usuários, memberships e documentos sintéticos em memória;
2. chama o mesmo endpoint HTTP da interface;
3. captura resposta, evidências, traces normalizados, custo e latência;
4. aplica asserções determinísticas, inclusive isolamento e feedback;
5. produz relatório comparável com a baseline.

O comando canônico é `pnpm run evals`; ele deve ser executado no checklist local de release e será adicionado ao CI quando GitHub for adotado.

## Crescimento do dataset

O corpus inicial possui 20 casos sintéticos. Antes do piloto:

- coletar pelo menos 100 perguntas reais anonimizadas;
- obter expectativa revisada por síndicos e especialistas;
- cobrir documentos longos, escaneados e conflitantes;
- incluir erros reais encontrados durante testes;
- estratificar resultados por tarefa, risco, tipo de documento e qualidade do OCR.
