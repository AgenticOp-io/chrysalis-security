# Load ProgramData env and start helix-agent (Mode A). Invoked by the HelixAgent task / service.
param(
  [string]$HelixRoot = $env:HELIX_ROOT,
  [string]$EnvFile = $(Join-Path $env:ProgramData 'Helix\helix-agent.env')
)

$ErrorActionPreference = 'Stop'

if (-not $HelixRoot -or -not (Test-Path $HelixRoot)) {
  $HelixRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
}

if (-not (Test-Path $EnvFile)) {
  Write-Error "Missing env file: $EnvFile (run deploy\windows\install.ps1 first)"
}

Get-Content -LiteralPath $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith('#')) { return }
  $i = $line.IndexOf('=')
  if ($i -lt 1) { return }
  $name = $line.Substring(0, $i).Trim()
  $value = $line.Substring($i + 1).Trim()
  Set-Item -Path "Env:$name" -Value $value
}

# Persist panel/tray mode changes back into this env file.
$env:HELIX_ENV_FILE = $EnvFile

$node = (Get-Command node -ErrorAction Stop).Source
$agent = Join-Path $HelixRoot 'packages\helix-agent\bin\helix-agent.mjs'
if (-not (Test-Path $agent)) {
  Write-Error "helix-agent not found at $agent"
}

# Optional: start the bundled demo API so first-run works without a CLI.
if ($env:HELIX_START_DEMO -eq '1' -or $env:HELIX_START_DEMO -eq 'true') {
  $demoPort = 4090
  if ($env:APP_UPSTREAM -match ':(\d+)\s*$') { $demoPort = [int]$Matches[1] }
  $listening = $false
  try {
    $listening = [bool](Get-NetTCPConnection -LocalPort $demoPort -State Listen -ErrorAction SilentlyContinue)
  } catch { $listening = $false }
  if (-not $listening) {
    $demo = Join-Path $HelixRoot 'fixtures\demo-api\server.mjs'
    $launch = "`$env:HOST='127.0.0.1'; `$env:PORT='$demoPort'; Set-Location -LiteralPath '$HelixRoot'; & '$node' '$demo'"
    Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @(
      '-NoProfile', '-WindowStyle', 'Hidden', '-Command', $launch
    )
    Start-Sleep -Milliseconds 500
  }
}

Set-Location -LiteralPath $HelixRoot
& $node $agent
exit $LASTEXITCODE
