#!/bin/bash

echo "Starting installation for Linux..."

set -e

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "uv is not installed. Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    # Add uv to path for current session if possible, or assume it's in .cargo/bin
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# Update package list
echo "Updating system packages..."
sudo apt-get update || { echo "Failed to update package list"; exit 1; }

# Install essential system tools
echo "Installing system dependencies..."
sudo apt-get install -y \
    python3-dev \
    build-essential \
    alsa-utils \
    portaudio19-dev \
    python3-pyaudio \
    libgtk-3-dev \
    libnotify-dev \
    libgconf-2-4 \
    libnss3 \
    libxss1 \
    nodejs \
    npm \
    docker-compose || { echo "Failed to install system packages"; exit 1; }

# Initialize uv project if needed
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

    if ! command -v npm &> /dev/null; then
        echo "Error: npm not found even after apt install. Please install Node.js manually."
    else
        echo "Installing frontend dependencies..."
        npm install || { echo "Frontend install failed"; exit 1; }
        echo "Frontend installed successfully."
    fi
    cd ../..
else
    echo "Warning: Frontend directory not found at frontend/agentic-seek-front"
fi

echo "Installation complete for Linux!"
echo "To activate the environment, run: source .venv/bin/activate"
echo "To start the application, use: ./start_services.sh"
