# Spec 078 — Runtime persistente autorizado

**Status:** implementação autorizada; liberação do destino pendente  
**Responsável:** engenharia e operador do piloto  
**Atualizado em:** 2026-11-25

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --------------------- | ------------------------ | --------------------------------------------------------------------------------------- |
| Problema e hipótese   | §§2 e 4                  | Liga a conversa e os documentos à memória persistente já implementada.                  |
| Público               | §3                       | Prepara o uso controlado pelos síndicos participantes do piloto.                        |
| Proposta de valor     | §§5–6                    | Permite retomar uma tarefa com histórico e documentos autorizados.                      |
| Prioridades do MVP    | §7, Blocos 1, 3, 5–7; §8 | Compõe acesso por código, histórico durável e processamento documental sem novas telas. |
| Segurança e confiança | §§8–10                   | Exige política revisada, admissão persistente, autorização atual e isolamento.          |
| Validação e métricas  | §§12–14                  | Verifica continuidade, negativa entre contas e falha segura antes da publicação.        |

### Limites respeitados

- O pedido explícito de 25/11 autoriza concluir a integração; não aprova política jurídica,
  retenção real ou valores de orçamento ainda não decididos.
- Reutiliza PostgreSQL/Supabase, Render e os provedores já autorizados: OpenAI ou Gemini
  temporária, conforme briefing §12. Não cria assinatura ou dependência.
- Não altera prompts, perfil vetorial ou o comportamento da demonstração.
- A primeira fatia executável compõe setup, perguntas e upload de documentos textuais com o
  worker já existente. OCR/fotos/síntese hospedada conservam seus contratos e não são ativados
  por esta política de admissão da API. Formatos indisponíveis permanecem explícitos.
- Não importa histórico em RAM como se fosse gravação durável nem usa integração destrutiva
  em banco persistente. Publicação, configuração e provas no destino são registradas separadamente.

### Divergências da visão

Nenhuma. Esta fatia fecha a ligação operacional dos blocos autorizados, sem antecipar WhatsApp,
cadastro público, módulos administrativos ou ação externa automática.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve a continuidade documental descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para utilidade, continuidade e zero vazamento.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Permitir a execução da conversa persistente somente para contas liberadas por configuração
operacional revisada e política de orçamento correspondente no banco, sem substituir guardas por flags.

## 2. Promessa testada

> A aplicação conserva a memória autorizada e só executa operações quando a configuração e
> a política persistida concordam; indisponibilidade ou revogação não libera novo envio.

## 3. Usuário primário

Síndico participante do piloto e operador responsável pela configuração e recuperação.

## 4. Escopo

Manifesto operacional sem segredos, revisão criptográfica do manifesto, admissão por conta,
validade temporal, moeda explícita, consulta persistente de revogação, composição com Spec 072,
conexão TLS verificada e preflight do schema/papéis antes de abrir o runtime autorizado.

## 5. Fora do escopo

Escolher teto monetário, aprovar dados reais ou especialistas, cadastrar credenciais,
ativar OCR externo, trocar modelo/prompt, criar conta pública ou migrar o estado RAM.

## 6. Pré-condições

Specs 058/068–072 e seus ADRs; migrations até 043 e migration 044 desta fatia. A configuração
é fornecida pelo operador somente depois das decisões correspondentes. Ausência conserva
admissão negativa. Não ler `.env` durante testes nem registrar valores do manifesto ou URLs.

## 7. Requisitos funcionais

### RQ-7801 — Configuração operacional vinculada ao banco

Interpretar `ALVITRA_PERSISTENT_EXECUTION_POLICY` como JSON estrito: versão, referência de
aprovação, revisão da política de dados, expiração UTC, moeda, contas autorizadas, provedor/modelo
e custos máximos por setup/pergunta/upload. Rejeitar campos desconhecidos, valores não inteiros,
contas inválidas, payload excessivo, duplicatas, revisão/expiração inválidas e modo demo.
O SHA-256 canônico do manifesto é a revisão da Spec 072, não um valor escolhido no HTTP.
Nenhum valor de exemplo é política aprovada. Provedor/modelo efetivo precisa corresponder ao manifesto.
Permitir somente um provedor efetivo por manifesto. OpenAI usa roteamento `single`; Gemini
preserva o modelo configurado existente. Provedor alternativo ativo e Codex são recusados,
sem alterar o roteamento da demonstração nem retirar a alternativa Gemini do projeto.

