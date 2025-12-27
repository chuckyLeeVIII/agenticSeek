@echo off
echo Starting installation for Windows...

REM Check/Install uv
uv --version >nul 2>&1
if %errorlevel% neq 0 (
    echo uv is not installed. Installing uv...
    powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
    if %errorlevel% neq 0 (
        echo Failed to install uv. Please install it manually.
        pause
        exit /b 1
    )
)

REM Initialize uv project
if not exist "pyproject.toml" (
    echo Initializing uv project...
    uv init --python 3.10
    if %errorlevel% neq 0 (
        echo Failed to initialize uv project
        pause
        exit /b 1
    )
)

REM Sync Python environment
echo Setting up Python environment...
uv sync --python 3.10
if %errorlevel% neq 0 (
    echo Failed to sync uv project
    pause
    exit /b 1
)

REM Install Python packages
echo Installing Python packages...
uv add pyreadline3 selenium
if exist "requirements.txt" (
    uv add -r requirements.txt
)

REM Setup Environment Variables
if not exist ".env" (
    if exist ".env.example" (
        echo Creating .env from .env.example...
        copy .env.example .env
    ) else (
        echo Warning: .env.example not found. Skipping .env creation.
    )
) else (
    echo .env file already exists.
)

REM Setup Frontend
if exist "frontend\agentic-seek-front" (
    echo Setting up Frontend...
    cd frontend\agentic-seek-front

    REM Check for npm
    call npm --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo Error: npm is not found. Please install Node.js manually from https://nodejs.org/
        echo Frontend setup skipped.
    ) else (
        echo Installing frontend dependencies...
        call npm install
        if %errorlevel% neq 0 (
            echo Frontend install failed.
        ) else (
            echo Frontend installed successfully.
        )
    )
    cd ..\..
) else (
    echo Warning: Frontend directory not found.
)

echo.
echo Installation complete for Windows!
echo To activate the environment, run: .venv\Scripts\activate
echo To start the application, use: start_services.cmd
echo.
echo Note: If pyAudio fails, please install portaudio manually or via choco/winget.
pause
