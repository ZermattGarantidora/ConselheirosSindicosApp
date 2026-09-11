# Evals do conselheiro documental

Esta pasta contém as avaliações sintéticas de comportamento da aplicação. Os 20 casos executam o endpoint real de perguntas e feedback usando o gateway determinístico local e o corpus versionado. O adapter do piloto também executa casos determinísticos pelo endpoint real local; avaliações probabilísticas e uso externo continuam bloqueados.

## Objetivo inicial

Avaliar uma promessa visível ao usuário:

> A aplicação responde somente com evidências autorizadas do condomínio selecionado, cita corretamente ou se abstém.

## Arquivos

- `fixtures/synthetic-corpus.yaml`: documentos e trechos fictícios, sem dados de clientes.
- `datasets/consulta-documental.yaml`: 20 casos iniciais de comportamento e regressão.
- `fixtures/synthetic-corpus.ts` e `datasets/consulta-documental.ts`: representação tipada usada pelo adapter.
- `baseline.json`: thresholds aprovados para a primeira execução local.
- `pnpm run evals:synthetic`: executa os 20 casos pelo endpoint real da aplicação e produz baseline agregada.
- `pnpm run pilot:synthetic`: piloto fechado com 100 casos sintéticos contra o endpoint real da aplicação.

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

## Adapters executáveis

O adapter atual:

1. configura usuários, memberships e documentos sintéticos em memória;
2. chama o mesmo endpoint HTTP da interface;
3. captura resposta, evidências, traces normalizados, custo e latência;
4. aplica asserções determinísticas, inclusive isolamento e feedback;
5. produz relatório comparável com a baseline.

O adapter do piloto sintético:

1. configura usuários, memberships e documentos fictícios gerados por IA;
2. chama o mesmo endpoint usado pela interface;
3. captura somente status, modo da resposta, duração e resultado agregado;
4. aplica asserções determinísticas de isolamento, grounding, abstenção e falha;
5. produz relatório sem conteúdo documental.

Uma evolução futura do adapter poderá:

1. restaurar o corpus sintético em ambiente isolado;
2. configurar usuários e memberships do caso;
3. chamar o mesmo caso de uso ou endpoint da interface;
4. capturar resposta, evidências, traces normalizados, custo e latência;
5. aplicar asserções determinísticas;
6. aplicar rubricas probabilísticas;
7. produzir relatório comparável com a baseline.

O comando canônico da suíte inicial é `pnpm run evals`; a projeção sintética
executável pelo endpoint real é `pnpm run evals:synthetic` e está no `README.md`,
no CI e no checklist de gates. O piloto de 100 casos usa `pnpm run pilot:synthetic`.
Qualquer evolução deve manter o corpus sintético e não introduzir dados reais.

## Crescimento do dataset

O corpus inicial possui 20 casos sintéticos. Nesta etapa, o piloto amplia a
execução para 100 casos sintéticos representativos:

- gerar casos fictícios representativos e revisá-los humanamente;
- registrar a limitação de não haver perguntas reais;
- cobrir documentos longos, escaneados e conflitantes;
- incluir erros reais encontrados durante testes;
- estratificar resultados por tarefa, risco, tipo de documento e qualidade do OCR.
