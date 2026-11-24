# Aceitação — Spec 060

- **AC-6001 / RQ-6001:** stream sintético com evento passivo documentado entre raciocínio e fala
  válida conclui sem transferir texto do evento para resposta; estrutura inválida, tipo desconhecido,
  ferramentas, erro de turno e ausência de conclusão permanecem recusados. Diagnóstico não copia
  conteúdo nem nomes de campo livres do evento.
- **AC-6002 / RQ-6002:** variantes históricas com `response`/`answerMode`/campos de protocolo,
  texto adjacente ou cerca são recusadas nos dois caminhos; retentativa pode produzir fala natural,
  sem extrair o JSON rejeitado. JSON técnico sem assinatura de envelope continua permitido.
- **AC-6002b / RQ-6002:** na variante local de teste, perguntas sem evidência recebem contrato
  técnico de texto natural, sem instrução concorrente para produzir envelope JSON e sem schema de
  saída. Com evidência, o contrato e schema documentais permanecem. Configuração `setup_turn`
  mantém seu contrato próprio. A telemetria identifica a nova variante; envelope eventualmente
  recebido continua rejeitado, sem extração silenciosa ou chamada adicional.
- **AC-6003 / RQ-6003:** em competição com mais de oito páginas, “próximo passo para cada unidade”
  conserva a página do acordo de U-A e saldos de U-A/U-B; variantes com IDs distintos não dependem
  do corpus do benchmark. Correção singular, fonte removida, outro tenant e qualidade baixa não
  promovem evidência indevida.
- **AC-6003b / RQ-6003:** quando principal e proposta compartilham o cabeçalho “cotas e acordos”,
  a reserva distingue cabeçalho de condições de proposta, assinatura, aceite ou pagamento; conserva
  ambas as páginas dentro das oito fontes. O caso deve falhar na seleção anterior e passar na
  corrigida, também com identificadores alternativos e concorrência de páginas mais pontuadas.
- **AC-6003c / RQ-6004:** inferência de unidades em fontes atuais reconhece identificadores de
  unidade e linhas de principal/proposta, inclusive IDs alternativos, sem transformar “data-base”
  ou outras palavras hifenizadas em unidades. Resposta com próximos passos por unidade real passa;
  omissão do estado de uma unidade real continua recusada.
- **AC-6004 / RQ-6004:** fechamento financeiro com fonte atual não troca resultado por saldo nem
  total por ordinário; reconhece formulação equivalente de conciliação/comprovantes. Falta de
  campo pedido, erro monetário, período errado e ausência real permanecem rejeitados.
- **AC-6005 / RQ-6004:** síntese preserva condições por versão, conflitos de locação/salão,
  proposta/aceite por unidade e próximo passo de avaliação/liberação técnica quando pertinentes;
  não atribui culpa, execução ou autorização. Na falta de contexto recente, esclarece o limite.
- **AC-6005b / RQ-6004:** em consulta com fonte pendente, o schema exige claims documentais de
  interpretação, inclusive sobre a versão confirmada, evitando trocar a citação para manter
  um rótulo factual; interpretações continuam sujeitas à validação de conteúdo. Retorno
  explícito à competência corrigida exclui obrigação antiga de outra competência; comparação
  explícita conserva ambas. Diferença correta entre recebimentos/pagamentos satisfaz resultado,
  mas montante incorreto e total rotulado ordinário permanecem recusados.
- **AC-6005d / RQ-6004:** impacto anual hipotético de diferença mensal entre versões do mesmo
  contrato é calculado por 12 meses explicitados, com os dois preços nas citações. Valor errado,
  fontes de contratos distintos ou soma de manutenção com modernização não ganham essa permissão.
- **AC-6006 / RQ-6005:** após gates, nova rodada com as duas condições exatas produz 560
  checkpoints/2.020 turnos e auditoria de 160 registros; resposta, fonte e hash verificáveis,
  posição 54 excluída nos dois modelos, denominador 79 e falhas fora da amostra visíveis.
- **AC-6005c / RQ-6004:** pedido do número que identifica a cobrança corrigida conserva unidade
  e principal documentado, quando disponíveis. Abstenção sem citação não pode embutir regra local
  afirmativa atribuída a “os registros”, mesmo após “não posso afirmar”; limite sem fato local
  continua permitido.
- **AC-6005e / RQ-6004:** em conversa de 30 turnos sem anexos, o gateway sintético fecha o
  rascunho com o título corrigido ainda recuperável por falas gerais validadas na janela e inclui
  a conferência de versões solicitada. Não declara reunião, envio ou deliberação ocorridos, não
  recupera rótulos fora da janela e não termina em `failed` por uma recusa genérica. Variantes
  usam outros títulos e pedidos; se o título não estiver disponível, pedem confirmação. O mesmo
  roteiro com IA real é registrado separadamente e não herda aprovação do modo sintético.
