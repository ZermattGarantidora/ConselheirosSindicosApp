# ADR 0040 — Código fornecido e sessão persistente por aparelho

**Status:** aceito para a fatia autorizada da Spec 068  
**Data:** 2026-11-05

## Decisão

Substituir a seleção pública de identidade por código provisionado pela equipe. O código de
128 bits é derivado por HMAC-SHA256 de segredo de 256 bits, identidade e revisão aleatória;
persiste somente seu hash e a revisão. A sessão autenticada permite recompor o próprio código
em Perfil. O segredo precisa de backup e não pode ser regenerado em reinícios.

Sessões usam token independente de 256 bits, persistido por hash e cookie HttpOnly/SameSite=Lax,
Secure em produção. Não expiram automaticamente no servidor; navegador recebe até 400 dias,
renovados no uso. Logout revoga a sessão e rotação do código invalida suas sessões. IP e
user-agent completo não são persistidos nem usados para autenticar.

Demonstração local usa arquivos privados com gravação atômica e serialização no processo;
PostgreSQL usa tabelas privadas e funções SECURITY DEFINER com search_path fixo, sem conceder
leitura direta ao runtime. O provisionamento é CLI operacional, sem endpoint público. Não
introduzir provedor ou dependência. Cadastro por WhatsApp continua posterior.

## Consequências e limites

Na integração sintética de 11/11/2026, a sessão usa UUID canônico e auth_subject pode ser distinto.
A migration 040 atualiza `app.resolve_user_id(text)` para reconhecer UUID somente por `users.id`
e exigir conta ativa; valores não UUID conservam o lookup legado por auth_subject. UUID ausente
ou bloqueado nunca faz fallback para auth_subject de outra conta. O mesmo resolver privado atende
membership e adaptadores existentes, evitando divergência entre acesso, catálogo, fontes e chat.
Sem nova função pública, grant amplo, papel, serviço ou mudança de permissão por condomínio.
As cinco funções legadas de listar/criar/sair/excluir condomínio e autorizar perfil são
redefinidas explicitamente na mesma migration, delegando somente a resolução de identidade ao
helper canônico. Seus demais corpos, regras de domínio, grants e search_path são preservados.

O código equivale a uma credencial e dá acesso à conta: deve ser compartilhado apenas com
aparelhos próprios. Limpeza de cookies exige nova entrada. Roubo do token exige revogação;
rotação do código pela equipe permite revogar todos os aparelhos. Não se promete “nunca”
independentemente do navegador. A demonstração em RAM continua sem histórico durável após
reinício. Arquivos locais atendem uma instância; piloto público exige banco durável e limites
distribuídos. Sem recuperação automática de conta nesta fatia.

Fundamentação: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html),
ADRs 0002, 0011 e 0020. Esta decisão altera deliberadamente a expiração limitada para novas
sessões por código, conforme permanência solicitada; sessões antigas conservam seu contrato.
