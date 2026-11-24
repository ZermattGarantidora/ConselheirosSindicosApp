# Resultado — legenda de envio e diagnóstico de validação

## Escopo e causa confirmada

Correção iniciada em 03/11 e validada em 04/11/2026. Atende AC-5716/5717 e AC-5817,
briefing §§1, 6, 8–10 e ADR 0036. A recusa relatada era `mode_citation_mismatch`, em
duas tentativas do Luna. A mensagem era apenas um aviso de reenvio, imediatamente após
um anexo: o caminho de pergunta recuperava oito fontes e exigia resposta documental.
O código prova incompatibilidade entre modo e citações; não identifica qual das duas
formas dessa incompatibilidade ocorreu na saída nativa.

A inspeção temporária foi autorizada explicitamente, depois de rejeição da revisão
automática por acesso amplo à memória. Leu apenas diagnóstico da resposta selecionada,
sem reiniciar, transmitir PDFs ou salvar texto privado. A conexão foi encerrada e a porta
do Inspector fechada. Os scripts de inspeção foram removidos. Metadados do incidente
permanecem somente no diretório local ignorado, fora de fixtures e evals.

## Comportamento entregue no código

- Aviso inequívoco sozinho usa a conversa breve gerada, sem busca ou citações. Não herda
  a classificação de alto risco de uma análise financeira anterior.
- Com anexos, o aviso é legenda literal de uma única análise conjunta, depois de todas
  as leituras/confirmações. Não gera pergunta adicional ao Luna. Perguntas, solicitações,
  negações, ressalvas factuais e ambiguidades continuam no caminho existente.
- O contrato aceita somente a legenda reconhecida e as versões autorizadas. Ela é
  conservada no journal antes do ACK, com idempotência e conflito para conteúdo alterado.
  Não é acrescentada como instrução ao gateway. Falha preserva o texto para retomada.
- Recusa definitiva da consulta registra somente um dos 24 códigos cadastrados ou
  `unknown`, e quantidade de tentativas de 1 a 2. Não registra pergunta, saída, trechos
  ou mensagem nativa. Exceção do observador não modifica a resposta segura.
- Nenhum validador de evidência foi desabilitado e não há exceção por arquivo real.

## Verificação

Reprodução anterior: 11 falhas e 58 aprovações em quatro arquivos. As regressões do delta
passaram; o gate consolidado final aprovou **2.014 testes em 179 arquivos**, formatação,
lint, tipagem, alinhamento das 63 specs e scanner de segredos. Cobertura: statements
91,79%, branches 88,27%, functions 96,34% e lines 93,39%. O classificador compartilhado
entrou na cobertura; os pisos de 80% foram conservados.

Builds API/web aprovados. Evals básicos: 20/20. Evals documentais determinísticos: 50/50.
Esses resultados não medem a acurácia global dos modelos nem substituem a bateria semântica.

Smoke real isolado, com dois uploads de PDF financeiro inteiramente sintético:

| Caso | Resultado | Modelo | Tokens de entrada / saída |
|---|---|---|---|
| Aviso sozinho | HTTP 200, zero buscas, sem citações | Luna | 11.315 / 102 |
| Lote e legenda, com repetição idempotente | HTTP 200, `grounded`, três fontes, uma legenda e uma geração | Sol 6.1 | 44.237 / 945 |

Sem diagnóstico de recusa. Uma rodada inicial também passou; foi repetida após a
consolidação das alterações financeiras concorrentes. Ambas foram preservadas localmente,
sem substituir um fracasso por resultado novo e sem reenviar documentos privados.

## Atas para demonstração

Foram criados três PDFs fictícios, de duas páginas cada, sobre eleição, impermeabilização
e reservas do salão, para o condomínio demonstrativo Jardim do Horizonte. Todas as páginas
foram renderizadas e inspecionadas. Uploads reais na instância isolada ficaram `ready`,
com seis de seis páginas pesquisáveis, sem confirmação indevida de nome. Não houve upload
automático na sessão do usuário.

O Sol 6.1 produziu uma análise conjunta fundamentada; três perguntas ao Luna produziram
respostas fundamentadas com citações sobre mandato, teto/parcelas da obra e responsável/prazo
do piloto. As saídas foram conferidas contra os PDFs. Quatro gerações, sem reparo ou recusa:
65.439 tokens de entrada e 2.134 de saída. Isso valida esses exemplos, sem garantir todas
as perguntas possíveis ou o estado do preview ainda não reiniciado.

## Estabilidade, revisão e ativação

O outro trabalho no mesmo projeto foi pausado conforme autorização do usuário. Uma rodada
intermediária teve três falhas de recuperação enquanto esse trabalho ainda alterava arquivos;
após a estabilização, o conjunto específico e o gate completo passaram, sem enfraquecer
asserções. As alterações concorrentes de cálculos/moeda/recuperação foram preservadas,
com critérios AC-4603b e AC-5618/5619. O relatório próprio do trabalho pausado ainda não
foi concluído; os resultados consolidados aqui não declaram sua bateria semântica concluída.

Snapshot de 403 arquivos de código/configuração/testes:
`876948fb8957e729dc95e6c78b9287419526430959230d4c1cf8ee74edc1e66b`.
Nenhum desses arquivos foi modificado durante o gate final. Baseline, logs, manifestos,
reprodução e smokes ficam em `.local/validation-recurrence/`, ignorado pelo Git.

Revisão do autor em `docs/reviews/2026-11-04-legenda-de-envio-documental.md`.
Após confirmação explícita do usuário, o build foi ativado no preview em 04/11/2026 às
00h45 (America/Sao_Paulo). Uma proteção de comparação do comando interrompeu a primeira
tentativa antes de parar o processo; a comparação literal verificada permitiu a ativação.
O cadastro do acesso atual e cinco PDFs foram restaurados localmente: todos prontos e
com hashes conferidos, sem chamadas à IA. API e proxy responderam `ok`; temporários privados
foram apagados e o Inspector permaneceu fechado. Os históricos em RAM foram descartados
conforme autorizado. O runtime compilado reconhece a legenda e expõe os 24 códigos.
Não houve merge, deploy ou declaração de cumprimento das condições de lançamento da Spec 058.
