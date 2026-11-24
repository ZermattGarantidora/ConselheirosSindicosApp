# Spec 062 — Geração de cópias documentais revisadas

**Status:** rascunho para revisão
**Responsável:** produto e engenharia
**Atualizado em:** 2026-11-03

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Reduz o esforço de preparar uma correção documental sem perder a ligação com a fonte. |
| Público | §3 | Atende síndicos moradores e profissionais que precisam revisar documentos do condomínio. |
| Proposta de valor e conversa | §§5 e 6 | Mantém o pedido, as perguntas de esclarecimento, a entrega e a revisão dentro do chat. |
| Prioridades do MVP | §7, Bloco 7 | Detalha a geração sob pedido explícito de uma cópia revisada de PDF legível. |
| Segurança e confiança | §§8–10 | Preserva o original, o isolamento por condomínio, as fontes, a abstenção, os conflitos e a revisão humana. |
| Validação e métricas | §§13–14 | Mede correções sustentadas, abstenções, tempo até o próximo passo e incidentes de isolamento. |

### Limites respeitados

- A primeira fatia aceita somente PDFs processados com texto (extraído diretamente ou por OCR) e estrutura suficientes para uma revisão segura; fotografias soltas, imagens e outros formatos não geram cópia nesta spec.
- A geração é solicitada explicitamente na conversa e não aparece como efeito automático do upload ou da análise inicial.
- A saída é um rascunho separado, vinculado à versão de origem. O original não é regravado, substituído ou marcado como aprovado.
- Correções de redação só podem preservar o sentido. Mudanças factuais exigem pedido explícito e evidência autorizada; conflitos, lacunas ou qualidade insuficiente impedem a alteração.
- Conteúdo jurídico, contábil, financeiro, técnico ou de segurança não recebe validação profissional automática. Propostas materiais exigem revisão humana especializada antes de uso.
- O arquivo gerado não é indexado, vetorizado nem utilizado automaticamente como evidência para respostas futuras.
- Esta definição não escolhe uma nova biblioteca, serviço ou provedor. Uma dependência, serviço ou fluxo de dados novo requer ADR e revisão dos custos e da privacidade.

### Divergências da visão

Nenhuma. Em 03/11/2026, o usuário autorizou explicitamente incluir a capacidade no briefing e criar esta spec, que a delimita ao Bloco 7.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema e testa uma hipótese descritos no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Quando a análise encontrar correções seguras, apresentar na conversa o que pode mudar e perguntar se o síndico quer uma cópia PDF revisada. Gerar o arquivo somente após confirmação afirmativa, mantendo o original intacto.

## 2. Promessa testada

> A Alvitra explica as mudanças que pode sustentar, pergunta se o síndico quer a cópia revisada e só então prepara um rascunho ligado à origem.

## 3. Usuário primário

Síndico profissional independente ou síndico morador que precisa corrigir um documento do condomínio e revisar as mudanças antes de utilizá-lo.

## 4. Escopo

