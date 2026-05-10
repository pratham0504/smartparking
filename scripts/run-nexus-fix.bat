@echo off
echo Exécution du diagnostic Nexus...
powershell -ExecutionPolicy Bypass -File "%~dp0nexus-fix.ps1"
pause
