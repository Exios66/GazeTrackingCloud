/**
 * Tests for tracking functions
 */

// Import the tracking module
const fs = require('fs');
const path = require('path');

// Read the tracking.js file
const trackingJsPath = path.resolve(__dirname, '../js/tracking.js');
const trackingJsContent = fs.readFileSync(trackingJsPath, 'utf8');

// Extract the handleGazeData function using regex
const handleGazeDataMatch = trackingJsContent.match(/const\s+handleGazeData\s*=\s*\(\s*gazeData\s*\)\s*=>\s*{([\s\S]*?)};/);
const handleGazeDataBody = handleGazeDataMatch ? handleGazeDataMatch[1] : '';

// Extract the updateDataPointsDisplay function using regex
const updateDataPointsDisplayMatch = trackingJsContent.match(/const\s+updateDataPointsDisplay\s*=\s*\(\s*\)\s*=>\s*{([\s\S]*?)};/);
const updateDataPointsDisplayBody = updateDataPointsDisplayMatch ? updateDataPointsDisplayMatch[1] : '';

// Extract the updateDurationDisplay function using regex
const updateDurationDisplayMatch = trackingJsContent.match(/const\s+updateDurationDisplay\s*=\s*\(\s*\)\s*=>\s*{([\s\S]*?)};/);
const updateDurationDisplayBody = updateDurationDisplayMatch ? updateDurationDisplayMatch[1] : '';

// Create the functions for testing
const handleGazeData = new Function('gazeData', `
  const dataPointsCount = 0;
  const allGazeData = [];
  const gazeXElement = document.getElementById('gaze-x');
  const gazeYElement = document.getElementById('gaze-y');
  const headXElement = document.getElementById('head-x');
  const headYElement = document.getElementById('head-y');
  const headZElement = document.getElementById('head-z');
  const updateDataPointsDisplay = () => {};
  const GazeDB = global.GazeDB;
  const GazeHeatmap = global.GazeHeatmap;
  const currentSessionId = 'test-session-id';
  ${handleGazeDataBody}
  return { dataPointsCount, allGazeData };
`);

const updateDataPointsDisplay = new Function(`
  const dataPointsCount = 100;
  const dataPointsElement = document.getElementById('data-points');
  ${updateDataPointsDisplayBody}
`);

const updateDurationDisplay = new Function(`
  const startTime = Date.now() - 60000; // 1 minute ago
  const sessionDurationElement = document.getElementById('session-duration');
  ${updateDurationDisplayBody}
`);

describe('Tracking Functions', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock the document.getElementById function to return mock elements
    document.getElementById = jest.fn().mockImplementation((id) => {
      switch (id) {
        case 'gaze-x':
        case 'gaze-y':
        case 'head-x':
        case 'head-y':
        case 'head-z':
        case 'session-duration':
        case 'data-points':
          return { textContent: '' };
        case 'video-container':
          return { 
            innerHTML: '',
            appendChild: jest.fn(),
            children: []
          };
        case 'api-status-indicator':
          return { 
            style: { backgroundColor: '' },
            textContent: ''
          };
        default:
          return {
            textContent: '',
            style: {}
          };
      }
    });
  });
  
  describe('handleGazeData', () => {
    test('should update UI elements with gaze data', () => {
      const mockGazeData = {
        GazeX: 100.5,
        GazeY: 200.5,
        HeadX: 0.5,
        HeadY: 0.3,
        HeadZ: 0.7,
        state: 0
      };
      
      handleGazeData(mockGazeData);
      
      // Verify that UI elements were updated
      expect(document.getElementById('gaze-x').textContent).toBe('100.50');
      expect(document.getElementById('gaze-y').textContent).toBe('200.50');
      expect(document.getElementById('head-x').textContent).toBe('0.50');
      expect(document.getElementById('head-y').textContent).toBe('0.30');
      expect(document.getElementById('head-z').textContent).toBe('0.70');
    });
    
    test('should add gaze data to allGazeData array', () => {
      const mockGazeData = {
        GazeX: 100.5,
        GazeY: 200.5,
        HeadX: 0.5,
        HeadY: 0.3,
        HeadZ: 0.7,
        state: 0
      };
      
      const result = handleGazeData(mockGazeData);
      
      // Verify that data was added to allGazeData
      expect(result.allGazeData.length).toBe(1);
      expect(result.allGazeData[0].gazeX).toBe(100.5);
      expect(result.allGazeData[0].gazeY).toBe(200.5);
      expect(result.allGazeData[0].headX).toBe(0.5);
      expect(result.allGazeData[0].headY).toBe(0.3);
      expect(result.allGazeData[0].headZ).toBe(0.7);
      expect(result.allGazeData[0].gazeState).toBe(0);
      expect(result.allGazeData[0].timestamp).toBeDefined();
    });
    
    test('should increment dataPointsCount', () => {
      const mockGazeData = {
        GazeX: 100.5,
        GazeY: 200.5,
        HeadX: 0.5,
        HeadY: 0.3,
        HeadZ: 0.7,
        state: 0
      };
      
      const result = handleGazeData(mockGazeData);
      
      // Verify that dataPointsCount was incremented
      expect(result.dataPointsCount).toBe(1);
    });
    
    test('should call GazeDB.saveGazeData', () => {
      const mockGazeData = {
        GazeX: 100.5,
        GazeY: 200.5,
        HeadX: 0.5,
        HeadY: 0.3,
        HeadZ: 0.7,
        state: 0
      };
      
      handleGazeData(mockGazeData);
      
      // Verify that GazeDB.saveGazeData was called
      expect(global.GazeDB.saveGazeData).toHaveBeenCalled();
    });
    
    test('should call GazeHeatmap.addGazePoint', () => {
      const mockGazeData = {
        GazeX: 100.5,
        GazeY: 200.5,
        HeadX: 0.5,
        HeadY: 0.3,
        HeadZ: 0.7,
        state: 0
      };
      
      handleGazeData(mockGazeData);
      
      // Verify that GazeHeatmap.addGazePoint was called
      expect(global.GazeHeatmap.addGazePoint).toHaveBeenCalled();
    });
  });
  
  describe('updateDataPointsDisplay', () => {
    test('should update dataPointsElement with formatted count', () => {
      updateDataPointsDisplay();
      
      // Verify that dataPointsElement was updated
      expect(document.getElementById('data-points').textContent).toBe('100');
    });
  });
  
  describe('updateDurationDisplay', () => {
    test('should update sessionDurationElement with formatted duration', () => {
      updateDurationDisplay();
      
      // Verify that sessionDurationElement was updated
      expect(document.getElementById('session-duration').textContent).toBe('00:01:00');
    });
  });
}); 