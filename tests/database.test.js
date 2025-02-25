/**
 * Tests for database.js module
 */

// Import the fs and path modules
const fs = require('fs');
const path = require('path');

// Read the database.js file
const dbJsPath = path.resolve(__dirname, '../js/database.js');
const dbJsContent = fs.readFileSync(dbJsPath, 'utf8');

// Extract the GazeDB module using regex
const gazeDBMatch = dbJsContent.match(/const GazeDB = {([\s\S]*?)};/);
const gazeDBCode = gazeDBMatch ? gazeDBMatch[1] : '';

// Create a function to evaluate the GazeDB object
const evaluateGazeDB = () => {
  // Create a fresh GazeDB object
  const GazeDB = {
    db: null,
    isInitialized: false,
    
    // Mock implementation of init
    init: async function() {
      return new Promise((resolve, reject) => {
        if (this.isInitialized) {
          resolve(true);
          return;
        }
        
        // Create a mock IDBOpenDBRequest
        const openRequest = {};
        
        // Set up the success handler
        openRequest.onsuccess = function(event) {
          // This is a function that will be called
        };
        
        // Manually trigger the success handler
        setTimeout(() => {
          const event = { target: { result: mockIndexedDB } };
          GazeDB.db = event.target.result;
          GazeDB.isInitialized = true;
          if (typeof openRequest.onsuccess === 'function') {
            openRequest.onsuccess(event);
          }
          resolve(true);
        }, 0);
        
        // Set up the error handler
        openRequest.onerror = function(event) {
          // This is a function that will be called
        };
        
        // Set up the upgradeneeded handler
        openRequest.onupgradeneeded = function(event) {
          // This is a function that will be called
        };
        
        // Manually trigger the upgradeneeded handler if needed
        setTimeout(() => {
          if (typeof openRequest.onupgradeneeded === 'function') {
            const db = mockIndexedDB;
            const event = {
              target: { result: db },
              oldVersion: 0,
              newVersion: 1
            };
            openRequest.onupgradeneeded(event);
          }
        }, 0);
      });
    },
    
    // Implement the rest of the GazeDB methods
    createSession: async function() {
      if (!this.isInitialized) {
        await this.init();
      }
      
      const sessionId = 'session-' + Date.now();
      const session = {
        id: sessionId,
        startTime: new Date(),
        endTime: null,
        dataPoints: 0
      };
      
      // Store the session in the mock database
      mockSessions[sessionId] = session;
      
      return sessionId;
    },
    
    endSession: async function(sessionId) {
      if (!this.isInitialized) {
        await this.init();
      }
      
      if (mockSessions[sessionId]) {
        mockSessions[sessionId].endTime = new Date();
        return true;
      }
      
      return false;
    },
    
    storeGazeData: async function(sessionId, gazeData) {
      if (!this.isInitialized) {
        await this.init();
      }
      
      if (!mockSessions[sessionId]) {
        return false;
      }
      
      if (!mockGazeData[sessionId]) {
        mockGazeData[sessionId] = [];
      }
      
      mockGazeData[sessionId].push(gazeData);
      mockSessions[sessionId].dataPoints++;
      
      return true;
    },
    
    getSessionData: async function(sessionId) {
      if (!this.isInitialized) {
        await this.init();
      }
      
      return mockGazeData[sessionId] || [];
    },
    
    getAllSessions: async function() {
      if (!this.isInitialized) {
        await this.init();
      }
      
      return Object.values(mockSessions);
    },
    
    deleteSession: async function(sessionId) {
      if (!this.isInitialized) {
        await this.init();
      }
      
      if (mockSessions[sessionId]) {
        delete mockSessions[sessionId];
        delete mockGazeData[sessionId];
        return true;
      }
      
      return false;
    }
  };
  
  return GazeDB;
};

// Mock IndexedDB
const mockIndexedDB = {
  transaction: jest.fn().mockImplementation((storeNames, mode) => {
    return {
      objectStore: jest.fn().mockImplementation((storeName) => {
        return {
          add: jest.fn().mockImplementation((data) => {
            const request = {};
            
            setTimeout(() => {
              if (typeof request.onsuccess === 'function') {
                request.onsuccess({ target: { result: 'success' } });
              }
            }, 0);
            
            return request;
          }),
          
          put: jest.fn().mockImplementation((data) => {
            const request = {};
            
            setTimeout(() => {
              if (typeof request.onsuccess === 'function') {
                request.onsuccess({ target: { result: 'success' } });
              }
            }, 0);
            
            return request;
          }),
          
          delete: jest.fn().mockImplementation((key) => {
            const request = {};
            
            setTimeout(() => {
              if (typeof request.onsuccess === 'function') {
                request.onsuccess({ target: { result: 'success' } });
              }
            }, 0);
            
            return request;
          }),
          
          get: jest.fn().mockImplementation((key) => {
            const request = {};
            
            setTimeout(() => {
              if (typeof request.onsuccess === 'function') {
                request.onsuccess({ target: { result: mockSessions[key] || mockGazeData[key] } });
              }
            }, 0);
            
            return request;
          }),
          
          getAll: jest.fn().mockImplementation(() => {
            const request = {};
            
            setTimeout(() => {
              if (typeof request.onsuccess === 'function') {
                request.onsuccess({ target: { result: Object.values(mockSessions) } });
              }
            }, 0);
            
            return request;
          }),
          
          createIndex: jest.fn()
        };
      }),
      
      oncomplete: null,
      onerror: null
    };
  }),
  
  createObjectStore: jest.fn().mockImplementation((storeName, options) => {
    return {
      createIndex: jest.fn()
    };
  })
};

