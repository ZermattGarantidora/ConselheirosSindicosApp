# Critérios de aceitação — Spec 037

## AC-3701 — Nomes diferentes

**Dado** Residencial Alameda selecionado e arquivo que identifica Condomínio Bosque no título ou cabeçalho  
**Quando** termina a leitura  
**Então** o chat exibe ambos os nomes e pede confirmação para Alameda  
**E** usa um único cartão azul-escuro, sem repetir a pendência em um alerta separado  
**E** o arquivo permanece indisponível para consultas e análise enquanto aguarda.

## AC-3702 — Equivalência e ausência de identificação

**Quando** há apenas variação de caixa, acento, pontuação ou prefixo genérico  
**Então** o envio prossegue sem confirmação extra.  
**Quando** não há nome explícito legível ou há somente menção incidental no corpo  
**Então** não inventa pertencimento nem uma divergência.

## AC-3703 — Decisão contextual

**Quando** a pessoa confirma para a versão pendente autorizada  
**Então** o documento pode ser consultado se os demais critérios de leitura e vigência permitirem  
**E** a mensagem junto do anexo pode ser consultada uma vez.  
**Quando** cancela  
**Então** o arquivo continua bloqueado e pode trocar o condomínio e reenviar, sem realocação automática.

## AC-3704 — Isolamento e retomada

**Quando** outro tenant, pessoa sem upload, associação revogada, versão antiga ou documento removido tenta confirmar  
**Então** a operação é negada sem liberar dados.  
**E** a pendência é retornada no catálogo após recarregar e a decisão no PostgreSQL registra o autor.

## AC-3705 — Fontes não confiáveis e revisão

**Dado** instruções hostis no documento, nomes contraditórios, OCR parcial ou vigência pendente  
**Então** nenhuma instrução altera contexto ou autorização  
**E** sinais explícitos divergentes pedem confirmação  
**E** confirmar pertencimento não remove revisão de leitura ou confirma vigência.
