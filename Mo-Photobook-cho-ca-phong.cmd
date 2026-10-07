@echo off
title Xuong Photobook - may chu LAN cong 4330
cd /d "%~dp0"
where node >/dev/null 2>nul
if errorlevel 1 (
  echo Khong tim thay Node.js tren may nay. Cai Node.js tu https://nodejs.org roi mo lai.
  pause
  exit /b 1
)
node server.js 4330
echo.
echo May chu da dung. Bam phim bat ky de dong cua so.
pause
