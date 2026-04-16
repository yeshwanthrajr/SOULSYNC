@echo off
echo =======================================================
echo     Initializing MindSentinel Enterprise Setup
echo =======================================================
echo.
echo [1/3] Stopping any running server processes...
taskkill /F /IM node.exe /T >nul 2>&1

echo.
echo [2/3] Installing Dependencies (Mongoose, Express, etc.)...
cd backend
call npm install

echo.
echo [3/3] Booting up the Cognitive State Engine...
start http://localhost:3000
call node server.js

pause
