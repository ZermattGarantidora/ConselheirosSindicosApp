#requires -Version 7.0
[CmdletBinding()]
param(
    [switch]$ConfirmSyntheticLocal,
    [switch]$KeepContainer,
    [ValidateSet('recovery', 'worker', 'rls', 'documents', 'authoring')][string]$Suite = 'recovery'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false

# Check before invoking Docker or creating any resource.
if (-not $ConfirmSyntheticLocal) {
    Write-Error 'Use -ConfirmSyntheticLocal somente para o ensaio local com dados sintéticos.'
    exit 1
}

$pilotRoot = Split-Path -Parent $PSScriptRoot
if ($Suite -eq 'documents' -and -not (Test-Path -LiteralPath (Join-Path $pilotRoot 'tests/vitest.pilot-document-lifecycle.config.ts') -PathType Leaf)) {
    Write-Output '{"code":"pilot_document_config_missing","resourcesCreated":false,"activationAuthorized":false}'
    Write-Error 'Configuração documental local ainda não disponível; nenhum recurso criado.'
    exit 1
}
$pilotOutput = Join-Path $pilotRoot '.local/pilot-operations'
$pilotRun = [guid]::NewGuid().ToString('N')
$pilotContainer = "alvitra-ops-$pilotRun"
$pilotWrapper = Join-Path $pilotOutput "container-$pilotRun"
$pilotHost = if ($IsWindows) { 'npipe:////./pipe/dockerDesktopLinuxEngine' } else { 'unix:///var/run/docker.sock' }
$pilotPhase = 'preconditions'
$pilotCreatedId = $null
$pilotPassed = $false
$pilotStopped = $false
$pilotChildDirectory = $null
$pilotStartedAt = [DateTimeOffset]::UtcNow
$pilotDocker = (Get-Command docker -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$pilotNode = (Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
New-Item -ItemType Directory -Path $pilotWrapper | Out-Null
$pilotConfig = Join-Path $pilotWrapper 'empty-docker-client'
New-Item -ItemType Directory -Path $pilotConfig | Out-Null
$pilotPrefix = @('--config', $pilotConfig, '--host', $pilotHost)

function Invoke-PilotDocker {
    param([string[]]$DockerArguments)
    $pilotDockerOutput = & $pilotDocker @pilotPrefix @DockerArguments
    if ($LASTEXITCODE -ne 0) { throw 'Comando Docker local não concluído.' }
    return $pilotDockerOutput
}

try {
    $pilotImageId = (Invoke-PilotDocker -DockerArguments @('image', 'inspect', '--format', '{{.Id}}', 'pgvector/pgvector:pg17')).Trim()
    if ($pilotImageId -notmatch '^sha256:[a-f0-9]{64}$') { throw 'Imagem local não conferida.' }
    # Public deterministic fixture, never a real account secret; no password value in Docker arguments.
    Set-Content -LiteralPath (Join-Path $pilotWrapper 'postgres.synthetic-password') -Value 'synthetic-only' -NoNewline -Encoding utf8
    $pilotPhase = 'container_start'
    $pilotCreatedId = (Invoke-PilotDocker -DockerArguments @('run', '--pull=never', '--detach', '--name', $pilotContainer,
        '--label', 'app.alvitra.purpose=synthetic-local-recovery', '--label', 'app.alvitra.data-policy=synthetic-local-only',
        '--env', 'POSTGRES_HOST_AUTH_METHOD=scram-sha-256', '--env', "POSTGRES_PASSWORD_FILE=/recovery/container-$pilotRun/postgres.synthetic-password",
        '--tmpfs', '/var/lib/postgresql/data:rw,size=768m',
        '--mount', "type=bind,source=$pilotOutput,target=/recovery", '--publish', '127.0.0.1::5432', 'pgvector/pgvector:pg17')).Trim()
    if ($pilotCreatedId -notmatch '^[a-f0-9]{64}$') { throw 'Container não conferido.' }
    $pilotPorts = Invoke-PilotDocker -DockerArguments @('inspect', '--format', '{{json (index .NetworkSettings.Ports "5432/tcp")}}', $pilotContainer) | ConvertFrom-Json
    if (@($pilotPorts).Count -ne 1 -or $pilotPorts[0].HostIp -ne '127.0.0.1' -or $pilotPorts[0].HostPort -notmatch '^\d{1,5}$') {
        throw 'Porta local não conferida.'
    }
    $pilotPhase = 'database_ready'
    $pilotReady = $false
    for ($pilotAttempt = 0; $pilotAttempt -lt 40; $pilotAttempt++) {
        & $pilotDocker @pilotPrefix exec --user postgres $pilotContainer pg_isready -U postgres | Out-Null
        if ($LASTEXITCODE -eq 0) { $pilotReady = $true; break }
        Start-Sleep -Milliseconds 250
    }
    if (-not $pilotReady) { throw 'Banco local não ficou pronto.' }

    $pilotPhase = 'recovery_exercise'
    $pilotProcessInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $pilotProcessInfo.FileName = $pilotNode
    $pilotProcessInfo.WorkingDirectory = $pilotRoot
    $pilotProcessInfo.UseShellExecute = $false
    $pilotProcessInfo.CreateNoWindow = $true
    $pilotProcessInfo.RedirectStandardOutput = $true
    $pilotProcessInfo.RedirectStandardError = $true
    $pilotProcessInfo.ArgumentList.Add('scripts/run-tsx.mjs')
    $pilotProcessInfo.ArgumentList.Add($(if ($Suite -eq 'recovery') { 'scripts/verify-pilot-recovery.ts' } else { 'scripts/verify-pilot-local-integration.ts' }))
    if ($Suite -ne 'recovery') { $pilotProcessInfo.ArgumentList.Add($Suite) }
    $pilotProcessInfo.Environment.Clear()
    foreach ($pilotEnvironmentName in @('PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'TEMP', 'TMP')) {
        $pilotEnvironmentValue = [Environment]::GetEnvironmentVariable($pilotEnvironmentName)
        if ($pilotEnvironmentValue) { $pilotProcessInfo.Environment[$pilotEnvironmentName] = $pilotEnvironmentValue }
    }
    $pilotProcessInfo.Environment['PILOT_RECOVERY_CONFIRMATION'] = 'synthetic-local-only'
    $pilotProcessInfo.Environment['PILOT_RECOVERY_ADMIN_URL'] = "postgresql://postgres:synthetic-only@127.0.0.1:$($pilotPorts[0].HostPort)/postgres"
    $pilotProcessInfo.Environment['PILOT_RECOVERY_DOCKER_CONTAINER'] = $pilotContainer
    $pilotProcess = [System.Diagnostics.Process]::new()
    $pilotProcess.StartInfo = $pilotProcessInfo
    try {
        if (-not $pilotProcess.Start()) { throw 'Processo local não iniciado.' }
        $pilotStdoutTask = $pilotProcess.StandardOutput.ReadToEndAsync()
        $pilotStderrTask = $pilotProcess.StandardError.ReadToEndAsync()
        if (-not $pilotProcess.WaitForExit(300000)) { $pilotProcess.Kill($true); throw 'Ensaio excedeu o prazo local.' }
        $pilotStdout = $pilotStdoutTask.GetAwaiter().GetResult()
        $pilotStderr = $pilotStderrTask.GetAwaiter().GetResult()
        Set-Content -LiteralPath (Join-Path $pilotWrapper 'stdout.jsonl') -Value $pilotStdout -Encoding utf8
        Set-Content -LiteralPath (Join-Path $pilotWrapper 'stderr.jsonl') -Value $pilotStderr -Encoding utf8
        if ($pilotProcess.ExitCode -ne 0) { throw 'Ensaio local não validado.' }
        $pilotExpectedCode = if ($Suite -eq 'recovery') { 'pilot_recovery_exercise_passed' } else { 'pilot_local_integration_passed' }
        $pilotSummaries = @($pilotStdout -split '\r?\n' | Where-Object { $_.StartsWith('{') } |
            ForEach-Object { $_ | ConvertFrom-Json } | Where-Object code -eq $pilotExpectedCode)
        if ($pilotSummaries.Count -ne 1) { throw 'Recibo do ensaio ausente.' }
        $pilotChildDirectory = [IO.Path]::GetFullPath($pilotSummaries[0].reportDirectory)
        $pilotAllowedPrefix = [IO.Path]::GetFullPath($pilotOutput).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
        if (-not $pilotChildDirectory.StartsWith($pilotAllowedPrefix, [StringComparison]::OrdinalIgnoreCase) -or
            [IO.Path]::GetFileName($pilotChildDirectory) -notmatch '^[a-f0-9]{32}$') { throw 'Recibo fora da saída sintética.' }
        $pilotChildResult = Get-Content -Raw -LiteralPath (Join-Path $pilotChildDirectory 'result.json') | ConvertFrom-Json
        if ($pilotChildResult.passed -ne $true -or $pilotChildResult.providerCalls -ne 0 -or
            $pilotChildResult.activationAuthorized -ne $false) { throw 'Evidência local incompleta.' }
        if ($Suite -eq 'recovery' -and (
            $pilotChildResult.corruptedAndOccupiedTargetsRefused -ne $true -or
            $pilotChildResult.rlsGrantAndOriginalTamperingDetected -ne $true -or
            $pilotChildResult.operationalSqlExecuted -ne $true -or
            $pilotChildResult.restrictedServiceLogins -ne 2 -or
            $pilotChildResult.wrongDatabasePasswordsDenied -ne $true -or
            $pilotChildResult.stableAccountSecretsVerified -ne $true -or
            $pilotChildResult.wrongKeyAndMfaBypassDenied -ne $true -or
            $pilotChildResult.ledgerBudgetLoginRecoveryVerified -ne $true -or
            $pilotChildResult.policyRevisionReplayAfterRestoreDenied -ne $true -or
            $pilotChildResult.ledgerRecoverySeparateProcesses -ne $true -or
            $pilotChildResult.maintenanceRecoveryVerified -ne $true -or
            $pilotChildResult.maintenanceSeparateProcesses -ne $true -or
            $pilotChildResult.maintenanceFreshRestoreCompared -ne $true -or
            $pilotChildResult.maintenanceDecisionsOutsideDump -ne $true)) { throw 'Evidência integral incompleta.' }
        if ($Suite -ne 'recovery' -and ($pilotChildResult.suite -ne $Suite -or $pilotChildResult.buildAndReportsExclusive -ne $true)) { throw 'Evidência da suíte local incompleta.' }
        $pilotPassed = $true
    } finally { $pilotProcess.Dispose() }
} catch {
    # Do not print raw subprocess/database exceptions or inherited environment.
    Write-Output ([ordered]@{ code = 'pilot_container_exercise_failed'; phase = $pilotPhase;
        errorType = $_.Exception.GetType().Name; scriptLine = $_.InvocationInfo.ScriptLineNumber;
        activationAuthorized = $false } | ConvertTo-Json -Compress)
} finally {
    if ($pilotCreatedId -and -not $KeepContainer) {
        try {
            $pilotIdentity = (Invoke-PilotDocker -DockerArguments @('inspect', '--format', '{{.Id}} {{index .Config.Labels "app.alvitra.purpose"}}', $pilotContainer)).Trim()
            if ($pilotIdentity -ne "$pilotCreatedId synthetic-local-recovery") { throw 'Não encerrar recurso não confirmado.' }
            Invoke-PilotDocker -DockerArguments @('stop', '--timeout', '10', $pilotContainer) | Out-Null
            $pilotStopped = $true
        } catch { $pilotPassed = $false }
    }
    [ordered]@{ verification = 'synthetic-local-container-recovery'; passed = $pilotPassed; activationAuthorized = $false;
        suite = $Suite;
        dataPolicy = 'synthetic-local-only'; containerName = $pilotContainer; containerStopped = $pilotStopped;
        childReportDirectory = $pilotChildDirectory;
        keptByRequest = [bool]$KeepContainer; elapsedMs = ([DateTimeOffset]::UtcNow - $pilotStartedAt).TotalMilliseconds
    } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $pilotWrapper 'result.json') -Encoding utf8
}
Write-Output ([ordered]@{ code = if ($pilotPassed) { 'pilot_container_exercise_passed' } else { 'pilot_container_exercise_not_validated' };
    reportDirectory = $pilotWrapper; containerStopped = $pilotStopped; activationAuthorized = $false } | ConvertTo-Json -Compress)
if (-not $pilotPassed) { exit 1 }
