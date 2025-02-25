/**
 * Tests for heatmap.js module
 */

// Import the fs and path modules
const fs = require('fs');
const path = require('path');

// Read the heatmap.js file
const heatmapJsPath = path.resolve(__dirname, '../js/heatmap.js');
const heatmapJsContent = fs.readFileSync(heatmapJsPath, 'utf8');

// Extract the GazeHeatmap module using regex
const gazeHeatmapMatch = heatmapJsContent.match(/const GazeHeatmap = \(\(\) => {([\s\S]*?)\}\)\(\);/);
const gazeHeatmapBody = gazeHeatmapMatch ? gazeHeatmapMatch[1] : '';

// Create a function to evaluate the GazeHeatmap module
const evaluateGazeHeatmap = () => {
  // Create a new function that returns the GazeHeatmap object
  const GazeHeatmapFunction = new Function(`
    const GazeHeatmap = (() => {${gazeHeatmapBody}})();
    return GazeHeatmap;
  `);
  
  // Execute the function to get the GazeHeatmap object
  return GazeHeatmapFunction();
};

// Mock DOM elements
const mockElements = {
  'heatmap-container': {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    style: {
      position: '',
      width: '',
      height: '',
      zIndex: ''
    },
    getBoundingClientRect: jest.fn().mockReturnValue({
      width: 1000,
      height: 800
    }),
    children: []
  },
  'heatmap-canvas': {
    width: 1000,
    height: 800,
    style: {
      position: '',
      top: '',
      left: '',
      width: '',
      height: '',
      zIndex: ''
    },
    getContext: jest.fn().mockReturnValue({
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      fillStyle: '',
      globalAlpha: 1,
      drawImage: jest.fn(),
      createRadialGradient: jest.fn().mockReturnValue({
        addColorStop: jest.fn()
      }),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      getImageData: jest.fn().mockReturnValue({
        data: new Uint8ClampedArray(1000 * 800 * 4),
        width: 1000,
        height: 800
      }),
      putImageData: jest.fn()
    }),
    toDataURL: jest.fn().mockReturnValue('mock-data-url')
  }
};

// Mock document.getElementById
document.getElementById = jest.fn().mockImplementation((id) => {
  return mockElements[id] || { style: {}, appendChild: jest.fn() };
});

// Mock document.createElement
document.createElement = jest.fn().mockImplementation((tag) => {
  if (tag === 'canvas') {
    return mockElements['heatmap-canvas'];
  }
  return {
    style: {},
    appendChild: jest.fn(),
    removeChild: jest.fn()
  };
});

// Get the GazeHeatmap object
let GazeHeatmap;

