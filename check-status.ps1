$log = Join-Path $PSScriptRoot "status-check.txt"
@"
=== $(Get-Date) ===
"@ | Out-File $log
Get-PSDrive C,D | Format-Table Name, @{N='FreeGB';E={[math]::Round($_.Free/1GB,2)}} | Out-File $log -Append
netstat -ano | findstr ":3000" | Out-File $log -Append
node -v 2>&1 | Out-File $log -Append
Set-Location $PSScriptRoot
try {
  $r = Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -TimeoutSec 3
  "HTTP $($r.StatusCode)" | Out-File $log -Append
} catch {
  "localhost:3000 FAILED: $($_.Exception.Message)" | Out-File $log -Append
}
