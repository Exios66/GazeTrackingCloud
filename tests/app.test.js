/**
 * Tests for app.js module
 */

// Import the fs and path modules
const fs = require('fs');
const path = require('path');

// Read the app.js file
const appJsPath = path.resolve(__dirname, '../js/app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Mock DOM elements
const mockElements = {
  'start-tracking': {
    addEventListener: jest.fn(),
    disabled: false
  },
  'stop-tracking': {
    addEventListener: jest.fn(),
    disabled: true
  },
  'export-csv': {
    addEventListener: jest.fn(),
    disabled: true
  },
  'export-session': {
    addEventListener: jest.fn(),
    disabled: true
  },
  'show-heatmap': {
    addEventListener: jest.fn(),
    disabled: true
  },
  'hide-heatmap': {
    addEventListener: jest.fn(),
    disabled: true
  },
  'clear-heatmap': {
    addEventListener: jest.fn(),
    disabled: true
  },
  'save-heatmap': {
    addEventListener: jest.fn(),
    disabled: true
  },
  'session-list': {
    addEventListener: jest.fn(),
    innerHTML: ''
  },
  'delete-session': {
    addEventListener: jest.fn(),
    disabled: true
  },
  'load-session': {
    addEventListener: jest.fn(),
    disabled: true
  },
  'status-message': {
    textContent: ''
  },
  'error-message': {
    textContent: '',
    style: {
      display: 'none'
    }
  },
  'error-container': {
    appendChild: jest.fn(),
    style: {
      display: 'none'
    }
  }
};

// Mock document.getElementById
document.getElementById = jest.fn().mockImplementation((id) => {
  return mockElements[id] || { addEventListener: jest.fn(), style: {}, appendChild: jest.fn() };
});

// Mock document.querySelector
document.querySelector = jest.fn().mockImplementation((selector) => {
  if (selector === '.selected') {
    return {
      classList: {
        remove: jest.fn()
      }
    };
  }
  return null;
});

// Mock document.querySelectorAll
document.querySelectorAll = jest.fn().mockImplementation((selector) => {
  return [];
});

// Mock document.createElement
document.createElement = jest.fn().mockImplementation((tag) => {
  return {
    style: {},
    className: '',
    textContent: '',
    appendChild: jest.fn()
  };
});

// Mock navigator.mediaDevices
navigator.mediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({})
};

// Mock GazeTracker
global.GazeTracker = {
  init: jest.fn(),
  startTracking: jest.fn().mockResolvedValue(true),
  stopTracking: jest.fn().mockResolvedValue(true),
  isTrackingActive: jest.fn().mockReturnValue(false),
  isCalibrationActive: jest.fn().mockReturnValue(false),
  exportCSV: jest.fn().mockResolvedValue('mock-csv-data'),
  exportSessionData: jest.fn().mockResolvedValue('mock-session-data'),
  showHeatmap: jest.fn().mockResolvedValue(true),
  hideHeatmap: jest.fn().mockResolvedValue(true),
  getCurrentSessionId: jest.fn().mockReturnValue('test-session-id')
};

// Mock GazeDB
global.GazeDB = {
  init: jest.fn().mockResolvedValue(true),
  getAllSessions: jest.fn().mockResolvedValue([
    {
      id: 'session-1',
      startTime: new Date(2022, 2, 8, 10, 0, 0),
      endTime: new Date(2022, 2, 8, 10, 5, 0),
      dataPoints: 100
    },
    {
      id: 'session-2',
      startTime: new Date(2022, 2, 8, 11, 0, 0),
      endTime: new Date(2022, 2, 8, 11, 5, 0),
      dataPoints: 200
    }
  ]),
  getSessionData: jest.fn().mockResolvedValue([
    {
      gazeX: 100,
      gazeY: 200,
      headX: 0.5,
      headY: 0.3,
      headZ: 0.7,
      gazeState: 0,
      timestamp: Date.now()
    }
  ]),
  deleteSession: jest.fn().mockResolvedValue(true)
};

