# Spec 037 — Confirmação do condomínio identificado no documento

**Status:** implementada localmente; integração e revisão pendentes  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-11-03

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| Problema e hipótese   | §§2 e 4            | Evita fundamentar uma resposta local em documento anexado ao contexto errado.        |
| Público               | §3                 | Ajuda síndicos que administram um ou vários condomínios.                             |
| Proposta de valor     | §§1, 5 e 6.5–6.6   | A Alvitra conversa para pedir confirmação contextual durante o envio no chat.        |
| Prioridades do MVP    | §7, Blocos 4 e 6   | Detalha o envio documental já autorizado, sem novo módulo.                           |
| Segurança e confiança | §§8–10             | Mantém tenant autorizado e impede consulta do anexo divergente antes da confirmação. |
| Validação e métricas  | §13                | Testa evidência local correta, redução de enganos e zero acesso cruzado.             |

### Limites respeitados

- Sem mudança automática de condomínio, cadastro pelo arquivo, ação externa ou novo provedor.
- Identificação determinística limitada a nomes explícitos no título do arquivo e na identificação inicial das páginas extraídas; não promete reconhecer nomes implícitos ou texto ilegível.
- Extração e OCR existentes são reutilizados; nenhuma instrução do arquivo decide autorização.
- Histórico de documentos já processados não é reclassificado retroativamente.

### Divergências da visão

Nenhuma. Solicitação explícita do usuário em 2026-10-20 detalha o envio autorizado.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Ao receber um arquivo com nome explícito diferente do condomínio selecionado, mostrar os nomes e perguntar se o documento pertence ao contexto atual antes de usá-lo em respostas.

## 2. Promessa testada

> Um anexo que identifica outro condomínio só fundamenta consultas depois de uma confirmação explícita para sua versão e contexto.

## 3. Usuário primário

Síndico morador ou profissional enviando documentação pelo chat.

## 4. Escopo

- Conferência de nomes no pipeline assíncrono, após a extração já existente.
- Fala contextual gerada da Alvitra, com nomes, confirmação e opção de cancelar o uso.
- Resultado de leitura, confirmação e cancelamento comunicado pela Alvitra na conversa.
- A Spec 045 acrescenta confirmação de recebimento e raio-X local automático, inclusive após autorizar o uso de um anexo sem pergunta.
- Pendência persistente por versão; retomada pelo catálogo autorizado de documentos sobre o chat.

## 5. Fora do escopo

- Inferência semântica de propriedade, validação de CNPJ, realocação entre tenants e revisão retroativa.
- Alteração do system prompt, autenticação, vigência documental ou qualidade de OCR.

## 6. Pré-condições

- Identidade vigente e permissão de upload para o condomínio selecionado.
- Nome esperado resolvido no servidor, nunca aceito como autorização enviada pelo cliente.

## 7. Requisitos funcionais

### RQ-3701 — Identificação explícita e prudente

Comparar nomes explícitos no título e no cabeçalho/identificação inicial do texto extraído, incluindo OCR disponível. Ignorar caixa, acentos, pontuação e prefixos genéricos equivalentes. No título do arquivo, ignorar o sufixo genérico “Preenchida” quando ele aparece depois do nome explícito do condomínio. Não tratar uma menção incidental no corpo como identificação. Sem nome legível, manter o processamento normal sem afirmar que o pertencimento foi verificado. Sinais contraditórios entre arquivo e conteúdo também exigem confirmação.

Por correção solicitada em 03/11/2026, separar do nome o período explícito anexado ao cabeçalho:
mês por extenso seguido de ano, inclusive “Outubro de 2026”, ou mês/ano numérico. Não retirar
qualificadores do nome, como “Norte” e “II”, nem palavras de mês que integrem um nome sem período
completo. Não usar comparação por prefixo ou similaridade para decidir equivalência.

### RQ-3702 — Pendência antes de consulta

Nome divergente gera `needs_review` e metadados com nome esperado, nomes encontrados e procedência. Original e extração permanecem privados no contexto de envio; retrieval e análise não podem usá-los enquanto houver pendência. Recepção continua respondendo 202 sem esperar a leitura. A pergunta junto do anexo fica preservada e não é consultada antes da confirmação.

### RQ-3703 — Confirmação explícita e cancelamento

O catálogo leva à conversa. A Alvitra gera uma pergunta sobre o arquivo e os dois nomes a partir
do estado autorizado no servidor, explicando que autorizar o uso preserva o nome cadastrado.
A pessoa pode confirmar o uso ou cancelar, mantendo o arquivo bloqueado e podendo trocar o
contexto e reenviar. A decisão é digitada no compositor normal, sem botões de sim/não, caixa de
perguntas ou formulário. Essa correção sucede as respostas sugeridas da versão anterior. Uma
aceitação ou recusa inequívoca responde à pendência atual; dúvida, pergunta ou texto ambíguo não
autoriza o uso. A mensagem original da decisão é registrada no histórico, sem fabricar texto de
usuário. A mensagem junto do anexo permanece preservada.

