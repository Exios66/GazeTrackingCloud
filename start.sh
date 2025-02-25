#!/bin/bash

# Start script for GazeTrackingCloud
# This script starts the application and opens it in the default browser

# Print colored text
print_green() {
  echo -e "\033[0;32m$1\033[0m"
}

print_yellow() {
  echo -e "\033[0;33m$1\033[0m"
}

print_red() {
  echo -e "\033[0;31m$1\033[0m"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  print_red "Node.js is not installed. Please install Node.js v12 or higher."
  exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  print_red "npm is not installed. Please install npm."
  exit 1
fi

# Check if the data directory exists
if [ ! -d "data" ]; then
  print_yellow "Data directory not found. Running setup..."
  npm run setup
  if [ $? -ne 0 ]; then
    print_red "Setup failed."
    exit 1
  fi
fi

# Check if node_modules directory exists
if [ ! -d "node_modules" ]; then
  print_yellow "Dependencies not installed. Installing..."
  npm install
  if [ $? -ne 0 ]; then
    print_red "Failed to install dependencies."
    exit 1
  fi
fi

# Start the application
print_green "Starting GazeTrackingCloud..."
print_yellow "Press Ctrl+C to stop the server"

# Run the start script
node start.js 