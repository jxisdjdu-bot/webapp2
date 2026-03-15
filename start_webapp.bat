@echo off
cd /d "%~dp0"
set PORT=8090
start "" "http://127.0.0.1:%PORT%"
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server %PORT%
  goto :eof
)
python -m http.server %PORT%
