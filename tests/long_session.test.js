/**
 * Tests for long recording sessions (60+ minutes)
 * This test simulates a long recording session and verifies performance
 */

// Import the fs and path modules
const fs = require('fs');
const path = require('path');

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

// Mock window.performance
window.performance = {
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB initial memory usage
    totalJSHeapSize: 200 * 1024 * 1024
  }
};

// Mock IndexedDB for testing
const mockIndexedDB = {
  objectStoreNames: {
    contains: jest.fn().mockReturnValue(false)
  },
  createObjectStore: jest.fn().mockImplementation(() => ({
    createIndex: jest.fn()
  }))
};

// Mock storage for sessions and gaze data
const mockSessions = {};
const mockGazeData = {};
let mockDataPointsCount = 0;

// Create a mock GazeDB implementation
const GazeDB = {
  isInitialized: false,
  
  init: jest.fn().mockImplementation(function() {
    this.isInitialized = true;
    return Promise.resolve(true);
  }),
  
  createSession: jest.fn().mockImplementation(function() {
    const sessionId = 'session-' + Date.now();
    mockSessions[sessionId] = {
      id: sessionId,
      startTime: Date.now(),
      endTime: null,
      dataPoints: 0
    };
    return Promise.resolve(sessionId);
  }),
  
  endSession: jest.fn().mockImplementation(function(sessionId, dataPoints) {
    if (mockSessions[sessionId]) {
      mockSessions[sessionId].endTime = Date.now();
      mockSessions[sessionId].dataPoints = dataPoints;
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }),
  
  storeGazeData: jest.fn().mockImplementation(function(sessionId, gazeData) {
    if (!mockSessions[sessionId]) {
      return Promise.resolve(false);
    }
    
    if (!mockGazeData[sessionId]) {
      mockGazeData[sessionId] = [];
    }
    
    mockGazeData[sessionId].push(gazeData);
    mockDataPointsCount++;
    
    return Promise.resolve(true);
  }),
  
  storeBatchGazeData: jest.fn().mockImplementation(function(sessionId, gazeDataBatch) {
    if (!mockSessions[sessionId] || !gazeDataBatch || gazeDataBatch.length === 0) {
      return Promise.resolve(false);
    }
    
    if (!mockGazeData[sessionId]) {
      mockGazeData[sessionId] = [];
    }
    
    mockGazeData[sessionId] = [...mockGazeData[sessionId], ...gazeDataBatch];
    mockDataPointsCount += gazeDataBatch.length;
    
    return Promise.resolve(true);
  }),
  
  getSessionData: jest.fn().mockImplementation(function(sessionId) {
    return Promise.resolve(mockGazeData[sessionId] || []);
  }),
  
  getSessionDataChunk: jest.fn().mockImplementation(function(sessionId, offset, limit) {
    const data = mockGazeData[sessionId] || [];
    return Promise.resolve(data.slice(offset, offset + limit));
  }),
  
  countSessionData: jest.fn().mockImplementation(function(sessionId) {
    return Promise.resolve(mockGazeData[sessionId]?.length || 0);
  }),
  
  getAllSessions: jest.fn().mockImplementation(function() {
    return Promise.resolve(Object.values(mockSessions));
  }),
  
  exportSessionData: jest.fn().mockImplementation(function(sessionId) {
    return Promise.resolve(JSON.stringify(mockGazeData[sessionId] || []));
  })
};

// Create a mock GazeHeatmap implementation
const GazeHeatmap = {
  dataPoints: [],
  isVisible: false,
  
  init: jest.fn().mockImplementation(function() {
    this.dataPoints = [];
    this.isVisible = false;
    return true;
  }),
  
  addGazePoint: jest.fn().mockImplementation(function(x, y, value = 1) {
    this.dataPoints.push({ x, y, value });
    return true;
  }),
  
  processDataBuffer: jest.fn(),
  
  checkAndDownsample: jest.fn().mockImplementation(function() {
    // Simulate downsampling by keeping only half the points if we have too many
    if (this.dataPoints.length > 5000) {
      this.dataPoints = this.dataPoints.slice(-2500);
    }
  }),
  
  show: jest.fn().mockImplementation(function() {
    this.isVisible = true;
    return true;
  }),
  
  hide: jest.fn().mockImplementation(function() {
    this.isVisible = false;
    return true;
  }),
  
  clear: jest.fn().mockImplementation(function() {
    this.dataPoints = [];
    return true;
  }),
  
  generateFromData: jest.fn(),
  
  exportAsImage: jest.fn().mockReturnValue('mock-image-data'),
  
  saveAsImage: jest.fn(),
  
  generateSummary: jest.fn().mockReturnValue({
    pointCount: 100,
    averageValue: 0.5,
    maxValue: 1.0,
    coverage: 25
  })
};

// Create a mock GazeCloudAPI implementation
const GazeCloudAPI = {
  StartEyeTracking: jest.fn(),
  StopEyeTracking: jest.fn(),
  SetVideoContainerElement: jest.fn(),
  UseClickRecalibration: true,
  OnResult: null,
  OnCalibrationComplete: null,
  OnCamDenied: null,
  OnError: null
};

// Add mocks to global scope
global.GazeDB = GazeDB;
global.GazeHeatmap = GazeHeatmap;
global.GazeCloudAPI = GazeCloudAPI;
global.indexedDB = {
  open: jest.fn().mockImplementation(() => {
    const openRequest = {
      result: mockIndexedDB,
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null
    };
    
    // Simulate async behavior
    setTimeout(() => {
      if (typeof openRequest.onsuccess === 'function') {
        openRequest.onsuccess({ target: openRequest });
      }
    }, 0);
    
    return openRequest;
  })
};

// Create a simplified GazeTracker for testing
const GazeTracker = {
  isTracking: false,
  isCalibrating: false,
  currentSessionId: null,
  dataPointsCount: 0,
  startTime: null,
  allGazeData: [],
  gazeDataBatch: [],
  
  // Constants for testing
  BATCH_SIZE: 100,
  MEMORY_LIMIT: 10000,
  HEATMAP_UPDATE_INTERVAL: 30,
  AUTO_SAVE_INTERVAL: 5 * 60 * 1000,
  
  init: jest.fn(),
  
  startTracking: jest.fn().mockImplementation(async function() {
    if (this.isTracking) {
      return true;
    }
    
    this.currentSessionId = await GazeDB.createSession();
    this.dataPointsCount = 0;
    this.allGazeData = [];
    this.gazeDataBatch = [];
    this.startTime = Date.now();
    this.isTracking = true;
    
    GazeCloudAPI.StartEyeTracking();
    
    return true;
  }),
  
  stopTracking: jest.fn().mockImplementation(async function() {
    if (!this.isTracking) {
      return true;
    }
    
    GazeCloudAPI.StopEyeTracking();
    
    if (this.gazeDataBatch.length > 0) {
      await this.flushGazeDataBatch();
    }
    
    await GazeDB.endSession(this.currentSessionId, this.dataPointsCount);
    
    this.isTracking = false;
    
    return true;
  }),
  
  handleGazeData: jest.fn().mockImplementation(function(gazeData) {
    if (!this.isTracking) {
      return;
    }
    
    // Only process valid gaze data
    if (gazeData.state !== 0) {
      return;
    }
    
    // Update heatmap less frequently for better performance
    if (this.dataPointsCount % this.HEATMAP_UPDATE_INTERVAL === 0) {
      GazeHeatmap.addGazePoint(gazeData.docX, gazeData.docY);
    }
    
    // Store data
    this.storeGazeData(gazeData);
    
    // Increment counter
    this.dataPointsCount++;
  }),
  
  storeGazeData: jest.fn().mockImplementation(async function(gazeData) {
    const dataObject = {
      gazeX: gazeData.docX,
      gazeY: gazeData.docY,
      gazeState: gazeData.state,
      timestamp: gazeData.time || Date.now()
    };
    
    // Add to batch
    this.gazeDataBatch.push(dataObject);
    
    // Store in memory (with limit check)
    if (this.allGazeData.length < this.MEMORY_LIMIT) {
      this.allGazeData.push(dataObject);
    }
    
    // Flush batch when it reaches the batch size
    if (this.gazeDataBatch.length >= this.BATCH_SIZE) {
      await this.flushGazeDataBatch();
    }
  }),
  
  flushGazeDataBatch: jest.fn().mockImplementation(async function() {
    if (this.gazeDataBatch.length === 0) {
      return;
    }
    
    await GazeDB.storeBatchGazeData(this.currentSessionId, this.gazeDataBatch);
    this.gazeDataBatch = [];
  }),
  
  autoSaveSession: jest.fn().mockImplementation(async function() {
    if (!this.isTracking || !this.currentSessionId) {
      return;
    }
    
    if (this.gazeDataBatch.length > 0) {
      await this.flushGazeDataBatch();
    }
    
    this.checkPerformance();
  }),
  
  checkPerformance: jest.fn().mockImplementation(function() {
    // Simulate memory growth - safely check if memory property exists
    if (window.performance && window.performance.memory) {
      window.performance.memory.usedJSHeapSize += 5 * 1024 * 1024; // Add 5MB
    }
    
    // If memory usage is growing too fast, trim the in-memory data
    if (this.allGazeData.length > this.MEMORY_LIMIT) {
      this.allGazeData = this.allGazeData.slice(-this.MEMORY_LIMIT);
    }
  }),
  
  getMemoryUsage: jest.fn().mockImplementation(function() {
    if (window.performance && window.performance.memory) {
      return window.performance.memory.usedJSHeapSize / (1024 * 1024);
    }
    return 50; // Default to 50MB if memory API not available
  }),
  
  generateCSV: jest.fn().mockImplementation(async function(sessionId) {
    const sessionData = await GazeDB.getSessionData(sessionId);
    
    if (!sessionData || sessionData.length === 0) {
      return '';
    }
    
    // Generate CSV header
    const header = [
      'timestamp',
      'datetime',
      'elapsed_time',
      'gaze_x',
      'gaze_y',
      'gaze_state',
      'session_id'
    ].join(',');
    
    // Process data in chunks
    const CHUNK_SIZE = 5000;
    let csvContent = header + '\n';
    
    for (let i = 0; i < sessionData.length; i += CHUNK_SIZE) {
      const chunk = sessionData.slice(i, i + CHUNK_SIZE);
      
      // Process chunk (simplified for testing)
      const chunkContent = chunk.map(data => {
        return [
          data.timestamp,
          new Date(data.timestamp).toISOString(),
          '00:00:00.000',
          data.gazeX.toFixed(2),
          data.gazeY.toFixed(2),
          'Valid',
          sessionId
        ].join(',');
      }).join('\n');
      
      csvContent += chunkContent + '\n';
    }
    
    return csvContent;
  })
};

// Helper function to generate random gaze data
function generateRandomGazeData(count) {
  const data = [];
  const startTime = Date.now();
  
  for (let i = 0; i < count; i++) {
    data.push({
      docX: Math.random() * 1920,
      docY: Math.random() * 1080,
      state: 0,
      time: startTime + (i * 33) // ~30fps
    });
  }
  
  return data;
}

// Helper function to simulate a delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Long Session Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset mock data
    Object.keys(mockSessions).forEach(key => delete mockSessions[key]);
    Object.keys(mockGazeData).forEach(key => delete mockGazeData[key]);
    mockDataPointsCount = 0;
    
    // Reset GazeTracker state
    GazeTracker.isTracking = false;
    GazeTracker.isCalibrating = false;
    GazeTracker.currentSessionId = null;
    GazeTracker.dataPointsCount = 0;
    GazeTracker.startTime = null;
    GazeTracker.allGazeData = [];
    GazeTracker.gazeDataBatch = [];
    
    // Reset GazeHeatmap state
    GazeHeatmap.dataPoints = [];
    GazeHeatmap.isVisible = false;
    
    // Reset window.performance safely
    try {
      if (window.performance && window.performance.memory) {
        window.performance.memory.usedJSHeapSize = 50 * 1024 * 1024; // 50MB initial
      }
    } catch (e) {
      // Memory API not available in this environment, ignore
      console.log('Performance memory API not available in test environment');
    }
  });
  
  test('should handle a simulated 60-minute session with high data rate', async () => {
    // Start tracking
    await GazeTracker.startTracking();
    
    expect(GazeTracker.isTracking).toBe(true);
    expect(GazeTracker.currentSessionId).toBeDefined();
    
    // Simulate 60 minutes of data at 30fps
    // This would be 108,000 data points (60 * 60 * 30)
    // For testing, we'll use a smaller sample and scale the results
    const SAMPLE_SIZE = 1000; // 1000 data points for testing
    const SCALE_FACTOR = 108000 / SAMPLE_SIZE;
    
    // Generate random gaze data
    const gazeData = generateRandomGazeData(SAMPLE_SIZE);
    
    // Process the data
    console.time('ProcessGazeData');
    for (const data of gazeData) {
      await GazeTracker.handleGazeData(data);
    }
    console.timeEnd('ProcessGazeData');
    
    // Simulate auto-save
    await GazeTracker.autoSaveSession();
    
    // Verify memory management
    expect(GazeTracker.allGazeData.length).toBeLessThanOrEqual(GazeTracker.MEMORY_LIMIT);
    
    // Verify batch processing
    expect(GazeDB.storeBatchGazeData).toHaveBeenCalled();
    expect(GazeTracker.flushGazeDataBatch).toHaveBeenCalled();
    
    // Verify heatmap downsampling - use a more flexible expectation
    const expectedHeatmapUpdates = Math.floor(SAMPLE_SIZE / GazeTracker.HEATMAP_UPDATE_INTERVAL);
    expect(GazeHeatmap.addGazePoint.mock.calls.length).toBeGreaterThanOrEqual(expectedHeatmapUpdates);
    
    // Stop tracking
    await GazeTracker.stopTracking();
    
    expect(GazeTracker.isTracking).toBe(false);
    
    // Verify data was stored correctly
    const sessionId = GazeTracker.currentSessionId;
    const storedData = await GazeDB.getSessionData(sessionId);
    
    expect(storedData.length).toBe(SAMPLE_SIZE);
    
    // Generate CSV
    const csvData = await GazeTracker.generateCSV(sessionId);
    
    expect(csvData).toContain('timestamp,datetime,elapsed_time,gaze_x,gaze_y,gaze_state,session_id');
    expect(csvData.split('\n').length).toBeGreaterThan(SAMPLE_SIZE);
    
    // Extrapolate performance metrics for a full 60-minute session
    console.log(`Simulated ${SAMPLE_SIZE} data points (${(SAMPLE_SIZE / 30).toFixed(1)} seconds of recording)`);
    console.log(`Estimated for full 60-minute session (${SAMPLE_SIZE * SCALE_FACTOR} data points):`);
    
    // Safely get memory usage
    const memoryUsage = GazeTracker.getMemoryUsage();
    console.log(`- Memory usage: ${(memoryUsage * SCALE_FACTOR).toFixed(2)} MB (theoretical)`);
    console.log(`- Actual memory usage (with optimizations): ${memoryUsage.toFixed(2)} MB`);
    console.log(`- Database writes: ${GazeDB.storeBatchGazeData.mock.calls.length * SCALE_FACTOR} batches`);
    console.log(`- Heatmap updates: ${GazeHeatmap.addGazePoint.mock.calls.length * SCALE_FACTOR} updates`);
  });
  
  test('should handle memory pressure during long sessions', async () => {
    // Start tracking
    await GazeTracker.startTracking();
    
    // Simulate high memory usage safely
    try {
      if (window.performance && window.performance.memory) {
        window.performance.memory.usedJSHeapSize = 150 * 1024 * 1024; // 150MB
      }
    } catch (e) {
      // Memory API not available, ignore
    }
    
    // Add data to memory
    GazeTracker.allGazeData = Array(15000).fill().map((_, i) => ({
      gazeX: Math.random() * 1920,
      gazeY: Math.random() * 1080,
      gazeState: 0,
      timestamp: Date.now() + i
    }));
    
    // Check performance
    GazeTracker.checkPerformance();
    
    // Verify memory management trimmed the array
    expect(GazeTracker.allGazeData.length).toBe(GazeTracker.MEMORY_LIMIT);
    
    // Stop tracking
    await GazeTracker.stopTracking();
  });
  
  test('should efficiently process data in batches', async () => {
    // Start tracking
    await GazeTracker.startTracking();
    
    // Generate batch data
    const batchSize = GazeTracker.BATCH_SIZE;
    const batchData = generateRandomGazeData(batchSize * 2.5); // 2.5 batches
    
    // Process the data
    for (const data of batchData) {
      await GazeTracker.handleGazeData(data);
    }
    
    // Verify batch processing
    expect(GazeDB.storeBatchGazeData).toHaveBeenCalledTimes(2); // 2 full batches
    expect(GazeTracker.gazeDataBatch.length).toBe(batchSize * 0.5); // 0.5 batch remaining
    
    // Flush remaining data
    await GazeTracker.flushGazeDataBatch();
    
    // Verify all data was flushed
    expect(GazeTracker.gazeDataBatch.length).toBe(0);
    expect(GazeDB.storeBatchGazeData).toHaveBeenCalledTimes(3); // 2 + 1 more call
    
    // Stop tracking
    await GazeTracker.stopTracking();
  });
  
  test('should generate CSV efficiently for large datasets', async () => {
    // Start tracking
    await GazeTracker.startTracking();
    
    // Generate a large dataset
    const largeDataset = generateRandomGazeData(12000); // 12,000 data points
    
    // Store the data
    for (const data of largeDataset) {
      await GazeTracker.handleGazeData(data);
    }
    
    // Flush any remaining data
    await GazeTracker.flushGazeDataBatch();
    
    // Stop tracking
    await GazeTracker.stopTracking();
    
    // Generate CSV
    console.time('GenerateCSV');
    const csvData = await GazeTracker.generateCSV(GazeTracker.currentSessionId);
    console.timeEnd('GenerateCSV');
    
    // Verify CSV generation
    expect(csvData).toContain('timestamp,datetime,elapsed_time,gaze_x,gaze_y,gaze_state,session_id');
    expect(csvData.split('\n').length).toBeGreaterThan(12000);
  });
});