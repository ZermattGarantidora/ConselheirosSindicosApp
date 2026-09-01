# Modelo de ameaças inicial

**Status:** rascunho; revisar antes do scaffold  
**Atualizado em:** 2026-08-31

## 1. Escopo

Primeira fatia vertical: autenticação, condomínios, upload de PDF, processamento/OCR, indexação, retrieval, geração de resposta, citações, feedback e auditoria.

Este documento não substitui revisão jurídica, avaliação de impacto à proteção de dados nem teste de segurança da implementação.

## 2. Ativos

- documentos originais e texto extraído;
- dados pessoais, financeiros, contratuais e operacionais;
- associações e permissões;
- embeddings, chunks, caches e resumos derivados;
- perguntas, respostas, feedback e trilhas;
- segredos, chaves, tokens e configurações;
- prompts, regras de roteamento e datasets de eval;
- reputação e confiança no produto.

## 3. Atores e origens de risco

- usuário legítimo com permissão limitada;
- usuário autenticado tentando acessar outro condomínio;
- pessoa externa sem autenticação;
- documento malicioso ou comprometido;
- dependência, parser, provedor ou integração comprometidos;
- erro de configuração ou implementação;
- modelo que alucina, segue instrução indevida ou muda de comportamento.

## 4. Fronteiras de confiança

1. navegador para API;
2. API para banco e storage;
3. API para fila e worker;
4. worker para parsers/OCR;
5. aplicação para índice de busca;
6. aplicação para provedores de IA;
7. aplicação para logs e telemetria;
8. operadores e ferramentas administrativas.

Conteúdo do usuário e dos documentos é sempre não confiável, mesmo depois de armazenado.

## 5. Ameaças e controles

| ID | Ameaça | Impacto | Controles propostos | Verificação |
|---|---|---|---|---|
| TM-001 | IDOR ou consulta a outro condomínio | Crítico | contexto autorizado no servidor, política no banco, negação por padrão | AC-002, AC-003, testes negativos |
| TM-002 | Vazamento pelo retrieval | Crítico | filtro de tenant antes do ranking, metadados obrigatórios, canários | AC-008, EVAL-010 |
| TM-003 | Vazamento por cache | Crítico | chaves com tenant, permissão e versão; invalidação na revogação | AC-009 |
| TM-004 | Vazamento por job ou storage | Crítico | paths privados, IDs escopados, revalidação no worker, URLs temporárias | testes de integração |
| TM-005 | Prompt injection em documento | Alto | delimitar como dado, nenhuma ferramenta perigosa, allowlist de evidências, validação de saída | AC-017, EVAL-012/013 |
| TM-006 | Upload disfarçado ou parser vulnerável | Alto | validar assinatura, tamanho e limites; sandbox de processamento; dependências atualizadas | testes de upload e scan |
| TM-007 | Zip bomb/arquivo excessivo/DoS | Alto | limites, timeout, quota, fila, backpressure e cancelamento | testes de limites |
| TM-008 | Citação fabricada | Alto | IDs de evidência fechados e validação pós-geração | AC-012/013 |
| TM-009 | Resposta sem base ou regra errada | Alto | gate de suficiência, abstenção, conflito e evals | AC-014–16 |
| TM-010 | OCR incorreto alterar sentido | Alto | score de qualidade, `needs_review`, visualização do original | AC-005/015 |
| TM-011 | Exposição em logs e tracing | Alto | minimização, redaction, acesso restrito, retenção | inspeção automatizada/manual |
| TM-012 | Uso indevido pelo provedor | Alto | DPA/política aprovada, minimização, configuração de retenção, gateway | revisão de fornecedor |
| TM-013 | Segredo no repositório ou prompt | Alto | secret manager, scan no CI, exemplos sem valores reais | secret scan |
| TM-014 | Link de arquivo reutilizável | Alto | URL curta, escopada e revogável; checagem no acesso | testes de expiração |
| TM-015 | Exclusão incompleta | Alto | inventário de derivados, tombstone, jobs de purge verificáveis | teste de ciclo de vida |
| TM-016 | Dependência comprometida | Alto | lockfile, origem confiável, scan e revisão de atualização | CI/SBOM quando definido |
| TM-017 | Mudança silenciosa de modelo | Médio/alto | versão registrada, eval baseline e rollout controlado | gate de eval |
| TM-018 | Abuso de consumo e custo | Médio | rate limit, budget por tenant/tarefa e alerta de anomalia | testes e alertas |
| TM-019 | Operador com privilégio excessivo | Alto | menor privilégio, acesso just-in-time, trilha e revisão | auditoria de acessos |
| TM-020 | Backup/exportação sem isolamento | Crítico | criptografia, acesso restrito, testes de restauração e export escopado | exercício operacional |

## 6. Regras de dados

- classificar documentos e derivados como dados confidenciais do cliente;
- coletar somente o necessário;
- não colocar dados reais em desenvolvimento ou evals;
- registrar acesso administrativo;
- definir retenção antes do piloto;
- tornar exportação e exclusão verificáveis;
- não usar documentos para treinamento sem consentimento específico.

## 7. Falha segura

Na dúvida sobre permissão, fonte, vigência, OCR, conflito ou provedor, negar, abster-se ou retornar falha recuperável. Disponibilidade não tem precedência sobre confidencialidade e integridade.

## 8. Checklist antes do piloto

- [ ] revisar fluxos e diagramas reais;
- [ ] mapear todos os lugares onde `condominium_id` aparece;
- [ ] testar canários entre tenants em banco, storage, fila, cache, busca, prompts e logs;
- [ ] executar testes de upload malicioso e limites;
- [ ] revisar provedores e retenção;
- [ ] validar revogação, exportação e exclusão;
- [ ] preparar resposta a incidente e rotação de segredos;
- [ ] revisar superfície administrativa;
- [ ] executar evals de prompt injection, grounding e citação;
- [ ] registrar riscos residuais aceitos por responsável definido.
