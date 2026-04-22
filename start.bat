@echo off
setlocal
echo ==================================================
echo   Pokemon Champions Tool - Launcher
echo ==================================================
cd /d "%~dp0"

IF NOT EXIST ".venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found. 
    echo Please run 'install.bat' first to setup the system.
    pause
    exit /b 1
)

echo Starting backend server...
start cmd /k ".\.venv\Scripts\python.exe backend\server.py"

echo Waiting for server to start...
timeout /t 3 /nobreak > nul

echo Opening PokeChamp UI in browser...
start http://127.0.0.1:8000/

echo.
echo ==================================================
echo   System is running! 
echo   Keep the console window open to use the tool.
echo ==================================================
