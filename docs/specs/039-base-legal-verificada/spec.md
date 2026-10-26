# Spec 039 — Base legal federal conferida

**Status:** implementada e validada localmente; ajustes de integração preparados; validação externa no Supabase pendente
**Responsável:** produto e engenharia
**Atualizado em:** 2026-10-26

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§1, 2 e 4 | Acrescenta evidência legal relevante às dúvidas do síndico sem exigir anexos para orientação geral. |
| Público | §3 | Atende síndicos profissionais e moradores com fontes federais de aplicação geral. |
| Proposta de valor | §5 | Permite conferir a regra citada e identificar o documento local ainda necessário. |
| Prioridades do MVP | §§6–8 | Reutiliza chat, recuperação e biblioteca legal compartilhada, sem nova tela ou cadastro. |
| Segurança e confiança | §§9–10 | Exige origem oficial, recorte explícito, versão, página da cópia de consulta, abstenção e autorização. |
| Validação e métricas | §§12–14 | Mede recuperação, integridade, citações, isolamento e falha segura em casos sintéticos. |

### Limites respeitados

- A autorização de 22/10/2026 abrange adicionar material necessário com confirmação oficial; não
  certifica todo o repositório ctresb/leis e não autoriza publicar ou importar dados de clientes.
- A fatia cobre recortes federais conferidos. Jurisprudência, leis locais, normas técnicas e
  dispositivos históricos ou futuros não conferidos continuam fora da recuperação.
- Mantém a conversa como experiência principal, o prompt aprovado e o encaminhamento profissional.
- Não introduz provedor, dependência, consulta web durante a conversa ou ação externa automática.

### Divergências da visão

Nenhuma. Cópias de consulta são documentos derivados identificados, com paginação própria
verificável; não atribuem páginas à publicação oficial em HTML nem certificam vigência futura.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema e testa a hipótese de conversa útil com evidência.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades, blocos autorizados e itens fora do escopo foram respeitados.
- [x] Isolamento, abstenção, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para correção, citações e utilidade do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Disponibilizar no projeto recortes oficiais verificáveis de direito condominial, locação,
proteção de dados, cobrança, seguros e segurança de piscinas, utilizáveis na demonstração e
preparados para importação administrativa na biblioteca persistente.

## 2. Promessa testada

> Ao perguntar por uma regra legal coberta, posso verificar a versão, o dispositivo e a página da
> cópia de consulta, sem confundir essa regra com um fato do meu condomínio.

## 3. Usuário primário

Síndico autorizado a consultar o contexto de um condomínio.

## 4. Escopo

- catálogo pequeno com origem HTTPS oficial, recortes literais e data da conferência;
- cópias de consulta em PDF, determinísticas e identificadas como derivadas;
- manifesto de integridade com hashes e versões imutáveis;
- recuperação compartilhada na demonstração, composta com o índice privado autorizado;
- leitura da página da fonte e da cópia de consulta mediante autorização;
- importação administrativa compatível com `app.legal_*`, com registro do limite de conferência;
- testes determinísticos e evals legais sintéticos por comando único.

## 5. Fora do escopo

Importação integral do GitHub, certificação de toda norma, regras locais, parecer definitivo,
atualização automática, consultas históricas com estes recortes, novo prompt e publicação.
A referência constitucional antiga exige conferência própria; esta fatia não declara a Constituição
integral atualizada apenas por localizar uma emenda mais recente.

## 6. Pré-condições

Fontes consultadas diretamente em portal oficial. ADR 0016 preservado e complementado pelo ADR
0029. Identidade e associação autorizadas antes da recuperação e da abertura de qualquer fonte.

## 7. Requisitos funcionais

### RQ-3901 — Curadoria e integridade

Cada recorte registra norma, dispositivos incluídos, URL oficial, órgão, jurisdição BR, data de
conferência, prazo de revisão, versão e hash. Texto, metadados relevantes e páginas participam da
identidade imutável. Conteúdo divergente do manifesto é recusado. Lei modificadora não duplica
o dispositivo consolidado; sua relação fica documentada na fonte.

