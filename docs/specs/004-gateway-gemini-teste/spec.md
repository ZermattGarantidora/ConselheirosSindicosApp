# Spec 004 — Gateway Gemini para testes locais

**Status:** rascunho para revisão
**Responsável:** produto e engenharia
**Atualizado em:** 2026-09-14

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§1–3 | Testa se uma IA transforma evidência documental em resposta útil, sem virar chat genérico. |
| Público | §2 | Atende síndicos que precisam consultar convenções e regimentos com segurança. |
| Proposta de valor | §§5 e 10 | Preserva fontes verificáveis, isolamento por condomínio e resposta natural. |
| Prioridades do MVP | §§11, 14 e 21 | Implementa somente redação sobre evidência já recuperada. |
| Segurança e confiança | §§12 e 13 | Mantém validação de citações, abstenção e encaminhamento de alto risco. |
| Validação e métricas | §§15–17 | Permite medir qualidade, latência e custo por resposta aprovada com corpus sintético. |

### Limites respeitados

- Busca web, ferramentas da Gemini, memória remota, automação externa, prospecção e envio automático permanecem fora do escopo, conforme §§12, 14 e 21.
- A fatia não substitui autenticação, upload, controle de versão, recuperação isolada ou validação humana previstos no MVP.
- A faixa gratuita é limitada a corpus sintético; nenhum dado real de cliente entra neste teste.

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

Permitir que o ambiente local use a Gemini API para redigir respostas documentais a partir de evidências já recuperadas e autorizadas.

## 2. Promessa testada

> Uma pergunta sobre documentos sintéticos gera uma resposta legível que só é exibida se suas fontes puderem ser verificadas.

## 3. Usuário primário

Síndico em ambiente de demonstração, avaliando uma consulta documental sem usar dados reais.

## 4. Escopo

- Gateway Gemini selecionado quando `GEMINI_API_KEY` estiver definida no processo do servidor ou no arquivo local `.env.local`, ignorado pelo Git.
- Chamada REST somente pelo backend, com `store: false` e limite de saída configurado. Consultas documentais usam saída JSON estruturada; orientações condominiais sem evidência usam texto conversacional envolvido no contrato seguro local, sem fontes ou afirmações documentais.
- Prompt limitado à pergunta e evidências recuperadas para o condomínio autorizado.
- Validação existente de citações, risco e conflito continua obrigatória.
- Sem chave, o gateway sintético local continua disponível.

## 5. Fora do escopo

- Chave no navegador, Git, logs ou fixtures.
- Documento completo, contexto de outro condomínio ou histórico de conversa para o provedor.
- Busca, ferramentas, memória remota ou ações pela Gemini.
- Corpus real na faixa gratuita.

## 6. Pré-condições

- A pergunta tem contexto autorizado e evidências suficientes, conforme Spec 001.
- `GEMINI_API_KEY` é definida somente no ambiente do processo ou em `.env.local`, que é carregado apenas pelo servidor local e não entra no repositório.

## 7. Requisitos funcionais

### RQ-401 — Seleção explícita do provedor

O servidor usa Gemini somente quando `GEMINI_API_KEY` não estiver vazia. Em desenvolvimento, `pnpm run dev:api` também carrega `.env.local`, ignorado pelo Git. `GEMINI_MODEL` é opcional e o padrão documentado é `gemini-flash-lite-latest`. A ausência de chave não impede o fluxo local.

### RQ-402 — Limite de dados e isolamento

O gateway recebe exclusivamente `question` e `evidence` já retornadas pelo retrieval autorizado. A API não recebe contexto fora da seleção.

### RQ-403 — Resposta verificável e conversa limitada

A saída deve conter resposta, modo, citações, ressalvas, próximo passo, especialista e afirmações. Uma citação só é aceita se corresponder a `evidenceId`, documento, versão, página, trecho e offsets da evidência recuperada.

Quando não há evidência, a Cora pode orientar sobre a rotina condominial em linguagem conversacional. Esse caminho não pode trazer citações, afirmações de regras locais ou fatos documentais; a interface não apresenta fontes vazias como se uma busca tivesse ocorrido.

### RQ-404 — Falha segura

Falha de rede, resposta incompleta, JSON inválido, excedente de limite ou validação reprovada produz resposta segura de falha, nunca afirmação sem fonte.

### RQ-405 — Telemetria mínima

Persistir somente modelo, contagem de tokens, latência, hash de entrada/saída e custo estimado quando informado; nunca chave, prompt ou conteúdo documental.

## 8. Contratos

`GEMINI_API_KEY` e `GEMINI_MODEL` são entradas do processo do servidor. O gateway devolve o contrato `GeneratedAnswer` já existente. O endpoint público permanece inalterado; erros do gateway se tornam `answerMode: failed` pelo caso de uso.

## 9. Requisitos não funcionais

- Timeout padrão de 30 segundos.
- Nenhuma chamada externa nos testes automatizados.
- A chave não aparece em telemetria ou resposta HTTP.

## 10. Critérios de sucesso

- Toda saída Gemini aceita passa pela validação de citações.
- Testes comprovam seleção por ambiente, ausência de envio de chave ao cliente e falha fechada.
- A telemetria permite medir custo e latência por resposta, contribuindo para as métricas de §§15–17 do briefing.

## 11. Questões em aberto

- A escolha definitiva de modelo e orçamento por pergunta depende dos evals com pelo menos 100 casos previstos no §15 do briefing.

## Gate para mudar o status

Esta spec não pode sair de `rascunho para revisão` enquanto o alinhamento, critérios de aceitação, rastreabilidade e testes estiverem pendentes.
