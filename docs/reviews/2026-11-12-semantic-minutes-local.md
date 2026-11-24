# Redação de ata a partir de áudio — continuação local

**Estado:** implementação e revisão local concluídas; transportes reais desativados.
**Escopo:** Spec 073, RQ-7309/7310 e AC-7317–7321, com preservação dos contratos anteriores.

O fluxo passa a solicitar uma redação semântica por assuntos, com discussões, propostas,
deliberações relatadas e encaminhamentos separados. A transcrição integral permanece consultável,
mas não é usada como substituto da ata. Dados ausentes e trechos incertos viram pendências.
Cada afirmação mantém segmento, trecho literal e referência de tempo; nomes de falantes não
identificam participantes. O síndico revisa o texto e confirma a versão exata antes do PDF.

## Implementação

- `semantic-minutes-model.ts`: adaptador Responses com modelo/transporte explícitos, JSON Schema,
  limites, timeout e cancelamento. Não lê chave/ambiente, cria fetch ou é injetado pelo startup.
  Redação e conferência são chamadas separadas, sem histórico compartilhado de geração.
- `semantic-minutes-contract.ts`: valida schema, trechos literais, referência/certeza, números,
  cobertura de todos os segmentos, IDs e hashes. Conferência deve avaliar todas as afirmações,
  categorias de decisão e segmentos. Qualquer recusa/incompletude impede a proposta.
- `audio-minutes.ts`: recibo de envio e resultado por fase, disputa idempotente e revalidação
  de permissão/origem entre etapas. Resultado salvo é reutilizado após falha da proposta;
  envio sem resultado salvo fica incerto e não é repetido automaticamente.
- API/UI distinguem disponibilidade de ASR e redator antes de enviar gravação nova. Recuperação
  semântica preserva revisão editada/confirmada. Legado extrativo usa nova identidade para redigir
  a mesma transcrição. Paginação do histórico resolve o pedido a partir de recibos da fase.
- `semantic-minutes-renderer.ts`: redação formal em tópicos e pendências, com referências
  temporais. O editor e o PDF existentes preservam revisão, hash, origem privada e confirmação.

As [instruções específicas](../specs/073-agente-documental-e-pdf/redacao-ata-prompt-proposto.md)
estão propostas para revisão e só foram exercitadas com transportes simulados. A personalidade
aprovada e `answers/prompt-catalog.ts` não foram alterados por esta continuação.

## Verificações

| Gate | Resultado da candidata |
|---|---|
| Autoria/áudio focados | 123 aprovados em 11 arquivos |
| Unitários globais, execução final isolada | 2.588 aprovados, zero falhas |
| Cobertura unitária | statements 87,09%; branches 83,18%; functions 92,86%; lines 89,02% |
| `evals:audio-minutes` | 26 cenários sintéticos aprovados; zero chamada real |
| E2E globais | 258 aprovados em 41 arquivos |
| Formatação global, ESLint, TypeScript | Aprovados pelos binários instalados |
| Builds API/web | Aprovados |
| Runtime compilado sintético | Dois PDFs, 20 perguntas, zero chamada externa |
| `evals` | 20/20 cenários sintéticos aprovados |
| `evals:documentary` | 50/50 determinísticos aprovados; 50 semânticos e revisão especializada continuam pendentes |
| Alinhamento | 73 specs aprovadas no gate estrutural; coerência semântica conferida no escopo da tarefa |
| PDF | Duas páginas por modo, extraídas, renderizadas e inspecionadas |
| Navegador | Desktop/mobile e revisão confirmada recuperada após reload; um ASR, uma redação e uma conferência simulados |
| Scanner de segredos | Aprovado, nenhum padrão conhecido encontrado |
| Manifesto de fontes | 47 arquivos conferidos, zero diferença inesperada; lockfile preservado |

