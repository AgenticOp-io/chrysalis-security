# Build (if needed) and launch the native Helix desktop app.
param(
  [string]$HelixRoot = $env:HELIX_ROOT
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
if (-not $HelixRoot -or -not (Test-Path $HelixRoot)) {
  $HelixRoot = (Resolve-Path (Join-Path $here '..\..\..')).Path
}
$env:HELIX_ROOT = $HelixRoot
$exe = Join-Path $here 'Helix.exe'
if (-not (Test-Path $exe)) {
  & (Join-Path $here 'build.ps1') -OutDir $here
}
Start-Process -FilePath $exe -WorkingDirectory $HelixRoot
Write-Host 'HELIX_DESKTOP_LAUNCH_OK'
