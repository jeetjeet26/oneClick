# Start Data-Engine with proper Python path
# Run this in Terminal 3: .\start.ps1

Write-Host "🚀 Starting P11 Data Engine..." -ForegroundColor Green
Write-Host ""

# Use Python 3.13
$pythonPath = "C:\Users\jasji\AppData\Local\Programs\Python\Python313\python.exe"

# Check if .env exists
if (!(Test-Path ".\.env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Copy .env.example to .env and configure" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Environment: .env loaded" -ForegroundColor Green
Write-Host "✅ Python: $pythonPath" -ForegroundColor Green
Write-Host ""

# Start server
& $pythonPath main.py
