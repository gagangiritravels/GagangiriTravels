@echo off
echo =======================================
echo   TourismApp Server Starting...
echo =======================================

REM Install dependencies if not installed
if not exist node_modules (
    echo Installing dependencies...
    npm install
)

echo Starting server with nodemon...
npm run dev

pause
