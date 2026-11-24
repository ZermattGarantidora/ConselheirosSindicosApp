# Pesquisa de prestadores e retomada — 04/11/2026

## Problema e correção

O print mostrou duas lacunas: a pesquisa automática anterior reconhecia sete temas oficiais,
excluindo prestadores; “pesquise na internet” selecionava o gateway sem recuperar um tópico,
que falhava com `web_topic_unsupported`. Os três testes anteriores não cobriam esse caso.

RQ-6504 e AC-6510–6512 da Spec 065 agora incluem descoberta pública de empresas de limpeza e
higienização de caixas d’água quando o usuário informa município/UF. O serviço é constante;
a cidade é reconhecida na lista incorporada do IBGE. Somente a consulta canônica sai do
servidor. O contrato isolado foi apresentado antes da aplicação; o prompt global não mudou.

Uma retomada explícita e sem assunto interpreta localmente apenas o último pedido do usuário
no mesmo chat autorizado. Não percorre assuntos anteriores, documentos, respostas da assistente
ou perfil. O risco do assunto original é preservado. Um pedido sem tópico resolvido segue
a conversa normal, sem invocar a pesquisa vazia.

Fontes empresariais públicas observadas são aceitas somente na política de prestadores. A
política oficial continua restrita a gov.br/leg.br/jus.br. Links recusam HTTP, IP, credenciais,
porta alternativa, domínios locais e os endpoints de ação/WhatsApp cobertos pelos testes.
O pesquisador não contata empresas, envia formulários ou solicita orçamento.

## Gates

- **2.157/2.157 testes aprovados**, com cobertura isolada e dois workers.
- Statements **91,94%**, branches **88,55%**, funções **96,37%**, linhas **93,53%**.
- TypeScript/build da API, ESLint, formatação, build web, scanner de segredos e gate de visão
  das **66 specs** aprovados.
- Evals existentes: **20/20** de consulta documental e **50/50** determinísticos de qualidade
  documental; os casos semânticos e a revisão especializada dessa suíte continuam pendentes.
- A primeira regressão detectou seleção indevida quando havia duas cidades. A detecção foi
  corrigida para reconhecer a conjunção; nenhuma asserção foi removida ou enfraquecida.
- A lista gerada foi comparada integralmente com a fonte pública: **5.571 municípios, 27 UFs**.
  O SHA-256 do JSON original está no cabeçalho de `brazilian-municipalities.ts`. A origem é a
  [API de localidades do IBGE](https://servicodados.ibge.gov.br/api/docs/localidades), obtida
  em 04/11/2026. Não há chamada ao IBGE em runtime ou nova dependência.

Comandos equivalentes aos scripts do projeto foram executados com os binários instalados.
Os relatórios, a cobertura e o delta contra as cópias anteriores desta fatia estão em
`.local/public-services-20261104/`. Alterações simultâneas, inclusive na Spec 066, foram
preservadas. Esta é revisão técnica do próprio delta; não é revisão independente ou merge.

## Testes reais

Três consultas foram executadas com Codex real em uma API isolada na porta 3101, identidade
sintética `sindico-demo`, sem documentos ou dados privados.

| Caso                                              | Sinal antes da resposta | Tempo completo | Resultado                                            |
| ------------------------------------------------- | ----------------------- | -------------- | ---------------------------------------------------- |
| Empresas de limpeza de caixa d’água em Pinhais PR | 1,19 s                  | 24,63 s        | Duas páginas empresariais como fontes                |
| “pesquise na internet”, no mesmo chat             | 1,35 s                  | 22,29 s        | Retomou Pinhais e respondeu com duas fontes públicas |
| Regras de assembleias virtuais                    | 22 ms                   | 27,79 s        | Fonte oficial do Senado                              |

Os três envelopes retornaram status 200, sinal de progresso antes do corpo, fontes e os dois
lados recuperáveis no journal. Nomes e atendimento são informações anunciadas nas páginas;
as respostas não afirmam qualidade, disponibilidade ou verificação de licenças. O ensaio
não constitui avaliação independente dos prestadores ou recomendação de contratação.

## Ativação

A API local foi reiniciada em 04/11/2026 às 10:23, conforme autorização explícita anterior
nesta conversa: PID 20328 → 19964, com os mesmos arquivos de ambiente e janela oculta.
O Vite permaneceu na porta 5173. O estado em RAM foi reiniciado; nenhum original em disco
foi removido. O cadastro do acesso anterior não foi localizado pelo script de preservação;
não se afirma restauração de cadastro ou histórico de outro acesso.

O teste adicional de Pinhais pelo proxy ativo passou: sinal em 3,74 s, resposta em 39,83 s,
duas fontes públicas e pergunta/resposta recuperáveis. A API isolada foi encerrada; a API
principal permaneceu saudável no PID 19964. Os registros estão em `activation/` e
`active-results.json`. Não houve observação visual do Chrome nesta
fatia; protocolo, leitura do cliente e links têm verificação técnica. Não houve merge ou deploy.

## Limites

Esta correção cobre o serviço observado no print e município explícito reconhecido, além dos
sete temas oficiais. Não implementa pesquisa arbitrária, outros serviços, uso de endereço ou
perfil como localização, ranking comercial, contato ou contratação. A retomada depende de o
último pedido conter assunto e localidade suficientes; não inventa o que faltar. A demonstração
continua em memória e não satisfaz o gate de histórico durável de lançamento da Spec 058.
