# Política de dados do piloto sintético B7

**Status:** aprovada somente para execução automatizada sintética
**Atualizado em:** 2026-09-10

## Dados autorizados

- documentos fictícios criados artificialmente por IA;
- perguntas, identificadores, memberships e frases-canário sintéticos;
- métricas agregadas de execução e hashes sem conteúdo de cliente;
- documentos com a marca visível `FICTÍCIO — GERADO POR IA — SOMENTE TESTE`.

Documentos, perguntas, identificadores e exemplos reais, inclusive anonimizados,
são proibidos. Não há participantes externos, dados de clientes ou corpus de
produção neste piloto.

## Processamento e ambientes

- o piloto usa API Fastify em memória e o gateway extrativo local;
- o Neon continua reservado exclusivamente à integração sintética marcada;
- OCR externo, storage remoto, autenticação real e Supabase não são usados;
- nenhum conteúdo é enviado a provedor externo;
- logs e relatórios contêm somente IDs sintéticos, status, duração e métricas
  agregadas.

## Retenção e descarte

O corpus sintético versionado pode permanecer no repositório. Saídas temporárias
de execução devem ser removidas ao final do comando; o relatório persistido não
contém trechos documentais. O exercício de purge deve preservar somente um
recibo minimizado e não deve ser usado como implementação de purge de dados reais.

## Segurança e incidentes

O piloto é interrompido diante de vazamento de tenant, citação fabricada,
resposta sem evidência, execução de instrução documental ou segredo em artefato.
O procedimento é o runbook em `b7-incident-runbook.md`; qualquer retomada exige
nova execução dos gates P0.

## Limites da evidência

Este piloto valida apenas o caminho técnico determinístico com dados fictícios.
Não valida comportamento de usuários reais, disposição de pagamento, retenção
comercial, desempenho de produção ou tratamento de dados pessoais.
