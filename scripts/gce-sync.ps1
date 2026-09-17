<#
.SYNOPSIS
  Sync chrysalis-security to agenticop-master and run Helix smokes.

.EXAMPLE
  .\scripts\gce-sync.ps1
  .\scripts\gce-sync.ps1 -SkipNft
  .\scripts\gce-sync.ps1 -SiteUp
  .\scripts\gce-sync.ps1 -WithCwl   # also sync sibling chrysalis-cwl for cutover / CWL bridge
  .\scripts\gce-sync.ps1 -WithL2    # Mode B L2 Phase 1 netns smoke (implies CWL pack + link)
  .\scripts\gce-sync.ps1 -WithL2P2  # Mode B L2 Phase 2 dual-iface smoke (implies CWL pack + link)
  .\scripts\gce-sync.ps1 -WithL2P3  # Mode B L2 Phase 3 transparent daddr=server divert (implies CWL pack + link)
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
  [switch] $WithL2,
  [switch] $WithL2P2,
  [switch] $WithL2P3
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Root "package.json"))) {
  throw "Run from chrysalis-security (package.json not found at $Root)"
}

# L2 + gce-smoke import cwl-bridge (static @agenticop-io/cwl) — pack sibling when present.
$cwlRootSibling = Join-Path (Split-Path -Parent $Root) "chrysalis-cwl"
$cwlPresent = Test-Path (Join-Path $cwlRootSibling "LANGUAGE_VERSION.md")
if ($WithL2 -or $WithL2P2 -or $WithL2P3) { $WithCwl = $true }
if ($WithCwl -and -not $cwlPresent) {
  throw "-WithCwl/-WithL2/-WithL2P2/-WithL2P3 requires sibling chrysalis-cwl at $cwlRootSibling"
}
# Always pack CWL when sibling exists so remote node can resolve @agenticop-io/cwl via symlink.
$packCwl = $cwlPresent

$tar = Join-Path $env:TEMP "chrysalis-security-gce.tgz"
if (Test-Path $tar) { Remove-Item $tar -Force }

Write-Host "Packing $Root → $tar"
Push-Location $Root
try {
  tar -czf $tar --exclude=data --exclude=node_modules --exclude=.git .
} finally {
  Pop-Location
}

# Relative to remote $HOME (pscp does not expand ~)
Write-Host "SCP → ${Name}:chrysalis-security-gce.tgz"
& gcloud compute scp $tar "${Name}:chrysalis-security-gce.tgz" --zone=$Zone --project=$Project
if ($LASTEXITCODE -ne 0) { throw "scp failed" }

if ($packCwl) {
  $cwlTar = Join-Path $env:TEMP "chrysalis-cwl-gce.tgz"
  if (Test-Path $cwlTar) { Remove-Item $cwlTar -Force }
  Write-Host "Packing CWL pillar $cwlRootSibling → $cwlTar"
  Push-Location $cwlRootSibling
  try {
    tar -czf $cwlTar --exclude=node_modules --exclude=.git --exclude=packages/webir .
  } finally {
    Pop-Location
  }
  Write-Host "SCP → ${Name}:chrysalis-cwl-gce.tgz"
  & gcloud compute scp $cwlTar "${Name}:chrysalis-cwl-gce.tgz" --zone=$Zone --project=$Project
  if ($LASTEXITCODE -ne 0) { throw "CWL scp failed" }
}

