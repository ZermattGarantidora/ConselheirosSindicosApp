# Spec 032 — Integração da análise documental na conversa

**Status:** implementação sintética verificada; avaliação especializada pendente
**Responsável:** produto e engenharia
**Atualizado em:** 2026-10-19

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Une a leitura e a comparação de documentos para reduzir releitura manual. |
| Público e proposta | §§3 e 5 | Oferece ao síndico valores e fontes conferíveis na própria conversa. |
| Experiência e prioridade | §§6 e 7, Bloco 7 | Exibe um relatório calculado junto ao turno, sem tela paralela. |
| Memória e segurança | §§8–10 | Lê páginas persistidas sob autorização e RLS; não armazena cópia desprotegida. |
| Validação | §§12 e 13 | Calcula diferenças determinísticas e verifica o fluxo com dados sintéticos. |

### Limites respeitados

- Não executa auditoria, contabilidade completa, parecer profissional nem ação externa.
- Não adiciona provedor, dependência ou formato de arquivo. Não muda o system prompt aprovado.
- O relatório é dado calculado da interface, distinto da fala gerada da Alvitra; não substitui a geração contextual.
- Revisão semântica especializada e liberação de dados reais permanecem gates próprios.

### Divergências da visão

Nenhuma. A conclusão e integração das quatro frentes foi solicitada explicitamente pelo usuário.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema e testa a hipótese documental do briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Conectar páginas autorizadas, extração estruturada, comparação financeira e análise normativa a um relatório verificável no turno da conversa.

## 2. Promessa testada

> Ao pedir análise de documentos, vejo o que foi efetivamente calculado ou localizado e abro suas fontes.

## 3. Usuário primário

Síndico profissional ou morador consultando os documentos do condomínio ativo.

## 4. Escopo

- Ler páginas completas de versões ativas, prontas e confirmadas, em memória ou PostgreSQL.
- Derivar estruturas em memória a partir do texto já persistido; sem repetir PDF/OCR e sem nova tabela.
- Comparar dois meses explícitos no pedido; ausência de período, duplicidade e extração incerta produzem limite explícito.
- Adaptar rótulos normativos explícitos, sem inferir validade ou prevalência.
- Exibir relatório, cálculos e fontes na conversa, separado da resposta gerada.

## 5. Fora do escopo

Reconhecimento universal de tabelas, persistência adicional dos derivados, novos prompts, revisão profissional ou piloto real.

## 6. Pré-condições

Autorização vigente e permissão documental; páginas elegíveis e com fonte completa.

## 7. Requisitos funcionais

### RQ-3201 — Leitura completa escopada

O reader recebe contexto autorizado, aplica RLS e filtros de elegibilidade antes de retornar páginas. Limites de 500 páginas e dois milhões de caracteres interrompem a análise sem apresentar um subconjunto como completo. Documentos removidos e versões pendentes não participam.

### RQ-3202 — Relatório financeiro e normativo

O relatório financeiro usa os extratores e comparadores das Specs 028/029. Cada variação inclui os dois valores e fontes, valores exatos em centavos serializados e percentual somente quando definido. Rótulos equivalentes limitam-se à normalização conservadora. O relatório normativo consome a Spec 030 e preserva condições, exceções e limitações. Falha de análise não invalida uma resposta de conversa já gerada; produz relatório indisponível sem expor conteúdo de erro.

### RQ-3203 — Apresentação e ciclo de vida

O relatório operacional acompanha a resposta HTTP do turno e é exibido no chat. Não é fala pré-programada da assistente nem fica limitado às 90 palavras do prompt. Na restauração do histórico, relatórios calculados não persistidos podem estar ausentes; as respostas e fontes auditáveis existentes permanecem. Nenhum cache ou derivado novo sobrevive à remoção do documento.

### RQ-3204 — Conferência independente de modelo

Antes de publicar um relatório calculado, código local verifica que cada citação corresponde
ao condomínio autorizado, documento, versão, título, página e trecho literal nos offsets em
code points da página lida. Versão ou página duplicada/ambígua não é escolhida silenciosamente.
Falha invalida o relatório integralmente; nenhum modelo decide se uma referência é válida.
Isso comprova a localização do trecho, não sua sustentação semântica nem a fidelidade do OCR.
O cálculo e a conferência funcionam mesmo se a geração da conversa falhar, sem nova chamada
de IA ou envio externo de documentos. A fala contextual permanece separada do relatório.

O relatório também aplica RQ-3504 antes de extrair campos: uma fonte com instrução hostil
invalida a conferência integralmente, sem ecoar o conteúdo na degradação segura.

O alinhamento adicional aplica briefing §§8–10 e §12 e o gate competitivo: mantém o chat e
o Bloco 7 autorizado, reforça provas e abstenção além de um chat genérico, mede localização
literal e resultados sem rede e usa apenas um validador local reversível, sem serviço novo.

## 8. Contratos

`DocumentAnalysisReader` fornece documentos e páginas elegíveis; `analyzeDocumentRequest` devolve relatório JSON com status, linhas e fontes verificáveis. `documentAnalysis` é um campo opcional da resposta do endpoint de perguntas, sem alterar o contrato persistido de resposta ou prompt.

## 9. Requisitos não funcionais

Sem chamada adicional de IA, sem log documental, zero mistura entre condomínios, cálculo monetário em inteiros e limites explícitos de trabalho.

## 10. Critérios de sucesso

Fluxo sintético desde páginas processadas até relatório HTTP/UI com fontes; exclusão, autorização, limite e falha segura testados. Gates locais e cobertura mínima nos quatro indicadores aprovados. Evals distinguem execução de revisão humana pendente.

## 11. Questões em aberto

Revisão humana especializada e validação probabilística do provedor antes de qualquer alegação de excelência ou liberação do piloto.

## Gate para mudar o status

Exige aceitação, rastreabilidade, testes do fluxo e gates locais. Não autoriza merge sem revisão integral nem piloto real.
