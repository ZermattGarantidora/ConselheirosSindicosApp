# Spec 058 — Histórico completo e durável da conversa

**Status:** implementada e validada tecnicamente com dados sintéticos; lançamento não autorizado  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-11-03

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Evita perder o trabalho já realizado e repetir o contexto ao procurar uma conversa. |
| Público | §3 | Mantém o histórico privado dos síndicos moradores e profissionais. |
| Proposta de valor | §§5 e 6 | Permite continuar a conversa e recuperar o que ambos disseram. |
| Prioridades do MVP | §7, Blocos 3, 5 e 6; §8, Histórico das conversas | Detalha o requisito de conservação explicitamente estabelecido pelo usuário antes do lançamento. |
| Segurança e confiança | §§8–10 | Preserva autorização, fontes atuais, isolamento, retenção e a distinção entre histórico e evidência. |
| Validação e métricas | §§13–14 | Exige recuperação demonstrada de mensagens confirmadas, testes de restauração e continuidade sem perda silenciosa. |

### Limites respeitados

Sem módulo paralelo, memória global, treinamento, novo provedor, envio externo adicional ou
expansão automática da janela da IA. A demonstração em RAM continua permitida em testes,
conforme esclarecimento do usuário; a obrigação de durabilidade vale antes do lançamento.
Esta decisão define critérios e lacunas e não declara a implementação pronta. Dados reais
não entram em testes, fixtures, evals ou ensaios de recuperação.

### Divergências da visão

Nenhuma. O usuário solicitou salvar as mensagens da Alvitra e fazê-la considerar as próprias
respostas, escolhendo “As duas coisas”. Esclareceu que, no produto final, ambos os lados devem
estar sempre disponíveis para consulta. O briefing e o MVP foram atualizados na mesma decisão.
Isso amplia a exigência de conservação das Specs 038/043 antes do lançamento, sem remover seus
controles de autorização e evidência.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema e testa uma hipótese descritos no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

O síndico recupera o histórico completo do que enviou e recebeu e continua o assunto sem perder
mensagens confirmadas quando a aplicação reinicia ou é atualizada.

## 2. Promessa testada

> O que foi confirmado como salvo continua na conversa, com os dois lados e suas referências.

## 3. Usuário primário

Síndico que retorna para consultar orientações, conferir o que foi informado e continuar uma
tarefa no mesmo chat e condomínio autorizados.

## 4. Escopo

- Conservação de mensagens do síndico e da Alvitra: abertura, cadastro, perguntas/respostas,
  confirmações e comentários sobre documentos, inclusive o comentário conjunto do lote.
- Registro antes de confirmar salvamento, recuperação paginada e reexibição fiel.
- Retomada pela IA das mensagens pertinentes dos dois lados, com procedência e fontes atuais.
- Evidências de durabilidade em reinício/atualização e de recuperação do armazenamento.
- Separação explícita entre demonstração volátil e requisitos do produto lançado.

## 5. Fora do escopo

Garantir persistência a cada tecla de um rascunho não enviado, memória ilimitada do modelo,
replay irrestrito de fatos antigos, uso de outro chat sem autorização ou retenção incompatível
com exclusão/política aprovada. A identificação de necessidade de backup não escolhe nem
contrata um serviço; a decisão operacional precede sua configuração.

## 6. Pré-condições

Specs 021, 024, 038, 043, 045 e 057; ADRs 0028, 0032 e 0036. Persistência exige contexto de
usuário autorizado e condomínio/chat quando a mensagem já pertence ao domínio. Mensagens de
identidade/configuração anteriores à criação do condomínio precisam de vínculo autenticado ao
usuário e associação posterior explícita, sem copiar conteúdo entre condomínios. Esse contrato
é detalhado pelo ADR 0037 e pela implementação autorizada abaixo; sua aprovação exige os testes desta spec.

## 7. Requisitos funcionais

### RQ-5801 — Ambos os lados registrados

Toda mensagem confirmada como recebida/salva e toda fala entregue pela Alvitra possuem identidade,
autoria/procedência, horário e vínculo recuperável à conversa. O conteúdo original é conservado;
a IA não recria depois uma fala que faltou. Mensagens auxiliares não ficam somente no estado da
página. Falha em registrar uma fala não pode ser apresentada como sucesso de salvamento.

A aceitação ou recusa de uso documental digitada no compositor (Spec 037) conserva o texto
original, a versão e o chat autorizados no journal. Não substituir por uma fala pronta do usuário.
Uma legenda de envio documental (Spec 057, AC-5716) também conserva o texto literal junto do
comentário gerado do lote. O ACK só acontece depois da gravação; não fabricar pergunta para
obter a análise nem confirmar como salvo um texto que ficou somente na página.
Falha de gravação não devolve sucesso de salvamento; uma retentativa idempotente pode concluir o
registro de uma decisão já aplicada, sem liberar outra versão nem duplicar a mensagem.

### RQ-5802 — Consulta íntegra e isolada

