# Critérios de aceitação — Spec 013

**Status:** aprovada para implementação local  
**Atualizado em:** 2026-09-24

## AC-1301 — Ler todas as páginas textuais (P0)

**Dado** um PDF textual com várias páginas  
**Quando** o processamento termina  
**Então** a quantidade processada e pesquisável corresponde ao total declarado  
**E** cada página preserva número, texto, hash e localização.

## AC-1302 — Preservar linhas úteis (P1)

**Dado** uma página com linhas ou tabela textual  
**Quando** o texto é extraído  
**Então** mudanças de linha são preservadas  
**E** palavras de linhas diferentes não são concatenadas como uma única frase.

## AC-1303 — Bloquear leitura parcial (P0)

**Dado** um PDF com ao menos uma página sem texto utilizável  
**E** OCR indisponível ou insuficiente  
**Quando** o processamento termina  
**Então** o estado é `needs_review`  
**E** a página afetada é identificada  
**E** o documento não sustenta resposta como se estivesse completo.

## AC-1304 — Rejeitar OCR incompleto (P0)

**Dado** um PDF de três páginas  
**Quando** o OCR devolve somente duas páginas  
**Então** a completude não é total  
**E** a versão permanece em revisão.

## AC-1305 — Mostrar completude no catálogo (P1)

**Dado** um documento processado  
**Quando** o síndico abre os documentos do condomínio  
**Então** vê páginas lidas sobre o total  
**E** vê as páginas que precisam de revisão, quando existirem.

## AC-1306 — Isolar o resumo de extração (P0)

**Dado** dois condomínios  
**Quando** um usuário consulta o catálogo de um deles  
**Então** nenhuma contagem ou página do outro condomínio aparece.

## AC-1307 — Limitar arquivo com segurança (P0)

**Dado** um PDF inválido, acima de 25 MB ou acima de 500 páginas  
**Quando** o envio ou processamento ocorre  
**Então** o sistema falha de forma recuperável  
**E** não publica resultado parcial como pronto.

## AC-1308 — Não enviar documento real a OCR externo (P0)

**Dado** um PDF real digitalizado no ambiente controlado  
**Quando** não há OCR local autorizado  
**Então** a versão fica em revisão  
**E** nenhum provedor externo recebe o arquivo silenciosamente.
