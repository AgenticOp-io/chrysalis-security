# Remove Helix for Windows startup task + optional tray task. Does not delete DNA.
param(
  [switch]$RemoveData,
  [string]$DataDir = $(Join-Path $env:ProgramData 'Helix')
)

$ErrorActionPreference = 'Stop'

foreach ($name in @('HelixAgent', 'HelixTray')) {
  $task = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
  if ($task) {
    if ($task.State -eq 'Running') { Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue }
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
    Write-Host "Removed scheduled task: $name"
  }
}

Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match 'helix-agent\.mjs' } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped helix-agent PID $($_.ProcessId)"
  }

if ($RemoveData -and (Test-Path $DataDir)) {
  Remove-Item -LiteralPath $DataDir -Recurse -Force
  Write-Host "Removed $DataDir"
} else {
  Write-Host "Kept data under $DataDir (pass -RemoveData to delete DNA/logs)"
}

Write-Host 'Helix for Windows uninstalled.'
