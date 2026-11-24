# ADR 0046 — Homologação local de autoria com Codex e whisper.cpp

**Status:** aceito para homologação técnica sintética local, por autorização de 18/11/2026  
**Data:** 2026-11-18

## Decisão

Reutilizar a sessão ChatGPT do Codex CLI conforme ADR 0031, sem copiar credenciais e sem
encaminhar chaves de API. Adaptadores de autoria/ata são explícitos: `codex exec`, temporário
isolado, sessão efêmera, somente leitura, ferramentas/skills/MCP/web desabilitados, schema
estruturado e validação de eventos. Processos usam argumentos separados, sem shell, timeout
e cancelamento. As instruções documentais já apresentadas na Spec 073 são usadas somente
nesta homologação autorizada; não alteram personalidade do chat ou startup de produção.

Transcrição usa whisper.cpp CPU local e modelo multilíngue small quantizado q5_1. Dependências
opcionais ficam em `.local/authoring-homologation/tools/`, sem pacote npm, PATH global, serviço
ou instalação de sistema. Download é preparação explícita, nunca comportamento do transcritor.
Não há rede durante ASR, reconhecimento de identidade, diarização ou fallback remoto.

Artefatos fixados e conferidos antes de executar:

- whisper.cpp b5454 (build indicado na release v1.9.5), `whisper-bin-x64.zip`, SHA256
  `6ba69e3482d7826214f90a6a9c84ca07782aec1e1d0c6a7c30c994fd5d816ccb`;
- modelo `ggml-small-q5_1.bin`, revisão HF `5359861c739e955e79d9a303bcbc70fb988958b1`,
  190085487 bytes, SHA256 `ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb`;
- código whisper.cpp e pesos Whisper sob licença MIT. Licenças e recibo de origem ficam ao
  lado dos binários locais. Não distribuir dependências no repositório.

## Consequências

Consome franquia/tempo do plano Codex já contratado, sem estimar saldo ou cobrança. ASR usa
CPU/RAM locais. WAVs limpos de voz sintética não comprovam qualidade em reuniões reais,
ruído ou múltiplos falantes. Conferência de modelo não substitui revisão humana especializada.
Saída rejeitada/indisponível continua bloqueada, sem retry ou API alternativa.

A proposta operacional permanece disabled por decisão explícita; não há TTL real aprovado.
A purga sintética passa a conservar mensagens públicas permanentes e oculta recibos internos,
removendo apenas payloads derivados. Isso corrige compatibilidade técnica, sem adotar política.

## Fontes primárias

- [Release v1.9.5 e build b5454](https://github.com/ggml-org/whisper.cpp/releases/tag/v1.9.5)
- [CLI e parâmetros](https://github.com/ggml-org/whisper.cpp/blob/v1.9.5/examples/cli/README.md)
- [Modelos oficiais do whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp)
- [Licença whisper.cpp](https://github.com/ggml-org/whisper.cpp/blob/v1.9.5/LICENSE)
- [Licença dos pesos Whisper](https://github.com/openai/whisper/blob/main/LICENSE)
