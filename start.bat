@echo off
title 2c-client
cd /d "%~dp0"
echo Starting 2C Client...
npm run dev -- --open
