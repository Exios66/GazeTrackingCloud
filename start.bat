@echo off
REM Start script for GazeTrackingCloud on Windows
REM This script starts the application and opens it in the default browser

echo Starting GazeTrackingCloud...

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo Node.js is not installed. Please install Node.js v12 or higher.
  exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo npm is not installed. Please install npm.
  exit /b 1
)

REM Check if the data directory exists
if not exist "data" (
  echo Data directory not found. Running setup...
  call npm run setup
  if %ERRORLEVEL% neq 0 (
    echo Setup failed.
    exit /b 1
  )
)

REM Check if node_modules directory exists
if not exist "node_modules" (
  echo Dependencies not installed. Installing...
  call npm install
  if %ERRORLEVEL% neq 0 (
    echo Failed to install dependencies.
    exit /b 1
  )
)

echo Starting GazeTrackingCloud...
echo Press Ctrl+C to stop the server

REM Run the start script
node start.js 