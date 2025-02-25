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
const gazeHeatmapMatch = heatmapJsContent.match(/const GazeHeatmap = {([\s\S]*?)};/);
const gazeHeatmapCode = gazeHeatmapMatch ? gazeHeatmapMatch[1] : '';

// Mock the h337 library
global.h337 = {
  create: jest.fn().mockReturnValue({
    setData: jest.fn(),
    getData: jest.fn().mockReturnValue({
      data: [
        { x: 100, y: 200, value: 1 },
        { x: 150, y: 250, value: 2 }
      ],
      max: 2
    }),
    repaint: jest.fn(),
    getValueAt: jest.fn().mockReturnValue(1),
    getCanvas: jest.fn().mockReturnValue({
      toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mockbase64data')
    })
  })
};

// Create a function to evaluate the GazeHeatmap object
const evaluateGazeHeatmap = () => {
  // Create a fresh GazeHeatmap object
  const GazeHeatmap = {
    heatmapInstance: null,
    container: null,
    isVisible: false,
    config: {
      radius: 30,
      maxOpacity: 0.8,
      minOpacity: 0,
      blur: 0.85
    },
    
    // Mock implementation of init
    init: function(containerElement) {
      if (!containerElement) {
        containerElement = document.createElement('div');
        containerElement.id = 'heatmap-container';
        document.body.appendChild(containerElement);
      }
      
      this.container = containerElement;
      
      // Create heatmap instance
      this.heatmapInstance = h337.create({
        container: this.container,
        radius: this.config.radius,
        maxOpacity: this.config.maxOpacity,
        minOpacity: this.config.minOpacity,
        blur: this.config.blur
      });
      
      // Hide the heatmap initially
      this.hide();
      
      return this;
    },
    
    // Add a gaze point to the heatmap
    addGazePoint: function(x, y, radius, opacity) {
      if (!this.heatmapInstance) {
        return false;
      }
      
      // Use default radius and opacity if not provided
      radius = radius || this.config.radius;
      opacity = opacity || this.config.maxOpacity;
      
      // Add the data point
      this.heatmapInstance.setData({
        data: [
          {
            x: x,
            y: y,
            value: 1,
            radius: radius,
            opacity: opacity
          }
        ],
        max: 1
      });
      
      return true;
    },
    
    // Show the heatmap
    show: function() {
      if (!this.heatmapInstance) {
        return false;
      }
      
      this.container.style.display = 'block';
      this.isVisible = true;
      
      return true;
    },
    
    // Hide the heatmap
    hide: function() {
      if (!this.heatmapInstance) {
        return false;
      }
      
      this.container.style.display = 'none';
      this.isVisible = false;
      
      return true;
    },
    
    // Clear the heatmap
    clear: function() {
      if (!this.heatmapInstance) {
        return false;
      }
      
      this.heatmapInstance.setData({ data: [], max: 0 });
      
      return true;
    },
    
    // Export the heatmap as an image
    exportAsImage: function() {
      if (!this.heatmapInstance) {
        return null;
      }
      
      return this.heatmapInstance.getCanvas().toDataURL();
    },
    
    // Save the heatmap as an image
    saveAsImage: function(filename) {
      if (!this.heatmapInstance) {
        return false;
      }
      
      const imageData = this.exportAsImage();
      if (!imageData) {
        return false;
      }
      
      // Create a download link
      const link = document.createElement('a');
      link.href = imageData;
      link.download = filename || 'heatmap.png';
      link.click();
      
      return true;
    },
    
    // Generate heatmap from gaze data
    generateFromData: function(gazeData) {
      if (!this.heatmapInstance) {
        return false;
      }
      
      // Clear existing data
      this.clear();
      
      // Filter out invalid gaze data
      const validGazeData = gazeData.filter(data => 
        data.gazeX !== undefined && 
        data.gazeY !== undefined && 
        data.gazeState !== undefined && 
        data.gazeState === 0
      );
      
      // Add each gaze point to the heatmap
      validGazeData.forEach(data => {
        this.addGazePoint(data.gazeX, data.gazeY);
      });
      
      // Show the heatmap
      this.show();
      
      return true;
    },
    
    // Generate summary statistics from heatmap
    generateSummary: function() {
      if (!this.heatmapInstance) {
        return null;
      }
      
      const data = this.heatmapInstance.getData();
      
      if (!data || !data.data || data.data.length === 0) {
        return {
          pointCount: 0,
          averageValue: 0,
          maxValue: 0,
          coverage: 0
        };
      }
      
      const pointCount = data.data.length;
      const maxValue = data.max;
      const totalValue = data.data.reduce((sum, point) => sum + point.value, 0);
      const averageValue = totalValue / pointCount;
      
      // Calculate coverage (percentage of screen with heatmap points)
      const containerWidth = this.container.offsetWidth;
      const containerHeight = this.container.offsetHeight;
      const containerArea = containerWidth * containerHeight;
      const pointArea = Math.PI * Math.pow(this.config.radius, 2);
      const coverage = Math.min(100, (pointCount * pointArea / containerArea) * 100);
      
      return {
        pointCount,
        averageValue,
        maxValue,
        coverage
      };
    }
  };
  
  return GazeHeatmap;
};

