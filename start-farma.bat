@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm is not installed or not in PATH.
  echo Install Node.js LTS and try again.
  pause
  exit /b 1
)

set "DATABASE_URL=postgresql://root:1234qwer@localhost:5432/farma?schema=public"
set "PORT=14000"
set "FARMA_API_URL=http://localhost:14000/api"
set "NEXT_PUBLIC_API_URL=http://localhost:14000/api"

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 goto :fail
)

echo Applying database schema...
set "DATABASE_URL=postgresql://root:1234qwer@localhost:5432/farma?schema=public"
call npx prisma db push --schema apps/api/prisma/schema.prisma
if errorlevel 1 goto :fail

echo Starting API on port 14000...
start "Farma API" cmd /k "cd /d ""%ROOT%"" && set DATABASE_URL=%DATABASE_URL% && set PORT=%PORT% && npm run dev:api"

echo Waiting for API health check...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; for($i=0;$i -lt 60;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing http://localhost:14000/api/health -TimeoutSec 2; if($r.StatusCode -eq 200){ $ok=$true; break } } catch {}; Start-Sleep -Seconds 1 }; if(-not $ok){ exit 1 }"
if errorlevel 1 (
  echo [WARN] API health check did not pass yet. Continuing anyway...
) else (
  echo API is healthy.
)

echo Starting Web on port 13000...
start "Farma Web" cmd /k "cd /d ""%ROOT%"" && set FARMA_API_URL=%FARMA_API_URL% && set NEXT_PUBLIC_API_URL=%NEXT_PUBLIC_API_URL% && npm --workspace apps/web run dev -- -p 13000"

start "" http://localhost:13000

echo.
echo Farma is starting.
echo Web: http://localhost:13000
echo API: http://localhost:14000/api/health
echo.
echo If you want demo data, run seed-farma.bat
pause
exit /b 0

:fail
echo [ERROR] Startup failed.
pause
exit /b 1

