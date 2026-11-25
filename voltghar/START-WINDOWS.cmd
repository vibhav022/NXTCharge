@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 LTS from https://nodejs.org then run this again.
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1)"
if errorlevel 1 (
  echo Node.js 24 or newer is required.
  pause
  exit /b 1
)
if not exist .env copy .env.example .env >nul
if not exist node_modules (
  call npm.cmd ci
  if errorlevel 1 goto failed
)
echo Open http://localhost:5173 after the servers start.
echo Leave this window open while using VoltGhar.
call npm.cmd run dev
pause
exit /b
:failed
echo Setup failed. Copy the error above and share it in the chat.
pause
exit /b 1
