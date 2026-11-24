# Spec 059 — Recuperação, completude e revalidação Luna/Sol

**Status:** implementação e avaliação técnica sintética concluídas; pendências de qualidade abertas  
**Responsável:** desenvolvimento Alvitra  
**Atualizado em:** 2026-10-31

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2, 12 | Reduz repetição e respostas incompletas sobre documentos dispersos, verificando continuidade na mesma conversa. |
| Público | §4 | Mantém o síndico como decisor humano das verificações e negociações. |
| Proposta de valor | §§5–6 | Recupera o trecho pertinente e explicita a diferença entre fato, proposta e evidência ausente. |
| Prioridades do MVP | §7, Blocos 3, 5 e 6 | Detalha recuperação, resposta citada e avaliação, com histórico da Spec 058 como pré-condição. |
| Segurança e confiança | §§9–10 | Preserva isolamento, evidência atual, abstenção, conflitos e validação humana. |
| Validação e métricas | §§12–14 | Repete corpus sintético congelado e audita respostas completas, custos e falhas. |

### Limites respeitados

Sem memória global, ampliação da janela, execução de negociação, serviço externo novo, escolha definitiva de fornecedor ou piloto com dados reais. O sequenciamento de `docs/product/estrategia-competitiva.md` permite corrigir confiança e continuidade do chat atual; não antecipa ERP, automação ou expansão comercial.

### Divergências da visão

Nenhuma.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Concluir os defeitos remanescentes da Spec 056 e repetir a bateria completa após validar a durabilidade da Spec 058, conforme confirmação explícita do usuário.

## 2. Promessa testada

> A resposta usa as páginas pertinentes disponíveis, conserva as distinções documentais e explicita o que falta verificar.

## 3. Usuário primário

Síndico que confere contratos, balancetes, atas e cobranças do condomínio autorizado.

## 4. Escopo

Recuperação de acordo por unidade e de preço/vigência por versão contratual; sínteses sobre negociação, encargos, aprovação e titularidade; classificação do resultado financeiro; comparação técnica congelada Luna high/Sol 6.1 low.

## 5. Fora do escopo

Alterar oráculos para favorecer respostas, aumentar o orçamento de oito fontes, usar conhecimento externo como prova local ou apresentar a avaliação técnica como validação jurídica/contábil profissional.

## 6. Pré-condições

Specs 054–056 e 058, ADRs 0031–0037. Gates da implementação e provas sintéticas de reinício/restauração concluídos antes da bateria. Autenticação CLI existente, sem fallback pago por API.

## 7. Requisitos funcionais

### RQ-5901 — Cobertura de páginas pertinentes

Dentro dos candidatos autorizados e ranqueados, reservar evidência do acordo da unidade ativa e dos campos comparados de cada versão. Correção de unidade elimina a referência superada, salvo comparação explícita. Fonte de baixa qualidade, removida, fora de vigência ou de outro condomínio não pode ser promovida para preencher lacuna.

### RQ-5902 — Completude sem equiparações indevidas

Síntese distingue preço confirmado/proposto, vencimento, aprovação, titularidade, acordo e encargos. Negociação não equivale a autorização ou quitação. Resultado total não se torna resultado ordinário ou disponibilidade livre. Ausência de trecho recuperado não equivale a inexistência do documento.

### RQ-5903 — Comparação reproduzível

Uma rodada de 280 cenários/1.010 turnos por modelo, memória ligada, mesmo código/corpus/prompts e oito fontes, Luna `high` e Sol 6.1 `low`. Preservar 80 alvos de auditoria, exclusão ambígua 54 e denominador comparável 79. Registrar falhas, tentativas, hashes, custos conhecidos/desconhecidos e esforço por condição. Comparação histórica com Luna low deve explicitar a mudança de esforço e código.

## 8. Contratos

Os planos de completude descrevem categorias e IDs de evidência, nunca números ou gabaritos inventados. Validação mantém rastreabilidade e retentativa limitada. A bateria usa checkpoint e snapshot congelado; mudanças posteriores exigem outra identificação de rodada.

## 9. Requisitos não funcionais

Zero vazamento entre usuários/condomínios, testes de regressão por defeito, cobertura global mínima de 80% nos quatro indicadores e ausência de conteúdo real nos evals. Nenhum resultado de infraestrutura vira acerto semântico.

## 10. Critérios de sucesso

Regressões determinísticas e gates aplicáveis aprovados; bateria íntegra ou falhas explicitamente classificadas; 79 alvos/modelo auditados com resposta e fontes. Melhorias quantitativas são resultado observado, não condição para alterar rótulos.

## 11. Questões em aberto

O [relatório de 31/10](results-2026-10-31.md) registra a bateria integral de 560 cenários/2.020 turnos e a auditoria de 79 posições comparáveis por modelo: Luna high 65/79 (82,3%), com 12 parciais e duas falhas; Sol 6.1 low 76/79 (96,2%), com três parciais. São notas técnicas da amostra, não acurácia global ou aprovação profissional.

Permanecem abertos: variante de envelope JSON na fala do Luna; perda de página de acordo em síntese das duas unidades, observada nos dois modelos; omissões e recusas em fechamentos; pauta incompleta após perda de contexto; e três respostas `failed` por `codex_tool_disallowed` fora da amostra. Os eventos brutos rejeitados não foram preservados, portanto a causa desse código não está determinada. Não houve nova execução para substituir respostas ruins. Validação profissional, revisão independente e operação de produção continuam gates distintos.

## Gate para mudar o status

Aceitação, rastreabilidade, gates e relatório da rodada devem estar concluídos. Falhas pendentes permanecem identificadas; nenhum merge é autorizado por esta spec.
