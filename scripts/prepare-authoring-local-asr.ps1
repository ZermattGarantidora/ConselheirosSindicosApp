#requires -Version 7.0
[CmdletBinding()]
param([switch]$ConfirmDownload)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $ConfirmDownload) {
    throw 'Informe -ConfirmDownload para preparar somente o ASR gratuito local. Nenhuma IA remota será chamada.'
}
$projectRoot = Split-Path -Parent $PSScriptRoot
$asrRoot = Join-Path $projectRoot '.local/authoring-homologation/tools'
New-Item -ItemType Directory -Force -Path $asrRoot | Out-Null
$archivePath = Join-Path $asrRoot 'whisper-b5454-x64.zip'
$modelPath = Join-Path $asrRoot 'ggml-small-q5_1.bin'
$binaryHash = '6ba69e3482d7826214f90a6a9c84ca07782aec1e1d0c6a7c30c994fd5d816ccb'
$modelHash = 'ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb'
function Get-VerifiedAsset {
    param([string]$Uri, [string]$Path, [string]$Sha256)
    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        if ((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Sha256) {
            throw 'Arquivo local divergente; não foi sobrescrito nem executado.'
        }
        return
    }
    $downloadPath = "$Path.$([guid]::NewGuid().ToString('N')).download"
    Invoke-WebRequest -Uri $Uri -OutFile $downloadPath
    if ((Get-FileHash -LiteralPath $downloadPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Sha256) {
        throw 'Download divergente. Retido para inspeção, sem executar ou extrair.'
    }
    Move-Item -LiteralPath $downloadPath -Destination $Path
}
Get-VerifiedAsset -Uri 'https://github.com/ggml-org/whisper.cpp/releases/download/b5454/whisper-bin-x64.zip' -Path $archivePath -Sha256 $binaryHash
Get-VerifiedAsset -Uri 'https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-small-q5_1.bin' -Path $modelPath -Sha256 $modelHash
Expand-Archive -LiteralPath $archivePath -DestinationPath (Join-Path $asrRoot 'whisper-b5454') -Force
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/ggml-org/whisper.cpp/v1.9.5/LICENSE' -OutFile (Join-Path $asrRoot 'whisper-cpp-LICENSE.txt')
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/openai/whisper/main/LICENSE' -OutFile (Join-Path $asrRoot 'whisper-model-LICENSE.txt')
$receipt = [ordered]@{
    preparedAt = [DateTimeOffset]::UtcNow.ToString('o')
    build = 'b5454'
    modelRevision = '5359861c739e955e79d9a303bcbc70fb988958b1'
    archiveSha256 = $binaryHash
    modelSha256 = $modelHash
    license = 'MIT'
    paidApiCalls = 0
    serviceInstalled = $false
    files = @(Get-ChildItem -LiteralPath (Join-Path $asrRoot 'whisper-b5454') -Recurse -File | ForEach-Object {
        [ordered]@{ path = [IO.Path]::GetRelativePath($asrRoot, $_.FullName); sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
    })
}
$receipt | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $asrRoot 'receipt.json') -Encoding utf8
Write-Output 'ASR local preparado com hashes conferidos. Nenhum serviço instalado ou chamada de IA feita.'
