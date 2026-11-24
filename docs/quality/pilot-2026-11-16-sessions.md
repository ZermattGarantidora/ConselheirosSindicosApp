# Roteiro presencial e acompanhamento — piloto 16/11/2026

**Estado:** proposta pronta para revisão, sem sessão marcada, convite enviado ou uso real liberado.  
Referências: Spec 011 RQ-1101–1106 e AC-1102/1104–1110; briefing §§2, 4–10 e 13–14.

## Preparação e papéis

Nomear facilitador, suporte técnico, especialista de domínio conforme as perguntas, decisor de
pausa e substituto operacional. O facilitador observa a tarefa; não responde como advogado,
contador ou engenheiro. Registrar nomes/canais reais somente em documento privado aprovado.
As pendências e papéis estão na [matriz](../security/pilot-2026-11-16/responsabilidades.md).

Proposta: 3–5 síndicos e no máximo cinco condomínios, sessões individuais de 60 minutos no
próprio aparelho e um segundo aparelho para continuidade. Usar conta/condomínio separados por
participante; não projetar conversa real para a sala nem usar conta compartilhada em computador
de demonstração. Preparar computador com navegador atualizado, celular Android/iOS conforme
disponibilidade, Wi-Fi aprovado e rede móvel de contingência, tomada e carregador. Não presumir
que todos terão ambos os sistemas; registrar a cobertura realmente observada.

Até a liberação, ensaiar todo o roteiro com PDFs textuais, digitalizados e fotos **inteiramente
sintéticos**. O exercício técnico não é uma sessão com cliente nem autoriza documentos reais.
O pacote sintético deve incluir texto claro, imagem rotacionada/desfocada, número financeiro
ambíguo, pergunta sem base, versões conflitantes, instrução maliciosa e documento do outro tenant.
Não usar o acervo real para montar benchmarks ou casos de regressão, mesmo anonimizado.

## Antes da sessão — verificação privada

- Identificador da candidata/configuração e decisão de liberação registrados com todos os
  [gates](pilot-2026-11-16-release-gates.md); sem P0/P1 aberto e com suporte disponível.
- Participação voluntária, aviso e autorização documental específicos nas versões finais aceitos,
  poderes e escopo verificados. Não enviar arquivos só para verificar se são permitidos.
- Documento(s) mínimos necessários e original disponível ao participante para conferir fontes;
  categorias não autorizadas retiradas previamente em local aprovado.
- Código entregue por operação pelo meio autorizado, conta/associação conferida e plano de
  revogação conhecido. Não anotar o código no formulário de observação.
- Limites de upload, tempo, custo e atendimento explicados. Confirmação de que a sessão não
  grava áudio/vídeo/tela. Se houver proposta de gravação, consentimento separado com finalidade,
  guarda, destinatários, prazo e opção de recusar sem perder a participação.

## Sessão de 60 minutos — proposta a aprovar

| Tempo | Tarefa | O que observar e registrar sem conteúdo real |
|---|---|---|
| 0–8 min | Explicar atividade, limites e direito de parar; conferir aceites | Versões aceitas, dúvidas gerais e opção de gravação; sem documento/assinatura no Git |
| 8–15 min | Entrar com código e iniciar a conversa, fornecendo contexto gradualmente | Tempo até conseguir conversar, erros, assistência, se confundiu código com nome; sem exigir anexo no cadastro |
| 15–27 min | Fazer uma pergunta que precise de documento e enviar apenas o item autorizado | Esforço, escolha de formato, progresso/erro e clareza sobre qualidade; PDF digitalizado/foto quando liberados |
| 27–37 min | Pedir informação local e conferir a citação no original | Conclusão, documento/versão/página/trecho sustentam a afirmação? Classificar verificação, sem copiar trecho |
| 37–43 min | Perguntar algo para o qual falta documento/período ou a imagem é incerta | Se explicou limite/pediu só o necessário; diferença entre ajuda geral e conclusão local; não induzir resposta perigosa |
| 43–50 min | Recarregar, reabrir histórico e conectar segundo aparelho próprio | Mensagens dos dois lados, contexto correto; sair de um preserva outro; registrar eventual perda, sem prints |
| 50–55 min | Encontrar documentos/Perfil e explicar como pedir suporte ou retirada | Compreensão do código, acesso próprio e canal; nenhuma exclusão/ação irreversível sem confirmação humana |
| 55–60 min | Perguntar utilidade, esforço e próxima tarefa | Escalas/contagens abaixo; não coletar depoimento público ou lead |

Troca entre condomínios só para participante com associações válidas. Tentativas maliciosas de
IDOR, restauração, exclusão e revogação administrativa são ensaiadas antes com sintéticos, não
improvisadas no acervo real durante a sessão. Se o formato estiver indisponível, interromper a
tarefa afetada e registrar limitação; não trocar de fornecedor ou enviar manualmente para uma IA.

