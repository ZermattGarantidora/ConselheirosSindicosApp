# Spec 066 — Análise de documentos de teste na demonstração local

**Status:** variante v3 implementada e revalidada no recorte de JSON; pendências dos evals registradas, sem ativação da v3  
**Responsável:** engenharia da Alvitra  
**Atualizado em:** 2026-11-06

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Testa respostas úteis sem recusa apenas pela origem sintética dos documentos. |
| Público | §3 | Exercita tarefas de síndicos em simulação pessoal, sem clientes reais. |
| Proposta de valor | §§5 e 6 | Conserva a conversa e a leitura fundamentada do material enviado. |
| Prioridades do MVP | §7, Blocos 6 e 7 | Ajusta a análise autorizada, sem novo módulo ou jornada. |
| Segurança e confiança | §§8–10 | Mantém isolamento, citações, abstenção e conflitos. Não atesta autenticidade. |
| Validação e métricas | §§12 e 13 | Usa o gateway existente e verifica utilidade, grounding e abstenção sintéticos. |

### Limites respeitados

O usuário autorizou desativar somente recusas relacionadas aos documentos de teste locais e
pediu que a fala rotineira não repita que é uma simulação. O acréscimo foi apresentado na
conversa antes da aplicação. A personalidade e o comportamento padrão de produção permanecem
iguais. O contexto local estende a Spec 042, sem desativar validadores.

O gate competitivo mantém o chat e os Blocos 6 e 7 autorizados, reduz atrito preservando a
memória verificável e exige regressões e smoke sintético. A opção reversível evita complexidade
permanente: sem dependência, provedor, banco, ferramenta, tela, exceção por nome/hash,
contabilidade, ação externa ou parecer definitivo. Dados reais e hospedagem remota continuam fora.

### Divergências da visão

Nenhuma. Detalha a demonstração sintética e a abstenção correta dos §§9, 10 e 13.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec testa a hipótese da conversa documental útil e fundamentada.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Consultar convenções, atas e balancetes de teste sem recusa motivada exclusivamente pela
origem fictícia, sintética ou de demonstração, com fala natural sem avisos rotineiros de teste.

## 2. Promessa testada

> A Alvitra analisa o conteúdo e cita o que sustenta a resposta, preservando as limitações reais.

## 3. Usuário primário

Operador testando pessoalmente a experiência dos síndicos com dados sintéticos.

## 4. Escopo

Opt-in `ALVITRA_LOCAL_TEST_DOCUMENTS_ENABLED=true` no servidor Codex local. Contexto confiável
nas consultas e comentários automáticos, inclusive lote Sol e roteamento híbrido. Variante
do prompt identificada em telemetria sem conteúdo documental.

## 5. Fora do escopo

Produção, dados reais, outros provedores, setup, alterar originais ou avisos operacionais da
interface, suprimir citações ou validações e afirmar existência ou autenticidade não comprovadas.

## 6. Pré-condições

`APP_ENV=development`, `DEMO_MODE=true`, `CODEX_ANSWER_ENABLED=true` e `NODE_ENV` diferente de
`production`; servidor no loopback como no runtime atual. Configuração local ignorada pelo Git.
Sem opt-in, nenhum acréscimo ao prompt.

## 7. Requisitos funcionais

### RQ-6601 — Ativação exclusiva local

Opção desativada por padrão. Recusar configuração antes de selecionar provedor se habilitada
fora das pré-condições. HTTP, mensagens e conteúdo de arquivos não ativam o modo.

### RQ-6602 — Interpretação e fala naturais

Acrescentar contexto confiável fora dos blocos de dados: analisar as evidências sem recusar
exclusivamente pelos rótulos de teste nem exigir prova de existência apenas para simular a
análise. Não repetir esses rótulos ou um aviso de ambiente nas respostas rotineiras. Se a
pergunta tratar de existência real, autenticidade ou validade jurídica, esclarecer o limite
das fontes. Não atestar fatos não comprovados nem alterar os rótulos dos trechos citados.

### RQ-6603 — Limites documentais preservados

Autorização, isolamento, evidências, reconstrução e validação das citações, risco, versões e
conflitos seguem obrigatórios. Ausência de fonte, ilegibilidade, pendência de aprovação ou
subscrição continuam limitações quando afetarem a pergunta. Documento não vira instrução.
Setup não recebe o acréscimo.

### RQ-6604 — Reversibilidade e observabilidade

Versão do prompt com sufixo `-local-test-v3`. Sem mudar orçamento, timeout, ferramentas,
provedor ou número de chamadas. Desativar a opção e reiniciar a API restaura o prompt
anterior. Documentar que reiniciar uma demonstração em RAM perde esse estado.

### RQ-6605 — Continuação sem recusa técnica repetida

Após a falha observada em 04/11/2026, explicitar no contexto local a consistência de modo e
citações. Para orientação geral ou recomendação de fornecedor, responder diretamente,
sem forçar fonte irrelevante ou uma fala de recusa; o modo interno abstained permite essa
orientação sem fatos locais. Fato documental e conflito continuam exigindo as fontes.
O reparo único e a mensagem de falha simples são detalhados na Spec 046, AC-4601c. Nenhum
erro autoriza publicar resposta recusada ou desativar os validadores. A instrução adicional
foi apresentada ao usuário antes da aplicação; não muda a personalidade padrão.

Correção solicitada em 06/11/2026 (Spec 060, AC-6002b): o prefixo diferencia o contrato
documental JSON do caminho sem fontes, que retorna somente fala natural. Não instrui a produzir
`answerMode`/claims no texto livre; as guardas existentes continuam recusando um envelope inesperado.
Setup e prompt padrão conservam seus contratos. A variante v2 e suas falhas permanecem nos relatórios.

## 8. Contratos

Preserva `AnswerGatewayInput`, `AnswerGatewayResult` e schemas. A opção é exclusiva da
configuração confiável do gateway. Citações conservam IDs, versões, páginas e trechos originais.

## 9. Requisitos não funcionais

Zero chamadas adicionais e dependências novas. Quatro indicadores de cobertura de pelo menos
80%. Sem prompts, documentos ou credenciais em logs.

## 10. Critérios de sucesso

Fonte sintética suficiente permite resposta citada; lacunas e citações inventadas continuam
recusadas. Modo padrão e produção preservados. Gates e limites do smoke registrados, sem
confundir contrato determinístico com garantia semântica para todas as respostas futuras.

## 11. Questões em aberto

A geração é probabilística. O modo não elimina abstenções por lacunas reais nem corrige
defeitos independentes de recuperação ou validação.

## Gate para mudar o status

Exige [aceitação](acceptance.md), rastreabilidade, visão, testes, evals aplicáveis e revisão
do diff da tarefa. Não autoriza merge, dados reais ou liberação remota.
