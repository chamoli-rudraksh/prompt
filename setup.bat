@echo off
setlocal enabledelayedexpansion
title ET NewsAI - Setup

echo ===========================================
echo    ET NewsAI - Windows Environment Setup
echo ===========================================
echo.

:: 0. Clean up stale processes
echo [0/4] Cleaning up any running services...
for %%p in (3000 3001 3002 8000) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%p') do (
        if "%%a" neq "0" (
            taskkill /F /PID %%a 2>nul
        )
    )
)
taskkill /F /IM "node.exe" 2>nul
taskkill /F /IM "python.exe" 2>nul
if exist "%~dp0frontend\.next\dev\lock" del /F /Q "%~dp0frontend\.next\dev\lock" 2>nul
echo   - Cleanup done.
echo.

:: 1. Check prerequisites
echo [1/4] Checking prerequisites...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.11+ and add it to PATH.
    pause
    exit /b 1
)
echo   - Python found.

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+ and add it to PATH.
    pause
    exit /b 1
)
echo   - Node.js found.

ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Ollama not found. Install from https://ollama.com
    pause
    exit /b 1
)
echo   - Ollama found.
echo.

:: 2. Setup Backend
echo [2/4] Setting up backend...
cd /d "%~dp0backend"

if not exist "venv" (
    echo   - Creating Python virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
echo   - Installing Python dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

:: Init .env
if not exist ".env" (
    echo   - Creating default .env file...
    > .env echo LLM_PROVIDER=ollama
    >> .env echo LLM_MODEL=llama3.1:8b
    >> .env echo OLLAMA_BASE_URL=http://localhost:11434
    >> .env echo DB_PATH=./etnewsai.db
    >> .env echo CHROMA_PATH=./chroma_store
    
    :: Generate random 64 char string for JWT secret
    for /f "delims=" %%i in ('python -c "import secrets; print(secrets.token_hex(32))"') do set JWT_SECRET=%%i
    >> .env echo JWT_SECRET=!JWT_SECRET!
    >> .env echo FRONTEND_URL=http://localhost:3000
)

:: 3. Setup Frontend
echo.
echo [3/4] Setting up frontend...
cd /d "%~dp0frontend"
echo   - Installing Node.js dependencies...
call npm install

:: 4. Ollama Models
echo.
echo [4/4] Ensuring Ollama models are present...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo   - Starting Ollama temporarily...
    start /B ollama serve >nul 2>&1
    timeout /t 3 /nobreak >nul
)

for %%m in ("llama3.1:8b" "nomic-embed-text") do (
    ollama list | findstr "%%~m" >nul 2>&1
    if %errorlevel% equ 0 (
        echo   - %%~m already available.
    ) else (
        echo   - Pulling %%~m ...
        ollama pull %%~m
    )
)

echo.
echo ===========================================
echo    Setup complete!
echo ===========================================
echo You can now double-click run.bat to start.
pause