# DNA + CWL bridge pack: cutover skips honestly if CWL absent
$smokeCmds = [System.Collections.Generic.List[string]]::new()
[void]$smokeCmds.Add("set -e")
[void]$smokeCmds.Add("mkdir -p ~/chrysalis-security")
[void]$smokeCmds.Add("tar -xzf ~/chrysalis-security-gce.tgz -C ~/chrysalis-security")
[void]$smokeCmds.Add("sed -i 's/\r$//' ~/chrysalis-security/scripts/*.sh")
[void]$smokeCmds.Add("chmod +x ~/chrysalis-security/scripts/*.sh")
if ($packCwl) {
  [void]$smokeCmds.Add("mkdir -p ~/chrysalis-cwl")
  [void]$smokeCmds.Add("tar -xzf ~/chrysalis-cwl-gce.tgz -C ~/chrysalis-cwl")
  [void]$smokeCmds.Add('export CHRYSALIS_CWL_ROOT=$HOME/chrysalis-cwl')
  # Static import in cwl-bridge needs @agenticop-io/cwl (and optional @chrysalis/cwl) on disk.
  [void]$smokeCmds.Add('mkdir -p ~/chrysalis-security/node_modules/@agenticop-io ~/chrysalis-security/node_modules/@chrysalis')
  [void]$smokeCmds.Add('ln -sfn "$HOME/chrysalis-cwl/packages/cwl" ~/chrysalis-security/node_modules/@agenticop-io/cwl')
  [void]$smokeCmds.Add('ln -sfn "$HOME/chrysalis-cwl/packages/cwl" ~/chrysalis-security/node_modules/@chrysalis/cwl')
}
[void]$smokeCmds.Add("cd ~/chrysalis-security")
[void]$smokeCmds.Add("node scripts/gce-smoke.mjs")
if (-not $SkipNft) { [void]$smokeCmds.Add("bash scripts/gce-nft-smoke.sh") }
if ($WithL2) {
  # netns/nft need root; preserve CWL root for any DNA checks inside L2 script
  [void]$smokeCmds.Add('sudo -n env CHRYSALIS_CWL_ROOT=$HOME/chrysalis-cwl node scripts/bridge-l2-smoke.mjs || sudo env CHRYSALIS_CWL_ROOT=$HOME/chrysalis-cwl node scripts/bridge-l2-smoke.mjs')
}
if ($WithL2P2) {
  [void]$smokeCmds.Add('sudo -n env CHRYSALIS_CWL_ROOT=$HOME/chrysalis-cwl node scripts/bridge-l2-p2-smoke.mjs || sudo env CHRYSALIS_CWL_ROOT=$HOME/chrysalis-cwl node scripts/bridge-l2-p2-smoke.mjs')
}
if ($WithL2P3) {
  [void]$smokeCmds.Add('sudo -n env CHRYSALIS_CWL_ROOT=$HOME/chrysalis-cwl node scripts/bridge-l2-p3-smoke.mjs || sudo env CHRYSALIS_CWL_ROOT=$HOME/chrysalis-cwl node scripts/bridge-l2-p3-smoke.mjs')
}
if ($SiteUp) {
  if ($Relearn) { [void]$smokeCmds.Add("RELEARN=1 bash scripts/gce-site-up.sh") }
  else { [void]$smokeCmds.Add("bash scripts/gce-site-up.sh") }
}
if ($SyncOnly) {
  $smokeCmds = [System.Collections.Generic.List[string]]::new()
  [void]$smokeCmds.Add("set -e")
  [void]$smokeCmds.Add("mkdir -p ~/chrysalis-security")
  [void]$smokeCmds.Add("tar -xzf ~/chrysalis-security-gce.tgz -C ~/chrysalis-security")
  [void]$smokeCmds.Add("sed -i 's/\r$//' ~/chrysalis-security/scripts/*.sh")
  [void]$smokeCmds.Add("chmod +x ~/chrysalis-security/scripts/*.sh")
  [void]$smokeCmds.Add("echo SYNC_ONLY_OK")
}

$remote = ($smokeCmds -join "; ")
Write-Host "SSH smokes on $Name ..."
# Pass --command as a single argv so PowerShell does not expand $HOME / $USER inside the remote script.
# Merge remote stderr into stdout and judge by exit code only: negative tests legitimately write
# to stderr (sign-smoke proves an unsigned certificate is refused), and with ErrorActionPreference
# = Stop a single stderr line would abort a passing sync before GCE_SYNC_OK.
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& gcloud compute ssh $Name --zone=$Zone --project=$Project --command="$remote" 2>&1 |
  ForEach-Object { Write-Host $_ }
$remoteRc = $LASTEXITCODE
$ErrorActionPreference = $prevEap
if ($remoteRc -ne 0) { throw "remote smokes failed (exit $remoteRc)" }
Write-Host "GCE_SYNC_OK"
