# Spec 035 — Instruções documentais não confiáveis

**Status:** aprovada para implementação local  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-19

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e proposta | §§4–6 | Mantém a conversa útil sem deixar que anexos controlem seu comportamento. |
| Memória e evidência | §§8–9 | Trata o conteúdo recuperado como dado e impede que instruções se tornem evidência. |
| Segurança e confiança | §10 | Reforça conteúdo não confiável, isolamento e confirmação humana para ações externas. |
| Validação | §13 | Exercita abstenção segura e ausência de vazamento com canários sintéticos. |

### Limites respeitados

- Não muda system prompt, chama provedor, executa ação, contato, exclusão ou altera permissões.
- Não declara resistência probabilística do modelo: os testes validam a barreira determinística no servidor.
- Não usa dados, segredos ou fornecedores reais.

### Divergências da visão

Nenhuma. Esta é uma defesa em profundidade dos §§8–10 do briefing.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Impedir que instruções encontradas em documentos recuperados controlem geração, ampliem contexto, revelem literais sensíveis ou provoquem ações.

## 2. Escopo

- Classificar evidência com padrões explícitos de instrução hostil.
- Excluir essa evidência da geração e validação; quando ela for a única base, abster-se sem chamar gateway.
- Em trecho misto, permitir somente uma visão literal restrita à maior frase declarativa elegível, independente das instruções detectadas, com offsets exatos e hash recalculado. O identificador continua apontando ao chunk autorizado existente, compatível com suas referências persistidas; a fonte original não é modificada. Nunca concatenar frases separadas ou reescrever a fonte. Se não houver subtrecho elegível, abster-se. As demais frases ficam indisponíveis nessa triagem conservadora.
- Bloquear saída que reproduza literal sintético marcado como segredo no trecho hostil.

## 3. Fora do escopo

- Classificação universal de intenção, avaliação probabilística de prompt, ferramentas de ação ou alteração de prompt.

## 4. Requisitos funcionais

### RQ-3501 — Documento é dado

Trecho com pedido de revelar segredo, apagar histórico de respostas ou ignorar regras/permissões não é enviado ao gateway como evidência. Pedidos de contato/ação dirigidos à Alvitra, ao assistente ou ao modelo também são bloqueados. O modo imperativo e a menção a fornecedor, isoladamente, não demonstram ataque: obrigações documentais destinadas às pessoas permanecem evidência, nunca autorização para execução. A triagem por padrões é defesa limitada, não classificador universal; a geração continua sem ferramentas de ação e sujeita aos controles de evidência.

O título documental também é dado não confiável enviado ao gateway e incluído em citações.
Título com padrão hostil invalida a evidência inteira: não se reaproveita a página com o
mesmo título nem se fabrica um título sanitizado. Os literais protegidos são coletados tanto
do conteúdo quanto do título bloqueado, sem persistir seus valores.

### RQ-3502 — Falha segura

Sem evidência segura restante, o servidor responde por abstenção e não invoca o gateway.

### RQ-3503 — Literal protegido

Saída que reproduz literal sensível extraído de instrução hostil é reprovada antes de retornar ao usuário.

Os literais explicitamente marcados por `segredo:`, `senha:`, `token:` ou `chave:` (ou `=`) permanecem somente na memória do pedido, separados da evidência segura. A checagem final cobre toda a resposta pública e claims, inclusive orientação geral, erros e fallback. A comparação normaliza caixa, Unicode e espaços; não registra o literal em logs/telemetria. Reprovação produz falha segura genérica, sem nova chamada de modelo. A defesa é lexical e não promete detectar toda paráfrase, codificação ou forma de exfiltração.

### RQ-3504 — Relatório calculado não contorna a barreira

O relatório da Spec 032 é uma saída pública e recebe a mesma detecção de instruções hostis
antes da extração de achados, inclusive páginas não selecionadas pela recuperação textual.
Se uma página ou título contém padrão hostil, o relatório inteiro fica indisponível com
limitação genérica, sem copiar comandos, literais ou detalhes do erro. Não se publica uma
visão parcial como se fosse completa. Obrigações legítimas destinadas às pessoas continuam
permitidas. A defesa permanece lexical e limitada, sem alterar prompt, provedor ou fonte.
Esta extensão aplica os mesmos §§8–10 do briefing ao campo `documentAnalysis`.

## 5. Critérios de sucesso

Os cinco cenários sintéticos adversariais passam pelo caso de uso e API, sem vazamento, contato, exclusão, mudança de escopo ou execução externa.
