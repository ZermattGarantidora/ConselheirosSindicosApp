# Spec 001 — Consulta documental com fontes

**Status:** aprovada para implementação local  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-05

## 0. Alinhamento com a visão do projeto

Esta spec implementa a primeira fatia recomendada pelo briefing e permanece deliberadamente menor que o MVP completo.

| Dimensão da visão | Seções do briefing | Como esta spec se alinha |
|---|---|---|
| Visão e problema | §§1, 2 e 4 | Entrega consulta operacional baseada primeiro na legislação oficial compartilhada e depois no contexto autorizado do condomínio, testando respostas confiáveis com evidência. |
| Público inicial | §3 | Prioriza o síndico profissional que administra mais de um condomínio. |
| Proposta de valor | §5 | Reduz procura e releitura de documentos, permitindo verificar documento, página e trecho. |
| Prioridades do MVP | §§7 e 14 | Cobre separação por condomínio, PDF/OCR, organização documental, chat fundamentado, citações, feedback e trilha. |
| Diferenciação e experiência | §§10 e 11 | Implementa memória isolada, fontes precisas, versão/vigência e resposta estruturada. |
| Segurança e especialistas | §§12 e 13 | Exige abstenção, separa evidência de interpretação, trata conflitos e encaminha situações de alto risco. |
| Estratégia técnica e custo | §15 | Recupera apenas contexto relevante, permite troca de provedor, mede custo e reserva escalonamento para tarefas que exigem maior capacidade. |
| Validação | §§16, 17 e 21 | Mede correção, citação, abstenção, confiança, custo e utilidade do núcleo documental antes de automações. |

### Limites respeitados

- Não inclui contabilidade, boletos, portaria, marketplace, parecer jurídico definitivo nem automação irreversível, conforme §7.
- Mantém comunicação assistida e extração de obrigações fora desta primeira fatia, embora pertençam ao MVP posterior.
- Não executa ações externas, conforme §§14 e 22.

### Divergências da visão

Nenhuma divergência conhecida. Se uma surgir durante o detalhamento ou implementação, esta spec deve voltar ao estado de rascunho até que seja corrigida ou que o briefing seja alterado com aprovação explícita.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve o problema documental e testa hipóteses descritas no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Permitir que um usuário autorizado faça uma pergunta sobre documentos de um condomínio e receba uma resposta fundamentada, com citações verificáveis, sem que dados de outro condomínio participem do processamento.

## 2. Promessa testada

> Dado um conjunto pequeno de documentos confirmados, o sistema encontra a base correta, responde em linguagem clara e permite que o síndico verifique cada afirmação relevante.

## 3. Usuário primário

Síndico profissional que administra mais de um condomínio e precisa consultar convenções, regimentos, atas e contratos sem misturar contextos.

## 4. Escopo da fatia

- autenticação e autorização suficientes para selecionar um condomínio;
- criação de ao menos dois condomínios para demonstrar isolamento;
- upload e processamento de PDF textual ou digitalizado;
- registro de tipo, versão, vigência, procedência e qualidade do OCR;
- indexação textual/semântica preservando página e origem;
- pergunta em linguagem natural dentro do contexto selecionado;
- recuperação da legislação oficial compartilhada e somente das fontes condominiais autorizadas;
- resposta estruturada com citações ou abstenção;
- identificação de conflito documental perceptível;
- recomendação de especialista em casos de alto risco;
- feedback do usuário;
- trilha auditável e telemetria de custo/latência sem conteúdo sensível desnecessário.

## 5. Fora do escopo

- DOCX, planilhas e imagens independentes;
- extração de pendências e obrigações;
- geração de comunicados;
- integrações com e-mail, calendário ou administradoras;
- envio de mensagens ou qualquer outra ação externa;
- parecer jurídico definitivo;
- painel multi-condomínio completo;
- automação de decisões.

## 6. Pré-condições

- O usuário está autenticado.
- Existe uma associação autorizada entre o usuário e o condomínio.
- O documento foi processado e seu estado permite consulta.
- Versão e vigência foram confirmadas ou estão explicitamente marcadas como pendentes.
- A implementação segue os ADRs 0001 a 0009. Dados reais e piloto continuam bloqueados pela política inicial de dados; o Neon é permitido exclusivamente para integração sintética conforme ADR 0007, e o OCR da OpenAI exclusivamente para PDFs sintéticos conforme ADR 0009.

## 7. Requisitos funcionais

### RQ-001 — Contexto autorizado e selecionado

Toda operação deve receber o condomínio selecionado, validar a associação do usuário e fixar `condominium_id` no contexto transacional antes de consultar dados. Identificadores fornecidos pelo cliente nunca são autorização suficiente. Quando um usuário administra mais de um condomínio, uma operação no condomínio A não pode recuperar linhas, evidências, cache ou contexto do condomínio B.