Reabrir, recarregar, sair/entrar ou atualizar o sistema preserva conteúdo, sequência e referências
autorizadas, sem omissão/duplicação por paginação ou repetição de requisição. Outro usuário,
condomínio ou chat não recebe esse conteúdo. Ocultar a organização não exclui a trilha auditável.
Fontes removidas conservam somente o histórico permitido pela política vigente, sem parecer fonte
atual ainda disponível.

No envio de anexos, a bolha temporária é substituída pela entrada confirmada do mesmo upload
quando o histórico chega. O arquivo aparece uma vez, na posição do envio, antes da resposta;
progresso, confirmação pendente e falha continuam acessíveis nessa entrada. A correspondência usa
condomínio e versão, nunca somente o nome do arquivo. Versões distintas, mesmo com nomes iguais,
permanecem visíveis. Falha ao carregar o histórico conserva o anexo temporário. Esse ajuste atende
briefing §§1, 6 e 8: reduz repetição na conversa dos blocos autorizados e preserva a memória
verificável, sem novo envio, geração, serviço ou alteração da persistência.

### RQ-5803 — Durabilidade antes da confirmação

O produto lançado usa armazenamento durável e confirma salvamento somente após concluir a
gravação correspondente. Falha de rede, banco ou gravação mantém estado explícito e permite
retentativa idempotente; não substitui histórico por vazio. Reinício, implantação e migração
devem ser ensaiados com mensagens sintéticas de ambos os lados. Backup e restauração exigem
procedimento operacional definido e execução comprovada antes do lançamento.

### RQ-5804 — Lembrança com procedência

A IA recebe mensagens pertinentes dos dois lados do mesmo chat autorizado, dentro do orçamento
definido. Guardar o histórico completo não aumenta automaticamente oito interações/12.000 bytes.
Perguntas e relatos não viram comprovação documental. Para reutilizar uma resposta documental,
suas dependências e fontes precisam continuar autorizadas, aplicáveis e verificáveis; uma
resposta antiga não dispensa recuperação de evidência. Fonte removida, revogação, mudança de
versão e conflito precisam de tratamento explícito. A exceção ao replay restrito do ADR 0032
exige contrato e regressões próprios antes de ativação, sem enfraquecer o validador.

Correção de continuidade de 03/11/2026: uma aceitação breve, como “quero ajuda” ou “sim, por
favor”, após comentário documental deve recuperar novamente o assunto do comentário recente.
Títulos e trechos das citações registradas pelo servidor podem orientar somente essa busca,
como dados não confiáveis; não entram como resposta antiga nem como evidência na geração.
Usar somente a janela efetivamente retida do mesmo chat, até oito interações, sem atravessar
uma nova pergunta independente. A referência de busca usa trechos inteiros, até 4.000 bytes,
e referência, pergunta e memória juntas respeitam 12.000 bytes. Fontes atuais continuam limitadas
ao orçamento existente, autorizadas e sujeitas à qualidade, vigência e validação de citações.
Sem fonte recuperada, esclarecer o limite sem reutilizar fatos antigos. A pergunta original
permanece intacta no gateway e na persistência. Não mudar prompt, provedor ou número de gerações.
Depois da recuperação, o foco da tarefa identifica separadamente a pergunta de ajuda aceita,
extraída da última frase interrogativa de um comentário validado do servidor (até 400 caracteres).
Essa pergunta é intenção conversacional, não comprovação dos fatos da resposta antiga. Exige
evidência atual autorizada da mesma versão e página citada, ausência de instrução hostil e o
mesmo orçamento da memória; sem essa base, a oferta antiga não entra no contexto. Não reenviar
o corpo do comentário nem converter a pergunta da assistente em fala do usuário.
Quando houver evidência atual, recusar uma negação explícita de acesso ao arquivo também quando
vier acompanhada de finalidade, como “não consigo acessar o arquivo para conferir a convenção”.
Ausência de assinatura comprovada ou de versão vigente não equivale a ausência de arquivo.

Atende briefing §§1, 2, 6, 8–10 e 13: permite aceitar a ajuda oferecida na conversa, com nova
recuperação de evidência, sem pedir novamente o documento disponível. O gate competitivo mantém
os blocos de chat e memória já autorizados e usa regressões sintéticas de continuação, troca de
assunto, fonte ausente e isolamento, sem serviço ou capacidade posterior.

### RQ-5805 — Separação do ambiente de teste

A demonstração atual pode continuar em RAM e perder histórico quando sua API reinicia. Recarregar
somente a página conserva os registros já salvos enquanto o mesmo processo está ativo. Essa
limitação deve permanecer clara e não conta como aprovação do gate de produção.

## 8. Contratos

### Implementação autorizada em 30/10/2026

O usuário confirmou concluir também este histórico antes da nova bateria Luna high/Sol low.
O ADR 0037 registra a solução: journal canônico no PostgreSQL com RLS e adaptador equivalente
em RAM para demonstração, sem mudar o contrato de autenticação ou o system prompt.

- Escopo é conta/sessão de configuração antes do condomínio; depois é usuário/condomínio/chat
  atualmente autorizado. O cliente escolhe somente escopos próprios e envia texto de usuário.
  Falas da assistente vêm de resultados do servidor; histórico recebido no corpo não é prova
  de autoria e não substitui o histórico do servidor.