Se houver mais de uma divergência real pendente, somente a pergunta da versão atual fica
aguardando resposta; a próxima é apresentada depois da decisão. Reabrir pela biblioteca não
muda silenciosamente a versão que receberá o “sim” digitado.

Confirmar libera somente a versão: nunca muda nome, perfil ou contexto do condomínio e não
elimina outros motivos de revisão nem confirma vigência pendente. Cancelar não altera nem cria
condomínio. A Alvitra também comunica o resultado e as limitações de leitura em fala gerada,
sem textos prontos atribuídos à assistente. Progresso usa indicador compacto; falha do provedor
fica identificada como indisponibilidade técnica, sem fabricar fala ou liberar a pendência.

### RQ-3704 — Autorização e persistência

Confirmação exige permissão de upload vigente, versão ativa do catálogo e o mesmo `condominium_id`. Não aceita nome ou tenant substituto no corpo. Persistir a decisão e o autor por versão no PostgreSQL; manter comportamento equivalente na demonstração em memória. Pendências reaparecem no catálogo após recarregar. Arquivo removido, versão antiga e acesso revogado não podem ser confirmados.

## 8. Contratos

- Catálogo acrescenta `condominiumCheck` opcional: nomes esperado/encontrados, fontes, estado pendente/confirmado e estado de leitura a retomar.
- `POST /v1/condominiums/:condominiumId/documents/:documentVersionId/confirm-condominium`: decisão explícita `confirm: true`, com `message` opcional contendo a aceitação inequívoca digitada. Texto contrário, ambíguo ou nome/tenant substituto é recusado; a decisão digitada fica no journal autorizado antes do sucesso. Contrato legado sem texto permanece compatível. 200 confirmado, 400 corpo inválido, 401 sem identidade, 403 sem permissão, 409 sem pendência ativa.
- A decisão é independente da validade/vigência documental e do nome do arquivo.
- `POST /v1/condominiums/:condominiumId/documents/:documentVersionId/conversation`:
  evento `received`, `status`, `confirmed` ou `cancelled`; `cancelled` aceita `message` opcional com
  recusa inequívoca, registrada junto da fala gerada. Lê somente a versão ativa autorizada, valida
  compatibilidade do evento com seu estado e gera a fala com o gateway existente. O provedor
  recebe somente enums operacionais e marcadores, nunca nomes, título ou conteúdo; a substituição
  dos marcadores por metadados autorizados ocorre em uma passagem local. Não executa
  decisão nem atualiza o perfil. Revalida acesso e estado depois da geração. Eventos de leitura
  elegíveis também incluem `snapshot` local conforme a Spec 045, sem enviar seu conteúdo ao gateway.

## 9. Requisitos não funcionais

- Identificação continua determinística e sem reextração. A fala usa o gateway já configurado,
  sem novo provedor/dependência; nomes e título permanecem locais, inseridos como texto sem
  executar instruções. Nunca usa páginas ou histórico como autorização. Sem conteúdo documental em logs.
- Interação acessível pelo compositor e envio normais do chat; nenhuma opção de sim/não em formulário.
- Banco reforça RLS existente; busca mantém exigência de estado pronto.

## 10. Critérios de sucesso

- Divergência sintética visível com ambos os nomes; ausência de recuperação antes da decisão.
- Nome equivalente não gera interrupção; ausência de nome não inventa identificação.
- Confirmação libera somente a versão autorizada; cancelamento e acesso cruzado não liberam.

## 11. Questões em aberto

- Ampliar reconhecimento semântico depende de evidência de falhas desta identificação explícita e decisão própria de qualidade/custo.

## Gate competitivo

1. A Alvitra pede confirmação e comunica resultados na própria conversa.
2. Correção pertence aos Blocos 4 e 6 já autorizados.
3. Reduz engano no vínculo de documentos e melhora segurança da evidência.
4. Preserva isolamento, abstenção, conflitos e decisão humana.
5. Protege a memória persistente autorizada, além de uma leitura momentânea de anexos.
6. Testes de parsing, recuperação, API e persistência demonstram o comportamento.
7. Reutiliza extração, estado de revisão e catálogo; não adiciona serviço ou dependência.

O ajuste de 03/11/2026 detalha briefing §§1, 6, 7 (Blocos 4 e 6) e 8–10: a Alvitra fala na
conversa, o usuário responde nela e a confirmação só existe diante de divergência real. Preserva
isolamento e decisão humana; parsing, API e histórico usam dados sintéticos e a stack existente.

## Gate para mudar o status

Exige aceitação, rastreabilidade, validação de visão e gates aplicáveis aprovados; nenhuma divergência não aprovada.
