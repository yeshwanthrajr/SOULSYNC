@echo off
echo =======================================================
echo     Automated Git Commit ^& GitHub Publisher Setup
echo =======================================================
echo.

echo [1/3] Adding all recent updates to Git...
git init
git add .
git commit -m "feat: Connected Frontend and Backend to Online MongoDB Database"

echo.
echo [2/3] Preparing Branch...
git branch -M main

echo.
echo [3/3] Forcing connection to https://github.com/yeshwanthrajr/SOULSYNC.git ...
git remote remove origin
git remote add origin https://github.com/yeshwanthrajr/SOULSYNC.git

echo.
echo Pushing changes...
git push -u origin main

echo.
echo =======================================================
echo Done! Your code has been securely backed up and pushed.
echo =======================================================
pause
