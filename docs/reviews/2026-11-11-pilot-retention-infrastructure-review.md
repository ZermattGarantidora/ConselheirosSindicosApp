# Retenção — revisão independente do delta do gate global

**Data:** 11/11/2026. **Revisor por IA:** Infraestrutura, sem edição da fonte/teste documental.
**Resultado:** nenhum novo defeito concreto confirmado nesse delta. Não aprova o branch inteiro.

O primeiro check global preservado em
`.local/pilot-security/global-check-window03-1794422113310.log` encontrou a asserção antiga
de dois contextos recebendo quatro. A preparação em duas fases passou a configurar tenant
também quando não existia observador e não havia consultas escopadas nessa primeira fase.

Li a fonte completa atual de `postgres-document-retention-repository.ts`, as seis unidades e
os exemplos correspondentes de AC-7121. O ajuste move somente o contexto da preparação para
dentro de `if (beforePurge)`. O contexto anterior a cada efeito de purga permanece explícito;
com observer, todas as preparações terminam antes do primeiro trigger. A asserção antiga de
dois contextos permanece intacta. Dois cenários novos conferem ordem completa e falha na segunda
preparação: rollback, nenhuma purga e liberação da conexão.

**6/6 unidades repetidas por esta frente**, com `envDir:false`, temporário/cache/saídas próprios:
`.local/pilot-operations/full-review/retention-window03-independent-2026-11-11.json` e JUnit
adjacente. Hashes da fonte/teste iguais antes/depois em
`retention-window03-independent-inputs-2026-11-11.json`. Não houve banco, rede ou transporte de IA.

O gate global completo foi repetido na candidata final 03/r4: 2.459/2.459 unidades e cobertura
acima de 80% nos quatro indicadores; ver o [fechamento global](2026-11-11-pilot-integration-local.md).
Oito timeouts da primeira tentativa são históricos; a repetição conservou os prazos e assertivas.
As provas SQL anteriores identificam seus próprios inputs; mocks não substituem o SQL do dono.
Não certifica política, destino real, CI remoto, merge, serviços ou cobrança.
