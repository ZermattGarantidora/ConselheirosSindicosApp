[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$photoCorpus = @('Convenção inteiramente fictícia para ensaio local.')
for ($photoClause = 1; $photoClause -le 24; $photoClause++) {
    $photoCorpus += "Cláusula fictícia ${photoClause}: a utilização do espaço comum exige registro na administração. Linha sintética completa e verificável."
}
$photoCorpus += 'Fim da página sintética: referência final preservada.'
$photoTranscript = $photoCorpus -join "`n"
$photoBitmap = [System.Drawing.Bitmap]::new(800, 1100)
$photoGraphics = [System.Drawing.Graphics]::FromImage($photoBitmap)
$photoFont = [System.Drawing.Font]::new('Arial', 11)
$photoY = 30
$photoRows = 0
try {
    $photoGraphics.Clear([System.Drawing.Color]::White)
    foreach ($photoParagraph in $photoCorpus) {
        $photoLine = ''
        foreach ($photoWord in $photoParagraph.Split(' ')) {
            $photoCandidate = if ($photoLine) { "$photoLine $photoWord" } else { $photoWord }
            if ($photoGraphics.MeasureString($photoCandidate, $photoFont).Width -gt 740) {
                if ($photoY -gt 1060) { throw 'O corpus sintético não cabe na página.' }
                $photoGraphics.DrawString($photoLine, $photoFont, [System.Drawing.Brushes]::Black, 30, $photoY)
                $photoY += 20
                $photoRows++
                $photoLine = $photoWord
            } else { $photoLine = $photoCandidate }
        }
        if ($photoY -gt 1060) { throw 'O corpus sintético não cabe na página.' }
        $photoGraphics.DrawString($photoLine, $photoFont, [System.Drawing.Brushes]::Black, 30, $photoY)
        $photoY += 20
        $photoRows++
    }
    $photoJpeg = Join-Path $PSScriptRoot 'synthetic-document-page.jpg'
    $photoPng = Join-Path $PSScriptRoot 'synthetic-document-page.png'
    $photoBitmap.Save($photoJpeg, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $photoBitmap.Save($photoPng, [System.Drawing.Imaging.ImageFormat]::Png)
    [ordered]@{
        classification = 'inteiramente-sintetico'
        width = 800
        height = 1100
        paragraphs = $photoCorpus.Count
        renderedRows = $photoRows
        transcriptSha256 = [Convert]::ToHexStringLower([System.Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($photoTranscript)))
        jpegSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $photoJpeg).Hash.ToLowerInvariant()
        pngSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $photoPng).Hash.ToLowerInvariant()
    } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'synthetic-document-photo-manifest.json')
} finally { $photoFont.Dispose(); $photoGraphics.Dispose(); $photoBitmap.Dispose() }
