@echo off
title LocalSpot — FBLA Coding & Programming
cd /d "%~dp0"
cls

echo.
echo  ==========================================
echo     LocalSpot  ^|  FBLA 2025-2026
echo     Coding ^& Programming Event
echo  ==========================================
echo.
echo  Starting development server...
echo  Open in browser: http://localhost:5173
echo.
echo  Press Ctrl+C to stop the server.
echo  ==========================================
echo.

call npm run dev
pause
