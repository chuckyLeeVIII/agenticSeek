#!/bin/bash

echo "Starting installation for macOS..."

set -e

# Check/Install Homebrew
if ! command -v brew &> /dev/null; then
    echo "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Update Homebrew
echo "Updating Homebrew..."
brew update

# Install System Dependencies
echo "Installing system dependencies..."
brew install wget portaudio node

# Check/Install uv
if ! command -v uv &> /dev/null; then
    echo "uv is not installed. Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# Initialize uv project
if [ ! -f "pyproject.toml" ]; then
    echo "Initializing uv project..."
    uv init --python 3.10 || { echo "Failed to initialize uv project"; exit 1; }
fi

# Sync Python environment
echo "Setting up Python environment..."
uv sync --python 3.10 || { echo "Failed to sync uv project"; exit 1; }

# Add Python dependencies
echo "Installing Python dependencies..."
uv add selenium || { echo "Failed to add selenium"; exit 1; }
if [ -f "requirements.txt" ]; then
    uv add -r requirements.txt || { echo "Failed to add requirements from requirements.txt"; exit 1; }
fi

# Setup Environment Variables
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
    else
        echo "Warning: .env.example not found. Skipping .env creation."
    fi
else
    echo ".env file already exists."
fi

# Setup Frontend
if [ -d "frontend/agentic-seek-front" ]; then
    echo "Setting up Frontend..."
    cd frontend/agentic-seek-front
    echo "Installing frontend dependencies..."
    npm install || { echo "Frontend install failed"; exit 1; }
    echo "Frontend installed successfully."
    cd ../..
else
    echo "Warning: Frontend directory not found at frontend/agentic-seek-front"
fi

echo "Installation complete for macOS!"
echo "To activate the environment, run: source .venv/bin/activate"
echo "To start the application, use: ./start_services.sh"