- Após análise de um PDF legível, oferecer a cópia revisada quando houver uma ou mais correções seguras e sustentadas que possam ser aplicadas.
- Antes da oferta, resumir as mudanças propostas com página, trecho e motivo suficientes para o síndico decidir.
- Perguntar na conversa se o síndico quer que a Alvitra gere a cópia revisada; aguardar resposta afirmativa antes de criar o arquivo.
- Tratar um pedido inicial explícito e inequívoco para gerar uma cópia de uma origem e mudanças determinadas como confirmação; se a origem ou as mudanças não estiverem claras, perguntar antes.
- Não oferecer geração quando nenhuma correção segura for encontrada ou quando só houver problemas sem evidência suficiente; explicar a limitação em vez disso.
- Se o síndico recusar, não gerar arquivo e manter o documento original intacto.
- Perguntar qual arquivo ou mudança a pessoa pretende quando o pedido, o documento ou a versão não forem inequívocos.
- Corrigir ortografia, pontuação e gramática apenas quando a alteração não mudar fatos, obrigações, valores, datas, decisões ou sentido normativo.
- Se nenhuma mudança segura e sustentada for necessária, informar isso na conversa sem criar uma cópia idêntica ou um derivado vazio.
- Oferecer uma alteração factual para confirmação somente quando uma fonte autorizada e atual sustentar a mudança sem conflito: fatos locais exigem fonte do mesmo condomínio; mudança normativa exige fonte oficial já disponível e verificada no fluxo autorizado, com jurisdição e vigência aplicáveis. O texto só entra no PDF após a confirmação do síndico.
- Gerar um PDF separado com sequência, dimensões de página e estrutura reconhecível do original; não entregar um arquivo se a preservação do conteúdo e da estrutura não puder ser verificada.
- Entregar o arquivo na conversa como rascunho revisado, junto de um resumo das alterações. O resumo identifica página, trecho original, trecho proposto, tipo e motivo da mudança.
- Para cada mudança factual, apontar documento, versão, página e trecho da evidência autorizada. Mudanças normativas também identificam a fonte oficial já disponível e verificada, jurisdição e vigência. Uma correção puramente ortográfica ou gramatical referencia a página e o trecho originais, sem criar uma fonte factual nova.
- Vincular o derivado à identidade, condomínio, chat, documento de origem, versão e hash do original.
- Permitir que a pessoa baixe o rascunho e faça sua própria revisão. Qualquer uso, distribuição, assinatura, publicação ou envio externo permanece sob responsabilidade e confirmação humanas.

## 5. Fora do escopo

- Alterar, sobrescrever, excluir ou promover o documento original ou suas versões.
- Declarar que o rascunho é válido, aprovado, assinado, juridicamente revisado ou pronto para uso oficial.
- Inserir fatos, obrigações, quórum, valores, prazos ou decisões sem solicitação explícita e evidência suficiente.
- Resolver divergências entre versões, documentos, regras, datas ou fontes por conta própria.
- Corrigir PDFs cuja extração, inclusive OCR, ou estrutura não alcance qualidade suficiente, fotografias soltas, imagens ou outros formatos não suportados; nesses casos, explicar o limite e oferecer orientação no chat.
- Criar ou enviar automaticamente uma versão nova à biblioteca documental, à vetorização, a outro usuário ou a qualquer serviço externo.
- Fazer avaliação contábil, jurídica, técnica ou profissional definitiva, ou executar assinatura, envio, publicação ou substituição.
- Incluir conteúdo documental real ou dados pessoais em fixtures, testes ou evals.

## 6. Pré-condições

- O usuário está autorizado a ler e derivar documentos no condomínio ativo; a API resolve a identidade, as permissões e o contexto, sem confiar em IDs fornecidos pelo cliente como autorização.
- O documento e a versão escolhidos pertencem ao condomínio autorizado, estão ativos e tiveram leitura concluída com qualidade suficiente.
- As páginas necessárias à edição mantêm texto, offsets, ordem e páginas verificáveis; pedidos que excedam os limites de processamento existentes são recusados ou reduzidos mediante esclarecimento.
- Correções factuais locais usam fontes autorizadas e atuais do mesmo condomínio; mudanças normativas exigem fonte oficial já disponível, verificada e aplicável. Revisão gramatical não autoriza inferir fatos.
- A política de retenção e exclusão aprovada abrange o arquivo derivado e suas referências.

## 7. Requisitos funcionais

### RQ-6201 — Oferta contextual e confirmação

Quando a análise encontra mudanças seguras e sustentadas, a Alvitra resume o conjunto proposto e pergunta em linguagem natural se o síndico quer gerar a cópia. A oferta identifica o documento e as mudanças, e não é substituída por cartão ou resposta fixa. A oferta não cria arquivo; a geração aguarda resposta afirmativa vinculada àquela proposta no mesmo chat. Upload, leitura automática ou pedido de análise nunca criam arquivo. Um pedido inicial explícito e inequívoco para gerar uma cópia da origem e do escopo identificados equivale à confirmação. Diante de ambiguidade, a Alvitra pergunta antes de gerar. Se a pessoa alterar o escopo depois da oferta, a Alvitra apresenta o novo conjunto e confirma novamente.