describe('Heatmap Module Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Get a fresh instance of GazeHeatmap for each test
    GazeHeatmap = evaluateGazeHeatmap();
  });
  
  describe('init', () => {
    test('should initialize the heatmap', () => {
      GazeHeatmap.init();
      
      expect(document.createElement).toHaveBeenCalledWith('canvas');
      expect(mockElements['heatmap-canvas'].width).toBe(1000);
      expect(mockElements['heatmap-canvas'].height).toBe(800);
      expect(mockElements['heatmap-canvas'].style.position).toBe('absolute');
    });
    
    test('should use provided container element', () => {
      const containerElement = {
        appendChild: jest.fn(),
        getBoundingClientRect: jest.fn().mockReturnValue({
          width: 800,
          height: 600
        })
      };
      
      GazeHeatmap.init(containerElement);
      
      expect(containerElement.appendChild).toHaveBeenCalled();
      expect(mockElements['heatmap-canvas'].width).toBe(800);
      expect(mockElements['heatmap-canvas'].height).toBe(600);
    });
  });
  
  describe('addGazePoint', () => {
    test('should add a gaze point to the heatmap', () => {
      // Initialize the heatmap first
      GazeHeatmap.init();
      
      GazeHeatmap.addGazePoint(500, 400);
      
      const context = mockElements['heatmap-canvas'].getContext();
      expect(context.globalAlpha).toBe(0.2); // Default opacity
      expect(context.beginPath).toHaveBeenCalled();
      expect(context.arc).toHaveBeenCalledWith(500, 400, 30, 0, Math.PI * 2, true);
      expect(context.fill).toHaveBeenCalled();
    });
    
    test('should use custom radius and opacity if provided', () => {
      // Initialize the heatmap first
      GazeHeatmap.init();
      
      GazeHeatmap.addGazePoint(500, 400, 50, 0.5);
      
      const context = mockElements['heatmap-canvas'].getContext();
      expect(context.globalAlpha).toBe(0.5);
      expect(context.arc).toHaveBeenCalledWith(500, 400, 50, 0, Math.PI * 2, true);
    });
    
    test('should not add point if heatmap is not initialized', () => {
      // Don't initialize the heatmap
      
      GazeHeatmap.addGazePoint(500, 400);
      
      expect(mockElements['heatmap-canvas'].getContext).not.toHaveBeenCalled();
    });
  });
  
  describe('show', () => {
    test('should show the heatmap', () => {
      // Initialize the heatmap first
      GazeHeatmap.init();
      
      GazeHeatmap.show();
      
      expect(mockElements['heatmap-canvas'].style.display).toBe('block');
    });
    
    test('should not show if heatmap is not initialized', () => {
      // Don't initialize the heatmap
      
      GazeHeatmap.show();
      
      expect(mockElements['heatmap-canvas'].style.display).not.toBe('block');
    });
  });
  
  describe('hide', () => {
    test('should hide the heatmap', () => {
      // Initialize the heatmap first
      GazeHeatmap.init();
      
      GazeHeatmap.hide();
      
      expect(mockElements['heatmap-canvas'].style.display).toBe('none');
    });
    
    test('should not hide if heatmap is not initialized', () => {
      // Don't initialize the heatmap
      
      GazeHeatmap.hide();
      
      expect(mockElements['heatmap-canvas'].style.display).not.toBe('none');
    });
  });
  
  describe('clear', () => {
    test('should clear the heatmap', () => {
      // Initialize the heatmap first
      GazeHeatmap.init();
      
      GazeHeatmap.clear();
      
      const context = mockElements['heatmap-canvas'].getContext();
      expect(context.clearRect).toHaveBeenCalledWith(0, 0, 1000, 800);
    });
    
    test('should not clear if heatmap is not initialized', () => {
      // Don't initialize the heatmap
      
      GazeHeatmap.clear();
      
      expect(mockElements['heatmap-canvas'].getContext).not.toHaveBeenCalled();
    });
  });
  
  describe('exportAsImage', () => {
    test('should export the heatmap as an image', () => {
      // Initialize the heatmap first
      GazeHeatmap.init();
      
      const imageData = GazeHeatmap.exportAsImage();
      
      expect(mockElements['heatmap-canvas'].toDataURL).toHaveBeenCalledWith('image/png');
      expect(imageData).toBe('mock-data-url');
    });
    
    test('should return null if heatmap is not initialized', () => {
      // Don't initialize the heatmap
      
      const imageData = GazeHeatmap.exportAsImage();
      
      expect(imageData).toBeNull();
    });
  });
  
  describe('saveAsImage', () => {
    test('should create a download link for the heatmap image', () => {
      // Initialize the heatmap first
      GazeHeatmap.init();
      
      GazeHeatmap.saveAsImage('heatmap.png');
      
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockElements['heatmap-canvas'].toDataURL).toHaveBeenCalledWith('image/png');
    });
    
    test('should not save if heatmap is not initialized', () => {
      // Don't initialize the heatmap
      
      GazeHeatmap.saveAsImage('heatmap.png');
      
      expect(document.createElement).not.toHaveBeenCalledWith('a');
    });
  });
  
  describe('generateFromData', () => {
    test('should generate heatmap from gaze data', () => {
      // Initialize the heatmap first
      GazeHeatmap.init();
      
      const gazeData = [
        { gazeX: 100, gazeY: 200, gazeState: 0 },
        { gazeX: 300, gazeY: 400, gazeState: 0 },
        { gazeX: 500, gazeY: 600, gazeState: 0 }
      ];
      
      GazeHeatmap.generateFromData(gazeData);
      
      const context = mockElements['heatmap-canvas'].getContext();
      expect(context.beginPath).toHaveBeenCalledTimes(3);
      expect(context.arc).toHaveBeenCalledTimes(3);
      expect(context.fill).toHaveBeenCalledTimes(3);
    });
    
    test('should filter out invalid gaze data', () => {
      // Initialize the heatmap first
      GazeHeatmap.init();
      
      const gazeData = [
        { gazeX: 100, gazeY: 200, gazeState: 0 }, // Valid
        { gazeX: 300, gazeY: 400, gazeState: 1 }, // Invalid
        { gazeX: 500, gazeY: 600, gazeState: 0 }  // Valid
      ];
      
      GazeHeatmap.generateFromData(gazeData);
      
      const context = mockElements['heatmap-canvas'].getContext();
      expect(context.beginPath).toHaveBeenCalledTimes(2);
      expect(context.arc).toHaveBeenCalledTimes(2);
      expect(context.fill).toHaveBeenCalledTimes(2);
    });
    
    test('should not generate if heatmap is not initialized', () => {
      // Don't initialize the heatmap
      
      const gazeData = [
        { gazeX: 100, gazeY: 200, gazeState: 0 }
      ];
      
      GazeHeatmap.generateFromData(gazeData);
      
      expect(mockElements['heatmap-canvas'].getContext).not.toHaveBeenCalled();
    });
  });
  
  describe('generateSummary', () => {
    test('should generate summary statistics from heatmap', () => {
      // Initialize the heatmap first
      GazeHeatmap.init();
      
      // Add some gaze points
      GazeHeatmap.addGazePoint(100, 200);
      GazeHeatmap.addGazePoint(300, 400);
      
      const summary = GazeHeatmap.generateSummary();
      
      expect(summary).toHaveProperty('pointCount');
      expect(summary).toHaveProperty('averageValue');
      expect(summary).toHaveProperty('maxValue');
      expect(summary).toHaveProperty('coverage');
    });
    
    test('should return default summary if heatmap is not initialized', () => {
      // Don't initialize the heatmap
      
      const summary = GazeHeatmap.generateSummary();
      
      expect(summary).toEqual({
        pointCount: 0,
        averageValue: 0,
        maxValue: 0,
        coverage: 0
      });
    });
  });
}); 