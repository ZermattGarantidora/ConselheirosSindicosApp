# Spec 075 — Leitura documental densa e verificável

**Status:** implementada; rodada exploratória concluída, sem liberação de produto  
**Responsável:** engenharia e qualidade da Alvitra  
**Atualizado em:** 2026-11-23

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Mede localização, interpretação e cruzamento de informações em documentos densos. |
| Público | §3 | Usa cadernos fictícios da rotina de síndicos profissionais e moradores. |
| Proposta de valor | §§1, 5 e 6 | Respostas úteis no chat com base documental verificável e limites explícitos. |
| Prioridades do MVP | §7, Blocos 6 e 7; §§8 e 12 | Fortalece envio, extração, recuperação e leitura já autorizados, sem novo módulo. |
| Segurança e confiança | §§8–10 | Verifica fontes, versões, abstenção, isolamento e resistência a instrução documental. |
| Validação e métricas | §13 | Separa completude da extração, recuperação, cobertura factual, qualidade, tempo e custo. |

### Limites respeitados

Somente corpus sintético, sem dados reais, novo provedor, dependência, banco, fine-tuning,
mudança de prompt ou policy do produto. Mantém limites de 500 páginas/25 MB e oito fontes.
Não promete que um documento processado foi integralmente considerado em toda resposta.
Não amplia contabilidade, parecer jurídico, ações externas ou blocos futuros.

### Divergências da visão

Nenhuma. O usuário solicitou testes mais difíceis de leitura como foco de excelência da
Alvitra. O gate competitivo mantém o chat e capacidades autorizadas; mede omissões e fontes,
preserva isolamento e abstenção e reutiliza corpus/replay/extração locais. O ganho sobre uma
IA genérica é demonstrável por rastreabilidade e critérios independentes por informação.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec testa a hipótese de memória documental útil e verificável.
- [x] Público e proposta de valor permanecem coerentes.
- [x] Prioridades, sequenciamento e exclusões foram respeitados.
- [x] Segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Expor em qual etapa a Alvitra perde informação de documentos densos e produzir casos
repetíveis de regressão, antes de otimizar prompts ou selecionar configuração.

## 2. Promessa testada

> Encontra o detalhe certo, cruza as fontes necessárias e explica o que os documentos não provam.

## 3. Usuário primário

Síndico que consulta cadernos financeiros, convenções, atas e contratos extensos e cheios de detalhes.

## 4. Escopo

Cinco PDFs textuais densos de 24 páginas: financeiro, convenção aprovada, minuta conflitante,
atas e contratos. Pelo menos 6.000 registros distintos e 3.500 caracteres não brancos por página,
com tabelas, referências cruzadas e notas finais. Trinta e duas perguntas pré-fixadas cobrem
detalhe, associação de colunas, exceção, soma, conflito, ausência e cruzamento de fontes.

## 5. Fora do escopo

OCR de imagem/manuscrito, promessa de leitura visual de gráficos, documento real, treinamento
de pesos, novo pipeline de produção ou certificação especializada. Esta rodada estabelece
baseline com Sol 6.1 low, sem trocar a configuração do chat.

## 6. Pré-condições

Specs 013, 041, 042, 063, 067 e 074; ADRs 0003, 0031, 0038 e 0040. CLI local já autorizado e
sem API paga alternativa. Corpus e gabaritos fechados antes da extração e da inferência.

## 7. Requisitos funcionais

### RQ-7501 — Densidade útil

Registros possuem IDs únicos, valores, datas, situações e vínculos próprios; não usar páginas
de enchimento repetidas. Conservar PDF original, texto esperado por página, ledger e oracle
separados do parser/modelo. Validar contagem, densidade, margens e renderização amostral.

### RQ-7502 — Extração e recuperação separadas

Enviar o PDF real ao endpoint, conferir original byte a byte e texto integral de cada página.
Medir separadamente se cada trecho necessário chegou ao modelo. Perguntas não fornecem páginas
nem respostas. Cada caso conserva o conjunto de fontes autorizado, inclusive versões disputadas.

### RQ-7503 — Perguntas exigentes

Cobrir início/meio/fim, registro parecido com outro, exceção em nota final, valores de linhas
diferentes, total de subconjunto, obrigação versus proposta, vigência, ausência e cruzamento
entre ata, contrato e lançamento. Informação ausente exige limitação; nenhuma acusação de
fraude ou aprovação/execução presumida é aceita. Documento continua dado não confiável.

### RQ-7504 — Execução congelada

`pnpm run evals:dense-documents` prepara o plano sem IA; `--prepare --run-key=<id>` valida e
exporta o corpus sem IA; `--execute --run-key=<id>` executa Sol local explicitamente. Snapshot
de código/corpus/gabaritos, checkpoints íntegros, uma geração e apenas o reparo já existente.
Não repetir resultado concluído para melhorar nota nem recorrer a outro provedor.

### RQ-7505 — Relatório honesto por etapa

Exibir páginas/linhas/caracteres/registros, completude de extração, fontes necessárias
recuperadas, fatos presentes, erros mecânicos, respostas, referências, tempo e consumo por
tentativa. Checks de presença não são nota semântica. Auditar tecnicamente cada resposta real
com justificativa e hash; revisão especializada permanece pendente. Falha vira caso mantido
na suíte; correção posterior exige nova rodada identificada sem alterar o gabarito anterior.

### RQ-7506 — Segurança e custo

Somente sintéticos, sem gabarito no prompt, sem fonte de outro condomínio, sem executar
instrução do documento e sem aumentar limites de entrada/saída. Interromper após falhas
repetidas de infraestrutura. Consumo CLI é observado, custo equivalente não é fatura e
não inclui escrita de cache ausente no CLI, conforme Spec 074.

## 8. Contratos

Reutiliza processamento, recuperação, gateways, validação e eventos atuais. Artefatos privados
em `.local/dense-documents/<id>/`; PDFs de inspeção em `output/pdf/dense-documents-<id>/`.
Nenhum schema ou comportamento de produção novo. O helper de preparação aceita contagem de
páginas numérica, mantendo os cenários antigos com uma, duas e oito páginas.

## 9. Requisitos não funcionais

Zero mistura entre condomínios; geração sem ferramentas e sem fallback pago. Comando padrão
sem inferência; nenhuma credencial no snapshot. Testes determinísticos do oracle e avaliação
detectam remoção de fonte, valor trocado e ausência de citação. Gates aplicáveis e cobertura
unitária >=80% nos quatro indicadores; nenhuma exclusão de produção.

## 10. Critérios de sucesso

Corpus denso íntegro, gabarito independente preservado e 32 casos executados ou bloqueios
explícitos. Resultado identifica onde faltou informação, sem chamar preparação de acerto de IA.
Nenhuma seleção de produção é inferida de uma rodada pequena ou de média que esconda falhas.

## 11. Questões em aberto

PDFs digitalizados, tabelas com leitura visual complexa, variação entre rodadas e validação de
especialistas exigem baterias posteriores. Melhorar pesos ou prompt não é automático por rodar evals.

## Gate para mudar o status

Alinhamento, aceitação, rastreabilidade, gates, revisão e resultados verificáveis. Falhas de
qualidade descobertas permanecem visíveis e bloqueiam qualquer alegação de liberação.
