# Spec 009 — Configurações do condomínio, documentos e exclusão

**Status:** aprovada para implementação local controlada  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-06

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Problema e hipótese   | §§1, 2, 4 e 11     | Mantém o chat compreensível e dá ao síndico controle claro sobre a identificação, a memória documental e o ciclo de vida do condomínio que ele criou.             |
| Público               | §§3 e 11           | Atende síndicos profissionais e moradores que alternam entre condomínios e precisam controlar o próprio acesso e seus cadastros.                                |
| Proposta de valor     | §§5 e 10           | Preserva uma experiência simples e contextual e deixa a identificação dos condomínios sob controle do síndico.                                                   |
| Prioridades do MVP    | §§7, 9, 11 e 14    | Detalha identificação editável, memória documental e exclusão segura sem antecipar integrações externas nem gestão operacional.                                  |
| Segurança e confiança | §§9, 12 e 14       | Exige `condominium_id` autorizado, confirmação humana, papel de síndico e exclusão isolada dos dados do condomínio selecionado.                                 |
| Validação e métricas  | §§16 e 17          | Permite observar se a pessoa entende as preferências e a consequência irreversível da exclusão.                                                                 |

### Limites respeitados

- “Sair da gestão e apagar condomínio” só pode ser executado pelo síndico responsável do condomínio selecionado.
- A exclusão remove permanentemente o cadastro, documentos, respostas, conversas, histórico, auditoria e associações daquele condomínio; não remove a conta do usuário nem dados de outros condomínios.
- A limpeza de conversa visível continua sendo apenas local e não substitui a exclusão do condomínio.
- Exportação, retenção detalhada, transferência de titularidade, equipes, integração com WhatsApp e envio automático de mensagens continuam fora desta fatia.
- As preferências de exibição são locais ao dispositivo nesta primeira versão; não representam configuração compartilhada do condomínio.
- O catálogo mostra apenas documentos do condomínio autorizado e o envio permanece restrito a PDFs de até 25 MB; demais formatos previstos no briefing permanecem sequenciados para depois.
- O perfil permite ajustar nome, endereço, administradora, número de unidades, contato da gestão, uma descrição de apresentação e até cinco fotos JPEG, PNG ou WebP de até 5 MB cada. O CNPJ permanece somente leitura.
- A descrição e as fotos são informações de apresentação fornecidas pelo síndico; não entram na recuperação documental, não são citadas como evidência e não qualificam o condomínio comercialmente.

### Divergências da visão

Nenhuma. O perfil detalha a identificação e os dados do condomínio previstos no cadastro e na memória do MVP (§§7, 9, 11 e 14), preservando isolamento e o contrato de evidência (§12). A exclusão continua restrita ao condomínio autorizado e depende de confirmação explícita.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Dar ao síndico controles básicos para a conversa, para a memória documental e para a identificação do condomínio, além de uma ação explícita para apagar definitivamente o condomínio que ele administra, sem confundir isso com limpar mensagens ou apagar a conta.

## 2. Promessa testada

> Reconheço e personalizo o condomínio selecionado, vejo e amplio sua memória documental e, se confirmar a exclusão, apago somente esse condomínio e seus dados vinculados.

## 3. Usuário primário

Síndico profissional ou síndico morador autenticado e com uma membership ativa de `manager` no condomínio selecionado.

## 4. Escopo

