$ErrorActionPreference = "Continue"
Set-Location "d:\Download\lms-app-main\lms-app-main"
$log = Join-Path $PSScriptRoot "auto-start-log.txt"

# Use D: for all temp/cache (C: is full)
$tmpDir = "D:\lms-temp"
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
$env:TEMP = $tmpDir
$env:TMP = $tmpDir
$env:NPM_CONFIG_CACHE = "$tmpDir\npm-cache"
New-Item -ItemType Directory -Force -Path $env:NPM_CONFIG_CACHE | Out-Null

function Log($msg) {
  $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
  Add-Content -Path $log -Value $line
  Write-Output $line
}

"" | Out-File $log -Force
Log "=== Auto-start LMS (temp on D:) ==="
Log "TEMP=$env:TEMP"

if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue }

Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

$outLog = Join-Path $PSScriptRoot "server-out.log"
$errLog = Join-Path $PSScriptRoot "server-err.log"
$job = Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev" -WorkingDirectory $PWD -PassThru -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog
Log "Started npm PID $($job.Id)"

for ($i = 1; $i -le 90; $i++) {
  Start-Sleep -Seconds 2
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) {
      Log "SERVER READY"
      Start-Process "http://localhost:3000"
      exit 0
    }
  } catch {}
  if ($i % 15 -eq 0) { Log "Waiting... $i" }
  if ($job.HasExited) {
    Log "npm exited with code $($job.ExitCode)"
    Log "--- stderr ---"
    Get-Content $errLog -ErrorAction SilentlyContinue | Select-Object -Last 20 | ForEach-Object { Log $_ }
    Log "--- stdout ---"
    Get-Content $outLog -ErrorAction SilentlyContinue | Select-Object -Last 20 | ForEach-Object { Log $_ }
    exit 1
  }
}

Log "TIMEOUT"
Get-Content $errLog -ErrorAction SilentlyContinue | Select-Object -Last 15 | ForEach-Object { Log $_ }
exit 1