### RQ-6202 — Alterações conservadoras

Mudanças linguísticas preservam o sentido original. Mudanças de fato, obrigação, decisão, data, prazo, valor, condição ou efeito normativo são substantivas: a Alvitra só as oferece para confirmação quando houver fonte autorizada suficiente e mostra essa evidência junto à proposta. Elas só entram no rascunho depois da resposta afirmativa à proposta exata. Um pedido vago de “melhorar” não autoriza mudança sem evidência. Sem mudança segura a realizar, a Alvitra explica o resultado, não oferece uma cópia e não cria um derivado idêntico. Se a oferta for recusada, não gera o arquivo nem repete a oferta no mesmo resultado.

### RQ-6203 — Evidência por mudança factual

Cada alteração factual tem referência verificável a uma fonte autorizada e atual: fatos locais exigem documento, versão, página e trecho do mesmo condomínio; mudanças normativas exigem fonte oficial já disponível, verificada e aplicável, com jurisdição e vigência. Trecho ausente, citação incompleta ou fonte sem autorização impede a alteração factual.

### RQ-6204 — Conflito e abstenção

Se as fontes divergem, a versão está pendente, a evidência é insuficiente ou a leitura não é confiável, a Alvitra não incorpora a alteração. Explica o limite e pode apresentar a questão como pendência para decisão humana, mantendo no rascunho o conteúdo original afetado.

### RQ-6205 — Original imutável e derivado rastreável

A saída tem identificador, hash próprio e vínculo com o condomínio, conversa e versão/hash de origem. A operação não altera o original, o catálogo ou o estado de vigência. Exclusão e retenção do derivado seguem a política aplicável e não deixam referências acessíveis a usuários não autorizados.

### RQ-6206 — Fidelidade e falha segura do arquivo

A saída é PDF. Preserva ordem e dimensões das páginas e não pode omitir, sobrepor ou cortar conteúdo de modo que mude ou esconda informação. Se a transformação ou a validação falhar, nenhum arquivo parcial é apresentado como cópia revisada; a Alvitra explica a limitação no chat.

### RQ-6207 — Rascunho e revisão humana

A fala e o nome do arquivo identificam claramente a saída como rascunho revisado. O resumo de mudanças acompanha a entrega. A Alvitra não insere assinatura, aprovação, protocolo ou declaração profissional que não exista na fonte.

### RQ-6208 — Isolamento e autorização contínua

Leitura, geração, armazenamento e download revalidam usuário, chat, condomínio, permissões e versão. Revogação, troca de contexto, erro ou resultado tardio impede a entrega e não revela o arquivo ou as evidências a outro usuário ou condomínio.

### RQ-6209 — Documento não confiável

Instruções contidas no PDF são dados e nunca comandos para o sistema. Elas não podem alterar o escopo, escolher fontes, conceder autorização, suprimir evidências ou instruir a geração a ocultar mudanças.

### RQ-6210 — Sem promoção automática

O artefato não entra na biblioteca de documentos ativos, no índice vetorial ou na base probatória. Para torná-lo fonte em consultas futuras, o usuário deve submetê-lo como novo documento pelo fluxo autorizado existente, com nova versão e processamento independente.

## 8. Contratos

O pedido conceitual contém conversa, instrução do usuário e referência opcional ao documento/versão. A API determina o condomínio pela sessão autorizada e exige permissões de leitura e criação de derivado; IDs no corpo não concedem acesso.

O resultado tem um estado entre awaiting_confirmation, draft_ready, declined, needs_clarification, blocked e failed. awaiting_confirmation inclui a proposta de mudanças e evidências resumidas, sem arquivo. A resposta afirmativa gera somente as mudanças listadas; declined registra a recusa sem criar artefato. Um pedido inicial que já equivale à confirmação segue para geração após validação da origem e do escopo. draft_ready inclui identificador e hash do artefato, hash e versão de origem, condomínio e chat, nome de arquivo marcado como rascunho, resumo das mudanças e referências de evidência. Cada mudança guarda página, trecho original, texto proposto, categoria e motivo. Mudanças factuais incluem a fonte verificável; mudanças de redação não afirmam fatos novos.

