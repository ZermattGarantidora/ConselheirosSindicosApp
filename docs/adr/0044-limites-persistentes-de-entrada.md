# ADR 0044 — Reserva persistente de tentativas de entrada

**Status:** decidido para preparação local da Spec 068; implantação não autorizada  
**Data:** 2026-11-09

## Contexto e decisão

O limite em Map por processo permite renovar tentativas em reinício ou alternando réplicas.
Usar o armazenamento de acesso existente, sem serviço/dependência nova: cofre com lock e gravação
atômica no desenvolvimento, função PostgreSQL privada no modo persistente (migration 040).
Reservar antes do parsing e da verificação do código, dez/origem e mil globais por 15 minutos.
Contar sucesso e falha; negar excesso com 429 e falha do armazenamento com 503, sem fallback.

A origem é `request.ip` definido pelo servidor. HMAC com domínio próprio e segredo de acesso
estável permite compartilhar a chave sem guardar IP em texto. HMAC continua pseudonimizado e
precisa da retenção aprovada para ambiente real. Limpar contadores vencidos no consumo seguinte;
não guardar user-agent, código, cookie ou conteúdo. O relógio do PostgreSQL governa suas janelas.

A linha global é travada antes da leitura/atualização das duas cotas, serializando reservas.
Tabela sem acesso direto para app_runtime, RLS/FORCE e função SECURITY DEFINER com search_path
fixo e revogação de PUBLIC seguem os ADRs 0002/0011/0040. Autorização por tenant e contrato de
sessão permanente não mudam. Antes de autenticar ainda não há condomínio: o contador contém
somente dados operacionais globais, nunca dados de domínio ou associação de contas.

## Consequências e validação

NAT/proxy compartilha cota por origem; a operação precisa configurar proxy confiável e ensaiar a
rede presencial antes de publicar. Limite global é proteção complementar e pode causar bloqueio
temporário durante ataque; borda e budgets de IA/OCR/upload permanecem necessários. A reserva
global serializa logins; adequação de capacidade deve ser medida. Não relaxar cota sem registrar
motivo e revalidar critérios.

Foco local: concorrência entre serviços no mesmo cofre, recriação, janela, corrupção, erros seguros,
HMAC, contrato SQL e sessões preservadas. Banco/hosts reais exigem teste sintético autorizado e
revisão independente. Rollout requer migration antes da API; ausência falha fechada. Não executar
migration em destino real nem apagar contadores ativos nesta rodada. A migration 040 foi
exercitada somente em bancos locais descartáveis, conforme autorização específica e recibos
sintéticos de 09/11 e 11/11. Código anterior pode ser restaurado apenas
com ambiente fechado, pois recoloca o limite volátil. Nenhum prazo autoriza esse downgrade público.

## Extensão local — reservas e recibos da Spec 072

Reutilizar PostgreSQL para limites compartilhados de operações/custo e claim idempotente.
A migration 040 preparada recebe tabelas privadas e funções específicas, sem alterar
o contrato de login. Política durável nasce disabled; runtime não a altera. Dados de domínio
permanecem por condomínio; setup anterior ao condomínio tem somente conta e metadados de consumo.

Serializar mutações pela linha de política, revalidar autorização no SQL e persistir claim antes
da chamada. Cancelamento só antes de iniciar. Depois do claim, falha conserva custo/concorrência
como pendência; não há takeover que repita chamada com resultado desconhecido. Finalização usa
token opaco por hash e guarda hash do resultado/custo, sem conteúdo. Isso não recupera resposta
perdida nem autoriza política de dados: journal/resultados e autorizador documental são contratos
distintos. Arquivo local é exclusivamente sintético e compartilha lock no mesmo volume; não é
backend público. Tetos/moeda/retenção reais e autorização positiva no startup continuam pendentes;
as ligações injetáveis das rotas foram compostas e testadas somente com sintéticos.

Recibos conservam moeda e UUIDs operacionais; trocar moeda com recibos existentes bloqueia
reservas/claims, sem conversão automática. Não usar FK/cascade para apagar consumo quando o
domínio é excluído nem bloquear exclusão existente com FK nova. Esses IDs não autorizam acesso:
funções revalidam entidade/membership; retenção exige decisão específica. Global guarda apenas
limites/contagens agregados, nunca resposta ou documento.

Na composição documental autorizada localmente, Spec 072 define total autoritativo; o ledger
da Spec 071 conserva resultado e compromisso espelhado, sem somar a segunda despesa. Sem custo
medido, contabilizar o máximo de forma conservadora e identificá-lo como tal, não fatura real.
Resultado confirmado pode ser recuperado apesar de pendência entre stores; não libera reserva
operacional desconhecida nem executa novamente. Startup positivo e reconciliação real continuam
gates separados. A revisão operacional é o SHA-256 da revisão de política autorizada.

## Extensão sintética — decisões e consumo fora do snapshot

Na continuação da Spec 073 (16/11), migration 043 acrescenta seis finalidades de autoria ao
mesmo contrato privado, exigindo manager para essas operações. Não habilita política ou acesso
direto às tabelas. O harness pode conservar o cofre sintético da Spec 072 fora do dump SQL;
provisionamento é explícito e perda do arquivo nega consumo, sem recriar ledger vazio. Hash e
custo máximo persistem; texto/resultado continuam somente no armazenamento privado de autoria.

RQ-7207/7208 acrescentam ferramenta operador local, sem dependência/serviço/rota nova. Plano
imutável HMAC, arquivo exclusivo com flush, hash esperado ancorado fora do dump, revisão,
snapshot e allowlist explícitos. Não armazenar resultado, conteúdo ou claim aberto no checkpoint.
SQL é restrito a fixture/loopback/marcador, política negada e manutenção sem jobs ativos; locks
de todas as tabelas `app` e inventário independente de OIDs cobrem o mesmo corte transacional.
Callback documental usa a mesma transação. O plano conserva efeito restritivo após restore e
jamais reabre serviço. Retenção e base legal reais continuam sem decisão.

Consumo é unido por identidade/fingerprint sem reduzir ou duplicar compromisso. Resultado que
não está no backup vira cerca incerta, sem geração. Reconciliação privilegiada aceita somente
resultado confirmado correspondente ou cancelamento comprovado anterior ao dispatch; pendência
sem prova continua bloqueada. Não há refund, claim novo ou retry por tempo. Planos/checkpoints
parciais, contraditórios ou divergentes de inventário negam e exigem manter a quarentena.