- Tela de configurações acessível no cabeçalho do chat.
- Navegação das configurações por abas acessíveis: “Personalização”, “Documentos”, “Preferências” e “Gestão”. A aba “Personalização” abre por padrão; cada aba apresenta somente seu conteúdo correspondente e a seleção vale para a sessão atual da tela.
- Perfil editável do condomínio selecionado com nome, dados de endereço, administradora, número de unidades, contato da gestão e descrição curta de apresentação.
- Inclusão, seleção da foto de capa e remoção de até cinco fotos do condomínio.
- Perfil e fotos visíveis somente a membros autorizados do condomínio; edição disponível apenas à pessoa com papel `manager`.
- Catálogo dos documentos registrados no condomínio selecionado, com tipo, versão e estados de processamento e vigência.
- Envio de um ou mais PDFs adicionais para o condomínio selecionado, com confirmação explícita de pertencimento e vigência antes do upload.
- Tela de perfil acessível pelo bloco “Gestor” na navegação, com somente identidade e controle de saída da conta.
- Preferência local para mostrar ou ocultar o histórico carregado na tela.
- Preferência local para mostrar ou ocultar o lembrete de evidências documentais.
- Ação para limpar apenas a conversa visível no dispositivo, sem apagar o histórico persistido.
- Ação “Sair da gestão e apagar condomínio” com diálogo de confirmação, disponível somente ao síndico responsável.
- Exclusão transacional e isolada do condomínio, seus documentos, conversas, histórico, auditoria e memberships.
- Retorno à lista de condomínios após a exclusão, com mensagem clara de que os dados foram apagados permanentemente.

## 5. Fora do escopo

- Exclusão da conta do usuário ou de qualquer outro condomínio.
- Remoção seletiva de mensagens da conversa sem apagar o condomínio.
- Transferência de titularidade, convites, administração de permissões ou gestão de equipe.
- Configurações compartilhadas entre usuários ou dispositivos.
- Integração com WhatsApp, envio automático ou qualquer ação externa.
- Edição, remoção, download ou substituição de documentos existentes nesta fatia.
- Alteração de CNPJ, transferência de titularidade, portal público, galeria sem limite, diretório de moradores ou uso da descrição como fonte documental.
- Upload de DOCX, planilhas ou imagens independentes antes da capacidade correspondente ser autorizada e implementada na sequência da Spec 001.

## 6. Pré-condições

- Uma sessão autenticada (real ou identidade de desenvolvimento) e um condomínio selecionado.
- A membership correspondente está ativa e tem papel `manager` para o usuário.
- Para o modo real, as migrations `014_leave_condominium_management.sql` e `015_delete_condominium.sql` estão aplicadas no PostgreSQL persistente.

## 7. Requisitos funcionais

### RQ-901 — Configurações da conversa

O chat deve abrir uma tela de configurações organizada em quatro abas: “Personalização”, “Documentos”, “Preferências” e “Gestão”. “Personalização” é a aba inicial e contém os dados e as fotos do perfil; “Documentos” contém o catálogo, a recuperação e a adição de PDFs; “Preferências” contém as opções locais da conversa; “Gestão” contém a ação de exclusão do condomínio. Somente o conteúdo da aba selecionada deve ser exibido. A troca de aba não altera dados do servidor nem descarta dados já carregados.

Em telas de celular, o acesso deve usar um ícone de configurações reconhecível, com área de toque mínima de 44 por 44 pixels, contraste suficiente e espaçamento que impeça corte na lateral do cabeçalho. O nome acessível continua descrevendo “Configurações do condomínio”.

As abas devem expor corretamente os papéis `tablist`, `tab` e `tabpanel`, manter seleção acessível e permitir navegação por teclado com setas, `Home` e `End`.

### RQ-902 — Exclusão iniciada pelo síndico

O usuário deve iniciar “Sair da gestão e apagar condomínio” somente para o condomínio selecionado e somente quando seu papel for `manager`. A interface deve explicar que a ação apaga o condomínio inteiro, não a conta, e pedir confirmação antes da chamada.

### RQ-903 — Exclusão autorizada

Após confirmação, a API deve validar a sessão, o `condominium_id` e a membership ativa de síndico, executar a exclusão transacional de todos os registros vinculados ao condomínio e retornar `204`. O cliente deve limpar o contexto local e voltar à lista.

### RQ-904 — Falha segura

Sessão ausente, membership inexistente ou papel diferente de `manager` não pode apagar dados. A interface deve exibir mensagem compreensível e permanecer na tela de configurações.

### RQ-905 — Perfil e encerramento de sessão

