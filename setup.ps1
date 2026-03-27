# ─────────────────────────────────────────────────────────────
# ET NewsAI — One-Time Setup Script (Windows PowerShell)
# ─────────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"

$ROOT_DIR = $PSScriptRoot

Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   ET NewsAI — Environment Setup" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════`n" -ForegroundColor Cyan

# 1. Check prerequisites
Write-Host "[1/4] Checking prerequisites..." -ForegroundColor Yellow

# Helper to check if a command exists and works
function Test-Command {
    param ($cmd, $args="--version")
    try {
        $null = & $cmd $args 2>&1
        return $true
    } catch {
        return $false
    }
}

$pythonCmd = if (Test-Command "python") { "python" } elseif (Test-Command "python3") { "python3" } else { $null }
if (-not $pythonCmd) {
    Write-Host "✗ Python not found or MS Store alias is blocking it. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Python found" -ForegroundColor Green

if (-not (Test-Command "node" "-v")) {
    Write-Host "✗ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Node.js found" -ForegroundColor Green

if (-not (Test-Command "ollama" "-v")) {
    Write-Host "✗ Ollama not found. Install from https://ollama.ai" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Ollama found" -ForegroundColor Green

# 2. Setup Backend
Write-Host "`n[2/4] Setting up backend..." -ForegroundColor Yellow
Set-Location "$ROOT_DIR\backend"

if (-not (Test-Path "venv")) {
    Write-Host "  Creating Python virtual environment..." -ForegroundColor Cyan
    & $pythonCmd -m venv venv
}

# Using the executable directly avoids PowerShell execution policy issues with Activate.ps1
$venvPython = "$ROOT_DIR\backend\venv\Scripts\python.exe"

Write-Host "  Installing Python dependencies..." -ForegroundColor Cyan
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r requirements.txt

if (-not (Test-Path ".env")) {
    Write-Host "  Creating default .env file..." -ForegroundColor Cyan
    $jwt = & $venvPython -c "import secrets; print(secrets.token_hex(32))"
    $envContent = @"
LLM_PROVIDER=ollama
LLM_MODEL=llama3.1:8b
OLLAMA_BASE_URL=http://localhost:11434
DB_PATH=./etnewsai.db
CHROMA_PATH=./chroma_store
JWT_SECRET=$jwt
FRONTEND_URL=http://localhost:3000
"@
    Set-Content -Path ".env" -Value $envContent -Encoding UTF8
}

# 3. Setup Frontend
Write-Host "`n[3/4] Setting up frontend..." -ForegroundColor Yellow
Set-Location "$ROOT_DIR\frontend"

Write-Host "  Installing Node.js dependencies (this may take a while)..." -ForegroundColor Cyan
# Using cmd /c prevents PowerShell from getting stuck on npm output streams
cmd /c npm install

# 4. Ollama Models
Write-Host "`n[4/4] Ensuring Ollama models are present..." -ForegroundColor Yellow
$tempOllama = $null

try {
    $null = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -ErrorAction Stop
} catch {
    Write-Host "  Starting Ollama temporarily to pull models..." -ForegroundColor Cyan
    $tempOllama = Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden -PassThru
    Start-Sleep -Seconds 4
}

$models = @("llama3.1:8b", "nomic-embed-text")
foreach ($model in $models) {
    $list = ollama list
    if ($list -match $model) {
        Write-Host "  ✓ $model already available" -ForegroundColor Green
    } else {
        Write-Host "  Pulling $model..." -ForegroundColor Cyan
        ollama pull $model
    }
}

if ($tempOllama) {
    Stop-Process -Id $tempOllama.Id -Force
}

Set-Location $ROOT_DIR

Write-Host "`n═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   ✓ Setup complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════`n" -ForegroundColor Cyan
Write-Host "You can now run the project using: " -NoNewline; Write-Host ".\run.ps1" -ForegroundColor Yellow