#!/usr/bin/env node

/**
 * Cross-platform browser opener script for GazeTrackingCloud
 * This script opens the default browser on any operating system
 */

const { exec } = require('child_process');
const os = require('os');

const url = process.argv[2] || 'http://localhost:3000';
const platform = os.platform();

console.log(`Opening ${url} in your default browser...`);

// Determine the command based on the operating system
let command;
switch (platform) {
  case 'win32':
    command = `start ${url}`;
    break;
  case 'darwin': // macOS
    command = `open ${url}`;
    break;
  case 'linux':
    command = `xdg-open ${url}`;
    break;
  default:
    console.error(`Unsupported platform: ${platform}`);
    process.exit(1);
}

// Execute the command
exec(command, (error) => {
  if (error) {
    console.error(`Failed to open browser: ${error.message}`);
    process.exit(1);
  }
  console.log('Browser opened successfully');
}); 