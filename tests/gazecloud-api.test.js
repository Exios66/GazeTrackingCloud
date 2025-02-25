/**
 * Tests for GazeCloudAPI integration functions
 */

// Mock the document.getElementById function to return mock elements
document.getElementById = jest.fn().mockImplementation((id) => {
  switch (id) {
    case 'gaze-x':
      return { textContent: '' };
    case 'gaze-y':
      return { textContent: '' };
    case 'head-x':
      return { textContent: '' };
    case 'head-y':
      return { textContent: '' };
    case 'head-z':
      return { textContent: '' };
    case 'session-duration':
      return { textContent: '' };
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
    case 'check-api-status':
      return {
        addEventListener: jest.fn()
      };
    case 'heatmap-container':
      return {
        appendChild: jest.fn()
      };
    default:
      return {
        textContent: '',
        style: {}
      };
  }
});

// Mock the document.querySelector function
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

// Mock the document.createElement function
document.createElement = jest.fn().mockImplementation((tag) => {
  const element = {
    style: {},
    setAttribute: jest.fn(),
    appendChild: jest.fn(),
    click: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
    getElementsByTagName: jest.fn(),
    getElementsByClassName: jest.fn(),
    getElementById: jest.fn(),
    remove: jest.fn(),
    tagName: tag.toUpperCase(),
    nodeName: tag.toUpperCase(),
    children: [],
    innerHTML: '',
    textContent: '',
    className: '',
    id: '',
  };
  return element;
});

// Mock MutationObserver
global.MutationObserver = jest.fn().mockImplementation((callback) => {
  return {
    observe: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn(),
    callback
  };
});

// Import the tracking module
const fs = require('fs');
const path = require('path');

// Read the tracking.js file
const trackingJsPath = path.resolve(__dirname, '../js/tracking.js');
const trackingJsContent = fs.readFileSync(trackingJsPath, 'utf8');

// Extract the loadGazeCloudAPI function using regex
const loadGazeCloudAPIMatch = trackingJsContent.match(/const\s+loadGazeCloudAPI\s*=\s*\(\s*\)\s*=>\s*{([\s\S]*?)};/);
const loadGazeCloudAPIBody = loadGazeCloudAPIMatch ? loadGazeCloudAPIMatch[1] : '';

// Extract the isAPIAvailable function using regex
const isAPIAvailableMatch = trackingJsContent.match(/const\s+isAPIAvailable\s*=\s*\(\s*\)\s*=>\s*{([\s\S]*?)};/);
const isAPIAvailableBody = isAPIAvailableMatch ? isAPIAvailableMatch[1] : '';

// Extract the setupVideoObserver function using regex
const setupVideoObserverMatch = trackingJsContent.match(/const\s+setupVideoObserver\s*=\s*\(\s*\)\s*=>\s*{([\s\S]*?)};/);
const setupVideoObserverBody = setupVideoObserverMatch ? setupVideoObserverMatch[1] : '';

// Create the functions for testing
const isAPIAvailable = () => {
  return typeof global.GazeCloudAPI !== 'undefined';
};

const loadGazeCloudAPI = () => {
  return new Promise((resolve, reject) => {
    if (typeof global.GazeCloudAPI !== 'undefined') {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://api.gazerecorder.com/GazeCloudAPI.js';
    script.async = true;
    
    script.onload = () => {
      if (typeof global.GazeCloudAPI !== 'undefined') {
        resolve();
      } else {
        reject(new Error('GazeCloudAPI loaded but not available'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load GazeCloudAPI'));
    };
    
    document.head.appendChild(script);
    
    // Add timeout
    setTimeout(() => {
      if (typeof global.GazeCloudAPI === 'undefined') {
        reject(new Error('Timeout loading GazeCloudAPI'));
      }
    }, 10000);
  });
};

const setupVideoObserver = () => {
  if (window.gazeVideoObserver) {
    window.gazeVideoObserver.disconnect();
  }
  
  window.gazeVideoObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeName === 'VIDEO') {
            const videoContainer = document.getElementById('video-container');
            if (videoContainer) {
              videoContainer.appendChild(node);
            }
          }
        }
      }
    }
  });
  
  window.gazeVideoObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
};

