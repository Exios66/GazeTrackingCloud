#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

// Print a styled message
function printMessage(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Print a section header
function printHeader(message) {
  console.log('\n' + colors.bright + colors.cyan + '='.repeat(message.length + 4) + colors.reset);
  console.log(colors.bright + colors.cyan + '= ' + message + ' =' + colors.reset);
  console.log(colors.bright + colors.cyan + '='.repeat(message.length + 4) + colors.reset + '\n');
}

// Execute a command and handle errors
function executeCommand(command, errorMessage) {
  try {
    printMessage(`Executing: ${command}`, colors.yellow);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    printMessage(`${errorMessage}: ${error.message}`, colors.red);
    return false;
  }
}

// Main installation function
async function install() {
  printHeader('GazeTrackingCloud Installation');
  
  // Check if Node.js is installed
  try {
    const nodeVersion = execSync('node --version').toString().trim();
    printMessage(`Node.js ${nodeVersion} detected`, colors.green);
  } catch (error) {
    printMessage('Node.js is not installed. Please install Node.js v12 or higher.', colors.red);
    process.exit(1);
  }
  
  // Create data directory if it doesn't exist
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    printMessage('Creating data directory...', colors.yellow);
    fs.mkdirSync(dataDir);
    printMessage('Data directory created successfully', colors.green);
  } else {
    printMessage('Data directory already exists', colors.green);
  }
  
  // Install dependencies
  printHeader('Installing Dependencies');
  if (!executeCommand('npm install', 'Failed to install dependencies')) {
    process.exit(1);
  }
  
  // Build the application
  printHeader('Building Application');
  if (!executeCommand('npm run build', 'Failed to build the application')) {
    process.exit(1);
  }
  
  // Installation complete
  printHeader('Installation Complete');
  printMessage('GazeTrackingCloud has been successfully installed!', colors.green);
  printMessage('\nTo start the application, run:', colors.bright);
  printMessage('  npm start', colors.cyan);
  printMessage('\nThis will start the server and open the application in your default browser.', colors.reset);
  printMessage('Press Ctrl+C to stop the server when you\'re done.', colors.reset);
}

// Run the installation
install().catch(error => {
  printMessage(`Installation failed: ${error.message}`, colors.red);
  process.exit(1);
}); 