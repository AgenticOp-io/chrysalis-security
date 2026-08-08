# Persist / restart Helix local lab on Windows (enforce).
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File scripts\local-lab-windows-start.ps1
# Optional login task:
#   powershell -ExecutionPolicy Bypass -File scripts\local-lab-windows-start.ps1 -RegisterTask

param(
  [switch]$RegisterTask,
  [ValidateSet('learn', 'shadow', 'enforce')]
  [string]$Mode = 'enforce'
)

$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $Root

$node = (Get-Command node -ErrorAction Stop).Source
& $node scripts/local-lab.mjs start --mode $Mode --kill
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Helix local lab mode=$Mode"
Write-Host "Panel  http://127.0.0.1:4080/"
Write-Host "Proof  http://127.0.0.1:4080/__helix/attack"
Write-Host "Block  http://127.0.0.1:4080/api/backdoor"

if ($RegisterTask) {
  $taskName = 'HelixLocalLab'
  $action = New-ScheduledTaskAction -Execute $node -Argument "`"$Root\scripts\local-lab.mjs`" start --mode $Mode --kill" -WorkingDirectory "$Root"
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Force | Out-Null
  Write-Host "Scheduled task registered: $taskName (at logon)"
}
