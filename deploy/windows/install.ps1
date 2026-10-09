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
  [switch]$Desktop,
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
# Ensure the installing user can write DNA/logs without elevation (avoids agent EPERM crashes).
try {
  $user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  icacls $DataDir /grant "${user}:(OI)(CI)M" /T | Out-Null
} catch { }
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

$taskName = 'HelixAgent'
# Prefer wscript+VBS (no console). Fall back to hidden PowerShell run-agent.
$vbs = Join-Path $PSScriptRoot 'run-agent-hidden.vbs'
$wscript = Join-Path $env:WINDIR 'System32\wscript.exe'
if ((Test-Path $vbs) -and (Test-Path $wscript)) {
  $action = New-ScheduledTaskAction -Execute $wscript -Argument "//B //Nologo `"$vbs`"" -WorkingDirectory $HelixRoot
} else {
  $runAgent = Join-Path $PSScriptRoot 'run-agent.ps1'
  $arg = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$runAgent`" -HelixRoot `"$HelixRoot`" -EnvFile `"$envFile`""
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg -WorkingDirectory $HelixRoot
}
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "Scheduled task registered: $taskName (at startup, silent)"

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

# Native desktop app is the primary surface (not the browser panel).
$appDir = Join-Path $PSScriptRoot 'HelixApp'
$build = Join-Path $appDir 'build.ps1'
if (Test-Path $build) {
  & $build -OutDir $appDir
  $exe = Join-Path $appDir 'Helix.exe'
  $startMenu = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs\Helix.lnk'
  $programs = Split-Path $startMenu -Parent
  New-Item -ItemType Directory -Force -Path $programs | Out-Null
  $w = New-Object -ComObject WScript.Shell
  $sc = $w.CreateShortcut($startMenu)
  $sc.TargetPath = $exe
  $sc.WorkingDirectory = $HelixRoot
  $sc.WindowStyle = 1
  $sc.Description = 'Helix DNA firewall'
  $sc.Save()
  Write-Host "Start Menu shortcut: $startMenu"

  if ($RegisterTrayAtLogon -or $Desktop -or $Start) {
    # Launch Helix.exe directly — never wrap in a visible PowerShell.
    $deskAction = New-ScheduledTaskAction -Execute $exe -WorkingDirectory $HelixRoot
    $deskTrigger = New-ScheduledTaskTrigger -AtLogOn
    Register-ScheduledTask -TaskName 'HelixDesktop' -Action $deskAction -Trigger $deskTrigger -Force | Out-Null
    Write-Host 'Scheduled task registered: HelixDesktop (at logon)'
  }
}

if ($Tray) {
  Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @(
    '-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass',
    '-File', (Join-Path $PSScriptRoot 'HelixTray.ps1'),
    '-HelixRoot', $HelixRoot
  )
}

if ($Desktop -or $Start) {
  if (-not $exe) { $exe = Join-Path $appDir 'Helix.exe' }
  if (-not (Test-Path $exe)) { throw "Helix.exe missing at $exe — build failed" }
  $env:HELIX_ROOT = $HelixRoot
  Start-Process -FilePath $exe -WorkingDirectory $HelixRoot
  Write-Host 'Launched Helix desktop app (auto-protect)'
} elseif ($Setup) {
  $wiz = Join-Path $PSScriptRoot 'Protect-Wizard.ps1'
  Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @(
    '-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass',
    '-File', $wiz, '-HelixRoot', $HelixRoot
  )
}

Write-Host ''
Write-Host 'Helix for Windows installed (Mode A).'
Write-Host "  Root     $HelixRoot"
Write-Host "  Data     $DataDir"
Write-Host "  Env      $envFile"
Write-Host "  Desktop  $(Join-Path $appDir 'Helix.exe')"
Write-Host '  Docs     docs/INSTALL-MODE-A-WINDOWS.md'
Write-Host ''
Write-Host 'Open Helix from the Start Menu — it protects automatically.'
