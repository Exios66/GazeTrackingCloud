#!/usr/bin/env node

/**
 * Startup script for GazeTrackingCloud
 * This script checks if the application is properly set up and starts it
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

// Print a styled message
function printMessage(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Check if the data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  printMessage('Data directory not found. Running setup...', colors.yellow);
  try {
    execSync('npm run setup', { stdio: 'inherit' });
  } catch (error) {
    printMessage(`Setup failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Check if node_modules directory exists
const nodeModulesDir = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesDir)) {
  printMessage('Dependencies not installed. Installing...', colors.yellow);
  try {
    execSync('npm install', { stdio: 'inherit' });
  } catch (error) {
    printMessage(`Failed to install dependencies: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Start the application
printMessage('Starting GazeTrackingCloud...', colors.green);
printMessage('Press Ctrl+C to stop the server', colors.yellow);

// Start the server
const server = spawn('node', ['server.js'], { stdio: 'inherit' });

// Handle server exit
server.on('exit', (code) => {
  if (code !== 0) {
    printMessage(`Server exited with code ${code}`, colors.red);
  }
});

// Wait for the server to start
setTimeout(() => {
  // Open the browser
  printMessage('Opening browser...', colors.green);
  require('./open-browser.js');
}, 2000);

// Handle process termination
process.on('SIGINT', () => {
  printMessage('\nShutting down...', colors.yellow);
  server.kill();
  process.exit(0);
}); 