A primeira execução unitária concorria com outras verificações e teve três falhas em testes
preexistentes. Os 85 testes dos três arquivos passaram isoladamente e a bateria completa foi
repetida com um worker e sem tarefas pesadas paralelas, com todos os 2.588 aprovados após as
duas correções de paginação. O typecheck detectou inferência estreita apenas no novo fixture
da interface; o tipo foi explicitado, sem mudar valores ou asserções, e typecheck/focados passaram.
Nenhum
teste, asserção ou timeout foi enfraquecido. O primeiro scanner coincidiu com remoção de arquivos
temporários E2E e recebeu `ENOENT`; a execução final após os testes passou, sem alterar seu escopo.

Evidências desta candidata em `.local/authoring/semantic-*`; ensaio dos componentes reais no
navegador em `.local/authoring/audio-browser/`. PDFs sintéticos de relato/reunião têm duas páginas
cada, extração completa e renderização Poppler inspecionada visualmente: acentos, referências,
decisões e paginação legíveis, sem cortes. Avisos locais de fontes alternativas do Poppler não
impediram renderização; o PDF usa Courier/WinAnsi já adotado no projeto.

Gates executados pelos binários Node/Vitest/TypeScript/ESLint/Prettier/Vite já instalados,
sem instalar dependências ou usar a resolução de versão do wrapper pnpm pela rede. Comandos
canônicos preservados em `package.json`, README e AGENTS; novo `evals:audio-minutes` registrado.
Manifesto `semantic-source-manifest.json` contém SHA-256 de 47 arquivos do escopo e dependências
locais relevantes. O lockfile mantém o hash da candidata anterior; não houve nova dependência.
O relatório, evidências geradas e manifesto não são aprovação de todo o checkout compartilhado.

O ensaio de navegador percorreu envio explícito, revisão, confirmação, PDF, mobile de 390 px e
recuperação após reload: uma transcrição, uma redação e uma conferência **simuladas**, nenhuma
requisição externa de página ou chamada real de IA. Harness usa componentes e API reais com
fixture WAV de hash fixo, armazenamento em memória e servidores temporários em loopback.

## Revisão da mudança

Revisão local própria com a skill `code-review`, cobrindo domínio, adaptador, API, interface,
chamadores, testes e documentos da tarefa. Encontrada e corrigida a recuperação quando o pedido
original cai fora da página atual, mas seus recibos ainda aparecem: agora resolve o request
privado por ID, com teste de regressão. Na interface, páginas antigas também preservam a
tentativa recente em vez de sobrescrevê-la por legado, com regressão específica. A candidata está
registrada no manifesto de fontes. Não restam achados P0/P1 identificados na revisão própria
do escopo. Não representa revisão independente ou autorização de merge.

## Limites e pendências

- As respostas do modelo/conferente nos testes são roteirizadas. Os 26 cenários de
  `evals:audio-minutes` provam controles e bloqueio de conferências rotuladas; **não medem a
  capacidade de uma IA real redigir ou detectar fabricação/omissão**. Schema e citação literal
  não garantem apoio semântico. Avaliação específica real continua pendente, com autorização.
- Não foram escolhidos/ativados fornecedores, transportes reais ou faturamento. Sem ASR e
  redator disponíveis, o cliente não envia nova gravação e a API não fabrica ata.
- Formato: WAV PCM, 25 MiB, até 10 minutos de relato ou 60 de reunião; redação também limita
  2.000 segmentos/220 mil bytes de entrada, 300 mil bytes de requisição/60 mil bytes de saída
  JSON por fase, 80 afirmações e 20 assuntos. Excesso falha inteiro, sem corte silencioso.
- Áudio persistente permanece negado até integração própria de storage, retenção/exclusão,
  restauração e ledger. Reinício da API em memória perde os dados; reload da página não é
  teste de durabilidade. Nenhuma migration ou conexão remota foi executada.
- Instruções específicas, fornecedor/política/orçamento e dados reais ainda precisam de
  homologação antes do transporte real. A Spec 073 permanece em andamento, inclusive demais
  requisitos de redação documental e proatividade. Este relatório não libera piloto ou produção.
- Checkout já continha alterações de outras frentes. Não houve commit, merge ou aprovação de
  todo o diff compartilhado, CI remoto ou revisão independente da candidata a integrar.
