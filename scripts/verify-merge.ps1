[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ReviewFile
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ReviewFile -PathType Leaf)) {
    throw "Registro de review não encontrado: $ReviewFile"
}

$review = Get-Content -LiteralPath $ReviewFile -Raw
if ($review -match '<[^>]+>') {
    throw 'O registro de review contém placeholders e não pode ser usado para integração.'
}

$requiredPatterns = @(
    '(?im)^- \*\*Status:\*\* APROVADO\s*$',
    '(?im)^- \*\*Commit ou diff revisado:\*\*\s*.+$',
    '(?im)^- \*\*Revisor independente:\*\*\s*.+$',
    '(?im)^- \*\*P0 abertos:\*\* 0\s*$',
    '(?im)^- \*\*P1 abertos:\*\* 0\s*$',
    '(?im)^- `pnpm run check`\s*$'
)

foreach ($pattern in $requiredPatterns) {
    if ($review -notmatch $pattern) {
        throw "O registro de review não atende a evidência obrigatória: $pattern"
    }
}

& pnpm run check
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host "Evidência de review aceita e gates locais aprovados. A integração local pode prosseguir."
