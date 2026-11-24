param([string]$VoiceName = '')
$ErrorActionPreference = 'Stop'
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location -LiteralPath $workspaceRoot
try {
  & node scripts/run-tsx.mjs evals/authoring-homologation/run.ts --verify-inputs
  if ($LASTEXITCODE -ne 0) { throw 'Entradas divergentes: nenhuma voz foi acionada.' }
} finally { Pop-Location }
$packetPath = Join-Path $workspaceRoot '.local\authoring-homologation\inputs.json'
$packet = Get-Content -LiteralPath $packetPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($packet.syntheticOnly -ne $true -or $packet.corpusVersion -ne 'authoring-homologation-v1' -or $packet.corpusHash -notmatch '^[a-f0-9]{64}$') { throw 'Prepare primeiro o pacote sintético; nenhuma voz remota será utilizada.' }
Add-Type -AssemblyName System.Speech
$speechSynth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $voices = @($speechSynth.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -eq 'pt-BR' })
  if ($VoiceName) { $voices = @($voices | Where-Object { $_.VoiceInfo.Name -eq $VoiceName }) }
  if ($voices.Count -eq 0) { throw 'Não há voz local pt-BR compatível. Não instalar, baixar ou usar serviço externo.' }
  $selectedVoice = ($voices | Sort-Object { $_.VoiceInfo.Name } | Select-Object -First 1).VoiceInfo.Name
  $speechSynth.SelectVoice($selectedVoice)
  $speechSynth.Rate = 0
  $format = [System.Speech.AudioFormat.SpeechAudioFormatInfo]::new(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
  $audioBase = [IO.Path]::GetFullPath((Join-Path $workspaceRoot '.local\authoring-homologation\audio'))
  if (-not $audioBase.StartsWith($workspaceRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Destino fora do workspace.' }
  [void][IO.Directory]::CreateDirectory($audioBase)
  $runDirectory = Join-Path $audioBase ('run-' + [guid]::NewGuid().ToString('N'))
  [void][IO.Directory]::CreateDirectory($runDirectory)
  foreach ($case in @($packet.cases | Where-Object { $_.input.audioEligible -eq $true })) {
    if ($case.id -notmatch '^[a-z][a-z0-9-]{2,79}$' -or $case.input.mode -notin @('dictation','meeting')) { throw 'Identidade ou modo de áudio inválidos.' }
    $segmentIndex = 0
    foreach ($source in $case.input.sources) {
      if ($source.kind -ne 'audio_script' -or $source.uncertain -ne $false -or -not $source.text) { throw 'Somente roteiros de fala limpa podem gerar esta amostra.' }
      $wavePath = Join-Path $runDirectory ($case.id + '-' + $segmentIndex + '.wav')
      $speechSynth.SetOutputToWaveFile($wavePath, $format)
      $speechSynth.Speak([string]$source.text)
      $speechSynth.SetOutputToNull()
      $segmentIndex++
    }
  }
  @{corpusHash=$packet.corpusHash;voice=$selectedVoice;culture='pt-BR';engine='Windows System.Speech offline'} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runDirectory 'utterances.json') -Encoding UTF8
  Push-Location -LiteralPath $workspaceRoot
  try {
    & node scripts/run-tsx.mjs evals/authoring-homologation/assemble-audio.ts $runDirectory
    if ($LASTEXITCODE -ne 0) { throw 'A validação dos WAVs locais falhou. Diretório mantido para inspeção.' }
  } finally { Pop-Location }
} finally { $speechSynth.Dispose() }
