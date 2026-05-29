# Restores code-tunnel.exe where Cursor expects it (fixes ENOENT port forward error).
$ErrorActionPreference = "Stop"
$cursorRoot = "$env:LOCALAPPDATA\Programs\cursor"
$src = Join-Path $cursorRoot "resources\app\bin"
$bin = Join-Path $cursorRoot "bin"

if (-not (Test-Path (Join-Path $src "code-tunnel.exe"))) {
  Write-Error "Cursor not found or incomplete install at $cursorRoot"
}

New-Item -ItemType Directory -Force -Path $bin | Out-Null
Copy-Item -Path "$src\code-tunnel.exe" -Destination "$bin\code-tunnel.exe" -Force
Copy-Item -Path "$src\cursor-tunnel.exe" -Destination "$bin\cursor-tunnel.exe" -Force -ErrorAction SilentlyContinue
Copy-Item -Path "$src\cursor.cmd" -Destination "$bin\cursor.cmd" -Force -ErrorAction SilentlyContinue

if (Test-Path "$bin\code-tunnel.exe") {
  Write-Host "OK: $bin\code-tunnel.exe"
  Write-Host "Reload Cursor: Ctrl+Shift+P -> Developer: Reload Window"
} else {
  Write-Error "Copy failed"
}
