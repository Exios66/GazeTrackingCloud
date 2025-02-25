/**
 * Direct import test for GazeTrackingCloud modules
 */

// Import the modules directly
const fs = require('fs');
const path = require('path');

// Path to the js files
const jsDir = path.resolve(__dirname, '../js');

describe('Direct Module Import Tests', () => {
  test('js directory exists', () => {
    expect(fs.existsSync(jsDir)).toBe(true);
  });

  test('tracking.js file exists', () => {
    const trackingJsPath = path.join(jsDir, 'tracking.js');
    expect(fs.existsSync(trackingJsPath)).toBe(true);
  });

  test('app.js file exists', () => {
    const appJsPath = path.join(jsDir, 'app.js');
    expect(fs.existsSync(appJsPath)).toBe(true);
  });

  test('database.js file exists', () => {
    const dbJsPath = path.join(jsDir, 'database.js');
    expect(fs.existsSync(dbJsPath)).toBe(true);
  });

  test('heatmap.js file exists', () => {
    const heatmapJsPath = path.join(jsDir, 'heatmap.js');
    expect(fs.existsSync(heatmapJsPath)).toBe(true);
  });
}); 