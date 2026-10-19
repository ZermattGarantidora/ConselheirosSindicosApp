# Critérios de aceitação — Spec 026

**Status:** aprovados para validação sintética

## AC-2601 — Sem fala pronta

**Dado** um novo acesso, uma retomada ou uma etapa de configuração  
**Quando** a Alvitra fala  
**Então** a mensagem é gerada a partir do estado e do contexto autorizado  
**E** não é selecionada de uma lista de frases pré-programadas.

**Dado** que a Alvitra fez uma pergunta de configuração  
**Quando** a pessoa responde, pergunta, pede um exemplo, corrige um dado ou apenas conversa  
**Então** a intenção é interpretada pelo modelo a partir do histórico recente  
**E** o cliente não classifica a mensagem por uma lista de frases ou palavras-chave  
**E** o cadastro só avança quando a interpretação produz um valor estruturado válido para a etapa atual.

## AC-2602 — Pergunta geral

**Dado** uma pergunta sobre rotina de sindicatura sem documento local  
**Quando** a Alvitra responde  
**Então** oferece orientação prática  
**E** não inventa um fato, uma regra ou uma fonte do condomínio  
**E** cita norma específica somente quando houver fonte oficial recuperada, vigente e aplicável à jurisdição.

## AC-2608 — Documento necessário sem envio imediato

**Dado** uma pergunta que pode ser orientada em termos gerais, mas cujo detalhe local depende de um documento ausente  
**Quando** a Alvitra responde e a pessoa não envia o documento  
**Então** ela oferece desde já a orientação geral e legal fundamentada disponível  
**E** explica que o documento é necessário para responder sobre o condomínio e pede somente o material pertinente  
**E** informa que a pessoa pode enviá-lo depois  
**E** continua a conversa sem repetir a exigência ou inventar uma conclusão local  
**E** pode aprofundar a análise quando o documento for enviado depois.

## AC-2603 — Outro assunto

**Dado** uma pergunta fora do tema condominial  
**Quando** a Alvitra responde  
**Então** atende à pergunta  
**E** só relaciona a resposta à sindicatura se a relação acrescentar utilidade.

## AC-2604 — Anexo verificável

**Dado** documento ou foto autorizados  
**Quando** a Alvitra os analisa  
**Então** distingue conteúdo observável de interpretação  
**E** cita procedência verificável para afirmações locais  
**E** informa limitações de OCR, imagem, versão ou vigência que alterem a conclusão.

## AC-2605 — Problema apontado com base

**Dado** evidência de uma inconsistência relevante  
**Quando** a Alvitra responde  
**Então** aponta o problema sem rodeio, explica a base e o impacto  
**E** sugere correção proporcional sem humilhar nem concordar automaticamente.

## AC-2606 — Limite e falha

**Dado** evidência insuficiente, tema de alto risco ou provedor indisponível  
**Quando** a resposta é preparada  
**Então** não aparece conclusão local sem base nem mensagem sintética fingindo ser da Alvitra  
**E** o limite e o próximo passo adequado ficam claros.

## AC-2607 — Isolamento e custo

**Dado** dois condomínios autorizados para a mesma pessoa  
**Quando** ela troca o contexto e pergunta ou anexa material  
**Então** evidências, chamada ao modelo, resposta e citações pertencem somente ao condomínio ativo  
**E** telemetria registra consumo e latência sem texto integral ou segredo.

## AC-2609 — Migração gradual dos provedores

**Dado** OpenAI configurada  
**Quando** a Alvitra gera uma mensagem ou resposta  
**Então** OpenAI é o provedor preferencial  
**E** Gemini pode assumir somente quando o provedor principal estiver indisponível.  
**Dado** somente a Gemini configurada  
**Quando** a pessoa conversa ou envia uma foto autorizada com os controles operacionais ativos  
**Então** resposta, análise e indexação continuam disponíveis pela Gemini  
**E** a descrição não é apresentada como laudo ou transcrição literal  
**E** o resultado e as citações permanecem no condomínio autorizado.  
**Dado** vetores gerados por provedores diferentes  
**Quando** uma busca é executada  
**Então** eles não são comparados silenciosamente como se fossem do mesmo perfil.

Regressão obrigatória: executar com perfis OpenAI e Gemini separadamente e com índice misto;
as duas consultas SQL filtram pelo perfil ativo. Índice apenas de outro perfil não dispara
embedding de foto. Retorno com perfil divergente, mesmo com 768 dimensões, é recusado antes
da consulta vetorial. Nenhum teste chama provedor real.
