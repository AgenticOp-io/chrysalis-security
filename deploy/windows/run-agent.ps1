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

$node = (Get-Command node -ErrorAction Stop).Source
$agent = Join-Path $HelixRoot 'packages\helix-agent\bin\helix-agent.mjs'
if (-not (Test-Path $agent)) {
  Write-Error "helix-agent not found at $agent"
}

Set-Location -LiteralPath $HelixRoot
& $node $agent
exit $LASTEXITCODE
