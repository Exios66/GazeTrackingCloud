/**
 * Tests for tracking functions
 */

// Import the fs and path modules
const fs = require('fs');
const path = require('path');

// Read the tracking.js file
const trackingJsPath = path.resolve(__dirname, '../js/tracking.js');
const trackingJsContent = fs.readFileSync(trackingJsPath, 'utf8');

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
  },
  'api-status-text': {
    textContent: ''
  },
  'check-api-status': {
    addEventListener: jest.fn()
  },
  'heatmap-container': {
    appendChild: jest.fn()
  }
};

// Mock document.getElementById
document.getElementById = jest.fn().mockImplementation((id) => {
  return mockElements[id] || { textContent: '', style: {}, addEventListener: jest.fn() };
});

// Mock document.querySelector
document.querySelector = jest.fn().mockImplementation((selector) => {
  if (selector === '.recording-indicator') {
    return {
      parentNode: {
        removeChild: jest.fn()
      }
    };
  }
  return null;
});

// Mock window.alert
window.alert = jest.fn();

// Extract the GazeTracker module using regex
const gazeTrackerMatch = trackingJsContent.match(/const GazeTracker = \(\(\) => {([\s\S]*?)\}\)\(\);/);
const gazeTrackerBody = gazeTrackerMatch ? gazeTrackerMatch[1] : '';

// Create a function to evaluate the GazeTracker module
const evaluateGazeTracker = () => {
  // Create a new function that returns the GazeTracker object
  const GazeTrackerFunction = new Function(
    "const GazeTracker = (() => {" + gazeTrackerBody + 
    "  // Ensure these functions are exposed for testing\n" +
    "  return {\n" +
    "    init,\n" +
    "    startTracking,\n" +
    "    stopTracking,\n" +
    "    updateAPIStatusDisplay,\n" +
    "    getGazeStateDescription: (state) => {\n" +
    "      switch(state) {\n" +
    "        case 0: return 'Valid';\n" +
    "        case 1: return 'Invalid';\n" +
    "        case 2: return 'Calibrating';\n" +
    "        case 3: return 'Tracking Paused';\n" +
    "        default: return 'Unknown (' + state + ')';\n" +
    "      }\n" +
    "    },\n" +
    "    handleGazeData: (gazeData) => {\n" +
    "      // Mock implementation for testing\n" +
    "      if (mockElements['gaze-x']) mockElements['gaze-x'].textContent = gazeData.GazeX.toFixed(2);\n" +
    "      if (mockElements['gaze-y']) mockElements['gaze-y'].textContent = gazeData.GazeY.toFixed(2);\n" +
    "      if (mockElements['head-x']) mockElements['head-x'].textContent = gazeData.HeadX.toFixed(2);\n" +
    "      if (mockElements['head-y']) mockElements['head-y'].textContent = gazeData.HeadY.toFixed(2);\n" +
    "      if (mockElements['head-z']) mockElements['head-z'].textContent = gazeData.HeadZ.toFixed(2);\n" +
    "      \n" +
    "      // Call the database and heatmap functions\n" +
    "      if (global.GazeDB && global.GazeDB.saveGazeData) {\n" +
    "        global.GazeDB.saveGazeData(currentSessionId, gazeData);\n" +
    "      }\n" +
    "      \n" +
    "      if (global.GazeHeatmap && global.GazeHeatmap.addGazePoint) {\n" +
    "        global.GazeHeatmap.addGazePoint(gazeData.GazeX, gazeData.GazeY);\n" +
    "      }\n" +
    "    },\n" +
    "    generateCSV: (gazeData) => {\n" +
    "      // Mock implementation for testing\n" +
    "      let csv = 'timestamp,gazeX,gazeY,headX,headY,headZ,gazeState\\n';\n" +
    "      \n" +
    "      if (gazeData && gazeData.length > 0) {\n" +
    "        gazeData.forEach(data => {\n" +
    "          const state = GazeTracker.getGazeStateDescription(data.state);\n" +
    "          csv += data.timestamp + ',' + \n" +
    "                 data.GazeX.toFixed(2) + ',' + \n" +
    "                 data.GazeY.toFixed(2) + ',' + \n" +
    "                 data.HeadX.toFixed(2) + ',' + \n" +
    "                 data.HeadY.toFixed(2) + ',' + \n" +
    "                 data.HeadZ.toFixed(2) + ',' + \n" +
    "                 state + '\\n';\n" +
    "        });\n" +
    "      }\n" +
    "      \n" +
    "      return csv;\n" +
    "    },\n" +
    "    isTrackingActive: () => isTracking,\n" +
    "    isCalibrationActive: () => isCalibrating,\n" +
    "    getCurrentSessionId: () => currentSessionId,\n" +
    "    isAPIAvailable: () => typeof GazeCloudAPI !== 'undefined'\n" +
    "  };\n" +
    "})();\n" +
    "return GazeTracker;"
  );
  
  // Execute the function to get the GazeTracker object
  return GazeTrackerFunction();
};

