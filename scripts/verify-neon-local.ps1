[CmdletBinding()]
param([switch]$CheckOnly)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectDirectory = Split-Path -Parent $PSScriptRoot
$requiredFiles = @('scripts/run-tsx.mjs', 'scripts/migrate-neon-integration.ts', 'scripts/neon-integration-guard.ts', 'node_modules/vitest/vitest.mjs', 'vitest.integration.config.ts')
foreach ($relativePath in $requiredFiles) {
  if (-not (Test-Path -LiteralPath (Join-Path $projectDirectory $relativePath) -PathType Leaf)) {
    throw "Pre-requisito ausente: $relativePath. Execute a partir da copia completa do projeto."
  }
}

if ($CheckOnly) {
  Write-Output 'Pre-requisitos locais conferidos. Nenhuma conexao ou alteracao no banco foi executada.'
  return
}

Push-Location -LiteralPath $projectDirectory
try {
  & node --env-file-if-exists=.env.local --env-file-if-exists=.env.admin.local scripts/run-tsx.mjs scripts/migrate-neon-integration.ts
  if ($LASTEXITCODE -ne 0) { throw 'A migracao protegida falhou. Os testes nao foram iniciados.' }
  & node --env-file-if-exists=.env.local --env-file-if-exists=.env.admin.local scripts/run-tsx.mjs node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts --maxWorkers 1
  if ($LASTEXITCODE -ne 0) { throw 'Os testes de integracao falharam.' }
} finally {
  Pop-Location
}
