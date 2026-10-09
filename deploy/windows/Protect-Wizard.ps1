# Helix for Windows - first-run Protect wizard (non-engineer path).
# Picks demo or a local app port, writes ProgramData env, restarts agent, opens panel.
#
#   powershell -ExecutionPolicy Bypass -File deploy\windows\Protect-Wizard.ps1
#   npm run helix-win -- setup

param(
  [string]$HelixRoot = $env:HELIX_ROOT,
  [string]$DataDir = $(Join-Path $env:ProgramData 'Helix'),
  [switch]$SilentDemo
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

if (-not $HelixRoot -or -not (Test-Path $HelixRoot)) {
  $HelixRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

$envFile = Join-Path $DataDir 'helix-agent.env'
New-Item -ItemType Directory -Force -Path $DataDir | Out-Null

function Write-HelixEnv {
  param(
    [int]$ListenPort = 4080,
    [string]$Upstream = 'http://127.0.0.1:4090',
    [string]$Mode = 'learn',
    [switch]$StartDemo,
    [int]$AutoSealAfter = 12
  )
  $demo = if ($StartDemo) { '1' } else { '0' }
  $dna = Join-Path $DataDir 'app.dna.json'
  $obs = Join-Path $DataDir 'observations.ndjson'
  $shadow = Join-Path $DataDir 'shadow.ndjson'
  $siem = Join-Path $DataDir 'siem.ndjson'
  @(
    '# Helix for Windows - managed by Protect wizard / panel (Mode A)'
    'LISTEN_HOST=0.0.0.0'
    "LISTEN_PORT=$ListenPort"
    "APP_UPSTREAM=$Upstream"
    "MODE=$Mode"
    "DNA=$dna"
    "OBSERVE=$obs"
    "SHADOW_LOG=$shadow"
    "SIEM_LOG=$siem"
    'HELIX_MAX_BODY_BYTES=1048576'
    'HELIX_ROOT_PANEL=1'
    "HELIX_START_DEMO=$demo"
    "HELIX_AUTO_SEAL_AFTER=$AutoSealAfter"
  ) -join "`r`n" | Set-Content -LiteralPath $envFile -Encoding ascii
}

function Stop-HelixAgent {
  Get-ScheduledTask -TaskName 'HelixAgent' -ErrorAction SilentlyContinue | Stop-ScheduledTask -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'helix-agent\.mjs' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

function Start-HelixAgent {
  $task = Get-ScheduledTask -TaskName 'HelixAgent' -ErrorAction SilentlyContinue
  if ($task) {
    Start-ScheduledTask -TaskName 'HelixAgent'
  } else {
    $run = Join-Path $PSScriptRoot 'run-agent.ps1'
    Start-Process -FilePath 'powershell.exe' -ArgumentList @(
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $run,
      '-HelixRoot', $HelixRoot, '-EnvFile', $envFile
    ) -WindowStyle Hidden
  }
}

function Get-LocalListeners {
  $rows = New-Object System.Collections.Generic.List[object]
  try {
    $conns = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
      Where-Object { $_.LocalAddress -in @('127.0.0.1', '0.0.0.0', '::', '::1') -and $_.LocalPort -lt 50000 }
    foreach ($c in $conns) {
      $procName = '?'
      try {
        $procName = (Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue).ProcessName
      } catch { }
      if ($procName -in @('System', 'Idle')) { continue }
      $rows.Add([pscustomobject]@{
          Port = [int]$c.LocalPort
          Process = $procName
          Pid = [int]$c.OwningProcess
          Label = ('{0} - {1} (pid {2})' -f $c.LocalPort, $procName, $c.OwningProcess)
        }) | Out-Null
    }
  } catch { }
  $rows | Sort-Object Port -Unique
}

function Apply-Protect {
  param([string]$Kind, [int]$AppPort = 0)
  if ($Kind -eq 'demo') {
    Write-HelixEnv -ListenPort 4080 -Upstream 'http://127.0.0.1:4090' -StartDemo -AutoSealAfter 12
  } else {
    if ($AppPort -lt 1) { throw 'Pick a local port first' }
    $privatePort = if ($AppPort -ge 10000) { $AppPort + 1 } else { 10000 + $AppPort }
    $listen = 4080
    $msg = @(
      "Helix will listen on http://127.0.0.1:$listen/"
      ''
      'Your app must accept traffic only on:'
      "  http://127.0.0.1:$privatePort"
      ''
      "1. Stop the app on port $AppPort (or change its bind/port)."
      "2. Start the app on 127.0.0.1:$privatePort"
      "3. Browse/use the app via http://127.0.0.1:$listen/ - not the old port."
      ''
      'Helix learns that traffic automatically, then can lock DNA.'
    ) -join "`r`n"
    [System.Windows.Forms.MessageBox]::Show($msg, 'Protect this app', 'OK', 'Information') | Out-Null
    Write-HelixEnv -ListenPort $listen -Upstream ("http://127.0.0.1:{0}" -f $privatePort) -AutoSealAfter 12
  }
  Stop-HelixAgent
  Start-Sleep -Milliseconds 400
  Start-HelixAgent
  Start-Sleep -Seconds 1
  Start-Process 'http://127.0.0.1:4080/'
}

if ($SilentDemo) {
  Apply-Protect -Kind 'demo'
  Write-Host 'HELIX_PROTECT_DEMO_OK'
  exit 0
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Helix - Protect an app'
$form.Size = New-Object System.Drawing.Size(520, 420)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false

$lbl = New-Object System.Windows.Forms.Label
$lbl.Text = "Helix checks one app front door - not your whole PC.`r`nChoose how to start:"
$lbl.Location = New-Object System.Drawing.Point(16, 16)
$lbl.Size = New-Object System.Drawing.Size(470, 48)
$form.Controls.Add($lbl)

$btnDemo = New-Object System.Windows.Forms.Button
$btnDemo.Text = 'Try the sample app (recommended)'
$btnDemo.Location = New-Object System.Drawing.Point(16, 72)
$btnDemo.Size = New-Object System.Drawing.Size(470, 36)
$btnDemo.Add_Click({
  Apply-Protect -Kind 'demo'
  $form.Close()
})
$form.Controls.Add($btnDemo)

$lbl2 = New-Object System.Windows.Forms.Label
$lbl2.Text = 'Or protect a local app already listening:'
$lbl2.Location = New-Object System.Drawing.Point(16, 124)
$lbl2.Size = New-Object System.Drawing.Size(470, 24)
$form.Controls.Add($lbl2)

$list = New-Object System.Windows.Forms.ListBox
$list.Location = New-Object System.Drawing.Point(16, 152)
$list.Size = New-Object System.Drawing.Size(470, 160)
$listeners = @(Get-LocalListeners)
foreach ($r in $listeners) { [void]$list.Items.Add($r.Label) }
$form.Controls.Add($list)

$btnApp = New-Object System.Windows.Forms.Button
$btnApp.Text = 'Protect selected app'
$btnApp.Location = New-Object System.Drawing.Point(16, 328)
$btnApp.Size = New-Object System.Drawing.Size(230, 32)
$btnApp.Add_Click({
  if ($list.SelectedIndex -lt 0) {
    [System.Windows.Forms.MessageBox]::Show('Select a listening port first.', 'Helix') | Out-Null
    return
  }
  $port = [int]$listeners[$list.SelectedIndex].Port
  Apply-Protect -Kind 'app' -AppPort $port
  $form.Close()
})
$form.Controls.Add($btnApp)

$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Text = 'Cancel'
$btnCancel.Location = New-Object System.Drawing.Point(256, 328)
$btnCancel.Size = New-Object System.Drawing.Size(230, 32)
$btnCancel.Add_Click({ $form.Close() })
$form.Controls.Add($btnCancel)

[void]$form.ShowDialog()
