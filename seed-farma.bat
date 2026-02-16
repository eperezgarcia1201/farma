@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm is not installed or not in PATH.
  pause
  exit /b 1
)

echo Checking API at http://localhost:14000/api/health ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; for($i=0;$i -lt 20;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing http://localhost:14000/api/health -TimeoutSec 2; if($r.StatusCode -eq 200){ $ok=$true; break } } catch {}; Start-Sleep -Seconds 1 }; if(-not $ok){ exit 1 }"
if errorlevel 1 (
  echo [ERROR] API is not running. Start it first with start-farma.bat
  pause
  exit /b 1
)

echo Seeding sample data...
set "API_URL=http://localhost:14000/api"
call npm run seed:sample
if errorlevel 1 (
  echo [ERROR] Sample seed failed.
  pause
  exit /b 1
)

echo Sample data loaded successfully.
pause
exit /b 0

