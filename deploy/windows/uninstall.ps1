# Remove Helix for Windows startup task + desktop app task. Does not delete DNA unless asked.
param(
  [switch]$RemoveData,
  [string]$DataDir = $(Join-Path $env:ProgramData 'Helix')
)

$ErrorActionPreference = 'Stop'

foreach ($name in @('HelixAgent', 'HelixTray', 'HelixDesktop')) {
  $task = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
  if ($task) {
    if ($task.State -eq 'Running') { Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue }
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
    Write-Host "Removed scheduled task: $name"
  }
}

Get-Process -Name 'Helix' -ErrorAction SilentlyContinue | ForEach-Object {
  Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
  Write-Host "Stopped Helix desktop PID $($_.Id)"
}

Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match 'helix-agent\.mjs' } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped helix-agent PID $($_.ProcessId)"
  }

$lnk = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs\Helix.lnk'
if (Test-Path $lnk) {
  Remove-Item -LiteralPath $lnk -Force
  Write-Host 'Removed Start Menu shortcut'
}

if ($RemoveData -and (Test-Path $DataDir)) {
  Remove-Item -LiteralPath $DataDir -Recurse -Force
  Write-Host "Removed $DataDir"
} else {
  Write-Host "Kept data under $DataDir (pass -RemoveData to delete DNA/logs)"
}

Write-Host 'Helix for Windows uninstalled.'
