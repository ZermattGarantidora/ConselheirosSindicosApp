# Critérios de aceitação — Spec 069

## AC-6901 — Ociosidade, sequência e encerramento (P0)

O worker aguarda quando não há trabalho, processa novos jobs em sequência, sobrevive a falha recuperável, encerra a espera ao receber sinal e não reserva novo trabalho após o encerramento. O pool é fechado uma vez após a tarefa ativa.

## AC-6902 — Renovação e tentativa antiga (P0)

Uma tarefa demorada renova a reserva. Outro worker não a reivindica antes do vencimento. Renovação de outro condomínio/tentativa, reserva vencida ou erro de renovação impede conclusão antiga e não altera o job atual.

## AC-6903 — Queda, retentativa e esgotamento (P0)

Job abandonado é retomado após o lease. Resultado antigo é recusado; repetição não duplica artefatos. Falha transitória não marca o documento como terminal. Queda na última tentativa termina em falha explícita após vencer a reserva.

## AC-6904 — API e worker separados (P0)

Upload retorna 202 e original recuperável com o worker parado. Iniciar o worker compilado em outro processo torna a versão disponível. Reiniciar a API conserva original, metadados e estado. Consulta enquanto há fila responde sem iniciar processamento na API.

## AC-6905 — Retomada no chat (P1)

Anexo recuperado do histórico consulta o catálogo atual do mesmo condomínio/versão. Acompanhamento distingue processamento, pronto, revisão e falha; atualização não duplica mensagens nem atribui texto operacional à Alvitra. A espera da página não cancela a fila.

## AC-6906 — Leitura longa e isolamento (P0)

Processar PDF sintético de 300 páginas em processo separado, verificar todas as páginas, hashes, original e fonte na página 300; outro condomínio não lê documento, catálogo ou fonte. PDF parcialmente ilegível não fica pronto.

## AC-6907 — Dez identidades e recuperação (P1)

Ensaio guardado atende dez identidades sintéticas durante a execução do worker, registra tempos, interrompe/reinicia o processador e confirma conclusão única. Relatório não chama IA externa nem certifica latência de produção.

Backend local recusa URL remota, hostname não literal, query/fragment, nome divergente,
confirmação ausente ou marcador inválido antes de fixtures/TRUNCATE. Build e relatórios são
exclusivos; filhos recebem ambiente mínimo sem `.env`. A execução positiva usa API/worker
compilados e banco próprio. A matriz RLS usa outro banco marcado e conserva suas assertivas.

## AC-6908 — Configuração e operação (P0)

Blueprint do piloto tem web/worker separados, sem worker incorporado na API, sem segredos versionados e sem execução de migrations sintéticas no destino real. Documentação contém comandos de build, execução, atualização, restauração e limites de fornecedor; não há contratação ou deploy automático nesta entrega.

O complemento da Spec 070 verifica Node 24 e janela de encerramento de 300 segundos, flags de
demo/IA não autorizadas desligadas e ausência de chave de conversa no worker. Validar sintaxe
local não substitui validação do fornecedor nem comprova conclusão antes de SIGKILL.

Em 25/11, o web do Blueprint persistente reutiliza `alvitra-demo-sintetica` em Oregon e
ambos os serviços mantêm Node 24, `1c-2g`, auto-deploy desligado e a mesma revisão revisada.
`render.yaml` espelha o plano já contratado, mas mantém a demonstração até a troca validada.
Não criar automaticamente outro web, worker pago ou alterar o banco em integração.

## AC-6909 — Fechamento da API em atualização (P0)

SIGTERM e SIGINT iniciam o fechamento uma vez; com fechamento pendente, sinais repetidos
não o duplicam e os hooks continuam aguardados. Ao concluir, os listeners são removidos.
Falha chama diagnóstico sem expor a mensagem original e define saída de erro no entrypoint.
O teste usa sinais simulados, sem terminar o processo de testes.

## AC-6910 — Domínio canônico sem redirecionamento aberto (P0)

Sem configuração, o atendimento mantém o comportamento atual. Com origem HTTPS e aliases
válidos, GET/POST no alias retornam 308 para o principal, conservando caminho e query.
Host principal, host desconhecido e `/health` não redirecionam. `X-Forwarded-Host` não muda
o destino. URL iniciada em `//`, barras invertidas e caminho absoluto não podem produzir
Location externo. Origem com usuário/senha/path/query, protocolo inseguro, aliases com URL,
wildcard, duplicados ou iguais ao principal são recusados antes de iniciar o servidor.