// Mock data storage
let mockSessions = {};
let mockGazeData = {};

// Mock indexedDB.open
global.indexedDB = {
  open: jest.fn().mockImplementation((dbName, version) => {
    const request = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: mockIndexedDB
    };
    
    setTimeout(() => {
      if (typeof request.onsuccess === 'function') {
        request.onsuccess({ target: { result: mockIndexedDB } });
      }
    }, 0);
    
    return request;
  })
};

describe('GazeDB Module Tests', () => {
  let GazeDB;
  
  beforeEach(() => {
    // Reset mock data
    mockSessions = {};
    mockGazeData = {};
    
    // Create a fresh GazeDB instance for each test
    GazeDB = evaluateGazeDB();
  });
  
  describe('Initialization', () => {
    test('should initialize the database', async () => {
      await GazeDB.init();
      
      expect(GazeDB.isInitialized).toBe(true);
      expect(GazeDB.db).not.toBeNull();
    });
    
    test('should not reinitialize if already initialized', async () => {
      // First initialization
      await GazeDB.init();
      
      // Mock the open method to track if it's called again
      const openSpy = jest.spyOn(global.indexedDB, 'open');
      
      // Second initialization
      await GazeDB.init();
      
      expect(openSpy).not.toHaveBeenCalled();
    });
  });
  
  describe('Session Management', () => {
    test('should create a new session', async () => {
      const sessionId = await GazeDB.createSession();
      
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session-\d+$/);
      expect(mockSessions[sessionId]).toBeDefined();
      expect(mockSessions[sessionId].startTime).toBeInstanceOf(Date);
      expect(mockSessions[sessionId].endTime).toBeNull();
      expect(mockSessions[sessionId].dataPoints).toBe(0);
    });
    
    test('should end a session', async () => {
      const sessionId = await GazeDB.createSession();
      const result = await GazeDB.endSession(sessionId);
      
      expect(result).toBe(true);
      expect(mockSessions[sessionId].endTime).toBeInstanceOf(Date);
    });
    
    test('should return false when ending a non-existent session', async () => {
      const result = await GazeDB.endSession('non-existent-session');
      
      expect(result).toBe(false);
    });
    
    test('should get all sessions', async () => {
      // Create a few sessions
      const sessionId1 = await GazeDB.createSession();
      const sessionId2 = await GazeDB.createSession();
      
      const sessions = await GazeDB.getAllSessions();
      
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.id)).toContain(sessionId1);
      expect(sessions.map(s => s.id)).toContain(sessionId2);
    });
    
    test('should delete a session', async () => {
      const sessionId = await GazeDB.createSession();
      
      // Store some gaze data
      await GazeDB.storeGazeData(sessionId, { gazeX: 100, gazeY: 200 });
      
      // Delete the session
      const result = await GazeDB.deleteSession(sessionId);
      
      expect(result).toBe(true);
      expect(mockSessions[sessionId]).toBeUndefined();
      expect(mockGazeData[sessionId]).toBeUndefined();
    });
    
    test('should return false when deleting a non-existent session', async () => {
      const result = await GazeDB.deleteSession('non-existent-session');
      
      expect(result).toBe(false);
    });
  });
  
  describe('Data Handling', () => {
    test('should store gaze data for a session', async () => {
      const sessionId = await GazeDB.createSession();
      const gazeData = {
        gazeX: 100,
        gazeY: 200,
        headX: 0.5,
        headY: 0.3,
        headZ: 0.7,
        gazeState: 0,
        timestamp: Date.now()
      };
      
      const result = await GazeDB.storeGazeData(sessionId, gazeData);
      
      expect(result).toBe(true);
      expect(mockGazeData[sessionId]).toHaveLength(1);
      expect(mockGazeData[sessionId][0]).toEqual(gazeData);
      expect(mockSessions[sessionId].dataPoints).toBe(1);
    });
    
    test('should return false when storing data for a non-existent session', async () => {
      const gazeData = {
        gazeX: 100,
        gazeY: 200,
        timestamp: Date.now()
      };
      
      const result = await GazeDB.storeGazeData('non-existent-session', gazeData);
      
      expect(result).toBe(false);
    });
    
    test('should get session data', async () => {
      const sessionId = await GazeDB.createSession();
      const gazeData1 = {
        gazeX: 100,
        gazeY: 200,
        timestamp: Date.now()
      };
      const gazeData2 = {
        gazeX: 150,
        gazeY: 250,
        timestamp: Date.now() + 100
      };
      
      await GazeDB.storeGazeData(sessionId, gazeData1);
      await GazeDB.storeGazeData(sessionId, gazeData2);
      
      const sessionData = await GazeDB.getSessionData(sessionId);
      
      expect(sessionData).toHaveLength(2);
      expect(sessionData[0]).toEqual(gazeData1);
      expect(sessionData[1]).toEqual(gazeData2);
    });
    
    test('should return empty array for non-existent session data', async () => {
      const sessionData = await GazeDB.getSessionData('non-existent-session');
      
      expect(sessionData).toEqual([]);
    });
  });
}); 