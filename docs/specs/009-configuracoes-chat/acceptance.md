# Critérios de aceitação — Spec 009

## AC-901 — Abrir configurações

**Dado** um condomínio selecionado no chat

**Quando** o usuário toca em “Configurações”

**Então** vê as abas “Personalização”, “Documentos”, “Preferências” e “Gestão” e a identificação do condomínio ativo

**E** “Personalização” está selecionada por padrão

**E** somente o conteúdo da aba selecionada é exibido.

**E** no celular o botão usa um ícone de configurações reconhecível, área de toque mínima de 44 por 44 pixels, contraste visível e não fica cortado na lateral.

## AC-914 — Navegar pelas abas das configurações

**Dado** que a pessoa está nas configurações do condomínio

**Quando** seleciona “Documentos”, “Preferências” ou “Gestão”

**Então** vê, respectivamente, o acervo documental, as opções da conversa ou a ação de gestão do condomínio

**E** o painel selecionado é anunciado como aba ativa para tecnologias assistivas

**E** setas, `Home` e `End` permitem navegar pelas abas usando o teclado

**E** trocar de aba não salva alterações, apaga estado carregado nem altera dados do servidor.

## AC-902 — Preferências locais

**Dado** a tela de configurações aberta  
**Quando** o usuário desativa histórico ou lembrete de evidências  
**Então** a renderização do chat muda imediatamente sem fazer chamada de exclusão ou alterar registros persistidos.

## AC-903 — Limpar conversa visível

**Dado** a tela de configurações aberta  
**Quando** o usuário seleciona “Limpar conversa visível”  
**Então** a tela do chat é reiniciada e a interface informa que o histórico salvo não foi apagado.

## AC-904 — Confirmar exclusão do condomínio

**Dado** uma membership ativa com papel de síndico no condomínio selecionado  
**Quando** o usuário confirma “Apagar condomínio”  
**Então** o cadastro, documentos, conversas, histórico, auditoria e associações daquele condomínio são apagados permanentemente, ele retorna à lista sem o condomínio e vê o aviso correspondente.

## AC-905 — Cancelar exclusão

**Dado** o diálogo de confirmação aberto  
**Quando** o usuário seleciona “Cancelar”  
**Então** nenhuma chamada de exclusão é feita e a tela de configurações permanece aberta.

## AC-906 — Acesso não autorizado

**Dado** uma sessão ausente, sem membership ativa ou com papel diferente de síndico  
**Quando** alguém tenta apagar um condomínio  
**Então** a API retorna `401` ou `403`, não altera dados e o cliente mostra uma mensagem sem detalhes internos.

## AC-907 — Isolamento da exclusão

**Dado** uma exclusão confirmada  
**Quando** outra conta consulta seus próprios condomínios  
**Então** a conta, os outros condomínios e seus dados continuam intactos; somente o `condominium_id` confirmado foi removido.

## AC-908 — Abrir o perfil e sair da conta

**Dado** que a navegação exibe o perfil “Gestor”
**Quando** a pessoa toca nesse perfil
**Então** abre uma tela de perfil com sua identidade e a ação “Sair da conta”
**E** pode voltar para a tela de origem
**E** preferências da conversa, informações ou configurações do condomínio e sua exclusão não são apresentadas nessa tela.

## AC-909 — Ver documentos registrados

**Dado** um condomínio selecionado e uma membership ativa com `document:read`
**Quando** a pessoa abre as configurações do condomínio
**Então** vê apenas os documentos ativos desse condomínio
**E** cada item apresenta título, tipo, versão mais recente, processamento e vigência
**E** carregamento, catálogo vazio e falha possuem estados compreensíveis.

## AC-910 — Adicionar mais documentos

**Dado** um condomínio selecionado e a permissão `document:upload`
**Quando** a pessoa seleciona PDFs válidos, confirma que pertencem ao condomínio e inicia o envio
**Então** cada arquivo é registrado exclusivamente nesse condomínio
**E** o catálogo é recarregado ao final
**E** a interface informa sucesso total, sucesso parcial ou falha sem ocultar quais arquivos não foram salvos.

## AC-911 — Isolar catálogo e upload

**Dado** um usuário associado a mais de um condomínio
**Quando** lista ou adiciona documentos nas configurações de um deles
**Então** a API resolve a membership e fixa o `condominium_id` autorizado antes de acessar o repositório
**E** nenhum documento do outro condomínio aparece ou é alterado
**E** sessão ausente ou permissão insuficiente resulta em `401` ou `403` sem mutação.

## AC-912 — Personalizar os dados do condomínio

**Dado** um síndico responsável pelo condomínio selecionado
**Quando** ele altera o nome, endereço, administradora, quantidade de unidades, contato da gestão ou descrição e salva
**Então** o servidor valida e persiste somente os campos permitidos daquele condomínio
**E** o CNPJ permanece somente leitura
**E** a lista, o cabeçalho e o perfil passam a mostrar o nome atualizado
**E** documentos, conversas e outros condomínios não são alterados.

**Dado** um membro sem papel de síndico ou sem associação ativa
**Quando** tenta alterar o perfil
**Então** recebe `403` ou `401`, sem mutação.

## AC-913 — Adicionar e gerenciar fotos

**Dado** um síndico responsável no condomínio selecionado
**Quando** adiciona JPEG, PNG ou WebP de até 5 MB e escolhe uma das imagens como capa
**Então** a foto é persistida no banco com vínculo ao condomínio autorizado e aparece no perfil
**E** ele pode remover uma foto escolhida
**E** a tela orienta a evitar imagens com pessoas ou dados pessoais desnecessários.

**Dado** um arquivo acima de 5 MB, com tipo não permitido ou conteúdo incompatível com o tipo declarado
**Quando** o servidor recebe o upload
**Então** rejeita o arquivo sem armazená-lo.

**Dado** uma pessoa sem vínculo ativo ou membro de outro condomínio
**Quando** tenta listar ou abrir uma foto usando um identificador conhecido
**Então** não consegue ler nem modificar a imagem.

**Dado** uma descrição de perfil e fotos personalizadas
**Quando** o Alvitra responde a uma pergunta documental
**Então** esses dados não entram na recuperação nem são apresentados como evidência ou citação.