### RQ-3902 — Paginação honesta

Uma cópia de consulta possui PDF reproduzível e páginas reais; cabeçalho informa que a paginação
é da cópia Alvitra, sua data e o recorte. O texto normativo não é reescrito por IA. A fonte inclui
URL de origem e limites. Citação e página exibida devem corresponder ao texto extraído desse PDF.

### RQ-3903 — Compartilhamento autorizado

Somente material público curado participa da biblioteca global. O índice privado permanece
filtrado pelo condomínio. A composição exige `document:read`, aplica o contexto autorizado ao
resultado e preserva `sourceScope: legislation`; documentos privados nunca são promovidos a globais.
A fonte pública não prova fatos locais nem dispensa convenção, ata, contrato ou validação humana.
O validador recusa afirmação classificada como fato do condomínio quando todas as suas citações
são legais. Regras legais são distinguíveis como interpretação/orientação, sem alterar o prompt.

### RQ-3904 — Data e limites

O recorte é elegível somente da data de conferência até o prazo de revisão, exclusivo.
O intervalo usa instantes UTC explícitos na memória e na persistência, independentemente do fuso
do banco. Ele delimita a validade da conferência, não o início de vigência da lei. Fora dele, o recorte não
fundamenta respostas; a cópia histórica permanece conferível. Para esta primeira edição, a revisão
vence em 21/11/2026. Não interpretar publicação recente como eficácia imediata. Dispositivos
incompletos, não conferidos ou de outra jurisdição não são ativados.

### RQ-3905 — Persistência administrativa

O runtime persistente continua somente leitura sobre a biblioteca. Um comando administrativo
importa as mesmas cópias verificadas, sem download em tempo de pergunta, sem sobrescrever versões
e sem reativar silenciosamente uma versão anterior. Repetir o mesmo conteúdo é idempotente.
Datas de conferência e revisão precisam ser filtradas na recuperação persistente.

### RQ-3906 — Validação

Testes usam perguntas e identidades sintéticas. Nenhum provedor pago é chamado. A adição exige
integridade do corpus, PDF/texto conferíveis, citações sustentadoras, recuperação pertinente,
abstenção temporal, autorização, isolamento privado e preservação das regressões existentes.
O banco de integração sintética reinicia também suas fontes legais entre cenários; evidência
de uma execução anterior não pode alterar o resultado de um caso posterior. A execução local
de integração deve preservar um relatório completo e identificar cada rodada separadamente.

## 8. Contratos

Entrada administrativa: catálogo conferido e cópias imutáveis. Saída: manifesto, páginas,
trechos, perfil vetorial e resultado por fonte. Entrada de recuperação: contexto autorizado,
pergunta e data. Saída mantém o contrato documental existente e identifica legislação.

## 9. Requisitos não funcionais

Zero dados pessoais no corpus. Nenhuma requisição externa durante a recuperação. Processamento
das cópias realizado uma vez e reutilizado. Falha de integridade bloqueia ativação da edição.

## 10. Critérios de sucesso

Fontes legais cobertas são recuperadas com procedência verificável; não há citação de página
inexistente, afirmação local sustentada só por lei, fonte vencida elegível ou acesso cruzado.
Cobertura unitária mantém os quatro indicadores acima de 80% e os evals legais passam integralmente.

## 11. Questões em aberto

Cobertura territorial, atualização constitucional integral, revisão especializada e medição de
qualidade semântica com provedor permanecem etapas próprias. Acesso ao banco pode limitar a
execução da migração e da importação; isso deve ser informado sem declarar ativação persistente.

## Gate para mudar o status

Exige gate de visão, rastreabilidade, testes, evals, revisão do diff e registro das limitações.
Migração e integração não executadas impedem declarar a persistência pronta para implantação.
