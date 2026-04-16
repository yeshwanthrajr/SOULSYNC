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
echo [3/3] Please enter your GitHub Repository URL (e.g. https://github.com/Username/repo.git) 
echo Or press Enter to skip if it's already connected:
set /p gitURL="Repository URL: "

if "%gitURL%"=="" (
    echo.
    echo Pushing changes to the already connected repository...
    git push -u origin main
) else (
    echo.
    echo Connecting remote %gitURL%...
    git remote add origin %gitURL%
    git push -u origin main
)

echo.
echo =======================================================
echo Done! Your code has been securely backed up and pushed.
echo =======================================================
pause
