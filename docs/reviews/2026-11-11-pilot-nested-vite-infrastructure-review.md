# E2E do proxy — descoberta implícita de ambiente

**Data:** 11/11/2026. **Revisor por IA:** Infraestrutura, sem edição do teste documental.

**Gatilho corrigido na candidata Segurança r6:** contraprova independente agora registra
`canaryImported=false`, `envDiscoveryDisabled=true`, sem listener, em
`nested-vite-env-green-2026-11-11.json`. Os oito testes mantidos de ambiente também passaram
independentemente (`security-env-independent-r6-2026-11-11.json`). Vermelho preservado;
o E2E final 03/r4 passou depois com 247/247 e entradas estáveis, conforme o
[fechamento global](2026-11-11-pilot-integration-local.md). Não aprova o checkout inteiro.
A reprodução e as instruções de correção abaixo descrevem o estado vermelho preservado.

## [P2] Desativar arquivos de ambiente também no Vite interno do teste

Em `tests/e2e/demo-web-research.e2e.test.ts:188`, `createViteServer` recebe `configFile:false`
e cria um proxy de loopback, mas não recebe `envDir:false`. Essa instância é distinta do
Vitest externo. A correção nas configurações globais não desliga sua descoberta automática
de `.env*`, contrariando o contrato de ambiente explícito da validação sintética.

A contraprova lê a chamada atual via AST, extrai seu objeto de opções e resolve a configuração
somente em uma raiz temporária própria com um canário integralmente fictício. O canário foi
importado e `envDir` não era false. Não houve leitura de credenciais do workspace, listener,
conexão, IA ou mudança no teste. Prova e hash da fonte:
`.local/pilot-operations/full-review/nested-vite-env-probe-2026-11-11.json`.

Antes de repetir o teste com acesso ao loopback permitido, o dono deve adicionar a guarda nessa
instância e uma regressão que exercite as opções reais contra um canário temporário. Conservar
os testes HTTP/proxy, sucesso, idempotência e isolamento; não substituir o transporte por mock
nem executar um teste vermelho contra arquivos reais de ambiente.

O resultado não afirma quais valores existiam, que algum segredo foi exposto ou que houve
transmissão externa. Demonstra a ausência da guarda no ensaio. As 37 falhas EACCES e o HTTP 403
de consulta recém-enviada são diagnósticos separados, preservados no relatório E2E global.
