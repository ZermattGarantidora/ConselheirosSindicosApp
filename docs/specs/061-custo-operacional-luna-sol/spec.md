# Spec 061 — Custo operacional da conversa com Luna e Sol

**Status:** implementada e verificada localmente; sem liberação de produção  
**Responsável:** engenharia da Alvitra  
**Atualizado em:** 2026-11-03

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Mantém consultas documentais úteis com menor trabalho de geração desnecessário. |
| Público | §3 | Busca reduzir o custo recorrente para síndicos profissionais e moradores. |
| Proposta de valor | §§1, 5 e 6 | A escolha do modelo permanece interna à conversa, sem configuração exigida do síndico. |
| Prioridades do MVP | §7, Blocos 2, 6 e 7; §12 | Reutiliza conversa, processamento documental e análise já autorizados; escolhe o caminho econômico sem remover qualidade. |
| Segurança e confiança | §§8–10 | Preserva fontes atuais, isolamento, histórico durável, abstenção e validação humana. |
| Validação e métricas | §§12–13 | Mede modelo/tokens/cache por tentativa, distinguindo redução potencial de custo e economia faturada. |

### Limites respeitados

Sem ERP, tela de planos, precificação comercial, novo provedor, dependência, migração, cache de
respostas, resumo de histórico ou compartilhamento de dados documentais entre usuários/condomínios.
Não altera o texto aprovado do prompt v27, o limite de oito fontes, oito turnos/12.000 bytes ou
os cálculos determinísticos. O plano Codex continua exclusivo de demonstração pessoal local
sintética; a API mantém faturamento próprio e seus gates de dados. Não autoriza deploy ou piloto.

### Divergências da visão

Nenhuma. O usuário pediu incorporar os ajustes de custo ao app e vê-los no teste local. O gate
competitivo preserva a conversa e os blocos autorizados, reduz chamadas desnecessárias, mantém
o diferencial de evidência e usa regras pequenas reversíveis e testes no caminho real do servidor.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema e testa uma hipótese descritos no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Usar Luna high nas solicitações simples e Sol 6.1 low nas complexas, tanto no adaptador local
quanto no caminho da API, sem gerar duas respostas para escolher uma nem enfraquecer validações.

## 2. Promessa testada

> O teste local e a API escolhem o modelo conforme a tarefa e reutilizam o processamento existente,
> preservando as evidências e tornando o consumo observável.

## 3. Usuário primário

Síndico que conversa e consulta documentos autorizados; operador que verifica a experiência local.

## 4. Escopo

Seleção híbrida nas fábricas de ambiente, esforço por modelo, prefixo estável na Responses API,
preservação do comentário documental autorizado em Sol, configuração local e documentação.

## 5. Fora do escopo

Nova bateria completa, mudança do prompt, fine-tuning, tentativa Luna seguida de Sol, classificador
remoto, troca de fornecedor, síntese integral de lote pela API, alteração de OCR/embeddings,
memória global, remoção do histórico, preço de mensalidade e promessa de economia percentual.

## 6. Pré-condições

Specs 026, 042, 043, 051, 057–060; ADRs 0003, 0022, 0031, 0032, 0035–0037. Manter os gates de
dados e credenciais existentes. Documentação oficial consultada em 03/11/2026 para modelos e cache;
o ADR 0038 registra a adaptação do transporte sem alterar as instruções aprovadas.

## 7. Requisitos funcionais

### RQ-6101 — Um modelo antes da geração nos dois caminhos

As fábricas de ambiente OpenAI e Codex adotam `hybrid` como padrão. A política da Spec 051 permanece:
Luna para consultas simples; Sol para risco alto, conflitos, integridade factual, versão pendente,
análise financeira e síntese de fontes. Registrar modelo efetivo e motivo fechado. Não chamar IA
para escolher modelo, nem executar ambos. `*_ANSWER_ROUTING=single` conserva o modelo configurado;
valor desconhecido impede inicialização. Adaptadores diretos usados em evals continuam de modelo único.

