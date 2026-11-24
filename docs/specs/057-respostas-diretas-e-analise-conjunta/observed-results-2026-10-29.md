# Resultados observados — Spec 057

Dados exclusivamente sintéticos. Nenhum documento real das imagens foi enviado ao modelo.

## Validação determinística

- Suíte completa final: **1.569 testes / 161 arquivos aprovados**, incluindo E2E.
- Cobertura: statements **92,20%**, branches **88,08%**, funções **97,05%**, linhas **93,87%**.
- Evals existentes: **20/20** consulta documental e **50/50** documentais determinísticos.
- Build web, formato, lint, tipagem, alinhamento das 57 specs e scanner de segredos aprovados.
- Banco e schema não mudaram; leitores e catálogo autorizados são reutilizados. Testes HTTP
  verificam fonte alheia, revogação de associação, mudança de catálogo e indisponibilidade sem fallback.

O pnpm do Corepack tentou baixar sua versão e falhou por DNS no sandbox. Os mesmos executáveis
já instalados em node_modules foram usados diretamente. TEMP/TMP foram direcionados ao diretório
ignorado .local/spec057-temp após falha de rename no temporário do sandbox. A concorrência de um
worker eliminou timeouts dos testes de PDF sob cobertura. Nenhuma asserção de domínio foi enfraquecida.
O E2E de três uploads recebeu teto de 30s porque cada acompanhamento admite 8s; mantêm-se asserções
de ordem, capacidade, pergunta única e isolamento. Sua nova fixture usa texto ASCII porque o
gerador de PDF sintético não preservava o caractere ê; isso não altera o parser de produção.

A exigência de completude conhecida revelou um caminho real da demonstração: o catálogo mantinha
as contagens nulas depois da extração. A rodada intermediária recusou a síntese corretamente.
O resumo de extração agora é transmitido ao catálogo pelos campos existentes, sem inferir que os
chunks representam o original inteiro. O E2E verifica contagens e completude dos três PDFs; a
regressão de metadados desconhecidos permanece recusada antes do gateway. A rodada final acima
passou após essa correção. Outra regressão conserva cálculos/fontes do mês anterior já disponível;
cláusulas divergentes na mesma página mantêm evidências distintas, sem relaxar o validador.

## Smoke com Codex gpt-6.1-sol

Mesmo conjunto fictício: convenção com mandatos contraditórios de dois e três anos e dois balancetes.
A segunda despesa mensal passa de R$ 8.000 para R$ 12.000; saldo disponível R$ 1.000 e obrigações
declaradas R$ 2.000. Todas as páginas e as comparações locais foram fornecidas, com fontes literais.

- R1: fontes e achados corretos, 106 palavras; repetiu ressalvas e não fez a pergunta de ajuda.
  Registro preservado em .local/spec057-smoke-r1.json.
- Após tornar explícitos a pergunta final e o tratamento das limitações metodológicas, R2:
  **dois parágrafos, 110 palavras**, comparação e divergência citadas, solução proporcional,
  sem campos de atenção/próximo passo duplicados e pergunta específica ao final.
  Registro preservado em .local/spec057-smoke-r2.json. O limite de 90 palavras é referência, não corte
  que elimina condições importantes; esse teste tem dois achados materiais e seus encaminhamentos.

- R3, versão final: **dois parágrafos, 112 palavras**, quatro citações válidas incluindo os
  dois artigos da mesma página, encaminhamentos e pergunta específica; campos de atenção/próximo
  passo vazios, sem repetição. Registro em .local/spec057-smoke-result.json.

O smoke inicial no sandbox falhou no processo, sem resposta. Os três resultados acima vieram de
execução autorizada fora do sandbox, somente no Codex/modelo aprovado e sem fallback.
Não há estimativa atribuível de créditos nesta validação; zero em telemetry do adaptador não
significa consumo gratuito. Um caso não mede qualidade universal nem aprova piloto real.

## Limites e revisão

Semântica das demais combinações e revisão contábil/jurídica especializada permanecem limitações.
Uma pergunta digitada junto aos anexos segue a consulta existente, sem comentário automático
duplicado; não pode alegar cobertura integral se sua seleção de evidências for parcial.
Não houve merge, publicação ou reinício do servidor do usuário.
