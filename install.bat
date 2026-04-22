@echo off
setlocal
echo ==================================================
echo   Pokemon Champions Tool - Installer
echo ==================================================
cd /d "%~dp0"

echo [1/3] Creating virtual environment...
python -m venv .venv
if %errorlevel% neq 0 (
    echo [ERROR] Failed to create virtual environment. 
    echo Please make sure Python is installed and in your PATH.
    pause
    exit /b 1
)

echo [2/3] Installing dependencies...
.\.venv\Scripts\pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)

echo [3/3] Initializing master data...
.\.venv\Scripts\python backend\fetch_moves_items.py
if %errorlevel% neq 0 (
    echo [WARNING] Master data fetch might have failed. You can retry later.
)

echo.
echo ==================================================
echo   Installation Complete!
echo   Please run 'start.bat' to launch the tool.
echo ==================================================
pause