O bloco “Gestor” deve funcionar como um controle acessível e abrir uma tela de perfil enxuta. A tela deve mostrar somente a identidade atual e a ação “Sair da conta”. Preferências da conversa, informações do condomínio ativo, acesso às configurações do condomínio e exclusão permanente não podem aparecer nessa tela; continuam disponíveis somente na área própria do chat quando aplicável.

### RQ-906 — Catálogo documental isolado

A tela de configurações deve listar somente os documentos ativos do condomínio selecionado. Para cada documento, deve mostrar o título, o tipo, a versão mais recente, o estado de processamento e o estado de vigência. A API deve resolver a identidade e a membership antes da consulta, aplicar o `condominium_id` no repositório e não aceitar o identificador enviado pelo cliente como autorização suficiente. Estado vazio, carregamento e falha devem ser compreensíveis sem expor detalhes internos.

### RQ-907 — Adição de documentos

Uma pessoa com permissão `document:upload` pode selecionar um ou mais PDFs de até 25 MB na tela de configurações. A interface deve mostrar os arquivos selecionados, exigir confirmação explícita de que pertencem ao condomínio ativo e podem fundamentar respostas, inferir um tipo documental inicial pelo nome do arquivo e enviar cada arquivo exclusivamente para o `condominium_id` autorizado. Ao terminar, o catálogo deve ser recarregado e distinguir sucesso total, sucesso parcial e falha. A ausência da permissão mantém o catálogo visível, mas desabilita o envio.

### RQ-908 — Personalização do perfil do condomínio

O perfil do condomínio selecionado deve permitir que uma pessoa com papel `manager` edite o nome, endereço, administradora, número de unidades, contato da gestão e uma descrição de até 500 caracteres. O CNPJ é somente leitura. A API valida os limites no servidor, valida a associação ativa e limita a alteração ao `condominium_id` autorizado.

A descrição é informação de apresentação fornecida pelo síndico: não participa da recuperação, geração de resposta, citação ou qualificação comercial. A alteração do perfil não pode modificar documentos, histórico ou dados de outro condomínio.

### RQ-909 — Fotografias do perfil

Uma pessoa com papel `manager` pode manter até cinco fotos do condomínio, selecionar qual delas é a capa e remover fotos. São aceitos somente JPEG, PNG e WebP, com até 5 MB por imagem; o servidor confere tipo real e tamanho. Os originais são armazenados no PostgreSQL associados ao `condominium_id`, servidos após autenticação e autorização, e removidos quando o condomínio é apagado. A tela orienta a não enviar fotos com pessoas, placas ou outros dados pessoais desnecessários.

Membros autorizados podem consultar as fotos; contas sem vínculo ativo e outros condomínios não podem listar, ler, alterar ou remover os arquivos.

## 8. Contratos

- `DELETE /v1/condominiums/:condominiumId` usa a sessão HttpOnly e retorna `204` quando o síndico apaga o condomínio; `401` para sessão ausente; `403` para condomínio não autorizado ou papel insuficiente.
- `DELETE /v1/development/test-condominiums/:condominiumId` usa `x-development-user-id` somente no ambiente demonstrativo e retorna `204` ou erro explícito.
- A função SQL `app.delete_condominium_for_user(auth_subject, condominium_id)` revalida a conta e a membership `manager`, apaga os registros do condomínio em ordem de dependência e não alcança outros `condominium_id`.
- A função SQL legada `app.leave_condominium_for_user` e seu endpoint de membership permanecem apenas para compatibilidade técnica; a ação da interface usa exclusivamente o endpoint de exclusão do condomínio.
- A limpeza da conversa visível é somente de estado de interface; nenhum endpoint de exclusão de histórico é chamado por essa opção.
- `GET /v1/condominiums/:condominiumId/documents` valida a sessão e a membership com `document:read`, aplica o escopo autorizado e retorna apenas os documentos ativos daquele condomínio com a versão mais recente; retorna `401` para sessão ausente e `403` para acesso não autorizado.
- `POST /v1/condominiums/:condominiumId/documents` continua sendo o contrato único de upload, valida `document:upload`, assinatura PDF, metadados e limite de 25 MB, e registra cada arquivo no mesmo condomínio autorizado.
- `GET /v1/condominiums/:condominiumId/profile` lê os dados do perfil e requer associação ativa; `PUT` atualiza somente os campos editáveis e exige papel `manager`.
- `GET/POST /v1/condominiums/:condominiumId/profile/photos` lista metadados ou registra uma foto JPEG, PNG ou WebP de até 5 MB; leitura binária, escolha da capa e exclusão usam rotas filhas com o identificador da foto. Todas validam sessão, associação e tenant no servidor.

