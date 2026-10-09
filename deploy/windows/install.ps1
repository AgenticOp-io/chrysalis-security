# Helix for Windows - Mode A install (host agent + tray + startup task).
# NGFW VIP stays on this host; Helix owns LISTEN_PORT; app binds localhost (D4).
#
#   powershell -ExecutionPolicy Bypass -File deploy\windows\install.ps1
#   powershell -ExecutionPolicy Bypass -File deploy\windows\install.ps1 -Start -Tray
#   npm run helix-win -- install

param(
  [string]$HelixRoot = '',
  [string]$DataDir = $(Join-Path $env:ProgramData 'Helix'),
  [switch]$Start,
  [switch]$Tray,
  [switch]$RegisterTrayAtLogon,
  [switch]$Setup,
  [ValidateSet('learn', 'shadow', 'enforce')]
  [string]$Mode = 'learn'
)

$ErrorActionPreference = 'Stop'

if (-not $HelixRoot) {
  $HelixRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

$node = (Get-Command node -ErrorAction Stop).Source
$agent = Join-Path $HelixRoot 'packages\helix-agent\bin\helix-agent.mjs'
if (-not (Test-Path $agent)) {
  Write-Error "helix-agent missing at $agent - clone chrysalis-security first"
}

New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
$envFile = Join-Path $DataDir 'helix-agent.env'
$example = Join-Path $PSScriptRoot 'helix-agent.env.example'
if (-not (Test-Path $envFile)) {
  $text = Get-Content -LiteralPath $example -Raw
  $text = $text -replace 'MODE=learn', "MODE=$Mode"
  $text = $text -replace [regex]::Escape('C:\ProgramData\Helix'), $DataDir
  Set-Content -LiteralPath $envFile -Value $text -Encoding ascii
  Write-Host "Wrote $envFile (edit APP_UPSTREAM / MODE / DNA before enforce)"
} else {
  Write-Host "Keeping existing $envFile"
}

$runAgent = Join-Path $PSScriptRoot 'run-agent.ps1'
$taskName = 'HelixAgent'
$arg = "-NoProfile -ExecutionPolicy Bypass -File `"$runAgent`" -HelixRoot `"$HelixRoot`" -EnvFile `"$envFile`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg -WorkingDirectory $HelixRoot
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "Scheduled task registered: $taskName (at startup)"

[Environment]::SetEnvironmentVariable('HELIX_ROOT', $HelixRoot, 'User')
$env:HELIX_ROOT = $HelixRoot

$marker = Join-Path $DataDir 'install.json'
@{
  helixRoot = $HelixRoot
  dataDir   = $DataDir
  envFile   = $envFile
  taskName  = $taskName
  installedAt = (Get-Date).ToString('o')
  tipNote   = 'Mode A Windows - traffic DNA; CWL optional bridge only'
} | ConvertTo-Json | Set-Content -LiteralPath $marker -Encoding ascii

if ($Start) {
  Start-ScheduledTask -TaskName $taskName
  Write-Host 'Started HelixAgent task'
}

if ($RegisterTrayAtLogon) {
  $tray = Join-Path $PSScriptRoot 'HelixTray.ps1'
  $trayArg = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$tray`" -HelixRoot `"$HelixRoot`""
  $trayAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $trayArg
  $trayTrigger = New-ScheduledTaskTrigger -AtLogOn
  Register-ScheduledTask -TaskName 'HelixTray' -Action $trayAction -Trigger $trayTrigger -Force | Out-Null
  Write-Host 'Scheduled task registered: HelixTray (at logon)'
}

if ($Tray) {
  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'HelixTray.ps1'),
    '-HelixRoot', $HelixRoot
  )
}

# Default consumer path: Protect wizard (demo) so the PC is usable without CLI.
if ($Setup -or $Start) {
  $wiz = Join-Path $PSScriptRoot 'Protect-Wizard.ps1'
  if ($Setup) {
    Start-Process -FilePath 'powershell.exe' -ArgumentList @(
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $wiz, '-HelixRoot', $HelixRoot
    )
  } else {
    & $wiz -HelixRoot $HelixRoot -SilentDemo
  }
}

Write-Host ''
Write-Host 'Helix for Windows installed (Mode A).'
Write-Host "  Root   $HelixRoot"
Write-Host "  Data   $DataDir"
Write-Host "  Env    $envFile"
Write-Host '  Panel  http://127.0.0.1:4080/'
Write-Host '  Docs   docs/INSTALL-MODE-A-WINDOWS.md'
Write-Host ''
Write-Host 'Next: open the panel → use the app through Helix → Lock DNA → watch → block'
