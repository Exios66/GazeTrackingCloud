/**
 * Tests for CSV generation and export functions
 */

// Import the tracking module
const fs = require('fs');
const path = require('path');

// Read the tracking.js file
const trackingJsPath = path.resolve(__dirname, '../js/tracking.js');
const trackingJsContent = fs.readFileSync(trackingJsPath, 'utf8');

// Extract the generateCSV function using regex
const generateCSVFunctionMatch = trackingJsContent.match(/const\s+generateCSV\s*=\s*\(\s*gazeData\s*\)\s*=>\s*{([\s\S]*?)return\s+csvContent;?\s*};/);
const generateCSVFunctionBody = generateCSVFunctionMatch ? generateCSVFunctionMatch[1] : '';

// Extract the getGazeStateDescription function using regex
const getGazeStateDescriptionMatch = trackingJsContent.match(/const\s+getGazeStateDescription\s*=\s*\(\s*state\s*\)\s*=>\s*{([\s\S]*?)};/);
const getGazeStateDescriptionBody = getGazeStateDescriptionMatch ? getGazeStateDescriptionMatch[1] : '';

// Create the functions for testing
const getGazeStateDescription = new Function('state', `${getGazeStateDescriptionBody} return getGazeStateDescription(state);`);
const generateCSV = new Function('gazeData', `
  const currentSessionId = 'test-session-id';
  const getGazeStateDescription = ${getGazeStateDescription.toString()};
  ${generateCSVFunctionBody}
  return csvContent;
`);

// Mock data for testing
const mockGazeData = [
  {
    timestamp: 1646735000000, // March 8, 2022, 10:30:00 AM UTC
    gazeX: 100.123456,
    gazeY: 200.987654,
    gazeState: 0, // Valid
  },
  {
    timestamp: 1646735001000, // March 8, 2022, 10:30:01 AM UTC
    gazeX: 150.654321,
    gazeY: 250.123456,
    gazeState: 1, // Invalid
  },
  {
    timestamp: 1646735002000, // March 8, 2022, 10:30:02 AM UTC
    gazeX: 200.111111,
    gazeY: 300.222222,
    gazeState: 2, // Calibrating
  },
  {
    timestamp: 1646735003000, // March 8, 2022, 10:30:03 AM UTC
    gazeX: 250.333333,
    gazeY: 350.444444,
    gazeState: 3, // Tracking Paused
  },
];

describe('CSV Generation Functions', () => {
  describe('getGazeStateDescription', () => {
    test('should return "Valid" for state 0', () => {
      expect(getGazeStateDescription(0)).toBe('Valid');
    });

    test('should return "Invalid" for state 1', () => {
      expect(getGazeStateDescription(1)).toBe('Invalid');
    });

    test('should return "Calibrating" for state 2', () => {
      expect(getGazeStateDescription(2)).toBe('Calibrating');
    });

    test('should return "Tracking Paused" for state 3', () => {
      expect(getGazeStateDescription(3)).toBe('Tracking Paused');
      expect(getGazeStateDescription(99)).toBe('Unknown (99)');
    });
  });

  describe('generateCSV', () => {
    test('should return "No data available" for empty data', () => {
      expect(generateCSV([])).toBe('No data available');
      expect(generateCSV(null)).toBe('No data available');
      expect(generateCSV(undefined)).toBe('No data available');
    });

    test('should generate CSV with correct headers', () => {
      const csv = generateCSV(mockGazeData);
      const lines = csv.split('\n');
      
      // Check header line
      expect(lines[0]).toBe('unix_timestamp,date_time,elapsed_time,gaze_x,gaze_y,gaze_state,session_id');
    });

    test('should format gaze coordinates with 2 decimal places', () => {
      const csv = generateCSV(mockGazeData);
      const lines = csv.split('\n');
      
      // Check first data line
      const firstDataLine = lines[1].split(',');
      expect(firstDataLine[3]).toBe('100.12'); // gazeX with 2 decimal places
      expect(firstDataLine[4]).toBe('200.99'); // gazeY with 2 decimal places
    });

    test('should include descriptive gaze state text', () => {
      const csv = generateCSV(mockGazeData);
      const lines = csv.split('\n');
      
      // Check gaze state in each line
      expect(lines[1].split(',')[5]).toBe('Valid');
      expect(lines[2].split(',')[5]).toBe('Invalid');
      expect(lines[3].split(',')[5]).toBe('Calibrating');
      expect(lines[4].split(',')[5]).toBe('Tracking Paused');
    });

    test('should include session ID in each row', () => {
      const csv = generateCSV(mockGazeData);
      const lines = csv.split('\n');
      
      // Check session ID in each line
      for (let i = 1; i < lines.length; i++) {
        expect(lines[i].split(',')[6]).toBe('test-session-id');
      }
    });

    test('should format elapsed time correctly', () => {
      const csv = generateCSV(mockGazeData);
      const lines = csv.split('\n');
      
      // Check elapsed time format
      expect(lines[1].split(',')[2]).toBe('00:00:00.000'); // First point (0 seconds)
      expect(lines[2].split(',')[2]).toBe('00:00:01.000'); // Second point (1 second)
      expect(lines[3].split(',')[2]).toBe('00:00:02.000'); // Third point (2 seconds)
      expect(lines[4].split(',')[2]).toBe('00:00:03.000'); // Fourth point (3 seconds)
    });

    test('should handle longer elapsed times correctly', () => {
      // Create data with longer time spans
      const longTimeData = [
        { ...mockGazeData[0], timestamp: 1646735000000 }, // 0 seconds
        { ...mockGazeData[1], timestamp: 1646735060000 }, // 1 minute
        { ...mockGazeData[2], timestamp: 1646738600000 }, // 1 hour
        { ...mockGazeData[3], timestamp: 1646821800000 }, // 24 hours + 6 minutes + 40 seconds
      ];
      
      const csv = generateCSV(longTimeData);
      const lines = csv.split('\n');
      
      // Check elapsed time format for longer times
      expect(lines[1].split(',')[2]).toBe('00:00:00.000'); // 0 seconds
      expect(lines[2].split(',')[2]).toBe('00:01:00.000'); // 1 minute
      expect(lines[3].split(',')[2]).toBe('01:00:00.000'); // 1 hour
      expect(lines[4].split(',')[2]).toBe('24:06:40.000'); // 24 hours + 6 minutes + 40 seconds
    });
  });
}); 