<#
.SYNOPSIS
  Sync chrysalis-security to agenticop-master and run Helix smokes.

.EXAMPLE
  .\scripts\gce-sync.ps1
  .\scripts\gce-sync.ps1 -SkipNft
#>
param(
  [string] $Project = "chrysalis-dev-f5x6qv",
  [string] $Zone = "us-central1-a",
  [string] $Name = "agenticop-master",
  [switch] $SkipNft,
  [switch] $SyncOnly
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Root "package.json"))) {
  throw "Run from chrysalis-security (package.json not found at $Root)"
}

$tar = Join-Path $env:TEMP "chrysalis-security-gce.tgz"
if (Test-Path $tar) { Remove-Item $tar -Force }

Write-Host "Packing $Root → $tar"
Push-Location $Root
try {
  tar -czf $tar --exclude=data --exclude=node_modules --exclude=.git .
} finally {
  Pop-Location
}

Write-Host "SCP → ${Name}:/tmp/chrysalis-security-gce.tgz"
& gcloud compute scp $tar "${Name}:/tmp/chrysalis-security-gce.tgz" --zone=$Zone --project=$Project
if ($LASTEXITCODE -ne 0) { throw "scp failed" }

$smokeCmds = @(
  "set -e",
  "mkdir -p ~/chrysalis-security",
  "tar -xzf /tmp/chrysalis-security-gce.tgz -C ~/chrysalis-security",
  "sed -i 's/\r$//' ~/chrysalis-security/scripts/*.sh",
  "chmod +x ~/chrysalis-security/scripts/*.sh",
  "cd ~/chrysalis-security",
  "node scripts/dna-core-smoke.mjs",
  "node scripts/smoke.mjs",
  "node scripts/host-smoke.mjs",
  "node scripts/static-smoke.mjs"
)
if (-not $SkipNft) { $smokeCmds += "bash scripts/gce-nft-smoke.sh" }
if ($SyncOnly) {
  $smokeCmds = @(
    "set -e",
    "mkdir -p ~/chrysalis-security",
    "tar -xzf /tmp/chrysalis-security-gce.tgz -C ~/chrysalis-security",
    "sed -i 's/\r$//' ~/chrysalis-security/scripts/*.sh",
    "chmod +x ~/chrysalis-security/scripts/*.sh",
    "echo SYNC_ONLY_OK"
  )
}

$remote = ($smokeCmds -join "; ")
Write-Host "SSH smokes on $Name ..."
& gcloud compute ssh $Name --zone=$Zone --project=$Project --command=$remote
if ($LASTEXITCODE -ne 0) { throw "remote smokes failed" }
Write-Host "GCE_SYNC_OK"
