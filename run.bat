@echo off
setlocal
title ET NewsAI - Services Running

echo ===========================================
echo    ET NewsAI - Start Services (Windows)
echo ===========================================
echo.

:: 0. Clean up stale processes
echo Cleaning up stale processes and ports...
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
timeout /t 2 /nobreak >nul
echo   - Cleanup complete.
echo.

if not exist "%~dp0backend\venv" (
    echo [ERROR] Setup incomplete. Please run setup.bat first.
    pause
    exit /b 1
)

:: 1. Start Ollama
echo [1/3] Checking Ollama...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo   - Starting Ollama server...
    start /B ollama serve >nul 2>&1
    timeout /t 3 /nobreak >nul
)
echo   - Ollama is running.

:: 2. Start Backend
echo [2/3] Starting Backend...
cd /d "%~dp0backend"
call venv\Scripts\activate.bat
start "ET NewsAI Backend" /B python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1

:: 3. Start Frontend
echo [3/3] Starting Frontend...
cd /d "%~dp0frontend"
start "ET NewsAI Frontend" /B npm run dev -- -p 3000

echo.
echo ===========================================
echo    ET NewsAI is UP!
echo    - Frontend: http://localhost:3000
echo    - Backend:  http://localhost:8000
echo ===========================================
echo Press any key to stop all services...
pause >nul

echo.
echo Shutting down services...
for %%p in (3000 8000) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%p') do (
        if "%%a" neq "0" taskkill /F /PID %%a 2>nul
    )
)
taskkill /F /FI "WINDOWTITLE eq Administrator: ET NewsAI Frontend*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Administrator: ET NewsAI Backend*" 2>nul
taskkill /F /IM "node.exe" 2>nul
taskkill /F /IM "python.exe" 2>nul
if exist "%~dp0frontend\.next\dev\lock" del /F /Q "%~dp0frontend\.next\dev\lock" 2>nul

echo All services stopped.
exit /b 0