### RQ-7802 — Revalidação e consumo

Compor `createApiOperationControl` com `createPostgresOperationBudgetStore`. Antes de executar
e antes de reutilizar uma prova, conferir expiração, conta permitida, contexto revalidado pela
rota e política atual do banco, com a mesma revisão e moeda. SQL de orçamento continua
autoritativo para membership, concorrência, teto, claim e resultado incerto. Falha de consulta
nega sem expor erro nativo. Revogar política impede replay e novas operações entre réplicas.

### RQ-7803 — Conexão e preflight

Validar URI PostgreSQL e exigir TLS remoto com verificação de certificado; aceitar CA PEM
opcional, sem `rejectUnauthorized:false`. Permitir somente os parâmetros de URI `sslmode` e
`application_name`, sem duplicatas, impedindo que o driver substitua o host validado por um
parâmetro de conexão. Antes de abrir o perfil autorizado, conferir schema,
funções mínimas, RLS forçada nas tabelas essenciais, papel runtime sem privilégios elevados e
capacidade de assumir esse papel. Não escrever, migrar ou corrigir permissões no preflight.
Falha encerra pools e não abre listener nem retorna à demonstração.
Assumir `app_runtime` antes de resolver funções de `app`; o login `NOINHERIT` não precisa
receber acesso direto ao schema. As verificações de identidade e privilégios continuam usando
`session_user`. Reconhecer os modos Supabase nas portas 6543 e 5432: derivar 5432, preservar
credenciais/banco/TLS e aceitar novamente a própria saída. Poolers desconhecidos continuam negados.

### RQ-7804 — Memória e publicação verificáveis

Conservar os adaptadores PostgreSQL de conversas, documentos e respostas. Guardas legadas
continuam negativas sem manifesto; ativação não altera o worker nem inicia chamadas por si só.
Publicar somente candidata revisada/testada. A prova remota usa dados sintéticos próprios,
sem TRUNCATE ou apagar dados anteriores, e registra revisão de API/worker e limites da validação.
Na transição autorizada do serviço existente, o Blueprint canônico `render.yaml` também usa
`DEMO_MODE=false`; uma sincronização não pode reaplicar o modo demo sobre o manifesto persistente.
Isso não habilita orçamento, provedor adicional, OCR ou dados reais.

## 8. Contratos

Migration 044 oferece somente função booleana de leitura da política corrente para runtime/worker;
não concede leitura/escrita das tabelas de orçamento. Manifesto aprovado é configuração privada,
não segredo, e sua revisão precisa ser idêntica à política habilitada pela operação no banco.
Operação contabiliza conservadoramente seu máximo; não apresenta esse valor como fatura.

## 9. Requisitos não funcionais

Sem nova dependência, conteúdo/credencial em logs ou bypass de tenant. Testes usam somente
sintéticos e mocks isolados. Cobertura global mínima de 80% nos quatro indicadores.

## 10. Critérios de sucesso

Aceitação cobre configuração válida e negativa, isolamento de conta, revogação, replay,
falha entre resultado/recibo, TLS e fechamento de pools. Validação no destino e revisão
independente continuam evidências distintas dos contratos locais.

## 11. Questões em aberto

Manifesto aprovado, tetos monetários, política/fornecedores para dados reais, liberação dos
formatos externos, revisão independente e ensaio integral no destino. Não inventar essas decisões.

## Gate competitivo

Mantém a conversa; fecha os blocos autorizados; melhora memória, confiança e retorno; preserva
isolamento e evidência; diferencia pela continuidade documental verificável. Reutilizar os
controles existentes reduz complexidade e permite revogar a configuração sem alterar o produto.

## Gate para mudar o status

Não declarar ativação remota ou piloto liberado sem candidata, configuração, política e provas
correspondentes. Preparação local, testes e aprovação da política são estados distintos.
