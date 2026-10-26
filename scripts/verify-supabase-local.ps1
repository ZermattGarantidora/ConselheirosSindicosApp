[CmdletBinding()]
param(
  [switch]$CheckOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectDirectory = Split-Path -Parent $PSScriptRoot
$requiredFiles = @(
  'scripts/run-tsx.mjs',
  'scripts/migrate-supabase-integration.ts',
  'scripts/supabase-integration-guard.ts',
  'node_modules/vitest/vitest.mjs',
  'vitest.integration.config.ts'
)

foreach ($relativePath in $requiredFiles) {
  $requiredPath = Join-Path $projectDirectory $relativePath
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
    throw "Pre-requisito ausente: $relativePath. Execute a partir da copia completa do projeto."
  }
}

$nodeExecutable = (Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$nodeVersion = & $nodeExecutable --version
if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v24\.') {
  throw 'Esta verificacao exige Node.js 24, conforme package.json.'
}

if ($CheckOnly) {
  Write-Output 'Pre-requisitos locais conferidos. Nenhuma conexao ou alteracao no banco foi executada.'
  return
}

$temporaryVariables = @('TEMP', 'TMP', 'TMPDIR')
$previousTemporaryValues = @{}
foreach ($variableName in $temporaryVariables) {
  $previousTemporaryValues[$variableName] = [Environment]::GetEnvironmentVariable($variableName, 'Process')
}

Push-Location -LiteralPath $projectDirectory
try {
  $testTemporaryDirectory = Join-Path ([IO.Path]::GetTempPath()) 'alvitra-supabase-integration'
  New-Item -ItemType Directory -Path $testTemporaryDirectory -Force | Out-Null
  foreach ($variableName in $temporaryVariables) {
    [Environment]::SetEnvironmentVariable($variableName, $testTemporaryDirectory, 'Process')
  }

  Write-Output 'Verificando exclusivamente o projeto Supabase dedicado de integracao sintetica.'
  Write-Output 'As guardas existentes exigem alvo Supabase, TLS, confirmacao e marcador persistente.'
  Write-Output 'A migracao aplica alteracoes pendentes; os testes recriam suas fixtures sinteticas.'

  & $nodeExecutable --env-file-if-exists=.env.local --env-file-if-exists=.env.admin.local scripts/run-tsx.mjs scripts/migrate-supabase-integration.ts
  if ($LASTEXITCODE -ne 0) {
    throw 'A migracao protegida falhou. Os testes nao foram iniciados; confira a mensagem acima.'
  }

  $reportDirectory = Join-Path $projectDirectory 'reports/supabase-integration'
  New-Item -ItemType Directory -Path $reportDirectory -Force | Out-Null
  $reportName = 'results-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffffffZ') + '.json'
  $reportPath = Join-Path $reportDirectory $reportName
  Write-Output "O resultado completo sera gravado em: $reportPath"

  $consolePath = [IO.Path]::ChangeExtension($reportPath, '.log')
  Write-Output "A saida completa do terminal sera gravada em: $consolePath"
  & $nodeExecutable --env-file-if-exists=.env.local --env-file-if-exists=.env.admin.local scripts/run-tsx.mjs node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts --maxWorkers 1 --reporter=default --reporter=json "--outputFile.json=$reportPath" 2>&1 | Tee-Object -FilePath $consolePath
  if ($LASTEXITCODE -ne 0) {
    throw 'Os testes de integracao falharam. A migracao anterior pode ter sido aplicada; confira o resultado acima.'
  }

  Write-Output 'Migracao protegida e testes de integracao concluidos com sucesso.'
}
finally {
  foreach ($variableName in $temporaryVariables) {
    [Environment]::SetEnvironmentVariable($variableName, $previousTemporaryValues[$variableName], 'Process')
  }
  Pop-Location
}
