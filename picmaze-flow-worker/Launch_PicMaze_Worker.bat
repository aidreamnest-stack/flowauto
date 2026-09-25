@echo off
title Flow Automation
echo ========================================================
echo   Starting Flow Automation for Google Flow...
echo ========================================================
echo.
echo Opening Google Flow / ImageFX in Google Chrome...
start "" "https://labs.google/fx/tools/image-fx"
echo.
echo ========================================================
echo   [1] Click the Flow Automation extension icon in Chrome toolbar.
echo   [2] Enter your master prompt and batch limit.
echo   [3] Click "START GENERATION BATCH".
echo ========================================================
timeout /t 5 >nul
