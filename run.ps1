# ─────────────────────────────────────────────────────────────
# ET NewsAI — Fast Run Script (Windows PowerShell)
# ─────────────────────────────────────────────────────────────
$ROOT_DIR = $PSScriptRoot
$backendProcess = $null
$frontendProcess = $null

Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   ET NewsAI — Starting Services" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan

if (-not (Test-Path "$ROOT_DIR\backend\venv") -or -not (Test-Path "$ROOT_DIR\frontend\node_modules")) {
    Write-Host "✗ Setup incomplete. Please run .\setup.ps1 first." -ForegroundColor Red
    exit 1
}

# Helper function to clear ports (Windows equivalent of lsof -ti | kill)
function Clear-Port($port) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  Killing process $($proc.ProcessName) holding port $port..." -ForegroundColor Yellow
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

try {
    # 1. Start Ollama
    Write-Host "[1/3] Checking Ollama..." -ForegroundColor Yellow
    try {
        $null = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -ErrorAction Stop
    } catch {
        Write-Host "  Starting Ollama server..." -ForegroundColor Cyan
        Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 3
    }
    Write-Host "  ✓ Ollama is running" -ForegroundColor Green

    # 2. Start Backend
    Write-Host "[2/3] Starting Backend..." -ForegroundColor Yellow
    Clear-Port 8000
    Set-Location "$ROOT_DIR\backend"
    $venvPython = "$ROOT_DIR\backend\venv\Scripts\python.exe"
    
    # Run in the same window so user sees output
    $backendProcess = Start-Process -FilePath $venvPython -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1" -NoNewWindow -PassThru

    # 3. Start Frontend
    Write-Host "[3/3] Starting Frontend..." -ForegroundColor Yellow
    Clear-Port 3000
    Set-Location "$ROOT_DIR\frontend"
    
    $frontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -NoNewWindow -PassThru

    Write-Host "`n🚀 ET NewsAI is up!" -ForegroundColor Green
    Write-Host "  → Frontend: http://localhost:3000"
    Write-Host "  → Backend:  http://localhost:8000`n"
    Write-Host "Press Ctrl+C to stop services safely." -ForegroundColor Yellow

    # Keep script alive until user presses Ctrl+C
    while ($true) {
        Start-Sleep -Seconds 1
    }

} finally {
    # The Trap/Cleanup equivalent
    Write-Host "`nShutting down ET NewsAI..." -ForegroundColor Yellow
    
    if ($backendProcess -and (-not $backendProcess.HasExited)) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($frontendProcess -and (-not $frontendProcess.HasExited)) {
        # Node scripts spawned via cmd need their child processes killed. 
        # taskkill /T /F handles the whole process tree.
        & taskkill /F /T /PID $frontendProcess.Id 2>&1 | Out-Null
    }
    
    Write-Host "All services stopped." -ForegroundColor Green
}