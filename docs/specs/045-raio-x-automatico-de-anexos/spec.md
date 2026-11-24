# Spec 045 — Recebimento e raio-X automático de anexos

**Status:** implementada e verificada localmente; aguardando aprovação da experiência  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-27

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Reduz o esforço até a primeira leitura útil do arquivo enviado. |
| Público | §3 | Ajuda síndicos moradores e profissionais a entender o material recebido. |
| Proposta de valor | §§1, 5 e 6.6 | A Alvitra confirma o recebimento e apresenta os resultados na conversa. |
| Prioridades do MVP | §7, Blocos 6 e 7 | Detalha envio sob demanda e análise documental já autorizados. |
| Segurança e confiança | §§8–10 e 12 | Reutiliza páginas autorizadas, valida citações e preserva revisão e confirmação. |
| Validação e métricas | §13 | Mede utilidade sem nova pergunta, fontes válidas e abstenção segura. |

### Limites respeitados

- Sem nova tela, dependência, provedor, reextração, persistência derivada ou ação externa.
- O resumo inicial não certifica completude, vigência, validade jurídica ou saúde financeira.
- Somente a versão recebida participa nos resumos gerais. Para balancetes, a Spec 049 sucede este limite e autoriza conferência automática com histórico e apoios elegíveis do mesmo condomínio.
- O system prompt aprovado permanece inalterado; a fala usa somente estados operacionais e o resumo é extraído localmente, sem enviar conteúdo ou nomes ao gateway.

### Divergências da visão

Nenhuma. O usuário solicitou explicitamente confirmação e resumo imediato em 2026-10-27.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Ao enviar um arquivo, mesmo sem texto, receber confirmação na conversa e um raio-X inicial assim que a leitura segura terminar, sem precisar pedir análise.

## 2. Promessa testada

> Envio o arquivo e a Alvitra já me mostra os dados úteis que conseguiu ler, suas fontes e o que falta conferir.

## 3. Usuário primário

Síndico enviando PDF ou foto pelo chat do condomínio autorizado.

## 4. Escopo

Confirmação após o HTTP 202, processamento assíncrono preservado, resumo automático da versão elegível e fontes acessíveis no chat. Mensagem junto do arquivo continua sendo respondida após a leitura.

## 5. Fora do escopo

Auditoria, comparação automática de carteira, reconhecimento universal, mudanças de perfil, certificação de documentos ou envio externo de mensagens.

## 6. Pré-condições

Upload autorizado; análise exige também leitura autorizada, versão ativa, processamento pronto, vigência confirmada ou não aplicável e nenhuma confirmação de condomínio pendente.

## 7. Requisitos funcionais

### RQ-4501 — Recebimento sem nova pergunta

Após registrar o original, solicitar fala contextual de recebimento sem aguardar extração. Essa fala não afirma leitura concluída. Falha técnica da fala não cancela o upload nem impede acompanhar o processamento.

### RQ-4502 — Resumo automático e escopado

Quando o processamento termina, a conversa produz automaticamente um resumo estruturado: identificação ou assunto verificável, até três dados ou achados úteis, limitações e próximo passo. Balancetes priorizam período e valores; atas, decisões e prazos; convenções/regimentos, regras; contratos, objeto, valores e obrigações; outros arquivos, conteúdo efetivamente legível. Nenhum campo ausente é inventado. Não pergunta genericamente o que o usuário deseja fazer antes dessa entrega.

Ler somente a versão enviada usando o reader autorizado existente. Reutilizar texto/OCR e os extratores determinísticos para identificar tipo, período e valores explícitos. Complementar com até três trechos literais priorizados por assunto (decisões, regras, objeto, valores, prazos ou obrigações); sem inferência semântica. Trechos longos são limitados a 900 caracteres e essa seleção inicial é declarada parcial. Não inferir tendências ou irregularidades sem histórico. Reutilizar validação local de citações e localização literal. Conteúdo documental continua sendo dado não confiável e não é enviado ao gateway.

Para balancetes, a Spec 049 substitui a seleção de versão única e o destaque de três valores pela conferência dos dez pontos, com histórico anterior e apoios autorizados. Os limites de evidência, processamento local e elegibilidade continuam aplicáveis.

### RQ-4503 — Limites e autorização

Pendência de condomínio, revisão, falha ou vigência não confirmada recebem explicação contextual em vez de resumo factual. Confirmar o uso dispara o resumo se a versão estiver elegível, inclusive sem pergunta anexada; cancelar não dispara análise. Ausência de páginas seguras produz limite explícito, sem resumo fabricado. O relatório local continua disponível se a fala gerada falhar, com indisponibilidade técnica identificada pela interface. Revalidar autorização e estado antes de devolver dados. Temas de risco recebem recomendação humana apropriada.

### RQ-4504 — Apresentação e continuidade

Resumo e fontes aparecem no chat; fontes abrem a versão/página/trecho existentes. Uma pergunta enviada com o arquivo é preservada e respondida depois da leitura. Troca de chat ou condomínio descarta resultados tardios. O resumo é transitório, como as falas documentais atuais; não promete restauração após recarregar.

A Spec 057 detalha a apresentação compacta: fontes recolhidas e agrupadas, resultados de lotes
reunidos depois das leituras e conferência completa acessível, preservando cada versão e limitação.
Após autorização específica de payload/destino, ela também sucede o limite de somente enums
exclusivamente para o comentário conjunto via Codex/modelo autorizado, conforme ADR 0036.

## 8. Contratos

O endpoint documental `/conversation` aceita também `received`, sem conteúdo factual. Eventos `status` e `confirmed` elegíveis retornam `message` e `snapshot` opcional no contrato `DocumentAnalysisReport`; estados bloqueados mantêm somente `message`. `message` pode estar ausente quando a geração falha mas o relatório local está disponível; a interface identifica essa falha técnica. Respostas privadas usam `no-store`.

## 9. Requisitos não funcionais

Zero mistura entre condomínios; sem logs documentais, cache ou schema novo. Uma chamada de recebimento e uma de apresentação por envio normal; ambas enviam somente enums e marcadores, sem nomes ou texto documental. Nenhuma chamada para extrair ou conferir fontes. Limites do reader de 500 páginas e dois milhões de caracteres preservados.

## 10. Critérios de sucesso

Envio sem pergunta entrega dados úteis e fontes automaticamente; recebimento antecede término da leitura; estados bloqueados e acesso revogado não expõem conteúdo; anexos com pergunta continuam funcionando. Gates de visão, tipagem, testes, cobertura e evals documentais aprovados.

## 11. Questões em aberto

Validação semântica especializada do resumo de documentos reais permanece posterior; testes usam somente material sintético.

## Gate competitivo

Mantém a conversa, pertence aos Blocos 6/7 autorizados e reduz a pergunta adicional até o primeiro valor. Preserva memória isolada e fontes recuperáveis além de um chat genérico. Testes de sequência, API, isolamento e apresentação medem o resultado. Reutiliza reader, gateway e validadores; não adiciona serviço permanente.

## Gate para mudar o status

Exige aceitação, rastreabilidade, gate de visão e validação local; não autoriza merge, publicação ou piloto real.