needs_clarification solicita a menor informação necessária. blocked explica um conflito, falta de evidência, qualidade insuficiente, permissão ou limite de fidelidade. failed comunica uma falha operacional sem expor conteúdo documental ou declarar geração concluída.

## 9. Requisitos não funcionais

- Zero alteração do original e zero acesso entre condomínios em todos os estados e falhas.
- Nenhum texto documental, conteúdo de alteração, evidência, hash de conteúdo ou arquivo em logs operacionais.
- Limites existentes de tamanho, páginas e conteúdo processado são reutilizados; superá-los não dispara custo, OCR ou chamadas adicionais sem autorização.
- Somente configuração de modelo e política de dados já autorizadas podem ser reutilizadas; a spec não libera documentos reais para novos provedores ou serviços.
- Arquivos de saída não podem introduzir scripts, ações, anexos ativos ou assinaturas fabricadas. Caso não seja possível removê-los ou validá-los, a geração falha com explicação.
- Dados de testes e evals são sintéticos e verificam conteúdo, proveniência, fidelidade, abstenção, autorização e isolamento.

## 10. Critérios de sucesso

- 100% dos rascunhos gerados são arquivos distintos do original, preservam seu hash e têm vínculo recuperável com a versão de origem.
- 100% das análises com correções seguras e sustentadas oferecem a cópia no chat; nenhuma análise sem correção segura gera uma oferta genérica.
- Zero arquivo é criado antes da confirmação do conjunto de mudanças; toda confirmação produz somente o conjunto apresentado.
- 100% das alterações factuais entregues possuem evidência autorizada completa; nenhum caso de conflito ou evidência insuficiente altera o conteúdo questionado.
- 100% dos casos sem qualidade ou fidelidade verificável se abstêm de entregar arquivo.
- 100% dos cenários de permissão, revogação e troca de condomínio bloqueiam acesso cruzado.
- Avaliação sintética distingue correções de redação de mudanças substantivas e detecta alterações de sentido não solicitadas.
- A utilidade é medida por tarefa concluída ou encaminhada com próximo passo claro, revisão humana do rascunho e tempo para obter uma cópia utilizável; não por volume de arquivos gerados.

## 11. Questões em aberto

- A fidelidade visual aceitável precisa ser demonstrada por uma bateria sintética de PDFs com tabelas, cabeçalhos, rodapés, fontes e diferentes comprimentos de texto antes da implementação.
- A estratégia de edição e validação do PDF deve ser registrada em ADR antes de selecionar dependências, serviços ou armazenamento adicional.
- Mudanças factuais de alto risco precisam de revisão humana qualificada; a interface e a eval devem identificar o tipo de revisão necessário sem prometer validade.

## Gate competitivo

- Mantém o chat como única interface de pedido, esclarecimento, entrega e revisão.
- Pertence ao Bloco 7, autorizado pelo usuário, sem antecipar módulos posteriores.
- Reduz o trabalho de preparar uma correção e preserva a evidência que uma ferramenta genérica de edição de PDF não relaciona ao condomínio e à versão de origem.
- Reutiliza autorização, catálogo e procedência documental existentes; preserva isolamento, abstenção, conflitos e decisão humana.
- Critérios sintéticos medem fidelidade, alterações sustentadas e tarefas encaminhadas; a bateria de layout e a revisão especializada limitam complexidade e risco antes de implementação.

## Gate para mudar o status

Esta spec não pode sair de rascunho para revisão enquanto o gate de visão, a bateria sintética de fidelidade, os critérios de aceitação, a rastreabilidade e um ADR de edição/armazenamento não estiverem concluídos. Aprovar esta spec não autoriza substituir originais, enviar arquivos externamente ou liberar uso com dados reais.