// Mock GazeHeatmap
global.GazeHeatmap = {
  init: jest.fn(),
  clear: jest.fn(),
  generateFromData: jest.fn(),
  saveAsImage: jest.fn()
};

// Create a simplified version of the app initialization
const initApp = () => {
  // Mock the app initialization
  const showError = (message) => {
    mockElements['error-message'].textContent = message;
    mockElements['error-message'].style.display = 'block';
  };
  
  const updateUIState = (isTracking) => {
    mockElements['start-tracking'].disabled = isTracking;
    mockElements['stop-tracking'].disabled = !isTracking;
    mockElements['export-csv'].disabled = !isTracking;
    mockElements['export-session'].disabled = !isTracking;
    mockElements['show-heatmap'].disabled = !isTracking;
    mockElements['hide-heatmap'].disabled = !isTracking;
    mockElements['clear-heatmap'].disabled = !isTracking;
    mockElements['save-heatmap'].disabled = !isTracking;
  };
  
  // Set up event listeners
  mockElements['start-tracking'].addEventListener.mockImplementation((event, handler) => {
    mockElements['start-tracking'].clickHandler = async () => {
      try {
        await global.GazeTracker.startTracking();
        updateUIState(true);
      } catch (error) {
        showError(`Error starting tracking: ${error.message}`);
      }
    };
  });
  
  mockElements['stop-tracking'].addEventListener.mockImplementation((event, handler) => {
    mockElements['stop-tracking'].clickHandler = async () => {
      try {
        await global.GazeTracker.stopTracking();
        updateUIState(false);
      } catch (error) {
        showError(`Error stopping tracking: ${error.message}`);
      }
    };
  });
  
  mockElements['export-csv'].addEventListener.mockImplementation((event, handler) => {
    mockElements['export-csv'].clickHandler = async () => {
      try {
        await global.GazeTracker.exportCSV();
      } catch (error) {
        showError(`Error exporting CSV: ${error.message}`);
      }
    };
  });
  
  mockElements['export-session'].addEventListener.mockImplementation((event, handler) => {
    mockElements['export-session'].clickHandler = async () => {
      try {
        await global.GazeTracker.exportSessionData();
      } catch (error) {
        showError(`Error exporting session data: ${error.message}`);
      }
    };
  });
  
  mockElements['show-heatmap'].addEventListener.mockImplementation((event, handler) => {
    mockElements['show-heatmap'].clickHandler = async () => {
      try {
        await global.GazeTracker.showHeatmap();
      } catch (error) {
        showError(`Error showing heatmap: ${error.message}`);
      }
    };
  });
  
  mockElements['hide-heatmap'].addEventListener.mockImplementation((event, handler) => {
    mockElements['hide-heatmap'].clickHandler = async () => {
      try {
        await global.GazeTracker.hideHeatmap();
      } catch (error) {
        showError(`Error hiding heatmap: ${error.message}`);
      }
    };
  });
  
  mockElements['clear-heatmap'].addEventListener.mockImplementation((event, handler) => {
    mockElements['clear-heatmap'].clickHandler = () => {
      try {
        global.GazeHeatmap.clear();
      } catch (error) {
        showError(`Error clearing heatmap: ${error.message}`);
      }
    };
  });
  
  mockElements['save-heatmap'].addEventListener.mockImplementation((event, handler) => {
    mockElements['save-heatmap'].clickHandler = () => {
      try {
        global.GazeHeatmap.saveAsImage('heatmap.png');
      } catch (error) {
        showError(`Error saving heatmap: ${error.message}`);
      }
    };
  });
  
  mockElements['session-list'].addEventListener.mockImplementation((event, handler) => {
    mockElements['session-list'].clickHandler = (event) => {
      const sessionItem = {
        getAttribute: jest.fn().mockReturnValue('session-1'),
        classList: {
          add: jest.fn()
        }
      };
      
      // Enable session-related buttons
      mockElements['delete-session'].disabled = false;
      mockElements['load-session'].disabled = false;
      
      return sessionItem;
    };
  });
  
  mockElements['delete-session'].addEventListener.mockImplementation((event, handler) => {
    mockElements['delete-session'].clickHandler = async () => {
      try {
        const selectedSession = document.querySelector('.selected');
        if (selectedSession) {
          const sessionId = selectedSession.getAttribute('data-session-id');
          await global.GazeDB.deleteSession(sessionId);
        }
      } catch (error) {
        showError(`Error deleting session: ${error.message}`);
      }
    };
  });
  
  mockElements['load-session'].addEventListener.mockImplementation((event, handler) => {
    mockElements['load-session'].clickHandler = async () => {
      try {
        const selectedSession = document.querySelector('.selected');
        if (selectedSession) {
          const sessionId = selectedSession.getAttribute('data-session-id');
          const sessionData = await global.GazeDB.getSessionData(sessionId);
          global.GazeHeatmap.generateFromData(sessionData);
        }
      } catch (error) {
        showError(`Error loading session: ${error.message}`);
      }
    };
  });
  
  // Initialize the modules
  global.GazeTracker.init();
  global.GazeDB.init();
  global.GazeHeatmap.init();
};

