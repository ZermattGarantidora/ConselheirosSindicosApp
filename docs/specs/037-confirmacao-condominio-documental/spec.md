# Spec 037 — Confirmação do condomínio identificado no documento

**Status:** implementada localmente; integração e revisão pendentes  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-20

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| Problema e hipótese   | §§2 e 4            | Evita fundamentar uma resposta local em documento anexado ao contexto errado.        |
| Público               | §3                 | Ajuda síndicos que administram um ou vários condomínios.                             |
| Proposta de valor     | §§5 e 6.5–6.6      | Pede confirmação contextual durante o envio no chat.                                 |
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
- Aviso operacional contextual, com nomes, confirmação e opção de cancelar o uso.
- Pendência persistente por versão; retomada pelo catálogo de documentos acessível no Perfil.

## 5. Fora do escopo

- Inferência semântica de propriedade, validação de CNPJ, realocação entre tenants e revisão retroativa.
- Alteração de prompt, autenticação, vigência documental ou qualidade de OCR.

## 6. Pré-condições

- Identidade vigente e permissão de upload para o condomínio selecionado.
- Nome esperado resolvido no servidor, nunca aceito como autorização enviada pelo cliente.

## 7. Requisitos funcionais

### RQ-3701 — Identificação explícita e prudente

Comparar nomes explícitos no título e no cabeçalho/identificação inicial do texto extraído, incluindo OCR disponível. Ignorar caixa, acentos, pontuação e prefixos genéricos equivalentes. Não tratar uma menção incidental no corpo como identificação. Sem nome legível, manter o processamento normal sem afirmar que o pertencimento foi verificado. Sinais contraditórios entre arquivo e conteúdo também exigem confirmação.

### RQ-3702 — Pendência antes de consulta

Nome divergente gera `needs_review` e metadados com nome esperado, nomes encontrados e procedência. Original e extração permanecem privados no contexto de envio; retrieval e análise não podem usá-los enquanto houver pendência. Recepção continua respondendo 202 sem esperar a leitura. A pergunta junto do anexo fica preservada e não é consultada antes da confirmação.

### RQ-3703 — Confirmação explícita e cancelamento

O chat e o catálogo de documentos acessível no Perfil apresentam uma pergunta operacional equivalente a: “O documento identifica ‘Condomínio Bosque’, mas o condomínio selecionado é ‘Residencial Alameda’. Este documento pertence a ‘Residencial Alameda’?”. A pessoa pode confirmar o uso no contexto selecionado ou cancelar, mantendo o arquivo bloqueado e podendo trocar o contexto e reenviar. Cancelar não altera nem cria condomínio. Confirmar não elimina outros motivos de revisão nem confirma vigência pendente.

A confirmação usa um único cartão azul-escuro, com contraste legível nos temas claro e escuro.
A pendência não gera um segundo alerta “Confirme o condomínio antes de usar este documento.
Sua mensagem foi preservada.”; a pergunta digitada continua preservada e o bloqueio documental
permanece até a decisão explícita. Falhas reais de envio ou confirmação continuam visíveis.

### RQ-3704 — Autorização e persistência

Confirmação exige permissão de upload vigente, versão ativa do catálogo e o mesmo `condominium_id`. Não aceita nome ou tenant substituto no corpo. Persistir a decisão e o autor por versão no PostgreSQL; manter comportamento equivalente na demonstração em memória. Pendências reaparecem no catálogo após recarregar. Arquivo removido, versão antiga e acesso revogado não podem ser confirmados.

## 8. Contratos

- Catálogo acrescenta `condominiumCheck` opcional: nomes esperado/encontrados, fontes, estado pendente/confirmado e estado de leitura a retomar.
- `POST /v1/condominiums/:condominiumId/documents/:documentVersionId/confirm-condominium`: decisão explícita `confirm: true`; 200 confirmado, 400 corpo inválido, 401 sem identidade, 403 sem permissão, 409 sem pendência ativa.
- A decisão é independente da validade/vigência documental e do nome do arquivo.

## 9. Requisitos não funcionais

- Sem nova chamada de IA ou reextração para conferir nomes; sem conteúdo documental em logs.
- Interação acessível com botões de confirmação/cancelamento, sempre dentro do chat.
- Banco reforça RLS existente; busca mantém exigência de estado pronto.

## 10. Critérios de sucesso

- Divergência sintética visível com ambos os nomes; ausência de recuperação antes da decisão.
- Nome equivalente não gera interrupção; ausência de nome não inventa identificação.
- Confirmação libera somente a versão autorizada; cancelamento e acesso cruzado não liberam.

## 11. Questões em aberto

- Ampliar reconhecimento semântico depende de evidência de falhas desta identificação explícita e decisão própria de qualidade/custo.

## Gate competitivo

1. Aviso e confirmação permanecem contextuais no chat.
2. Correção pertence aos Blocos 4 e 6 já autorizados.
3. Reduz engano no vínculo de documentos e melhora segurança da evidência.
4. Preserva isolamento, abstenção, conflitos e decisão humana.
5. Protege a memória persistente autorizada, além de uma leitura momentânea de anexos.
6. Testes de parsing, recuperação, API e persistência demonstram o comportamento.
7. Reutiliza extração, estado de revisão e catálogo; não adiciona serviço ou dependência.

## Gate para mudar o status

Exige aceitação, rastreabilidade, validação de visão e gates aplicáveis aprovados; nenhuma divergência não aprovada.
