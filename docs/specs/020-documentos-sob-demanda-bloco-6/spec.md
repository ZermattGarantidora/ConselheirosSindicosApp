# Spec 020 — Documentos sob demanda, Bloco 6 da reestruturação

**Status:** implementada e aguardando aprovação do usuário  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-29

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

O ajuste de comunicação solicitado em 2026-10-27 detalha briefing §§1, 6.4, 7 (Bloco 6) e 9:
enviar os documentos relevantes é essencial para conhecer o condomínio; sem eles, fica difícil
ajudar com precisão sobre fatos locais. A fala enfatiza essa necessidade e convida ao envio,
sem minimizar sua importância ou oferecer adiamento espontâneo. O fluxo continua aceitando
orientação geral enquanto aguarda o material, conforme a visão. O gate competitivo é atendido
por explicitar o valor da memória documental na conversa já autorizada, sem novo módulo,
dependência, provedor ou chamada adicional; testes e smoke sintético verificam a comunicação.

A correção solicitada em 2026-10-29 detalha briefing §§1, 2, 6.6 e 7 (Bloco 6): ao confirmar o
envio, os anexos deixam de ocupar a caixa de mensagem e o acompanhamento fica no chat. Atende
ao gate competitivo por reduzir atrito na entrega de evidências para a memória autorizada,
sem antecipar blocos, alterar isolamento ou exigir nova confirmação. Reutiliza os estados de
envio e recuperação existentes, sem dependência, custo de IA ou capacidade adicional; testes de
renderização verificam seleção, envio e retorno somente dos arquivos não recebidos.

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

O chat abre, aceita perguntas e respostas conversacionais sem exigir documento ou checklist inicial. A conclusão da configuração explica que enviar os documentos relevantes é essencial para a Alvitra conhecer o condomínio e ajudar com precisão sobre suas regras, decisões, valores e histórico. Explicita que, sem eles, fica difícil oferecer essa ajuda e convida ao envio pela conversa. Não usa a frase “não precisa enviar”, não oferece adiamento espontâneo nem trata os arquivos como opcionais. A configuração não aguarda upload ou confirmação sobre anexos; a orientação geral permanece disponível enquanto o material não chega.

### RQ-2002 — Pedido mínimo e contextual

Quando não houver evidência suficiente para uma conclusão documental, a Alvitra se abstém, explica por que o documento relevante é necessário e indica somente o arquivo ou validação diretamente pertinente; não pede arquivos em cumprimentos ou de modo genérico. Enquanto aguarda, mantém a orientação geral e os próximos passos possíveis.

### RQ-2003 — Memória autorizada preservada

Um documento enviado explicitamente continua no pipeline privado existente e, após processamento, só pode fundamentar consultas do mesmo `condominium_id` autorizado.

### RQ-2004 — Mensagem junto com o anexo

A seta e Enter enviam o arquivo selecionado e preservam a mensagem digitada. O texto aparece
imediatamente no turno e a consulta é executada uma única vez depois que a versão enviada fica
pronta. Um envio somente com arquivo recebe confirmação e raio-X inicial automaticamente,
conforme a Spec 045, sem fabricar uma pergunta em nome do usuário. Falha no envio,
leitura incompleta ou espera excedida preserva a mensagem para nova tentativa e explica a
limitação, sem consultar silenciosamente outra base como se o anexo estivesse pronto.

### RQ-2005 — Recepção e leitura com estados distintos

Após armazenar e registrar o original, a API retorna 202 com a versão recebida sem aguardar
extração e indexação, inclusive na demonstração. O cliente acompanha essa versão no catálogo
autorizado, distingue envio, processamento, pronto, revisão e falha e limita sua espera a 60
segundos. O original continua disponível enquanto a leitura ocorre ou exige revisão. Progresso
usa indicador compacto; resultados, limitações de leitura e confirmações são comunicados pela
Alvitra em fala gerada, conforme a Spec 037. Falhas técnicas permanecem identificadas como
interface, sem fala fixa atribuída à Alvitra.

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