### RQ-002 — Ingestão de PDF

O sistema deve armazenar o original, calcular sua identidade de conteúdo, detectar se há texto utilizável e aplicar OCR quando necessário. O estado de processamento e a qualidade estimada devem ser visíveis.

No ambiente integrado de teste, o processamento enfileirado deve ser executado automaticamente após o upload, sem exigir que o usuário inicie manualmente outro processo. A confirmação explícita de que o documento pode fundamentar respostas deve ser persistida como estado de validade da versão, e não somente mantida na interface.

Estados mínimos: `uploaded`, `processing`, `ready`, `needs_review` e `failed`.

### RQ-002A — Envio e identificação na conversa

A conversa deve disponibilizar um controle acessível para escolher um PDF destinado ao condomínio já
selecionado, sem aceitar um identificador de condomínio fornecido pelo arquivo ou pelo cliente
como autorização. A escolha apenas anexa o PDF localmente: o envio deve exigir um segundo ato
explícito no controle de envio da conversa, identificado visualmente por uma seta. Depois da extração, o sistema deve identificar de forma determinística e
conservadora se o conteúdo parece uma convenção, regimento interno, ata ou contrato. A
identificação é apenas uma organização inicial: quando não houver sinal suficiente, o tipo
permanece `other`; ela não confirma vigência, não constitui parecer e não torna um documento
ilegível elegível para fundamentar respostas.

O arquivo continua sendo dado não confiável. A identificação não pode executar instruções
presentes no PDF, registrar seu texto em logs nem enviá-lo a um provedor novo.

### RQ-002B — Visualização e remoção controlada

O catálogo deve permitir abrir o PDF original somente após validar leitura no condomínio ativo. O
original deve ser persistido e lido do banco de dados protegido, com RLS por condomínio; a API não
deve depender de arquivo local para exibir ou processar documentos persistidos.
O síndico com permissão de envio pode remover da memória qualquer documento do condomínio ativo,
mediante confirmação explícita. A remoção deve impedir novas consultas, manter o PDF original no
armazenamento protegido por 30 dias para recuperação e informar esse prazo claramente. Após 30 dias,
um processo interno deve apagar o original; a recuperação não pode alcançar outro condomínio. Ao enviar
outra ata, a interface deve perguntar separadamente se uma ata anterior deve ser removida; a nova versão
nunca substitui a anterior silenciosamente.

### RQ-003 — Versão e vigência

Cada arquivo processado deve gerar uma versão documental imutável com tipo, procedência, datas de vigência e relação com versões anteriores quando conhecidas. Uma nova versão não apaga nem substitui silenciosamente a anterior.

### RQ-004 — Recuperação isolada

Toda busca deve aplicar o `condominium_id` autorizado antes de qualquer ranking ou seleção de contexto. O filtro deve existir no armazenamento, nos índices, no cache e no código de aplicação.

### RQ-005 — Resposta fundamentada

A geração de afirmações sobre o condomínio só pode ocorrer depois da recuperação de evidências suficientes. Cada afirmação sobre regra, fato ou decisão local deve ser sustentada por uma ou mais evidências retornadas pelo recuperador.

Perguntas sobre o condomínio devem consultar primeiro a memória documental, mesmo quando não citarem palavras como “ata”, “documento” ou “convenção”. Isso inclui perguntas sobre identificação do condomínio, pessoas, datas, valores, quórum, prazos, deliberações, pendências, limites de autorização e orientações para a rotina. Cumprimentos simples podem dispensar a busca. Quando os documentos sustentarem a resposta, a redação é produzida para a pergunta e deve citar as fontes; não pode ser substituída por uma mensagem pronta.

### RQ-006 — Citações verificáveis

Cada citação deve conter:

- identificador e título do documento;
- identificador da versão;
- página humana;
- trecho apresentado ao usuário;
- localização interna suficiente para abrir a fonte.

O trecho exibido deve existir no texto processado da página indicada.

### RQ-007 — Abstenção

Quando não houver evidência suficiente, a resposta deve declarar a limitação, informar o que foi consultado e sugerir qual documento ou validação pode resolver a dúvida. O modelo pode oferecer uma orientação geral útil e formulada para a pergunta, mas deve separá-la da base documental, não usar citações e nunca apresentá-la como regra, fato ou decisão do condomínio. Temas jurídicos, técnicos, contábeis ou de segurança preservam a indicação de validação humana.

### RQ-008 — Conflitos documentais

Quando fontes recuperadas apresentarem regras incompatíveis, a resposta deve citar ambas, informar versões e vigências conhecidas e evitar escolher uma sem base determinística suficiente.

### RQ-009 — Conteúdo não confiável

