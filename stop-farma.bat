@echo off
setlocal

echo Stopping Farma API/Web windows...
taskkill /FI "WINDOWTITLE eq Farma API" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Farma Web" /T /F >nul 2>&1

echo Done.
pause
exit /b 0