### RQ-2007 — Seleção e envio de vários arquivos

A pedido explícito do usuário em 2026-10-28, o seletor do chat aceita vários PDFs ou fotos
na mesma seleção e permite acrescentar arquivos em seleções seguintes. A lista mostra nomes e
remoção individual antes da confirmação pela seta ou Enter. Cada arquivo é validado separadamente
pelos tipos e tamanhos já permitidos; um inválido não descarta os válidos nem a mensagem. Repetir
a seleção do mesmo nome, tamanho, tipo e data de modificação não duplica o arquivo pendente.

Uma confirmação envia a lista inteira no condomínio e chat capturados. Para conter os picos de
memória, o próximo upload começa somente depois de terminar o acompanhamento da leitura do
anterior (até 60 segundos por arquivo). Cada original continua usando o endpoint privado
individual, sem juntar bytes em um corpo único ou iniciar uploads/leituras concorrentes no
cliente. O guard de capacidade da Spec 025 continua aplicável e pode recusar um novo envio.

O chat mostra, por arquivo, espera, envio, leitura e resultado ou erro; originais recebidos
continuam abríveis. Falha em um arquivo não interrompe os demais. Somente uploads não recebidos
permanecem na seleção para repetição; originais aceitos não são reenviados automaticamente.
Assim que o envio é confirmado pela seta ou Enter, a lista de anexos selecionados desaparece
da caixa de mensagem durante todo o envio e acompanhamento da leitura do lote. O progresso
continua no chat. Ao terminar, somente arquivos não recebidos reaparecem na caixa para nova
tentativa; falhas de leitura e confirmações de originais já recebidos permanecem no chat,
sem recolocar esses arquivos na seleção. Essa mudança de apresentação não descarta os arquivos
necessários à recuperação de falha no envio.
Pendências de condomínio são conservadas separadamente e confirmadas uma a uma, sem trocar ou
renomear o condomínio. A pergunta conjunta só é executada uma vez quando todos os arquivos
estiverem prontos; falha, revisão, timeout ou confirmação pendente preservam o texto para que
o usuário o envie depois de resolver as limitações. Na seleção de um único arquivo, permanece
a retomada após confirmação de condomínio prevista na Spec 037.

Mudança de chat/condomínio descarta a seleção e os estados transitórios anteriores; resultados
tardios não iniciam o próximo arquivo, não atualizam a nova conversa e não enviam a pergunta.
Sem texto, cada arquivo mantém recebimento e raio-X da Spec 045, sem pergunta fabricada.
A Spec 057 sucede a apresentação individual inicial em lotes: progresso por arquivo e resultados
prontos reunidos após as leituras, com detalhes acessíveis por documento e sem pergunta fabricada.

O alinhamento é com briefing §§2, 6.6, 7 (Bloco 6), 8–10 e 13: reduz o esforço para fornecer
evidências na conversa, preservando original privado, memória, evidência e autorização por
arquivo. O gate competitivo mantém os sete pontos acima e o sequenciamento já autorizado;
não antecipa blocos, não cria módulo, provedor, dependência, prompt ou operação externa nova.

## 3. Critérios de sucesso

- nenhum documento é exigido durante o cadastro e a necessidade dos arquivos para respostas locais fica clara;
- abstenções explicam o que falta sem inventar regra local;
- upload, vetorização, citações e isolamento existentes continuam cobertos pelos testes do núcleo documental.
- mensagem e anexo são tratados em um envio sem segunda ação do síndico;
- recepção não espera a leitura e nenhum estado pendente é apresentado como pronto;
- a visualização preserva o arquivo inteiro e o controle de acesso.
- uma seleção com vários arquivos exige uma só confirmação, mantém resultados individuais e
  não sobrepõe seus uploads/leituras; pergunta conjunta nunca ignora falhas de um arquivo.
- ao confirmar o envio, os anexos saem da caixa de mensagem e o progresso fica no chat; ao
  terminar, a seleção apresenta somente arquivos não recebidos que precisam de nova tentativa.