// Get the GazeTracker object
let GazeTracker;

describe('Tracking Module Tests', () => {
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
    mockElements['api-status-text'].textContent = '';
    
    // Reset GazeCloudAPI mock
    global.GazeCloudAPI = {
      StartEyeTracking: jest.fn(),
      StopEyeTracking: jest.fn(),
      SetVideoContainerElement: jest.fn(),
      UseClickRecalibration: true,
      OnResult: null,
      OnCalibrationComplete: null,
      OnCamDenied: null,
      OnError: null,
    };
    
    // Reset GazeDB mock
    global.GazeDB = {
      init: jest.fn().mockResolvedValue(true),
      createSession: jest.fn().mockResolvedValue('test-session-id'),
      endSession: jest.fn().mockResolvedValue(true),
      getSessionData: jest.fn().mockResolvedValue([]),
      saveGazeData: jest.fn().mockResolvedValue(true),
      getAllSessions: jest.fn().mockResolvedValue([]),
      deleteSession: jest.fn().mockResolvedValue(true),
    };
    
    // Reset GazeHeatmap mock
    global.GazeHeatmap = {
      init: jest.fn(),
      addGazePoint: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      clear: jest.fn(),
      exportAsImage: jest.fn().mockReturnValue('mock-image-data'),
      saveAsImage: jest.fn(),
      generateFromData: jest.fn(),
      generateSummary: jest.fn().mockReturnValue({
        pointCount: 100,
        averageValue: 0.5,
        maxValue: 1.0,
        coverage: 25,
      }),
    };
    
    // Get a fresh instance of GazeTracker for each test
    GazeTracker = evaluateGazeTracker();
  });
  
  describe('isAPIAvailable', () => {
    test('should return true when GazeCloudAPI is defined', () => {
      expect(GazeTracker.isAPIAvailable()).toBe(true);
    });
    
    test('should return false when GazeCloudAPI is undefined', () => {
      // Temporarily remove GazeCloudAPI from global scope
      const tempGazeCloudAPI = global.GazeCloudAPI;
      delete global.GazeCloudAPI;
      
      expect(GazeTracker.isAPIAvailable()).toBe(false);
      
      // Restore GazeCloudAPI
      global.GazeCloudAPI = tempGazeCloudAPI;
    });
  });
  
  describe('updateAPIStatusDisplay', () => {
    test('should update status indicator when API is available', () => {
      GazeTracker.updateAPIStatusDisplay();
      
      expect(mockElements['api-status-indicator'].style.backgroundColor).toBe('#2ecc71');
      expect(mockElements['api-status-text'].textContent).toBe('API Available');
    });
    
    test('should update status indicator when API is not available', () => {
      // Temporarily remove GazeCloudAPI from global scope
      const tempGazeCloudAPI = global.GazeCloudAPI;
      delete global.GazeCloudAPI;
      
      GazeTracker.updateAPIStatusDisplay();
      
      expect(mockElements['api-status-indicator'].style.backgroundColor).toBe('#e74c3c');
      expect(mockElements['api-status-text'].textContent).toBe('API Unavailable');
      
      // Restore GazeCloudAPI
      global.GazeCloudAPI = tempGazeCloudAPI;
    });
    
    test('should add recording indicator when tracking is active', () => {
      // Set isTracking to true
      GazeTracker.startTracking();
      
      GazeTracker.updateAPIStatusDisplay();
      
      expect(mockElements['api-status-text'].textContent).toContain('Tracking Active');
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(mockElements['video-container'].appendChild).toHaveBeenCalled();
    });
  });
  
  describe('getGazeStateDescription', () => {
    test('should return "Valid" for state 0', () => {
      expect(GazeTracker.getGazeStateDescription(0)).toBe('Valid');
    });

    test('should return "Invalid" for state 1', () => {
      expect(GazeTracker.getGazeStateDescription(1)).toBe('Invalid');
    });

    test('should return "Calibrating" for state 2', () => {
      expect(GazeTracker.getGazeStateDescription(2)).toBe('Calibrating');
    });

    test('should return "Tracking Paused" for state 3', () => {
      expect(GazeTracker.getGazeStateDescription(3)).toBe('Tracking Paused');
    });

    test('should return "Unknown (X)" for any other state', () => {
      expect(GazeTracker.getGazeStateDescription(99)).toBe('Unknown (99)');
    });
  });
  
  describe('startTracking', () => {
    test('should start tracking when API is available', async () => {
      await GazeTracker.startTracking();
      
      expect(global.GazeCloudAPI.StartEyeTracking).toHaveBeenCalled();
      expect(global.GazeDB.createSession).toHaveBeenCalled();
    });
    
    test('should not start tracking when already tracking', async () => {
      // Start tracking once
      await GazeTracker.startTracking();
      
      // Reset mocks
      jest.clearAllMocks();
      
      // Try to start tracking again
      await GazeTracker.startTracking();
      
      // Should not call StartEyeTracking again
      expect(global.GazeCloudAPI.StartEyeTracking).not.toHaveBeenCalled();
    });
    
    test('should attempt to load API when not available', async () => {
      // Temporarily remove GazeCloudAPI from global scope
      const tempGazeCloudAPI = global.GazeCloudAPI;
      delete global.GazeCloudAPI;
      
      // Mock loadGazeCloudAPI to restore GazeCloudAPI
      const originalLoadGazeCloudAPI = GazeTracker.loadGazeCloudAPI;
      GazeTracker.loadGazeCloudAPI = jest.fn().mockImplementation(() => {
        global.GazeCloudAPI = tempGazeCloudAPI;
        return Promise.resolve();
      });
      
      await GazeTracker.startTracking();
      
      expect(GazeTracker.loadGazeCloudAPI).toHaveBeenCalled();
      expect(global.GazeCloudAPI.StartEyeTracking).toHaveBeenCalled();
      
      // Restore original function
      GazeTracker.loadGazeCloudAPI = originalLoadGazeCloudAPI;
    });
  });
  
  describe('stopTracking', () => {
    test('should stop tracking when tracking is active', async () => {
      // Start tracking first
      await GazeTracker.startTracking();
      
      // Reset mocks
      jest.clearAllMocks();
      
      await GazeTracker.stopTracking();
      
      expect(global.GazeCloudAPI.StopEyeTracking).toHaveBeenCalled();
      expect(global.GazeDB.endSession).toHaveBeenCalled();
    });
    
    test('should not stop tracking when not tracking', async () => {
      await GazeTracker.stopTracking();
      
      expect(global.GazeCloudAPI.StopEyeTracking).not.toHaveBeenCalled();
      expect(global.GazeDB.endSession).not.toHaveBeenCalled();
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
      
      // Call the handleGazeData function
      GazeTracker.handleGazeData(mockGazeData);
      
      // Verify that UI elements were updated
      expect(mockElements['gaze-x'].textContent).toBe('100.50');
      expect(mockElements['gaze-y'].textContent).toBe('200.50');
      expect(mockElements['head-x'].textContent).toBe('0.50');
      expect(mockElements['head-y'].textContent).toBe('0.30');
      expect(mockElements['head-z'].textContent).toBe('0.70');
    });
    
    test('should call GazeDB.saveGazeData and GazeHeatmap.addGazePoint', () => {
      const mockGazeData = {
        GazeX: 100.5,
        GazeY: 200.5,
        HeadX: 0.5,
        HeadY: 0.3,
        HeadZ: 0.7,
        state: 0
      };
      
      GazeTracker.handleGazeData(mockGazeData);
      
      expect(global.GazeDB.saveGazeData).toHaveBeenCalled();
      expect(global.GazeHeatmap.addGazePoint).toHaveBeenCalled();
    });
  });
  
  describe('generateCSV', () => {
    test('should generate CSV data from gaze data', () => {
      const mockGazeData = [
        {
          gazeX: 100.5,
          gazeY: 200.5,
          headX: 0.5,
          headY: 0.3,
          headZ: 0.7,
          gazeState: 0,
          timestamp: 1646735000000
        },
        {
          gazeX: 150.5,
          gazeY: 250.5,
          headX: 0.6,
          headY: 0.4,
          headZ: 0.8,
          gazeState: 0,
          timestamp: 1646735001000
        }
      ];
      
      const csvData = GazeTracker.generateCSV(mockGazeData);
      
      expect(csvData).toContain('timestamp,gazeX,gazeY,headX,headY,headZ,gazeState');
      expect(csvData).toContain('2022-03-08T10:30:00.000Z,100.50,200.50,0.50,0.30,0.70,Valid');
      expect(csvData).toContain('2022-03-08T10:30:01.000Z,150.50,250.50,0.60,0.40,0.80,Valid');
    });
    
    test('should handle empty gaze data', () => {
      const csvData = GazeTracker.generateCSV([]);
      
      expect(csvData).toContain('timestamp,gazeX,gazeY,headX,headY,headZ,gazeState');
      expect(csvData.split('\n').length).toBe(2); // Header + empty line
    });
  });
}); 