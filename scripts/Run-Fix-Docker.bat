@echo off
echo Execution du script de reparation Docker...
powershell -ExecutionPolicy Bypass -File "%~dp0Fix-Docker.ps1"
pause
