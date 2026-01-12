#!/bin/bash
# P11 Data Engine Startup Script
# Automatically activates venv and starts server

echo "Starting P11 Data Engine..."
echo

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Set Python path to include MCP servers
export PYTHONPATH="$(pwd)/../mcp-servers:$(pwd)/..:$PYTHONPATH"

echo "Virtual environment activated"
echo "PYTHONPATH configured"
echo
echo "Data Engine running on http://localhost:8000"
echo "Press Ctrl+C to stop"
echo

python main.py





