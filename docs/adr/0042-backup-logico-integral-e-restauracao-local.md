# ADR 0042 — Backup lógico integral e ensaio de restauração local

**Status:** aceito para preparação local sintética; prova integral local executada, ambiente efetivo pendente  
**Data:** 2026-11-09

## Contexto

O briefing §8 e a Spec 058 exigem recuperação antes do lançamento. O backup existente exporta
somente journal e depende de contas/condomínios já restaurados. Pelo ADR 0017, originais privados
também estão no PostgreSQL. É necessário recuperar o conjunto e conferir as proteções, sem
contratar serviços ou acessar dados reais nesta rodada.

## Decisão

- Usar ferramentas PostgreSQL `pg_dump` custom e `pg_restore`, sem pacote Node ou serviço novo.
  Quando ausentes no host, permitir execução em container local dedicado da imagem
  PostgreSQL/pgvector já usada pela fundação. Inspecionar somente labels, imagem, porta e mounts,
  sem ler credenciais; engine local e diretório de configuração Docker vazio explícitos.
  A conexão do Node continua em loopback e corresponde à porta do mesmo container. Somente o
  diretório de saída sintética é montado, nunca o repositório inteiro ou arquivo de ambiente.
- Exportar todo o schema `app` em snapshot consistente compartilhado com o inventário; incluir
  conteúdo das tabelas/sequências e definições de RLS, ACLs, funções, índices e constraints.
- Conservar ACLs. Recriar ownership pelo operador local de restauração (`--no-owner`); conferir
  ownership e funções SECURITY DEFINER no inventário. Esta versão exige mesmo operador/papéis
  locais, e não implementa mapeamento silencioso de ownership entre plataformas.
- Papéis globais restritos e extensão vector são pré-condições conferidas separadamente;
  senhas/logins e segredos estáveis não entram no dump ou manifesto.
- Somente bancos locais descartáveis com nomes e marcadores explícitos. Restore em banco vazio
  distinto, transação única, sem limpeza destrutiva e sem ativar aplicação ou worker.
- Comparar fingerprints SHA-256 de linhas ordenadas por hash, contagens, sequências e catálogo
  de segurança; o arquivo também tem SHA-256. Isso valida igualdade do ponto recuperado, não
  autenticidade de um dump não confiável. Executar somente artefato produzido no ensaio confiável.
- O runbook exige custódia/cifra externa, políticas aprovadas, reaplicação de exclusões/revogações
  e novo ensaio antes de adaptar a operação ao Supabase efetivo.
- Para a extensão sintética da Spec 070, RQ-7005, usar o plano privado autenticado da Segurança
  fora do dump e o callback transacional de conteúdo da frente Documentos. Conferir o ponto
  recuperado e reaplicar restrições antes da elegibilidade, sem reabertura automática. O runner
  não cria outra política de dados nem outro total de consumo: compara o fence mínimo de recibos
  e conserva unknown. Política real, custódia externa e prazos continuam pendentes.

## Consequências

Não se promete backup de cluster, configuração dos fornecedores, WAL/PITR ou RPO/RTO medido.
Não se restaura segredo externo a partir do banco. Comparações não substituem testes de acesso
autorizado e negativo. O ensaio local mantém o destino em quarentena; prova local não aprova
serviço, tratamento de dados, retenção ou readiness do piloto.

Alinhado às Specs 040/058/069/070, ADRs 0002/0017/0030/0041 e briefing §§8–10 e 12–14.