## Intervenções e registro

Começar com a tarefa e deixar a pessoa agir. Se ela pedir ajuda ou ficar bloqueada por cerca de
dois minutos, registrar intervenção e usar a menor explicação necessária. Intervenção técnica
não transforma a tarefa em conclusão independente. Não sugerir o conteúdo da resposta correta.
Se houver risco ou dúvida de autorização, pausar imediatamente em vez de esperar dois minutos.

Ficha privada por tarefa: ID pseudonimizado de sessão, código de tarefa, tipo de aparelho/formato,
horários/duração, concluída sem ajuda / com ajuda / não concluída, número e categoria das
intervenções, fonte verificável sim/não/não aplicável, limite explicado sim/não, incidente por
código e referência privada do suporte. Evitar texto livre; se indispensável, sanitizar antes do
registro técnico. Relação ID/pessoa, aceites e conteúdo ficam fora do Git e relatórios públicos.

| Métrica | Cálculo / pergunta | Uso |
|---|---|---|
| Primeira conversa útil | Minutos desde acesso até resposta útil ou próximo passo aceito | Mediana/faixa, separando pessoas assistidas |
| Conclusão | Tarefas concluídas sem ajuda / tarefas tentadas, com denominador | Validar redução de esforço; não chamar todos os casos de sucesso |
| Evidência | Afirmações documentais revisadas sustentadas / revisadas | Meta da Spec 011: 100%; qualquer falha exige pausa/investigação |
| Abstenção | Casos sem base em que explicitou limite / casos observados sem base | Meta da Spec 011: 100%; registrar incerteza de revisão |
| Esforço | “Foi fácil fornecer o que faltava?” escala 1–5 | Medir atrito, sem pedir mais arquivos para melhorar score |
| Utilidade/confiança calibrada | “Conseguiu avançar?” e “Sabe o que conferir antes de agir?” 1–5 | Confiança não substitui correção nem fonte |
| Tempo poupado | Estimativa voluntária comparada ao modo habitual, com faixa | Autodeclaração, separada do tempo medido |
| Custo/latência | Consumo e duração minimizados por tarefa/condomínio; custo/resposta aprovada | Limites aprovados antes da sessão; alerta não substitui bloqueio compartilhado |
| Retorno/suporte | Retorno semanal, intervenções e pedidos por categoria | Evidência exploratória de recorrência, sem prospecção |

## Pausa, retomada e ampliação

Pausar diante de acesso cruzado, sessão revogada aceita, segredo/conteúdo real em registro técnico,
perda de mensagem confirmada, afirmação documental falsa/sem fonte, citação inventada, ação externa
não confirmada, instrução de documento seguida ou suspeita de autorização insuficiente. Isolar
a operação afetada, acionar segurança/decisor e preservar somente evidência mínima privada. Falha
de rede, custo excedido, limite, processamento preso ou especialista ausente interrompe a tarefa
afetada; suporte informa o estado sem prometer que um upload falho foi salvo.

Retomar só com causa/impacto tratados, revisão independente e gates afetados reexecutados no
commit/configuração efetivos. Qualquer incidente de isolamento exige pausa de toda a coorte.
Comunicações ficam sob responsável competente, com confirmação humana; não contatar terceiros
por este roteiro.

Não ampliar além de cinco condomínios por esta spec. Proposta para decidir avanço dentro da coorte:
primeira sessão liberada, revisão das observações no mesmo dia, zero incidente/P0/P1 e gates
válidos; todas as fontes/abstenções revisadas corretas e participante capaz de concluir a consulta
com fonte. Produto deve aprovar limiar de esforço/tempo e custo antes de usar esses números como
critério. Sem limiar aprovado, não alegar validação comercial ou expandir por avaliação subjetiva.

## Acompanhamento e suporte — sem automação/convites

Executar por dependência e disponibilidade, sem lotes diários nem datas intermediárias. A meta
final de início continua 16/11/2026. Preparação aprovada libera ensaio; gates e aceites liberam
sessão; observações revisadas liberam continuação; incidente bloqueia retomada até correção e
novos gates. Após iniciar, acompanhar por quatro semanas conforme a Spec 011, medindo retorno,
tarefas e suporte com dados mínimos e revisão competente. Não transformar material observado
em fixture/dataset. Nenhuma mensagem de acompanhamento foi enviada ou agendada por este roteiro.

Suporte a preencher antes da liberação: canal [ ], horário presencial/remoto [ ], responsável [ ],
substituto [ ], capacidade simultânea [ ], objetivo de resposta [ ], escalonamento [ ], decisor
de pausa [ ]. Dúvida interpretativa vai para profissional de domínio; suporte técnico não dá
parecer. Para falta de rede: parar envios, manter o original privado e retomar só após conferir
estado/duplicação; não usar e-mail/mensageiro como upload alternativo sem aprovação.
