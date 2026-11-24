# ADR 0035 — Roteamento Luna/Sol antes da geração

**Status:** aceito para implementação sintética autorizada  
**Data:** 2026-10-27

Complementado pela [Spec 061](../specs/061-custo-operacional-luna-sol/spec.md) e pelo
[ADR 0038](0038-roteamento-runtime-e-cache-de-instrucoes.md) em 03/11/2026: híbrido é o padrão
das fábricas OpenAI/Codex, com Luna high/Sol 6.1 low. O protocolo dos evals históricos permanece.

## Decisão

Implementar a Spec 051 com política determinística versionada. Luna é a base; Sol recebe risco alto, conflitos, pedidos explícitos de adulteração/ocultação e análises compostas. Ambos usam o mesmo contexto autorizado, recuperação e validação. O roteador não chama um modelo para classificar nem gera duas respostas. A única correção existente por validação permanece no mesmo modelo. Configuração local explícita `CODEX_ANSWER_ROUTING=hybrid`; ausência conserva o caminho anterior. Nenhum provedor, dependência, schema ou credencial adicional.

## Consequências

Menor custo potencial com critérios auditáveis, sem garantia prévia de qualidade. Regras podem superestimar ou subestimar complexidade; regressões e a comparação dos mesmos 280 cenários medem esse risco. Não há treinamento automático a partir de feedback ou testes. Melhorias são mudanças revisáveis no código e testes. Sol histórico não isola o efeito da política, porque o código mudou; Luna e híbrido novos compartilham snapshot.

## Alternativas

Sol em todas as respostas aumenta custo. Luna em todas exige medir suas limitações. Classificador remoto e tentativa Luna seguida de Sol elevam chamadas e latência; ficam fora desta fatia. Não se alteram as restrições locais/sintéticas do ADR 0031.