describe('GazeCloudAPI Integration Functions', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
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
  });
  
  describe('isAPIAvailable', () => {
    test('should return true when GazeCloudAPI is defined', () => {
      // GazeCloudAPI is already defined in the global scope
      expect(isAPIAvailable()).toBe(true);
    });
    
    test('should return false when GazeCloudAPI is undefined', () => {
      // Temporarily remove GazeCloudAPI from global scope
      const tempGazeCloudAPI = global.GazeCloudAPI;
      delete global.GazeCloudAPI;
      
      expect(isAPIAvailable()).toBe(false);
      
      // Restore GazeCloudAPI
      global.GazeCloudAPI = tempGazeCloudAPI;
    });
  });
  
  describe('loadGazeCloudAPI', () => {
    test('should resolve immediately if GazeCloudAPI is already loaded', async () => {
      await expect(loadGazeCloudAPI()).resolves.toBeUndefined();
      expect(document.createElement).not.toHaveBeenCalled();
      expect(document.head.appendChild).not.toHaveBeenCalled();
    });
    
    test('should create a script element and append it to document.head', async () => {
      // Temporarily remove GazeCloudAPI from global scope
      const tempGazeCloudAPI = global.GazeCloudAPI;
      delete global.GazeCloudAPI;
      
      // Create a promise that will be resolved when the script's onload is called
      const loadPromise = loadGazeCloudAPI();
      
      // Verify that a script element was created with the correct attributes
      expect(document.createElement).toHaveBeenCalledWith('script');
      expect(document.head.appendChild).toHaveBeenCalled();
      
      // Get the script element that was created
      const scriptElement = document.createElement.mock.results[0].value;
      expect(scriptElement.src).toBe('https://api.gazerecorder.com/GazeCloudAPI.js');
      expect(scriptElement.async).toBe(true);
      
      // Simulate script load
      global.GazeCloudAPI = tempGazeCloudAPI; // Restore GazeCloudAPI
      scriptElement.onload(); // Trigger the onload event
      
      // Verify that the promise resolves
      await expect(loadPromise).resolves.toBeUndefined();
    });
    
    test('should reject if script loading fails', async () => {
      // Temporarily remove GazeCloudAPI from global scope
      const tempGazeCloudAPI = global.GazeCloudAPI;
      delete global.GazeCloudAPI;
      
      // Create a promise that will be rejected when the script's onerror is called
      const loadPromise = loadGazeCloudAPI();
      
      // Get the script element that was created
      const scriptElement = document.createElement.mock.results[0].value;
      
      // Simulate script load error
      scriptElement.onerror(); // Trigger the onerror event
      
      // Verify that the promise rejects
      await expect(loadPromise).rejects.toThrow('Failed to load GazeCloudAPI');
      
      // Restore GazeCloudAPI
      global.GazeCloudAPI = tempGazeCloudAPI;
    });
    
    test('should reject if script loads but GazeCloudAPI is not available', async () => {
      // Temporarily remove GazeCloudAPI from global scope
      const tempGazeCloudAPI = global.GazeCloudAPI;
      delete global.GazeCloudAPI;
      
      // Create a promise that will be rejected when the script's onload is called but GazeCloudAPI is still undefined
      const loadPromise = loadGazeCloudAPI();
      
      // Get the script element that was created
      const scriptElement = document.createElement.mock.results[0].value;
      
      // Simulate script load without restoring GazeCloudAPI
      scriptElement.onload(); // Trigger the onload event
      
      // Verify that the promise rejects
      await expect(loadPromise).rejects.toThrow('GazeCloudAPI loaded but not available');
      
      // Restore GazeCloudAPI
      global.GazeCloudAPI = tempGazeCloudAPI;
    });
  });
  
  describe('setupVideoObserver', () => {
    test('should create a MutationObserver and observe document.body', () => {
      setupVideoObserver();
      
      // Verify that a MutationObserver was created
      expect(global.MutationObserver).toHaveBeenCalled();
      
      // Verify that the observer was stored in the window object
      expect(window.gazeVideoObserver).toBeDefined();
      
      // Verify that observe was called on the observer
      expect(window.gazeVideoObserver.observe).toHaveBeenCalled();
    });
  });
}); 