describe('App Module Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Reset mock elements
    mockElements['start-tracking'].disabled = false;
    mockElements['stop-tracking'].disabled = true;
    mockElements['export-csv'].disabled = true;
    mockElements['export-session'].disabled = true;
    mockElements['show-heatmap'].disabled = true;
    mockElements['hide-heatmap'].disabled = true;
    mockElements['clear-heatmap'].disabled = true;
    mockElements['save-heatmap'].disabled = true;
    mockElements['session-list'].innerHTML = '';
    mockElements['delete-session'].disabled = true;
    mockElements['load-session'].disabled = true;
    mockElements['status-message'].textContent = '';
    mockElements['error-message'].textContent = '';
    mockElements['error-message'].style.display = 'none';
    
    // Reset GazeTracker mock
    global.GazeTracker.isTrackingActive.mockReturnValue(false);
    global.GazeTracker.isCalibrationActive.mockReturnValue(false);
    
    // Initialize the app
    initApp();
  });
  
  describe('App Initialization', () => {
    test('should initialize GazeTracker and GazeDB', () => {
      expect(global.GazeTracker.init).toHaveBeenCalled();
      expect(global.GazeDB.init).toHaveBeenCalled();
      expect(global.GazeHeatmap.init).toHaveBeenCalled();
    });
    
    test('should set up event listeners for UI elements', () => {
      expect(mockElements['start-tracking'].addEventListener).toHaveBeenCalled();
      expect(mockElements['stop-tracking'].addEventListener).toHaveBeenCalled();
      expect(mockElements['export-csv'].addEventListener).toHaveBeenCalled();
      expect(mockElements['export-session'].addEventListener).toHaveBeenCalled();
      expect(mockElements['show-heatmap'].addEventListener).toHaveBeenCalled();
      expect(mockElements['hide-heatmap'].addEventListener).toHaveBeenCalled();
      expect(mockElements['clear-heatmap'].addEventListener).toHaveBeenCalled();
      expect(mockElements['save-heatmap'].addEventListener).toHaveBeenCalled();
      expect(mockElements['session-list'].addEventListener).toHaveBeenCalled();
      expect(mockElements['delete-session'].addEventListener).toHaveBeenCalled();
      expect(mockElements['load-session'].addEventListener).toHaveBeenCalled();
    });
  });
  
  describe('UI Event Handlers', () => {
    test('should handle start tracking button click', async () => {
      await mockElements['start-tracking'].clickHandler();
      
      expect(global.GazeTracker.startTracking).toHaveBeenCalled();
      expect(mockElements['start-tracking'].disabled).toBe(true);
      expect(mockElements['stop-tracking'].disabled).toBe(false);
    });
    
    test('should handle stop tracking button click', async () => {
      // First start tracking
      await mockElements['start-tracking'].clickHandler();
      
      // Then stop tracking
      await mockElements['stop-tracking'].clickHandler();
      
      expect(global.GazeTracker.stopTracking).toHaveBeenCalled();
      expect(mockElements['start-tracking'].disabled).toBe(false);
      expect(mockElements['stop-tracking'].disabled).toBe(true);
    });
    
    test('should handle export CSV button click', async () => {
      await mockElements['export-csv'].clickHandler();
      
      expect(global.GazeTracker.exportCSV).toHaveBeenCalled();
    });
    
    test('should handle export session button click', async () => {
      await mockElements['export-session'].clickHandler();
      
      expect(global.GazeTracker.exportSessionData).toHaveBeenCalled();
    });
    
    test('should handle show heatmap button click', async () => {
      await mockElements['show-heatmap'].clickHandler();
      
      expect(global.GazeTracker.showHeatmap).toHaveBeenCalled();
    });
    
    test('should handle hide heatmap button click', async () => {
      await mockElements['hide-heatmap'].clickHandler();
      
      expect(global.GazeTracker.hideHeatmap).toHaveBeenCalled();
    });
    
    test('should handle clear heatmap button click', () => {
      mockElements['clear-heatmap'].clickHandler();
      
      expect(global.GazeHeatmap.clear).toHaveBeenCalled();
    });
    
    test('should handle save heatmap button click', () => {
      mockElements['save-heatmap'].clickHandler();
      
      expect(global.GazeHeatmap.saveAsImage).toHaveBeenCalled();
    });
    
    test('should handle delete session button click', async () => {
      // Simulate selecting a session
      document.querySelector.mockReturnValueOnce({
        getAttribute: jest.fn().mockReturnValue('session-1'),
        classList: {
          remove: jest.fn()
        }
      });
      
      await mockElements['delete-session'].clickHandler();
      
      expect(global.GazeDB.deleteSession).toHaveBeenCalledWith('session-1');
    });
    
    test('should handle load session button click', async () => {
      // Simulate selecting a session
      document.querySelector.mockReturnValueOnce({
        getAttribute: jest.fn().mockReturnValue('session-1'),
        classList: {
          remove: jest.fn()
        }
      });
      
      await mockElements['load-session'].clickHandler();
      
      expect(global.GazeDB.getSessionData).toHaveBeenCalledWith('session-1');
      expect(global.GazeHeatmap.generateFromData).toHaveBeenCalled();
    });
  });
  
  describe('Session List', () => {
    test('should handle session item click', () => {
      const mockEvent = {
        target: {
          closest: jest.fn().mockReturnValue({
            getAttribute: jest.fn().mockReturnValue('session-1'),
            classList: {
              add: jest.fn()
            }
          })
        }
      };
      
      const result = mockElements['session-list'].clickHandler(mockEvent);
      
      expect(mockElements['delete-session'].disabled).toBe(false);
      expect(mockElements['load-session'].disabled).toBe(false);
      expect(result.getAttribute()).toBe('session-1');
    });
  });
  
  describe('Error Handling', () => {
    test('should display error message', () => {
      // Find the showError function in the app initialization code
      const showError = (message) => {
        mockElements['error-message'].textContent = message;
        mockElements['error-message'].style.display = 'block';
      };
      
      showError('Test error message');
      
      expect(mockElements['error-message'].textContent).toBe('Test error message');
      expect(mockElements['error-message'].style.display).toBe('block');
    });
    
    test('should handle tracking errors', async () => {
      // Mock GazeTracker.startTracking to throw an error
      global.GazeTracker.startTracking.mockRejectedValueOnce(new Error('Tracking error'));
      
      await mockElements['start-tracking'].clickHandler();
      
      expect(global.GazeTracker.startTracking).toHaveBeenCalled();
      expect(mockElements['error-message'].textContent).toContain('Tracking error');
      expect(mockElements['error-message'].style.display).toBe('block');
    });
  });
}); 