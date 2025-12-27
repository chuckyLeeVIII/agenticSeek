@echo off
echo =========================================
echo    AgenticSeek One-Click Setup (Windows)
echo =========================================

set SCRIPTS_DIR=scripts
set LLM_ROUTER_DIR=llm_router

if exist "%SCRIPTS_DIR%\windows_install.bat" (
    call "%SCRIPTS_DIR%\windows_install.bat"
) else (
    echo Error: %SCRIPTS_DIR%\windows_install.bat not found!
    exit /b 1
)

REM Download LLM models if needed (Assuming bash is available or manual)
if exist "%LLM_ROUTER_DIR%\dl_safetensors.sh" (
    echo.
    echo Note: Model download script is a bash script.
    echo If you have Git Bash or WSL, run: bash %LLM_ROUTER_DIR%/dl_safetensors.sh
    echo Otherwise, please download the models manually as per README.
)

echo.
echo =========================================
echo    Setup Completed!
echo    You can now run: start_services.cmd
echo =========================================
pause
