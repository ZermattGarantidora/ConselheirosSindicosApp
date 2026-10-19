# Notas de integração — Spec 035

O classificador é uma barreira determinística de servidor, não prova de robustez probabilística de prompt/modelo. Evals semânticos continuam pendentes de revisão especializada. Integrações futuras de ferramentas devem continuar fora do contrato `AnswerGateway` e exigir confirmação humana explícita.

O runner canônico importa `security/executors.ts`. Os cinco cenários percorrem o endpoint de perguntas com recuperação e persistência sintéticas e verificam abstenção, ausência de citação/canário, zero chamadas ao gateway e invocação registrada como ignorada. Não simulam execução de ferramenta nem comprovam resistência universal de modelo.
