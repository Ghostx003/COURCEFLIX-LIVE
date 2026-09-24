@echo off
echo Registering CourseFlix Windows Protocol...
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0register-courseflix-protocol.ps1"
echo Done!
pause
