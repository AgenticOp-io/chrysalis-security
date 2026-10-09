# Build Helix.exe (native WinForms) with .NET Framework csc — no Visual Studio required.
param(
  [string]$OutDir = ''
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
if (-not $OutDir) { $OutDir = $here }
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) {
  $csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'
}
if (-not (Test-Path $csc)) { throw 'csc.exe not found (needs .NET Framework 4.x)' }

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$src = Join-Path $here 'HelixApp.cs'
$out = Join-Path $OutDir 'Helix.exe'
$refs = @(
  '/reference:System.dll',
  '/reference:System.Core.dll',
  '/reference:System.Drawing.dll',
  '/reference:System.Windows.Forms.dll',
  '/reference:System.Net.dll',
  '/reference:System.Management.dll'
)

& $csc /nologo /target:winexe /platform:anycpu /optimize+ /out:$out @refs $src
if ($LASTEXITCODE -ne 0) { throw "csc failed: $LASTEXITCODE" }
Write-Host "HELIX_DESKTOP_BUILD_OK $out"
