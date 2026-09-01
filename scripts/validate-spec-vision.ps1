[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$briefingPath = Join-Path $projectRoot 'BRIEFING_PRODUTO_CONSELHEIRO_SINDICO.md'
$specsRoot = Join-Path $projectRoot 'docs\specs'
$errors = [System.Collections.Generic.List[string]]::new()

if (-not (Test-Path -LiteralPath $briefingPath -PathType Leaf)) {
    $errors.Add('O briefing canônico não foi encontrado.')
}
elseif ((Get-Item -LiteralPath $briefingPath).Length -eq 0) {
    $errors.Add('O briefing canônico está vazio.')
}

$specFiles = @(
    Get-ChildItem -LiteralPath $specsRoot -Recurse -File -Filter 'spec.md' -ErrorAction SilentlyContinue
)

if ($specFiles.Count -eq 0) {
    $errors.Add('Nenhuma spec foi encontrada em docs/specs/*/spec.md.')
}

$requiredPatterns = [ordered]@{
    'seção de alinhamento' = '(?m)^## 0\. Alinhamento com a visão do projeto\s*$'
    'mapeamento das partes do briefing' = '(?m)^\| Dimensão da visão \| Seções do briefing \|'
    'limites respeitados' = '(?m)^### Limites respeitados\s*$'
    'divergências da visão' = '(?m)^### Divergências da visão\s*$'
    'checklist de alinhamento' = '(?m)^### Checklist de alinhamento\s*$'
}

foreach ($specFile in $specFiles) {
    $content = Get-Content -Raw -LiteralPath $specFile.FullName
    $relativePath = [System.IO.Path]::GetRelativePath($projectRoot, $specFile.FullName)

    foreach ($required in $requiredPatterns.GetEnumerator()) {
        if ($content -notmatch $required.Value) {
            $errors.Add("$relativePath`: ausente $($required.Key).")
        }
    }

    $sectionReferences = [regex]::Matches($content, '§+\s*\d+')
    if ($sectionReferences.Count -lt 3) {
        $errors.Add("$relativePath`: informe pelo menos três referências concretas a seções do briefing.")
    }

    if ($content -match '(?m)^- \[ \] .+$') {
        $errors.Add("$relativePath`: o checklist de alinhamento possui item não confirmado.")
    }

    $divergenceMatch = [regex]::Match(
        $content,
        '(?ms)^### Divergências da visão\s*(.+?)(?=^### Checklist de alinhamento|^## \d+\.|\z)'
    )

    if (-not $divergenceMatch.Success -or $divergenceMatch.Groups[1].Value -notmatch '(?i)\bnenhuma\b') {
        $errors.Add("$relativePath`: existe ou pode existir divergência; alinhe a spec ou atualize o briefing com aprovação explícita.")
    }
}

if ($errors.Count -gt 0) {
    Write-Error ("Gate de alinhamento falhou:`n- " + ($errors -join "`n- "))
    exit 1
}

Write-Output "Gate de alinhamento aprovado para $($specFiles.Count) spec(s)."
Write-Output 'Observação: o gate valida evidências estruturais; a coerência semântica com o briefing ainda exige revisão humana.'