Instruções contidas nos documentos ou na pergunta não podem alterar políticas, ampliar permissões, revelar segredos ou solicitar dados de outro condomínio. O conteúdo recuperado é sempre tratado como dado.

### RQ-010 — Escalonamento

A resposta deve recomendar especialista quando envolver disputa jurídica, aplicação controvertida de multa, obra estrutural, segurança, tributação, fraude, sinistro, proteção de dados ou responsabilidade relevante.

### RQ-011 — Feedback

O usuário deve poder classificar a resposta como `correct`, `incorrect`, `incomplete` ou `outdated` e incluir comentário opcional. O feedback deve preservar o vínculo com a resposta e suas fontes.

### RQ-012 — Auditoria e custo

Cada resposta deve registrar, de forma minimizada:

- usuário e condomínio;
- documentos e trechos utilizados;
- versão do pipeline, prompt e modelos;
- decisão de roteamento;
- latência;
- tokens ou unidade de consumo;
- custo estimado;
- resultado de segurança e abstenção.

### RQ-013 — Falha segura

Falhas em OCR, busca, banco, provedor ou validação não podem produzir uma resposta aparentemente fundamentada nos documentos. Quando o provedor de IA continuar disponível, falhas de busca ou validação documental podem degradar para orientação geral sem fontes e com a limitação visível. Se não for possível gerar nem essa orientação com segurança, o sistema deve retornar estado de falha recuperável ou pedir nova tentativa.

Quando apenas o provedor generativo estiver temporariamente indisponível, o ambiente de teste pode usar um fallback documental local, desde que ele receba somente as evidências já autorizadas, mantenha citações verificáveis, não amplie o sentido dos trechos e informe a degradação. Esse fallback local não deve fingir que formulou orientação geral sem um modelo disponível. Falhas de autorização continuam fechadas; falhas de evidência ou validação só podem degradar para orientação geral sem fontes.

Antes de acionar o fallback local, o gateway deve repetir de forma limitada as falhas transitórias de rede, timeout, limite temporário e erro 5xx, respeitando um orçamento total de tempo. Erros permanentes de autenticação ou configuração não devem ser repetidos. O fallback nunca pode exibir como resposta o bloco bruto recuperado, começar ou terminar no meio de uma palavra ou juntar campos de tabela sem uma frase compreensível. Quando não conseguir formar localmente uma conclusão curta e completa sem ampliar a evidência, deve se abster em vez de apresentar texto fragmentado.

### RQ-014 — Formato da resposta

A interface deve distinguir:

1. resposta direta;
2. base documental;
3. pontos de atenção;
4. próximo passo sugerido;
5. quando consultar um especialista.

Se uma seção não for aplicável, o contrato pode representá-la vazia sem inventar conteúdo.

Na interface, pontos de atenção, próximo passo e indicação de especialista devem permanecer no
mesmo cartão da resposta direta, em vez de parecerem novas mensagens da conversa. Em respostas
documentais fundamentadas de risco baixo ou médio, `attentionPoints` deve ficar vazio e
`suggestedNextStep` deve ser `null`; uma condição indispensável para entender a resposta deve ser
incorporada de forma curta ao texto principal. Esses campos só são exibidos quando forem
essenciais para uma abstenção, falha, conflito documental, risco alto, validação profissional ou
degradação relevante do serviço.

A resposta direta deve priorizar a conclusão e usar texto curto, sem introdução, despedida,
repetição da pergunta ou lista genérica. Cumprimentos e perguntas sociais simples devem receber
somente uma frase breve, sem busca documental, alertas, risco ou fontes. Quando não houver citação,
a interface não deve exibir um bloco de fontes vazio; a limitação documental permanece visível uma
única vez nos pontos de atenção quando a pergunta exigir consulta aos documentos.

Perguntas gerais e breves sobre como a Alvitra pode ajudar, sem pedir uma regra ou fato específico
do condomínio, também são conversacionais: não exigem busca documental nem devem receber uma
limitação documental genérica. A identificação visual do modo da resposta e da classe de risco não
deve se repetir em respostas rotineiras. O cartão de fontes já informa a base de uma resposta
fundamentada; um indicador curto de atenção fica reservado a conflito documental, falha ou
encaminhamento relevante por risco/validação humana.

Uma resposta substantiva pode usar até 90 palavras. Depois da conclusão, deve incluir um ou dois
detalhes diretamente úteis — como condição, prazo, exceção ou consequência — quando eles estiverem
sustentados pelas evidências ou forem orientação geral segura. Esse ganho de completude não autoriza
repetição, introdução, despedida, preenchimento genérico nem informação sem fonte.

### RQ-015 — Integridade dos turnos e confirmação de envio

