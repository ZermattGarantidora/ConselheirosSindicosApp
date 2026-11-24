# Resultado local — Spec 061 — 03/11/2026

## Comportamento entregue

Fábricas de ambiente OpenAI/Codex usam híbrido por padrão: Luna high para solicitações simples
e Sol 6.1 low para as complexas, seguindo as regras da Spec 051. A decisão não gera uma segunda
resposta nem chama um classificador remoto. `single` continua disponível com modelo configurado
e esforço low; construtores diretos e comparações históricas permanecem de modelo único.
Orientação geral conserva o motivo de roteamento na persistência, além do modelo efetivo.

O ambiente local ignorado pelo Git foi configurado com `CODEX_ANSWER_ROUTING=hybrid`, preservando
as demais configurações. Reiniciar `pnpm run dev:api` aplica as mudanças; `pnpm run dev:web`
continua servindo a interface em `http://127.0.0.1:5173/`. Não foi reiniciado um servidor existente
nem alterado seu estado em RAM. Login e disponibilidade dos modelos continuam necessários.

O comentário conjunto de arquivos permanece exclusivamente em Codex/Sol 6.1 low mesmo com
perguntas em híbrido, sem habilitar envio integral à API ou à Luna. Fontes, autorização e limites
do lote continuam nos testes existentes. Perguntas/documentos usam o mesmo pipeline, cálculos
locais, janela recente e histórico durável; não foram criados resumos ou caches de respostas.

Na Responses API, somente instruções genéricas recebem breakpoint explícito com TTL de 30m.
Metadados dinâmicos, pergunta, histórico, IDs e evidências ficam fora desse prefixo. Testes
reconstroem exatamente o prompt v27 a partir das mensagens, incluindo configuração inicial.
O cache do CLI é próprio do Codex, sem os controles específicos da API. A implementação seguiu
o [OpenAI Docs](https://developers.openai.com/api/docs/guides/prompt-caching), consultado em 03/11.

## Gates executados

| Verificação | Resultado |
|---|---|
| `pnpm run check` | Aprovado: formatação, lint, tipos, cobertura, visão e segredos. |
| Testes unitários/E2E incluídos no gate | 1.727 testes, 171 arquivos, todos aprovados. |
| Cobertura statements | 91,43%. |
| Cobertura branches | 87,60%. |
| Cobertura functions | 96,17%. |
| Cobertura lines | 93,11%. |
| Visão | 61 specs aprovadas estruturalmente; revisão semântica do alinhamento realizada no delta. |
| `pnpm run evals` | 20/20; 14 P0 sem falhas. Sem provedor externo. |
| `pnpm run evals:documentary` | 50/50 verificações determinísticas; revisão semântica humana permanece pendente. |
| `pnpm run build:api` e `pnpm run build:web` | Aprovados. |

O launcher Corepack disponível no PATH tentou baixar pnpm sem rede. Os mesmos scripts canônicos
foram executados com o pnpm 11.19.0 já instalado, sem trocar dependências. Vitest usou temporários
no workspace, um worker e o preload `safe-os-user-info.cjs` existente para compatibilidade do sandbox.

## Smoke real sintético pelo plano Codex

Duas gerações sequenciais, sem reparo ou API paga, usando a configuração local atual:

| Entrada fictícia | Modelo/esforço solicitado | Motivo | Entrada/saída/cache em tokens | Latência |
|---|---|---|---|---|
| Organização de tarefas do síndico | Luna high | `basic_request` | 11.192 / 164 / 6.912 | 5.167 ms |
| Risco com quadro elétrico energizado | Sol 6.1 low | `high_risk` | 11.892 / 110 / 7.552 | 7.922 ms |

Ambas concluíram com resposta não vazia e zero citações, coerente com a ausência de evidências
nessas entradas. O smoke confirma disponibilidade e seleção, sem certificar correção semântica
universal. Uso inclui o harness do Codex e não equivale ao transporte da API.

Antes disso houve uma tentativa interrompida por `codex_process_failed` no ambiente restrito,
sem usage disponível. Ela permanece desconhecida, não custo zero. O login foi confirmado pelo
próprio CLI; as duas gerações concluíram fora dessa restrição. Não foram lidos ou copiados tokens
de autenticação, expostas chaves ou enviados documentos reais.

Logs técnicos locais e metadados sem conteúdo ficam em `.local/cost-061/`; a configuração local
permanece ignorada pelo Git. Relatórios e notas das baterias anteriores não foram reescritos.

## Limites

Não foi executada nova bateria completa nem inferência pela API faturada. Testes da API usam
rede simulada e verificam o transporte, contratos e fluxo do servidor. A qualidade de Luna high
sob budgets curtos, a taxa de cache, o tráfego híbrido e a economia faturada exigem medição própria.
Não se transfere a acurácia individual da Spec 060 à configuração híbrida ou à API.

Esta fatia não altera preço ao cliente, plano comercial, orçamento de saída ou processamento de
documentos; preserva as otimizações existentes e adiciona seleção no runtime e cache de instruções.
Não houve commit, merge, deploy, migração ou alteração no banco. O delta foi revisado pelo autor;
revisão independente do branch completo, CI e gates de piloto/produção permanecem necessários.
