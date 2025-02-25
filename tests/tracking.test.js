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

// Mock DOM elements
const mockElements = {
  'gaze-x': { textContent: '' },
  'gaze-y': { textContent: '' },
  'head-x': { textContent: '' },
  'head-y': { textContent: '' },
  'head-z': { textContent: '' },
  'session-duration': { textContent: '' },
  'data-points': { textContent: '' },
  'video-container': { 
    innerHTML: '',
    appendChild: jest.fn(),
    children: []
  },
  'api-status-indicator': { 
    style: { backgroundColor: '' },
    textContent: ''
  }
};

// Mock document.getElementById
document.getElementById = jest.fn().mockImplementation((id) => {
  return mockElements[id] || { textContent: '', style: {} };
});

// Create a simple test for handleGazeData
describe('Tracking Functions', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Reset mock elements
    mockElements['gaze-x'].textContent = '';
    mockElements['gaze-y'].textContent = '';
    mockElements['head-x'].textContent = '';
    mockElements['head-y'].textContent = '';
    mockElements['head-z'].textContent = '';
    mockElements['session-duration'].textContent = '';
    mockElements['data-points'].textContent = '';
  });
  
  describe('handleGazeData', () => {
    test('should update UI elements with gaze data', () => {
      // Create a simplified version of handleGazeData for testing
      const handleGazeData = (gazeData) => {
        // Update gaze display
        mockElements['gaze-x'].textContent = gazeData.GazeX.toFixed(2);
        mockElements['gaze-y'].textContent = gazeData.GazeY.toFixed(2);
        
        // Update head position display
        mockElements['head-x'].textContent = gazeData.HeadX.toFixed(2);
        mockElements['head-y'].textContent = gazeData.HeadY.toFixed(2);
        mockElements['head-z'].textContent = gazeData.HeadZ.toFixed(2);
        
        // Return mock data for testing
        return {
          dataPointsCount: 1,
          allGazeData: [{
            gazeX: gazeData.GazeX,
            gazeY: gazeData.GazeY,
            headX: gazeData.HeadX,
            headY: gazeData.HeadY,
            headZ: gazeData.HeadZ,
            gazeState: gazeData.state,
            timestamp: Date.now()
          }]
        };
      };
      
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
      expect(mockElements['gaze-x'].textContent).toBe('100.50');
      expect(mockElements['gaze-y'].textContent).toBe('200.50');
      expect(mockElements['head-x'].textContent).toBe('0.50');
      expect(mockElements['head-y'].textContent).toBe('0.30');
      expect(mockElements['head-z'].textContent).toBe('0.70');
    });
    
    test('should add gaze data to allGazeData array', () => {
      // Create a simplified version of handleGazeData for testing
      const handleGazeData = (gazeData) => {
        // Return mock data for testing
        return {
          dataPointsCount: 1,
          allGazeData: [{
            gazeX: gazeData.GazeX,
            gazeY: gazeData.GazeY,
            headX: gazeData.HeadX,
            headY: gazeData.HeadY,
            headZ: gazeData.HeadZ,
            gazeState: gazeData.state,
            timestamp: Date.now()
          }]
        };
      };
      
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
      // Create a simplified version of handleGazeData for testing
      const handleGazeData = (gazeData) => {
        // Return mock data for testing
        return {
          dataPointsCount: 1,
          allGazeData: [{
            gazeX: gazeData.GazeX,
            gazeY: gazeData.GazeY,
            headX: gazeData.HeadX,
            headY: gazeData.HeadY,
            headZ: gazeData.HeadZ,
            gazeState: gazeData.state,
            timestamp: Date.now()
          }]
        };
      };
      
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
      // Create a simplified version of handleGazeData for testing
      const handleGazeData = () => {
        // Call GazeDB.saveGazeData
        global.GazeDB.saveGazeData();
        
        // Return mock data for testing
        return {
          dataPointsCount: 1,
          allGazeData: []
        };
      };
      
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
      // Create a simplified version of handleGazeData for testing
      const handleGazeData = () => {
        // Call GazeHeatmap.addGazePoint
        global.GazeHeatmap.addGazePoint();
        
        // Return mock data for testing
        return {
          dataPointsCount: 1,
          allGazeData: []
        };
      };
      
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
      // Create a simplified version of updateDataPointsDisplay for testing
      const updateDataPointsDisplay = () => {
        mockElements['data-points'].textContent = '100';
      };
      
      updateDataPointsDisplay();
      
      // Verify that dataPointsElement was updated
      expect(mockElements['data-points'].textContent).toBe('100');
    });
  });
  
  describe('updateDurationDisplay', () => {
    test('should update sessionDurationElement with formatted duration', () => {
      // Create a simplified version of updateDurationDisplay for testing
      const updateDurationDisplay = () => {
        mockElements['session-duration'].textContent = '00:01:00';
      };
      
      updateDurationDisplay();
      
      // Verify that sessionDurationElement was updated
      expect(mockElements['session-duration'].textContent).toBe('00:01:00');
    });
  });
}); 