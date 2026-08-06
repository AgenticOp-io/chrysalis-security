<#
.SYNOPSIS
  Sync chrysalis-security to agenticop-master and run Helix smokes.

.EXAMPLE
  .\scripts\gce-sync.ps1
  .\scripts\gce-sync.ps1 -SkipNft
  .\scripts\gce-sync.ps1 -SiteUp
  .\scripts\gce-sync.ps1 -WithCwl   # also sync sibling chrysalis-cwl for cutover / CWL bridge
  .\scripts\gce-sync.ps1 -WithL2    # also run Mode B L2 netns smoke (root on GCE)
#>
param(
  [string] $Project = "chrysalis-dev-f5x6qv",
  [string] $Zone = "us-central1-a",
  [string] $Name = "agenticop-master",
  [switch] $SkipNft,
  [switch] $SyncOnly,
  [switch] $SiteUp,
  [switch] $Relearn,
  [switch] $WithCwl,
  [switch] $WithL2
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

$cwlRootSibling = Join-Path (Split-Path -Parent $Root) "chrysalis-cwl"
if ($WithCwl) {
  if (-not (Test-Path (Join-Path $cwlRootSibling "LANGUAGE_VERSION.md"))) {
    throw "-WithCwl requires sibling chrysalis-cwl at $cwlRootSibling"
  }
  $cwlTar = Join-Path $env:TEMP "chrysalis-cwl-gce.tgz"
  if (Test-Path $cwlTar) { Remove-Item $cwlTar -Force }
  Write-Host "Packing CWL pillar $cwlRootSibling → $cwlTar"
  Push-Location $cwlRootSibling
  try {
    tar -czf $cwlTar --exclude=node_modules --exclude=.git --exclude=packages/webir .
  } finally {
    Pop-Location
  }
  Write-Host "SCP → ${Name}:/tmp/chrysalis-cwl-gce.tgz"
  & gcloud compute scp $cwlTar "${Name}:/tmp/chrysalis-cwl-gce.tgz" --zone=$Zone --project=$Project
  if ($LASTEXITCODE -ne 0) { throw "CWL scp failed" }
}

# DNA + CWL bridge pack: cutover skips honestly if CWL absent
$smokeCmds = [System.Collections.Generic.List[string]]::new()
[void]$smokeCmds.Add("set -e")
[void]$smokeCmds.Add("mkdir -p ~/chrysalis-security")
[void]$smokeCmds.Add("tar -xzf /tmp/chrysalis-security-gce.tgz -C ~/chrysalis-security")
[void]$smokeCmds.Add("sed -i 's/\r$//' ~/chrysalis-security/scripts/*.sh")
[void]$smokeCmds.Add("chmod +x ~/chrysalis-security/scripts/*.sh")
if ($WithCwl) {
  [void]$smokeCmds.Add("mkdir -p ~/chrysalis-cwl")
  [void]$smokeCmds.Add("tar -xzf /tmp/chrysalis-cwl-gce.tgz -C ~/chrysalis-cwl")
  [void]$smokeCmds.Add('export CHRYSALIS_CWL_ROOT=$HOME/chrysalis-cwl')
}
[void]$smokeCmds.Add("cd ~/chrysalis-security")
[void]$smokeCmds.Add("node scripts/gce-smoke.mjs")
if (-not $SkipNft) { [void]$smokeCmds.Add("bash scripts/gce-nft-smoke.sh") }
if ($WithL2) {
  [void]$smokeCmds.Add("node scripts/bridge-l2-smoke.mjs")
}
if ($SiteUp) {
  if ($Relearn) { [void]$smokeCmds.Add("RELEARN=1 bash scripts/gce-site-up.sh") }
  else { [void]$smokeCmds.Add("bash scripts/gce-site-up.sh") }
}
if ($SyncOnly) {
  $smokeCmds = [System.Collections.Generic.List[string]]::new()
  [void]$smokeCmds.Add("set -e")
  [void]$smokeCmds.Add("mkdir -p ~/chrysalis-security")
  [void]$smokeCmds.Add("tar -xzf /tmp/chrysalis-security-gce.tgz -C ~/chrysalis-security")
  [void]$smokeCmds.Add("sed -i 's/\r$//' ~/chrysalis-security/scripts/*.sh")
  [void]$smokeCmds.Add("chmod +x ~/chrysalis-security/scripts/*.sh")
  [void]$smokeCmds.Add("echo SYNC_ONLY_OK")
}

$remote = ($smokeCmds -join "; ")
Write-Host "SSH smokes on $Name ..."
& gcloud compute ssh $Name --zone=$Zone --project=$Project --command=$remote
if ($LASTEXITCODE -ne 0) { throw "remote smokes failed" }
Write-Host "GCE_SYNC_OK"
