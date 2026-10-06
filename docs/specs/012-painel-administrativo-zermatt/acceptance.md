# Critérios de aceitação — Spec 012

## AC-1201 — Conta administrativa reconhecida

**Dado** um identificador interno de conta presente na configuração administrativa do servidor  
**Quando** a pessoa inicia uma sessão válida  
**Então** a resposta identifica `isAdmin: true` e a interface abre diretamente o painel da Zermatt.

## AC-1202 — Conta comum isolada

**Dado** uma conta autenticada que não está na configuração administrativa  
**Quando** ela solicita o painel  
**Então** recebe `403`, não descobre quem são os administradores e continua na experiência comum do produto.

## AC-1203 — Sessão obrigatória

**Dado** uma requisição sem sessão válida  
**Quando** o endpoint administrativo é solicitado  
**Então** recebe `401` sem qualquer métrica.

## AC-1204 — Indicadores mínimos

**Dado** um conjunto controlado de contas e sessões sintéticas  
**Quando** a conta administrativa abre o painel  
**Então** visualiza contas ativas, novos cadastros em sete dias, usuários com acesso em sete dias e o horário da atualização.

## AC-1205 — Nenhum dado de condomínio ou conteúdo

**Dado** que existem condomínios, documentos e conversas no sistema  
**Quando** a consulta administrativa é executada e a resposta é renderizada  
**Então** não há referência a tabelas, identificadores, nomes, contagens ou conteúdo desses domínios.

## AC-1206 — Sem inferência comercial

**Dado** que ainda não existe fluxo de consentimento comercial  
**Quando** o painel é exibido  
**Então** ele informa que a coleta não está ativa e não apresenta leads, contatos, rankings ou oportunidades inferidas.

## AC-1207 — Uso responsivo e saída

**Dado** o painel aberto em celular ou computador  
**Quando** a pessoa consulta os indicadores ou escolhe sair  
**Então** os cards e ícones permanecem legíveis e centralizados, e a sessão é encerrada pela ação visível de saída.

## AC-1208 — Diretório mínimo de contas

**Dado** contas ativas cadastradas  
**Quando** a conta administrativa abre o painel  
**Então** visualiza somente nome e e-mail das 100 contas mais recentes, sem telefone, identificador interno, condomínio, atividade individual ou ação de contato.
