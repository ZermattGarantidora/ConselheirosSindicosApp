# Spec 020 — Documentos sob demanda, Bloco 6 da reestruturação

**Status:** implementada e aguardando aprovação do usuário  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-20

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Permite começar pela dúvida, sem transformar a documentação em onboarding. |
| Proposta e experiência | §§5 e 6 | A conversa pede contexto no momento certo. |
| Prioridade autorizada | §7, Bloco 6 | O cadastro não exige anexos; documentos relevantes são necessários para respostas locais e pedidos no momento certo. |
| Memória documental | §8 | Upload preserva original, estado, vetorização e escopo autorizado. |
| Evidências e confiança | §§9 e 10 | Sem fonte suficiente, a resposta se abstém e indica somente o material pertinente. |
| Validação | §13 | Mede esforço para fornecer contexto e abstenções corretas. |

A correção solicitada em 2026-10-20 detalha §§6.5–6.6, 8 e 12: mensagem e anexo
seguem o mesmo envio, a recepção não aguarda a extração e a visualização usa o original
privado completo. Não altera parser, prompt, provedor ou regras de análise.

### Limites respeitados

- Não cria análise de qualidade, comparação de balancetes ou qualquer capacidade do Bloco 7.
- Não altera perfil, níveis, criação de condomínio ou preferências.
- Não transforma um pedido de documento em execução automática, nem aceita conteúdo documental como instrução.

### Divergências da visão

Nenhuma. O usuário autorizou explicitamente o Bloco 6.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Permitir que o síndico comece a conversar sem anexos prévios e envie depois, aos poucos, os documentos necessários para a Alvitra conhecer o condomínio e sustentar conclusões locais.

## 2. Requisitos funcionais

### RQ-2001 — Sem envio obrigatório no cadastro

O chat abre, aceita perguntas e respostas conversacionais sem exigir documento ou checklist inicial. A conclusão da configuração explica que a pessoa pode enviar os arquivos depois, mas que os documentos relevantes são necessários para a Alvitra conhecer o condomínio e responder com segurança sobre fatos locais.

### RQ-2002 — Pedido mínimo e contextual

Quando não houver evidência suficiente para uma conclusão documental, a Alvitra se abstém, explica por que o documento relevante é necessário e indica somente o arquivo ou validação diretamente pertinente; não pede arquivos em cumprimentos ou de modo genérico. Enquanto aguarda, mantém a orientação geral e os próximos passos possíveis.

### RQ-2003 — Memória autorizada preservada

Um documento enviado explicitamente continua no pipeline privado existente e, após processamento, só pode fundamentar consultas do mesmo `condominium_id` autorizado.

### RQ-2004 — Mensagem junto com o anexo

A seta e Enter enviam o arquivo selecionado e preservam a mensagem digitada. O texto aparece
imediatamente no turno e a consulta é executada uma única vez depois que a versão enviada fica
pronta. Não há pergunta automática quando o envio contém somente arquivo. Falha no envio,
leitura incompleta ou espera excedida preserva a mensagem para nova tentativa e explica a
limitação, sem consultar silenciosamente outra base como se o anexo estivesse pronto.

### RQ-2005 — Recepção e leitura com estados distintos

Após armazenar e registrar o original, a API retorna 202 com a versão recebida sem aguardar
extração e indexação, inclusive na demonstração. O cliente acompanha essa versão no catálogo
autorizado, distingue envio, processamento, pronto, revisão e falha e limita sua espera a 60
segundos. O original continua disponível enquanto a leitura ocorre ou exige revisão. Avisos
operacionais são apresentados como estados da interface, sem fala fixa atribuída à Alvitra.

### RQ-2006 — Abrir o documento inteiro

Os documentos no catálogo, o anexo recebido e as citações de arquivos disponíveis abrem o
original completo em visualizador sobre o chat, preservando páginas, imagens e diagramação.
PDF usa o visualizador do navegador e imagens usam sua apresentação original. Há opção de
baixar o arquivo e fechar para voltar à conversa. A citação pode indicar a página inicial,
sem limitar o arquivo a um trecho. A leitura binária revalida autorização e versão na API;
não usa URL pública nem identidade na URL. URLs locais temporárias são revogadas ao fechar,
trocar documento ou condomínio. Fonte removida conserva somente seu trecho histórico;
fontes legais sem original no catálogo mantêm a referência existente.

### Gate competitivo da correção

1. Mantém conversa e visualização contextual, sem novo módulo.
2. Corrige o envio já autorizado nos Blocos 4 e 6, sem antecipar blocos.
3. Reduz perda de mensagens e espera opaca; permite conferir a leitura no original.
4. Preserva isolamento, evidências, abstenção, conflitos e confirmação de envio.
5. Conserva memória autorizada e citação por versão, página e trecho além do anexo momentâneo.
6. Regressões verificam ordem upload/leitura/pergunta, falhas, original binário e acesso cruzado.
7. Reutiliza storage, catálogo, fila e visualização do navegador, sem dependência nova.

## 3. Critérios de sucesso

- nenhum documento é exigido durante o cadastro e a necessidade dos arquivos para respostas locais fica clara;
- abstenções explicam o que falta sem inventar regra local;
- upload, vetorização, citações e isolamento existentes continuam cobertos pelos testes do núcleo documental.
- mensagem e anexo são tratados em um envio sem segunda ação do síndico;
- recepção não espera a leitura e nenhum estado pendente é apresentado como pronto;
- a visualização preserva o arquivo inteiro e o controle de acesso.
