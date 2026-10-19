# Critérios de aceitação — Spec 036

## AC-3605 — Fontes independentes e lacunas preservadas

Dados os 50 cenários, quando o pacote é preparado, então as fontes contêm cláusulas, deliberações e valores sintéticos independentes do gabarito. Alterar `expectedResult` não altera pergunta nem fontes. Cenários com página/versão/trecho ausente, baixa qualidade ou resumo de terceiro mantêm esses limites e não são convertidos em evidência íntegra. Conflitos têm textos realmente divergentes.

## AC-3606 — Artefatos revisáveis, sem aprovação fictícia

Dado o comando registrado, quando executado sem gateway ou com a opção explícita de replay sintético, então ele exporta relatório JSON com fichas, respostas/telemetria quando disponíveis e formulário humano não preenchido. O modo sintético informa zero chamadas pagas e nunca aprovação de modelo. Gateway não é escolhido implicitamente por credenciais do ambiente.

## AC-3601 — Pacote revisável

Dado o inventário semântico da Spec 031, quando o pacote é gerado, então existem 50 fichas únicas com pergunta, fontes sintéticas verificáveis, resultado esperado, severidade, checks mecânicos, rubrica e revisores requeridos.

## AC-3602 — Ausência de gateway

Dado que nenhum gateway foi fornecido, quando o harness roda, então informa `pending_gateway`, zero replays e zero aprovação semântica.

## AC-3603 — Replay configurado

Dado um gateway explicitamente fornecido, quando o harness reproduz os casos, então valida somente fonte/tenant/contrato de citação e apresenta `pending_specialist_review`, jamais `approved`.

## AC-3604 — Revisão humana pendente

Dado qualquer resultado do replay, quando não houver ficha preenchida por contador, jurista ou síndico conforme o tema, então o resultado não conta para baseline, piloto ou rollout.
