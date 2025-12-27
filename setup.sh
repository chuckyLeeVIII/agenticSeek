#!/bin/bash

# Setup script for Linux and macOS
SCRIPTS_DIR="scripts"
LLM_ROUTER_DIR="llm_router"

echo "========================================="
echo "   AgenticSeek One-Click Setup (Linux/Mac)"
echo "========================================="

OS_TYPE=$(uname -s)

case "$OS_TYPE" in
    "Linux"*)
        if [ -f "$SCRIPTS_DIR/linux_install.sh" ]; then
            bash "$SCRIPTS_DIR/linux_install.sh"
        else
            echo "Error: $SCRIPTS_DIR/linux_install.sh not found!"
            exit 1
        fi
        ;;
    "Darwin"*)
        if [ -f "$SCRIPTS_DIR/macos_install.sh" ]; then
            bash "$SCRIPTS_DIR/macos_install.sh"
        else
            echo "Error: $SCRIPTS_DIR/macos_install.sh not found!"
            exit 1
        fi
        ;;
    *)
        echo "Unsupported OS: $OS_TYPE"
        exit 1
        ;;
esac

# Download LLM models if needed
if [ -d "$LLM_ROUTER_DIR" ]; then
    echo "Checking LLM Router models..."
    cd "$LLM_ROUTER_DIR"
    if [ -f "dl_safetensors.sh" ]; then
        bash dl_safetensors.sh
    fi
    cd ..
fi

echo "========================================="
echo "   Setup Completed Successfully!"
echo "   You can now run: ./start_services.sh"
echo "========================================="
