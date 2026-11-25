# Revisão local — instrumentação e layout Codex para cache

- **Data:** 24/11/2026.
- **Status:** gates de software, repetição real/auditoria r4 e scanner final concluídos.
- **Tipo:** revisão técnica do autor por IA; revisão independente e especializada pendentes.
- **Snapshot r4:** `8c4c77de9578cc27bf4ca361c52a919aa09c216cc7b6a7eaefa8bbcdfc87d22d`.
- **Manifest r4:** `5513ae7e475efb69e8ae59f046cc6f07ee1fb790d7d20cbaebffbeda3486163e`.
- **Escopo:** nove arquivos de aplicação, quatro de harness, oito de testes e documentação.
- **Dados reais, banco remoto, reinício de app, merge e deploy:** não executados.

## Delta e segurança

Briefing vigente lido integralmente; estratégia, MVP, Spec 077, quality gates e ADRs
0002/0003/0031/0038 relacionados consultados. RQ-7707/7708/7709 e AC-7711/7712/7713 foram
registrados antes do comportamento; ADR 0049 registra a sucessão restrita do cwd no candidato.
Mantém os Blocos 6/7, o chat, a memória documental e o contrato de evidência. Sem expansão.

O codec cria mapas dentro da chamada e altera somente referências estruturadas. Schema e
regras de pendência permanecem equivalentes; o texto gerado não é reescrito para aprovação.
O decode recusa referência desconhecida e restaura IDs antes da reconstrução de citações e
validadores. Não há cache de resposta, sessão compartilhada ou conteúdo no cwd genérico.
O schema privado não fica nesse cwd. Diretório não vazio/simbólico falha antes da chamada.

Relógio monotônico é separado do relógio documental. Milestones são números/null, sem copiar
texto de eventos ou mensagens de erro. Falha do observador não altera execução. A telemetria
de gateway e callbacks internos não mudam o schema público/SQL. Eventos no domínio têm
condominium_id autorizado. Primeiro evento completo é identificado como tal, nunca como TTFT.

O harness propaga o layout efetivo aos dois braços e o fixa no manifest; recibos conservam
marcos junto dos eventos/usage originais, inclusive no replay sem reenviar. Fonte desconhecida,
schema de minuta, isolamento e entrega HTTP foram exercitados. Nenhuma asserção antiga foi
enfraquecida e nenhuma exclusão de cobertura adicionada.

## Gates

Passaram na candidata r4 formatação global, lint, TypeScript, build da API, **2.979 unitários** e **275 E2E**.
Cobertura statements/branches/functions/lines: **85,67 / 81,99 / 91,10 / 87,50%**.
Evals 20/20 e documentários 50/50; os 50 semânticos anteriores continuam pendentes. Relatórios
em `.local/latency-cache/gates-r4/`; os gates anteriores de r3 permanecem em `gates/`. O lint inicial apontou import de tipo em linha; a correção
foi feita e a cadeia completa repetida, mantendo `lint-initial.log`. E2E usam loopback local
autorizado, sem carregar .env nem banco guardado. O runtime Python bundled conferiu as páginas.

Código congelado após os gates, mesmos originais/PDFs/páginas e gabarito verificados. A rodada
de comparação usa o Codex local autorizado, sem fallback de API paga. Scanner integral aprovado.

## Resultado e limites

R3 foi reprovada: julgamento inicial 38/40 Sol e 40/40 híbrido, com referências internas visíveis. O replay de
015 no snapshot r3 reproduz 403 e no código corretivo entrega 200, sem inferência nos dois
casos. O journal reconhece negativa explícita de aprovação em claim já validada, mantendo
seus guardas. Alias no corpo é recusado e passa pelo reparo existente, sem apagar texto.
Regressões unitárias/HTTP cobrem as duas correções. O julgamento inicial de abstenção em
040 de r3 foi excessivo conforme a regra já vigente RQ-7704: houve revisão complementar por
hash, sem apagar o score/auditoria anteriores, alterar o oracle ou esconder a reprovação r3.
Outra rodada foi congelada após repetir todos os gates.

R4: 80 respostas auditadas, **40/40 completos por braço**, 83 recibos conhecidos, zero consumo
desconhecido ou vazamento. Automático 40/40 e 38/40 preservado; os desacordos de 026 e 040
foram justificados por resposta/hash, respeitando abstenção sem fato local. Formulário humano
mantém 80 decisões em branco. Mesmos modelos iniciais, tarefas, riscos, budgets e fontes.

Sol USD 1,0877432 equivalente e média 13,115 s; híbrido USD 0,84342878 e média 13,628 s.
P95 18,958/25,107 s: o híbrido piorou na cauda por três reparos, apesar de média/custo menores
que r2. Reuse 28,23%/25,17%. O candidato permanece opt-in, sem adoção global por velocidade.
O cache do provedor não foi zerado e a quantidade de tokens de saída também variou.

Scanner integral e alinhamento das 77 specs passaram, sem padrão conhecido encontrado;
logs em `gates-r4/secrets.log` e `spec-vision-final.log`. Diff do escopo revisado pelo autor;
nenhum P0/P1 identificado no delta próprio. Não é aprovação do branch inteiro ou CI remoto.
Hashes finais em `.local/latency-cache/reviewed-files.json`.

Ver [relatório](../specs/077-estresse-documental-e-conflitos-ineditos/results-cache-r4.md).
Candidato não é aceito com regressão de qualidade. Custos históricos não são fatura; efeitos
de cache/carga/variação do serviço não são separados causalmente por uma única rodada.
Esta revisão cobre o delta próprio, preserva as mudanças preexistentes e não aprova o branch
inteiro ou substitui revisão independente, especialista humano e CI de merge.
