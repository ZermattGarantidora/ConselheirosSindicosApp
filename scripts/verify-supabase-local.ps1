[CmdletBinding()]
param([switch]$CheckOnly)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
foreach ($relativePath in @('scripts/run-tsx.mjs','scripts/migrate-supabase-integration.ts','scripts/supabase-integration-guard.ts','node_modules/vitest/vitest.mjs','vitest.integration.config.ts')) {
  if (-not (Test-Path -LiteralPath (Join-Path $projectDirectory $relativePath) -PathType Leaf)) { throw "Pre-requisito ausente: $relativePath." }
}
$nodeExecutable = (Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
if ((& $nodeExecutable --version) -notmatch '^v24\.') { throw 'Esta verificacao exige Node.js 24, conforme package.json.' }
if ($CheckOnly) { Write-Output 'Pre-requisitos locais conferidos. Nenhuma conexao ou alteracao no banco foi executada.'; return }
Push-Location -LiteralPath $projectDirectory
try {
  Write-Output 'Verificando exclusivamente o projeto Supabase dedicado de integracao sintetica.'
  & $nodeExecutable --env-file-if-exists=.env.local --env-file-if-exists=.env.admin.local scripts/run-tsx.mjs scripts/migrate-supabase-integration.ts
  if ($LASTEXITCODE -ne 0) { throw 'A migracao protegida falhou. Os testes nao foram iniciados.' }
  $reportDirectory = Join-Path $projectDirectory 'reports/supabase-integration'; New-Item -ItemType Directory -Path $reportDirectory -Force | Out-Null
  $reportPath = Join-Path $reportDirectory ('results-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffffffZ') + '.json')
  & $nodeExecutable --env-file-if-exists=.env.local --env-file-if-exists=.env.admin.local scripts/run-tsx.mjs node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts --maxWorkers 1 --reporter=default --reporter=json "--outputFile.json=$reportPath"
  if ($LASTEXITCODE -ne 0) { throw 'Os testes de integracao falharam.' }
} finally { Pop-Location }