## 9. Requisitos não funcionais

- Toda operação deve manter o isolamento por `condominium_id` e aceitar somente a identidade autenticada pelo servidor.
- A confirmação deve ser explícita, acessível por teclado e informar que a exclusão é permanente e irreversível.
- A conta global do usuário e dados de outros condomínios devem permanecer intactos.
- Mensagens de erro não devem expor SQL, tokens, credenciais ou detalhes internos.
- Nenhum dado real de cliente entra em fixtures, testes ou evals.
- Fotografias nunca são gravadas em pastas locais nem servidas como conteúdo ativo; imagens não rasterizadas ou que não correspondam à assinatura do tipo declarado são rejeitadas.

## 10. Critérios de sucesso

- Uma pessoa encontra as configurações no chat em até uma interação e entende o efeito de cada opção.
- Ao abrir as configurações, uma pessoa encontra “Personalização”, “Documentos”, “Preferências” e “Gestão”; cada aba mostra apenas sua área correspondente, e a navegação funciona por teclado e em telas estreitas.
- Uma pessoa abre o perfil tocando em “Gestor” e encontra somente sua identidade e a ação “Sair da conta”, sem informações ou configurações do condomínio.
- Desativar o histórico ou o lembrete altera somente a visualização local.
- A exclusão confirmada remove o condomínio da lista do síndico e apaga seus registros vinculados, sem afetar a conta ou outros condomínios.
- Um usuário sem sessão ou sem papel de síndico recebe `401`/`403`, nenhum registro é alterado e a interface informa o motivo sem detalhes internos.
- Uma pessoa autorizada identifica os documentos registrados e seus estados sem sair das configurações do condomínio.
- Uma pessoa com `document:upload` adiciona PDFs após confirmação explícita e vê o catálogo atualizado; arquivos rejeitados não aparecem como registrados.
- A listagem e o upload nunca retornam nem alteram documentos de outro condomínio, mesmo quando o usuário conhece seus identificadores.
- Uma pessoa com permissão de síndico consegue atualizar os campos permitidos e vê as mudanças refletidas no condomínio selecionado; CNPJ, documentos e outros condomínios permanecem iguais.
- Uma pessoa autorizada consegue adicionar até cinco imagens válidas, escolher a capa e remover uma imagem; arquivos acima do limite, tipos não aceitos ou dados sem associação ativa são rejeitados.
- Descrição e fotos são exibidas no perfil, mas não são usadas como evidência nas respostas.

## 11. Questões em aberto

- Persistência das preferências por usuário e dispositivo poderá ser avaliada após validação do uso.
- Política de retenção e exportação além dos limites desta funcionalidade exige decisão específica de produto, LGPD e autorização administrativa.

## Gate para implementação local

Esta spec autoriza a implementação do perfil editável e fotos privadas do condomínio, do catálogo e upload adicional de PDFs, além da exclusão permanente iniciada pelo síndico. As operações mantêm confirmação explícita quando destrutivas e isolamento por condomínio. Ela não autoriza apagar contas, alterar o CNPJ, expor fotos publicamente, usar dados de apresentação como evidência, aceitar formatos ainda não implementados, integrar WhatsApp ou publicar o fluxo sem revisão de permissões e privacidade.