Cada pergunta exibida deve permanecer vinculada somente à resposta produzida para ela. Ao iniciar
um novo envio, a interface deve mover o turno anterior concluído para o histórico e remover sua
resposta da área ativa antes de mostrar o estado de espera da nova pergunta. Enquanto houver uma
consulta ativa, outro envio deve permanecer bloqueado para evitar concorrência e respostas fora de
ordem.

O envio iniciado pela pessoa deve produzir uma confirmação sonora curta e discreta. A chegada de
uma resposta concluída com sucesso deve produzir outra confirmação sonora, claramente diferente do
envio. As confirmações não podem atrasar nem bloquear a requisição, e indisponibilidade da API de
áudio não pode impedir o uso do chat.

### RQ-016 — Latência sem duplicação de evidência

O caminho interativo deve evitar trabalho e conteúdo redundantes sem reduzir o piso de qualidade.
Quando a resposta do provedor selecionar uma fonte, deve retornar somente o identificador da
evidência; documento, versão, página e trecho continuam sendo reconstruídos localmente a partir das
evidências autorizadas. A interface deve mostrar imediatamente a pergunta e o estado de espera,
enquanto a recuperação e a geração necessárias são concluídas.

### RQ-017 — Legislação como base principal compartilhada

Toda pergunta substantiva deve consultar a base oficial de legislação antes de formular a
resposta. A legislação é compartilhada, somente leitura para usuários e separada das tabelas e
arquivos particulares dos condomínios. A recuperação pode combinar trechos legais relevantes com
documentos do condomínio autorizado, mas deve identificar a origem de cada fonte e nunca elevar
uma regra interna acima da legislação. Um trecho legal irrelevante não deve ser citado apenas para
forçar a presença da lei na resposta. Cumprimentos simples podem dispensar a busca.

Cada fonte legal deve registrar órgão emissor, URL oficial, versão, marco de atualização, hash do
conteúdo, páginas e trechos verificáveis. Atualizações criam versões imutáveis e não substituem a
anterior silenciosamente.

## 8. Contrato conceitual da resposta

```json
{
  "answer": "string",
  "answerMode": "grounded | abstained | conflict | failed",
  "citations": [
    {
      "documentId": "string",
      "documentVersionId": "string",
      "title": "string",
      "page": 1,
      "excerpt": "string"
    }
  ],
  "claims": [
    {
      "statement": "string",
      "citationIndexes": [0]
    }
  ],
  "attentionPoints": ["string"],
  "suggestedNextStep": "string | null",
  "specialist": {
    "required": false,
    "type": "string | null",
    "reason": "string | null"
  }
}
```

O contrato final será definido na implementação, mas não pode remover as propriedades sem atualizar esta spec.

## 9. Requisitos não funcionais

### Segurança e privacidade

- negar por padrão;
- criptografar dados em trânsito e armazenados;
- usar URLs temporárias e escopadas para arquivos;
- minimizar logs e retenção;
- permitir futura exportação e exclusão compatíveis com LGPD;
- não usar documentos do cliente para treinamento sem consentimento específico.

### Observabilidade

Métricas devem permitir investigar falhas de recuperação, qualidade, custo e latência sem depender de registrar o conteúdo integral do documento.

### Portabilidade

OCR, embeddings, reranking e geração devem ser acessados por contratos que permitam substituição de provedor.

### Acessibilidade e idioma

A experiência inicial deve funcionar em português do Brasil, com linguagem clara e navegação por teclado nos controles principais.

## 10. Critérios de sucesso da fatia

- todos os cenários P0 de `acceptance.md` passam;
- nenhuma evidência de outro condomínio aparece na busca, prompt, resposta, cache ou log;
- o usuário consegue abrir e conferir as citações;
- casos sem base produzem abstenção consistente;
- uma execução de eval gera baseline de qualidade, latência e custo;
- feedback pode ser associado ao resultado avaliado.

## 11. Questões em aberto

- Como representar retificações e vigência parcial de atas e convenções?
- Qual provedor de OCR atinge o piso de qualidade em documentos brasileiros?
- Quais limites de latência e custo serão aceitáveis no piloto?
- Quem pode confirmar vigência e corrigir metadados?
- Quais prazos de retenção, backup, exportação e exclusão serão aprovados para o piloto?

As questões acima não bloqueiam a primeira fatia de identidade e isolamento. Elas bloqueiam, respectivamente, o comportamento definitivo de vigência, a integração de OCR, o rollout, a permissão administrativa e qualquer piloto com dados reais.

## Gate para implementação local

Esta spec está aprovada para iniciar a implementação local com dados sintéticos. Antes de implementar uma etapa, o time deve confirmar que ela possui critérios de aceitação, rastreabilidade e testes ou evals aplicáveis. A liberação de piloto exige resolver as questões que o bloqueiam e executar os gates de qualidade correspondentes.
