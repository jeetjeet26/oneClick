@echo off
REM P11 Data Engine Startup Script
REM Automatically activates venv and starts server

echo Starting P11 Data Engine...
echo.

REM Check if venv exists
if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

REM Set Python path to include MCP servers
set PYTHONPATH=%CD%\..\mcp-servers;%CD%\..;%PYTHONPATH%

echo Virtual environment activated
echo PYTHONPATH configured
echo.
echo Data Engine running on http://localhost:8000
echo Press Ctrl+C to stop
echo.

python main.py





