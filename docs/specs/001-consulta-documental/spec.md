# Spec 001 — Consulta documental com fontes

**Status:** aprovada para implementação local  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-09-01

## 0. Alinhamento com a visão do projeto

Esta spec implementa a primeira fatia recomendada pelo briefing e permanece deliberadamente menor que o MVP completo.

| Dimensão da visão | Seções do briefing | Como esta spec se alinha |
|---|---|---|
| Visão e problema | §§1, 2 e 4 | Entrega consulta operacional baseada no contexto autorizado do condomínio e testa a hipótese de respostas confiáveis com evidência. |
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
- recuperação somente de fontes autorizadas;
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

Estados mínimos: `uploaded`, `processing`, `ready`, `needs_review` e `failed`.

### RQ-003 — Versão e vigência

Cada arquivo processado deve gerar uma versão documental imutável com tipo, procedência, datas de vigência e relação com versões anteriores quando conhecidas. Uma nova versão não apaga nem substitui silenciosamente a anterior.

### RQ-004 — Recuperação isolada

Toda busca deve aplicar o `condominium_id` autorizado antes de qualquer ranking ou seleção de contexto. O filtro deve existir no armazenamento, nos índices, no cache e no código de aplicação.

### RQ-005 — Resposta fundamentada

A geração só pode ocorrer depois da recuperação de evidências suficientes. Cada afirmação sobre o condomínio deve ser sustentada por uma ou mais evidências retornadas pelo recuperador.

### RQ-006 — Citações verificáveis

Cada citação deve conter:

- identificador e título do documento;
- identificador da versão;
- página humana;
- trecho apresentado ao usuário;
- localização interna suficiente para abrir a fonte.

O trecho exibido deve existir no texto processado da página indicada.

### RQ-007 — Abstenção

Quando não houver evidência suficiente, a resposta deve declarar a limitação, informar o que foi consultado e sugerir qual documento ou validação pode resolver a dúvida. Não deve completar a resposta com conhecimento geral como se fosse regra do condomínio.

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

Falhas em OCR, busca, banco, provedor ou validação não podem produzir uma resposta aparentemente completa. O sistema deve retornar estado de falha recuperável ou pedir nova tentativa.

### RQ-014 — Formato da resposta

A interface deve distinguir:

1. resposta direta;
2. base documental;
3. pontos de atenção;
4. próximo passo sugerido;
5. quando consultar um especialista.

Se uma seção não for aplicável, o contrato pode representá-la vazia sem inventar conteúdo.

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
