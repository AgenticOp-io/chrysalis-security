# Helix for Windows - system tray (Mode A operator surface).
# Opens the existing /__helix/ control panel; does not invent a second security engine.
#
#   powershell -ExecutionPolicy Bypass -File deploy\windows\HelixTray.ps1
#   npm run helix-win -- tray

param(
  [string]$HelixRoot = $env:HELIX_ROOT,
  [string]$PanelUrl = 'http://127.0.0.1:4080/',
  [string]$EnvFile = $(Join-Path $env:ProgramData 'Helix\helix-agent.env')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

if (-not $HelixRoot -or -not (Test-Path $HelixRoot)) {
  $HelixRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

function Read-HelixMode {
  if (-not (Test-Path $EnvFile)) { return 'uninstalled' }
  $m = Select-String -Path $EnvFile -Pattern '^\s*MODE\s*=\s*(\S+)' | Select-Object -First 1
  if ($m) { return $m.Matches[0].Groups[1].Value.ToLowerInvariant() }
  return 'unknown'
}

function Get-AgentRunning {
  try {
    $r = Invoke-WebRequest -Uri ($PanelUrl.TrimEnd('/') + '/__helix/healthz') -UseBasicParsing -TimeoutSec 2
    return $r.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Start-HelixAgentTask {
  $task = Get-ScheduledTask -TaskName 'HelixAgent' -ErrorAction SilentlyContinue
  if ($task) {
    Start-ScheduledTask -TaskName 'HelixAgent'
    return
  }
  $run = Join-Path $HelixRoot 'deploy\windows\run-agent.ps1'
  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $run,
    '-HelixRoot', $HelixRoot, '-EnvFile', $EnvFile
  ) -WindowStyle Hidden
}

function Stop-HelixAgentTask {
  $task = Get-ScheduledTask -TaskName 'HelixAgent' -ErrorAction SilentlyContinue
  if ($task -and $task.State -eq 'Running') {
    Stop-ScheduledTask -TaskName 'HelixAgent' -ErrorAction SilentlyContinue
  }
  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'helix-agent\.mjs' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

function New-TrayItem([string]$text, [scriptblock]$onClick) {
  $item = New-Object System.Windows.Forms.ToolStripMenuItem
  $item.Text = $text
  if ($onClick) { $item.add_Click($onClick) }
  return $item
}

$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Text = 'Helix DNA firewall'
$notify.Icon = [System.Drawing.SystemIcons]::Shield
$notify.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$status = New-TrayItem 'Status: ...' $null
$status.Enabled = $false
[void]$menu.Items.Add($status)

function Refresh-StatusItem {
  $mode = Read-HelixMode
  $up = Get-AgentRunning
  $status.Text = if ($up) { "Status: running ($mode)" } else { "Status: stopped ($mode)" }
}

[void]$menu.Items.Add((New-TrayItem 'Open control panel' { Start-Process $PanelUrl }))
[void]$menu.Items.Add((New-TrayItem 'Open attack proof' { Start-Process ($PanelUrl.TrimEnd('/') + '/__helix/attack') }))
[void]$menu.Items.Add('-')
[void]$menu.Items.Add((New-TrayItem 'Start Helix' { Start-HelixAgentTask; Start-Sleep -Seconds 1; Refresh-StatusItem }))
[void]$menu.Items.Add((New-TrayItem 'Stop Helix' { Stop-HelixAgentTask; Start-Sleep -Milliseconds 500; Refresh-StatusItem }))
[void]$menu.Items.Add((New-TrayItem 'Refresh status' { Refresh-StatusItem }))
[void]$menu.Items.Add('-')
[void]$menu.Items.Add((New-TrayItem 'Exit' {
  $notify.Visible = $false
  $notify.Dispose()
  [System.Windows.Forms.Application]::Exit()
}))

$notify.ContextMenuStrip = $menu
$notify.add_DoubleClick({ Start-Process $PanelUrl })

Refresh-StatusItem
$notify.ShowBalloonTip(
  4000,
  'Helix',
  'DNA firewall tray. Double-click opens the control panel.',
  [System.Windows.Forms.ToolTipIcon]::Info
)

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 5000
$timer.add_Tick({ Refresh-StatusItem })
$timer.Start()

[System.Windows.Forms.Application]::Run()