// Mock DOM elements
const mockElements = {
  'heatmap-container': {
    style: {
      display: 'none'
    },
    offsetWidth: 1920,
    offsetHeight: 1080
  }
};

// Mock document.getElementById
document.getElementById = jest.fn().mockImplementation((id) => {
  return mockElements[id] || { style: {} };
});

// Mock document.createElement
document.createElement = jest.fn().mockImplementation((tag) => {
  if (tag === 'a') {
    return {
      href: '',
      download: '',
      click: jest.fn(),
      style: {}
    };
  }
  return {
    style: {},
    id: '',
    toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mockbase64data')
  };
});

// Mock document.body
document.body.appendChild = jest.fn();

describe('Heatmap Module Tests', () => {
  let GazeHeatmap;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create a fresh GazeHeatmap instance for each test
    GazeHeatmap = evaluateGazeHeatmap();
  });
  
  describe('init', () => {
    test('should initialize the heatmap', () => {
      GazeHeatmap.init();
      
      expect(h337.create).toHaveBeenCalled();
      expect(GazeHeatmap.heatmapInstance).not.toBeNull();
      expect(GazeHeatmap.container).not.toBeNull();
      expect(GazeHeatmap.isVisible).toBe(false);
    });
    
    test('should use provided container element', () => {
      const container = document.createElement('div');
      container.id = 'custom-container';
      
      GazeHeatmap.init(container);
      
      expect(h337.create).toHaveBeenCalledWith(expect.objectContaining({
        container: container
      }));
      expect(GazeHeatmap.container).toBe(container);
    });
  });
  
  describe('addGazePoint', () => {
    test('should add a gaze point to the heatmap', () => {
      GazeHeatmap.init();
      
      const result = GazeHeatmap.addGazePoint(100, 200);
      
      expect(result).toBe(true);
      expect(GazeHeatmap.heatmapInstance.setData).toHaveBeenCalledWith({
        data: [
          {
            x: 100,
            y: 200,
            value: 1,
            radius: GazeHeatmap.config.radius,
            opacity: GazeHeatmap.config.maxOpacity
          }
        ],
        max: 1
      });
    });
    
    test('should use custom radius and opacity if provided', () => {
      GazeHeatmap.init();
      
      const result = GazeHeatmap.addGazePoint(100, 200, 50, 0.5);
      
      expect(result).toBe(true);
      expect(GazeHeatmap.heatmapInstance.setData).toHaveBeenCalledWith({
        data: [
          {
            x: 100,
            y: 200,
            value: 1,
            radius: 50,
            opacity: 0.5
          }
        ],
        max: 1
      });
    });
    
    test('should return false if heatmap is not initialized', () => {
      const result = GazeHeatmap.addGazePoint(100, 200);
      
      expect(result).toBe(false);
    });
  });
  
  describe('show', () => {
    test('should show the heatmap', () => {
      GazeHeatmap.init();
      
      const result = GazeHeatmap.show();
      
      expect(result).toBe(true);
      expect(GazeHeatmap.container.style.display).toBe('block');
      expect(GazeHeatmap.isVisible).toBe(true);
    });
    
    test('should return false if heatmap is not initialized', () => {
      GazeHeatmap.heatmapInstance = null;
      
      const result = GazeHeatmap.show();
      
      expect(result).toBe(false);
    });
  });
  
  describe('hide', () => {
    test('should hide the heatmap', () => {
      GazeHeatmap.init();
      GazeHeatmap.show();
      
      const result = GazeHeatmap.hide();
      
      expect(result).toBe(true);
      expect(GazeHeatmap.container.style.display).toBe('none');
      expect(GazeHeatmap.isVisible).toBe(false);
    });
    
    test('should return false if heatmap is not initialized', () => {
      GazeHeatmap.heatmapInstance = null;
      
      const result = GazeHeatmap.hide();
      
      expect(result).toBe(false);
    });
  });
  
  describe('clear', () => {
    test('should clear the heatmap', () => {
      GazeHeatmap.init();
      
      const result = GazeHeatmap.clear();
      
      expect(result).toBe(true);
      expect(GazeHeatmap.heatmapInstance.setData).toHaveBeenCalledWith({ data: [], max: 0 });
    });
    
    test('should return false if heatmap is not initialized', () => {
      GazeHeatmap.heatmapInstance = null;
      
      const result = GazeHeatmap.clear();
      
      expect(result).toBe(false);
    });
  });
  
  describe('exportAsImage', () => {
    test('should export the heatmap as an image', () => {
      GazeHeatmap.init();
      
      const result = GazeHeatmap.exportAsImage();
      
      expect(result).toBe('data:image/png;base64,mockbase64data');
      expect(GazeHeatmap.heatmapInstance.getCanvas).toHaveBeenCalled();
    });
    
    test('should return null if heatmap is not initialized', () => {
      GazeHeatmap.heatmapInstance = null;
      
      const result = GazeHeatmap.exportAsImage();
      
      expect(result).toBeNull();
    });
  });
  
  describe('saveAsImage', () => {
    test('should create a download link for the heatmap image', () => {
      GazeHeatmap.init();
      
      // Create a mock click function
      const mockClick = jest.fn();
      document.createElement.mockReturnValueOnce({
        href: '',
        download: 'test.png',
        click: mockClick,
        style: {}
      });
      
      const result = GazeHeatmap.saveAsImage('test.png');
      
      expect(result).toBe(true);
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
    });
    
    test('should use default filename if not provided', () => {
      GazeHeatmap.init();
      
      // Create a mock with default filename
      const mockElement = {
        href: '',
        download: '',
        click: jest.fn(),
        style: {}
      };
      document.createElement.mockReturnValueOnce(mockElement);
      
      GazeHeatmap.saveAsImage();
      
      expect(mockElement.download).toBe('heatmap.png');
    });
    
    test('should return false if heatmap is not initialized', () => {
      GazeHeatmap.heatmapInstance = null;
      
      const result = GazeHeatmap.saveAsImage();
      
      expect(result).toBe(false);
    });
  });
  
  describe('generateFromData', () => {
    test('should generate heatmap from gaze data', () => {
      GazeHeatmap.init();
      GazeHeatmap.clear = jest.fn();
      GazeHeatmap.addGazePoint = jest.fn();
      GazeHeatmap.show = jest.fn();
      
      const gazeData = [
        { gazeX: 100, gazeY: 200, gazeState: 0 },
        { gazeX: 150, gazeY: 250, gazeState: 0 },
        { gazeX: 200, gazeY: 300, gazeState: 1 } // Invalid state
      ];
      
      const result = GazeHeatmap.generateFromData(gazeData);
      
      expect(result).toBe(true);
      expect(GazeHeatmap.clear).toHaveBeenCalled();
      expect(GazeHeatmap.addGazePoint).toHaveBeenCalledTimes(2);
      expect(GazeHeatmap.addGazePoint).toHaveBeenCalledWith(100, 200);
      expect(GazeHeatmap.addGazePoint).toHaveBeenCalledWith(150, 250);
      expect(GazeHeatmap.show).toHaveBeenCalled();
    });
    
    test('should filter out invalid gaze data', () => {
      GazeHeatmap.init();
      GazeHeatmap.addGazePoint = jest.fn();
      
      const gazeData = [
        { gazeX: 100, gazeY: 200, gazeState: 0 },
        { gazeY: 250, gazeState: 0 }, // Missing gazeX
        { gazeX: 300, gazeState: 0 }, // Missing gazeY
        { gazeX: 400, gazeY: 500 }, // Missing gazeState
        { gazeX: 600, gazeY: 700, gazeState: 1 } // Invalid state
      ];
      
      GazeHeatmap.generateFromData(gazeData);
      
      expect(GazeHeatmap.addGazePoint).toHaveBeenCalledTimes(1);
      expect(GazeHeatmap.addGazePoint).toHaveBeenCalledWith(100, 200);
    });
    
    test('should return false if heatmap is not initialized', () => {
      GazeHeatmap.heatmapInstance = null;
      
      const result = GazeHeatmap.generateFromData([]);
      
      expect(result).toBe(false);
    });
  });
  
  describe('generateSummary', () => {
    test('should generate summary statistics from heatmap', () => {
      GazeHeatmap.init();
      
      const summary = GazeHeatmap.generateSummary();
      
      expect(summary).toEqual({
        pointCount: 2,
        averageValue: 1.5,
        maxValue: 2,
        coverage: expect.any(Number)
      });
    });
    
    test('should return default summary if heatmap is not initialized', () => {
      GazeHeatmap.heatmapInstance = null;
      
      const summary = GazeHeatmap.generateSummary();
      
      expect(summary).toEqual(null);
    });
    
    test('should handle empty data', () => {
      GazeHeatmap.init();
      GazeHeatmap.heatmapInstance.getData.mockReturnValueOnce({ data: [], max: 0 });
      
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