### RQ-6102 — Esforço e orçamento explícitos

Em híbrido, Luna usa `high` e Sol 6.1 usa `low`, em ambos os transportes. Conservar os budgets de
saída existentes, o reparo limitado e a recusa de resposta incompleta. Não aumentar tokens ou
repetições silenciosamente. Configuração `single` mantém o comportamento anterior de esforço low.

### RQ-6103 — Cache somente de instruções estáveis na API

Para os modelos Luna/Sol suportados, separar o prefixo de instruções anterior a `TASK` dos
metadados dinâmicos e da pergunta/contexto/evidências. Marcar somente esse prefixo com breakpoint
explícito de cache de 30 minutos. O conteúdo textual e a versão v27 permanecem idênticos.
Perguntas, identificadores, permissões, trechos e histórico não entram no bloco cacheável.
Modelos configurados fora dessa dupla conservam o transporte anterior, sem parâmetros de cache
presumidamente suportados. Não criar cache de resposta/retrieval nem reutilizar evidência antiga.

### RQ-6104 — Reutilização e limites existentes

Manter o processamento de OCR/texto/embeddings por documento, a recuperação pertinente, cálculos
locais, oito fontes e memória recente autorizada. O histórico completo continua salvo e consultável
conforme a Spec 058; não reenviar todo o histórico a cada pergunta. Essa fatia não reprocessa
documentos nem adiciona cálculo pelo modelo para substituir o método determinístico.

### RQ-6105 — Teste local pronto e reversível

Configurar explicitamente o ambiente local existente para híbrido sem ler/copiar credenciais.
Documentar reinício da API, comandos locais, prioridade exclusiva do Codex e reversão para `single`.
Não mudar chaves, autenticação, banco ou serviço público. Consumo de API e de plano são distintos.

### RQ-6106 — Preservar o comentário do lote no modo local

O modo híbrido não pode desativar o comentário do lote da Spec 057. Esse fluxo continua usando
exclusivamente Codex/ChatGPT e Sol 6.1 low, uma geração com os limites e revalidações existentes.
Em modo single com modelo diferente de Sol, o fluxo permanece indisponível. Não encaminhar o
payload integral à API ou à Luna nem ativar fallback novo.

## 8. Contratos

`AnswerGatewayInput/Result`, fontes e payload público permanecem. Novos parâmetros operacionais:
`OPENAI_ANSWER_ROUTING=hybrid|single` e opções internas de esforço/cache. O cache é otimização do
provedor sobre instruções genéricas, não memória documental compartilhada. Tokens/cache/latência
continuam registrados; custo legado em BRL não representa fatura ou franquia.

## 9. Requisitos não funcionais

Sem novas chamadas para roteamento, segredos em logs, dependências, serviços ou schema. Testes
de transporte com rede simulada, E2E por endpoints reais e gates/cobertura >=80% nos quatro
indicadores. Não afirmar economia real sem consumo faturado nem transferir acurácia do Codex à API.

## 10. Critérios de sucesso

Os dois caminhos selecionam o mesmo modelo/esforço para entradas equivalentes, com uma geração;
falhas não contornam o validador. A API deixa somente instruções genéricas no prefixo cacheável.
O modo local está configurado, a síntese Sol continua disponível, documentação e gates conferem.
Qualidade semântica e economia em produção permanecem hipóteses a medir com tráfego representativo.

## 11. Questões em aberto

Taxa de cache, esforço high sob budgets curtos, qualidade/custo do tráfego híbrido e mensalidade
requerem medição própria. Esta implementação não promete reproduzir as notas individuais da
Spec 060, nem certifica piso semântico, faturamento ou liberação de produção.

## Gate para mudar o status

Alinhamento, aceitação, rastreabilidade, revisão do delta e gates aplicáveis executados. Resultados
devem distinguir testes simulados de inferência real, registrar limitações e não autorizar merge.
