# Quick Launch Script for Tamil Nadu Flood Warning System
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Tamil Nadu Flood Prediction & Early Warning System (ML-Powered) " -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n[1/3] Checking Backend Database & ML Models..." -ForegroundColor Green
$env:PYTHONPATH = "$Root\backend"
Set-Location "$Root\backend"

if (-not (Test-Path "$Root\backend\ml_models\flood_risk_classifier.joblib")) {
    Write-Host "Training Machine Learning Models..." -ForegroundColor Yellow
    py -m ml_training.train
}

if (-not (Test-Path "$Root\backend\flood_warning.db")) {
    Write-Host "Seeding Tamil Nadu River Basins & Stations..." -ForegroundColor Yellow
    py seed_data.py
}

Write-Host "`n[2/3] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\backend'; `$env:PYTHONPATH = '$Root\backend'; py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

Start-Sleep -Seconds 2

Write-Host "`n[3/3] Starting Vite React Frontend on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\frontend'; npm run dev"

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host " Application Launched Successfully!" -ForegroundColor Green
Write-Host " Frontend: http://localhost:3000" -ForegroundColor White
Write-Host " Backend API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