- Entradas incluem ID, autoria, tipo, conteúdo original, horário/ordem, referências e recibo
  idempotente da operação. Chave repetida com a mesma entrada devolve o resultado confirmado;
  payload diferente é conflito. Falha de gravação não confirma sucesso nem devolve histórico vazio.
  A criação do condomínio durante o cadastro também conserva recibo idempotente privado, sem
  inventar uma fala: perda da resposta pode retomar o contexto já criado, após revalidar acesso,
  sem criar outro condomínio ou confirmar uma criação inexistente.
  No PostgreSQL, cadastro e recibo de criação participam da mesma transação, com serialização
  por usuário/chave e rejeição de payload divergente, inclusive quando a gravação posterior do
  journal falha. O recibo não dispensa autorização atual para retomar o cadastro.
- A API fornece consulta paginada completa e a interface a reexibe na conversa. Associação de
  configuração a chat é explícita e não copia/reassocia mensagens entre condomínios. Legado de
  perguntas/respostas conserva seu conteúdo e procedência, sem geração de texto retroativa.
- Replay usa somente registros do servidor no mesmo chat. Resposta documental só entra quando
  o ledger completo de dependências corresponde a IDs, versões, páginas e hashes das fontes
  atuais; ledger ausente/transitivo desconhecido, remoção, revogação e conflito impedem replay.
  Nenhuma resposta antiga vira comprovação atual por estar salva.
- Backup/restauração e reinício devem ser executados com dados sintéticos no destino guardado,
  conservando identidades, conteúdo, sequência e isolamento. Backup tem versão/checksum e
  destino de restauração isolado; não introduz serviço externo ou uso de dados de clientes.

Atende §§2, 4–6, 7 (Blocos 3/5/6), 8–10 e 12–14 do briefing. O gate competitivo é atendido pela
continuidade verificável no chat, redução de repetição e regressões/ensaios de recuperação.
Não amplia janela, provedor, interface paralela ou autenticação futura. Implementação e provas
serão registradas antes de alterar este status para validado.

Preservar os contratos de perguntas/respostas existentes e sua trilha auditável. O registro das
demais falas precisa de identidade/procedência verificável do servidor: um corpo do cliente não
pode forjar fala da Alvitra para reutilização como contexto confiável. A decisão inicial de
somente documentar o requisito foi sucedida pela implementação autorizada em 30/10/2026;
as provas executadas e limitações operacionais devem constar no relatório correspondente.

## 9. Requisitos não funcionais

Zero perda silenciosa de mensagens confirmadas, zero acesso cruzado, nenhum conteúdo real em
testes e nenhum conteúdo de chat em logs. Cobertura mínima de 80% nos quatro indicadores, com
testes de falha/repetição e integração real da persistência. Continuidade da IA é validada
separadamente por evals; histórico salvo sozinho não certifica lembrança ou resposta correta.

## 10. Critérios de sucesso

Todos os cenários de aceitação executados e aprovados, incluindo restauração e reinício, sem
mensagens confirmadas faltantes. A base de testes de produção deve incluir as falas auxiliares
e ambos os lados, além das perguntas/respostas já existentes. Ausência de implementação ou
evidência de execução bloqueia o lançamento.

## 11. Questões em aberto e estado observado antes da implementação

O estado abaixo é histórico. A implementação e as provas de 31/10/2026 estão em
`technical-validation-2026-10-31.md`; os limites de operação real permanecem explícitos nesse relatório.

- Perguntas/respostas normais já são persistidas por `AnswerPersistence`; PostgreSQL conserva
  esses registros entre processos e RAM não os conserva após reinício.
- `setupMessages` e `documentConversationMessages` em `App.tsx` mantêm falas fora desse histórico:
  abertura, cadastro, confirmações e comentários de documentos ainda precisam de registro e
  reexibição completos. A confirmação geral de produção permanece pendente.
- O contexto atual reaproveita respostas gerais de procedência segura; respostas documentais
  são omitidas pelo ADR 0032. O perfil básico é recarregado separadamente pela Spec 021.
- Falta definir o registro anterior ao condomínio, a extensão de persistência, a ordem completa
  de mensagens, o replay com dependências revalidadas e os ensaios operacionais de recuperação.

## Gate competitivo

Mantém o chat e os blocos autorizados; reduz repetição e perda de trabalho; preserva evidência,
isolamento e decisão humana; diferencia pela continuidade verificável; valida por testes de
recuperação e evals; reutiliza persistência e autorização existentes antes de considerar serviço
adicional. O requisito não autoriza antecipar autenticação WhatsApp ou outro módulo.

## Gate para mudar o status

Esta spec só será implementada/validada quando os contratos pendentes, critérios de aceitação,
testes de integração, evals, cobertura e revisão estiverem concluídos. O gate de visão estrutural
valida a documentação e não aprova durabilidade de produção. A definição deste requisito, por si,
não libera lançamento nem altera a API de demonstração.
