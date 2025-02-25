/**
 * Tests for database.js module
 */

// Import the fs and path modules
const fs = require('fs');
const path = require('path');

// Read the database.js file
const databaseJsPath = path.resolve(__dirname, '../js/database.js');
const databaseJsContent = fs.readFileSync(databaseJsPath, 'utf8');

// Extract the GazeDB module using regex
const gazeDBMatch = databaseJsContent.match(/const GazeDB = \(\(\) => {([\s\S]*?)\}\)\(\);/);
const gazeDBBody = gazeDBMatch ? gazeDBMatch[1] : '';

// Create a function to evaluate the GazeDB module
const evaluateGazeDB = () => {
  // Create a new function that returns the GazeDB object
  const GazeDBFunction = new Function(`
    const GazeDB = (() => {${gazeDBBody}})();
    return GazeDB;
  `);
  
  // Execute the function to get the GazeDB object
  return GazeDBFunction();
};

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn().mockReturnValue({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
    result: {
      transaction: jest.fn().mockReturnValue({
        objectStore: jest.fn().mockReturnValue({
          add: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null
          }),
          put: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null
          }),
          delete: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null
          }),
          get: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null,
            result: null
          }),
          getAll: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null,
            result: []
          }),
          index: jest.fn().mockReturnValue({
            get: jest.fn().mockReturnValue({
              onsuccess: null,
              onerror: null,
              result: null
            }),
            getAll: jest.fn().mockReturnValue({
              onsuccess: null,
              onerror: null,
              result: []
            })
          })
        }),
        oncomplete: null,
        onerror: null
      }),
      createObjectStore: jest.fn(),
      objectStoreNames: {
        contains: jest.fn().mockReturnValue(true)
      }
    }
  }),
  deleteDatabase: jest.fn()
};

// Get the GazeDB object
let GazeDB;

describe('Database Module Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock global.indexedDB
    global.indexedDB = mockIndexedDB;
    
    // Get a fresh instance of GazeDB for each test
    GazeDB = evaluateGazeDB();
  });
  
  describe('init', () => {
    test('should initialize the database', async () => {
      // Mock the open request
      const openRequest = mockIndexedDB.open.mockReturnValueOnce({
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        result: {
          transaction: jest.fn().mockReturnValue({
            objectStore: jest.fn().mockReturnValue({
              add: jest.fn().mockReturnValue({
                onsuccess: null,
                onerror: null
              }),
              put: jest.fn().mockReturnValue({
                onsuccess: null,
                onerror: null
              }),
              delete: jest.fn().mockReturnValue({
                onsuccess: null,
                onerror: null
              }),
              get: jest.fn().mockReturnValue({
                onsuccess: null,
                onerror: null,
                result: null
              }),
              getAll: jest.fn().mockReturnValue({
                onsuccess: null,
                onerror: null,
                result: []
              }),
              index: jest.fn().mockReturnValue({
                get: jest.fn().mockReturnValue({
                  onsuccess: null,
                  onerror: null,
                  result: null
                }),
                getAll: jest.fn().mockReturnValue({
                  onsuccess: null,
                  onerror: null,
                  result: []
                })
              })
            }),
            oncomplete: null,
            onerror: null
          }),
          createObjectStore: jest.fn(),
          objectStoreNames: {
            contains: jest.fn().mockReturnValue(true)
          }
        }
      });
      
      // Initialize the database
      const initPromise = GazeDB.init();
      
      // Simulate successful database open
      openRequest.onsuccess({
        target: {
          result: openRequest.result
        }
      });
      
      await expect(initPromise).resolves.toBe(true);
      expect(mockIndexedDB.open).toHaveBeenCalledWith('GazeTrackingDB', 1);
    });
    
    test('should handle database open error', async () => {
      // Mock the open request
      const openRequest = mockIndexedDB.open.mockReturnValueOnce({
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        error: new Error('Failed to open database')
      });
      
      // Initialize the database
      const initPromise = GazeDB.init();
      
      // Simulate database open error
      openRequest.onerror({
        target: {
          error: openRequest.error
        }
      });
      
      await expect(initPromise).rejects.toThrow('Failed to open database');
    });
    
    test('should create object stores if needed', async () => {
      // Mock the open request
      const openRequest = mockIndexedDB.open.mockReturnValueOnce({
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        result: {
          transaction: jest.fn().mockReturnValue({
            objectStore: jest.fn().mockReturnValue({
              add: jest.fn().mockReturnValue({
                onsuccess: null,
                onerror: null
              }),
              put: jest.fn().mockReturnValue({
                onsuccess: null,
                onerror: null
              }),
              delete: jest.fn().mockReturnValue({
                onsuccess: null,
                onerror: null
              }),
              get: jest.fn().mockReturnValue({
                onsuccess: null,
                onerror: null,
                result: null
              }),
              getAll: jest.fn().mockReturnValue({
                onsuccess: null,
                onerror: null,
                result: []
              }),
              index: jest.fn().mockReturnValue({
                get: jest.fn().mockReturnValue({
                  onsuccess: null,
                  onerror: null,
                  result: null
                }),
                getAll: jest.fn().mockReturnValue({
                  onsuccess: null,
                  onerror: null,
                  result: []
                })
              })
            }),
            oncomplete: null,
            onerror: null
          }),
          createObjectStore: jest.fn(),
          objectStoreNames: {
            contains: jest.fn().mockReturnValue(false)
          }
        }
      });
      
      // Initialize the database
      const initPromise = GazeDB.init();
      
      // Simulate database upgrade needed
      openRequest.onupgradeneeded({
        target: {
          result: openRequest.result
        }
      });
      
      // Simulate successful database open
      openRequest.onsuccess({
        target: {
          result: openRequest.result
        }
      });
      
      await expect(initPromise).resolves.toBe(true);
      expect(openRequest.result.createObjectStore).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('createSession', () => {
    test('should create a new session', async () => {
      // Mock the transaction and object store
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue({
          add: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null
          })
        }),
        oncomplete: null,
        onerror: null
      };
      
      mockIndexedDB.open.mockReturnValueOnce({
        onsuccess: null,
        onerror: null,
        result: {
          transaction: jest.fn().mockReturnValue(mockTransaction),
          objectStoreNames: {
            contains: jest.fn().mockReturnValue(true)
          }
        }
      });
      
      // Create a session
      const createSessionPromise = GazeDB.createSession();
      
      // Simulate successful database open
      mockIndexedDB.open.mock.results[0].value.onsuccess({
        target: {
          result: mockIndexedDB.open.mock.results[0].value.result
        }
      });
      
      // Simulate successful transaction
      const addRequest = mockTransaction.objectStore().add.mock.results[0].value;
      addRequest.onsuccess = jest.fn().mockImplementation(function() {
        this.result = 'test-session-id';
      });
      
      // Trigger the success event
      addRequest.onsuccess();
      
      // Simulate transaction complete
      mockTransaction.oncomplete();
      
      const sessionId = await createSessionPromise;
      expect(sessionId).toBe('test-session-id');
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('sessions');
    });
    
    test('should handle transaction error', async () => {
      // Mock the transaction and object store
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue({
          add: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null
          })
        }),
        oncomplete: null,
        onerror: null,
        error: new Error('Transaction failed')
      };
      
      mockIndexedDB.open.mockReturnValueOnce({
        onsuccess: null,
        onerror: null,
        result: {
          transaction: jest.fn().mockReturnValue(mockTransaction),
          objectStoreNames: {
            contains: jest.fn().mockReturnValue(true)
          }
        }
      });
      
      // Create a session
      const createSessionPromise = GazeDB.createSession();
      
      // Simulate successful database open
      mockIndexedDB.open.mock.results[0].value.onsuccess({
        target: {
          result: mockIndexedDB.open.mock.results[0].value.result
        }
      });
      
      // Simulate transaction error
      mockTransaction.onerror({
        target: {
          error: mockTransaction.error
        }
      });
      
      await expect(createSessionPromise).rejects.toThrow('Transaction failed');
    });
  });
  
  describe('endSession', () => {
    test('should end a session', async () => {
      // Mock the transaction and object store
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue({
          put: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null
          }),
          get: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null,
            result: {
              id: 'test-session-id',
              startTime: new Date(2022, 2, 8, 10, 0, 0),
              endTime: null,
              dataPoints: 100
            }
          })
        }),
        oncomplete: null,
        onerror: null
      };
      
      mockIndexedDB.open.mockReturnValueOnce({
        onsuccess: null,
        onerror: null,
        result: {
          transaction: jest.fn().mockReturnValue(mockTransaction),
          objectStoreNames: {
            contains: jest.fn().mockReturnValue(true)
          }
        }
      });
      
      // End a session
      const endSessionPromise = GazeDB.endSession('test-session-id');
      
      // Simulate successful database open
      mockIndexedDB.open.mock.results[0].value.onsuccess({
        target: {
          result: mockIndexedDB.open.mock.results[0].value.result
        }
      });
      
      // Simulate successful get request
      const getRequest = mockTransaction.objectStore().get.mock.results[0].value;
      getRequest.onsuccess({
        target: {
          result: getRequest.result
        }
      });
      
      // Simulate successful put request
      const putRequest = mockTransaction.objectStore().put.mock.results[0].value;
      putRequest.onsuccess = jest.fn();
      
      // Trigger the success event
      putRequest.onsuccess();
      
      // Simulate transaction complete
      mockTransaction.oncomplete();
      
      await expect(endSessionPromise).resolves.toBe(true);
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('sessions');
      expect(mockTransaction.objectStore().get).toHaveBeenCalledWith('test-session-id');
      expect(mockTransaction.objectStore().put).toHaveBeenCalled();
    });
    
    test('should handle session not found', async () => {
      // Mock the transaction and object store
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue({
          put: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null
          }),
          get: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null,
            result: null
          })
        }),
        oncomplete: null,
        onerror: null
      };
      
      mockIndexedDB.open.mockReturnValueOnce({
        onsuccess: null,
        onerror: null,
        result: {
          transaction: jest.fn().mockReturnValue(mockTransaction),
          objectStoreNames: {
            contains: jest.fn().mockReturnValue(true)
          }
        }
      });
      
      // End a session
      const endSessionPromise = GazeDB.endSession('test-session-id');
      
      // Simulate successful database open
      mockIndexedDB.open.mock.results[0].value.onsuccess({
        target: {
          result: mockIndexedDB.open.mock.results[0].value.result
        }
      });
      
      // Simulate get request with no result
      const getRequest = mockTransaction.objectStore().get.mock.results[0].value;
      getRequest.onsuccess({
        target: {
          result: null
        }
      });
      
      // Simulate transaction complete
      mockTransaction.oncomplete();
      
      await expect(endSessionPromise).rejects.toThrow('Session not found');
    });
  });
  
  describe('saveGazeData', () => {
    test('should save gaze data', async () => {
      // Mock the transaction and object store
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue({
          add: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null
          })
        }),
        oncomplete: null,
        onerror: null
      };
      
      mockIndexedDB.open.mockReturnValueOnce({
        onsuccess: null,
        onerror: null,
        result: {
          transaction: jest.fn().mockReturnValue(mockTransaction),
          objectStoreNames: {
            contains: jest.fn().mockReturnValue(true)
          }
        }
      });
      
      // Save gaze data
      const saveGazeDataPromise = GazeDB.saveGazeData('test-session-id', {
        gazeX: 100,
        gazeY: 200,
        headX: 0.5,
        headY: 0.3,
        headZ: 0.7,
        gazeState: 0,
        timestamp: Date.now()
      });
      
      // Simulate successful database open
      mockIndexedDB.open.mock.results[0].value.onsuccess({
        target: {
          result: mockIndexedDB.open.mock.results[0].value.result
        }
      });
      
      // Simulate successful add request
      const addRequest = mockTransaction.objectStore().add.mock.results[0].value;
      addRequest.onsuccess = jest.fn();
      
      // Trigger the success event
      addRequest.onsuccess();
      
      // Simulate transaction complete
      mockTransaction.oncomplete();
      
      await expect(saveGazeDataPromise).resolves.toBe(true);
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('gazeData');
      expect(mockTransaction.objectStore().add).toHaveBeenCalled();
    });
  });
  
  describe('getSessionData', () => {
    test('should get session data', async () => {
      // Mock the transaction and object store
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue({
          index: jest.fn().mockReturnValue({
            getAll: jest.fn().mockReturnValue({
              onsuccess: null,
              onerror: null,
              result: [
                {
                  sessionId: 'test-session-id',
                  gazeX: 100,
                  gazeY: 200,
                  headX: 0.5,
                  headY: 0.3,
                  headZ: 0.7,
                  gazeState: 0,
                  timestamp: Date.now()
                }
              ]
            })
          })
        }),
        oncomplete: null,
        onerror: null
      };
      
      mockIndexedDB.open.mockReturnValueOnce({
        onsuccess: null,
        onerror: null,
        result: {
          transaction: jest.fn().mockReturnValue(mockTransaction),
          objectStoreNames: {
            contains: jest.fn().mockReturnValue(true)
          }
        }
      });
      
      // Get session data
      const getSessionDataPromise = GazeDB.getSessionData('test-session-id');
      
      // Simulate successful database open
      mockIndexedDB.open.mock.results[0].value.onsuccess({
        target: {
          result: mockIndexedDB.open.mock.results[0].value.result
        }
      });
      
      // Simulate successful getAll request
      const getAllRequest = mockTransaction.objectStore().index().getAll.mock.results[0].value;
      getAllRequest.onsuccess({
        target: {
          result: getAllRequest.result
        }
      });
      
      // Simulate transaction complete
      mockTransaction.oncomplete();
      
      const sessionData = await getSessionDataPromise;
      expect(sessionData).toHaveLength(1);
      expect(sessionData[0].sessionId).toBe('test-session-id');
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('gazeData');
      expect(mockTransaction.objectStore().index).toHaveBeenCalledWith('sessionId');
      expect(mockTransaction.objectStore().index().getAll).toHaveBeenCalledWith('test-session-id');
    });
  });
  
  describe('getAllSessions', () => {
    test('should get all sessions', async () => {
      // Mock the transaction and object store
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue({
          getAll: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null,
            result: [
              {
                id: 'test-session-id-1',
                startTime: new Date(2022, 2, 8, 10, 0, 0),
                endTime: new Date(2022, 2, 8, 10, 5, 0),
                dataPoints: 100
              },
              {
                id: 'test-session-id-2',
                startTime: new Date(2022, 2, 8, 11, 0, 0),
                endTime: new Date(2022, 2, 8, 11, 5, 0),
                dataPoints: 200
              }
            ]
          })
        }),
        oncomplete: null,
        onerror: null
      };
      
      mockIndexedDB.open.mockReturnValueOnce({
        onsuccess: null,
        onerror: null,
        result: {
          transaction: jest.fn().mockReturnValue(mockTransaction),
          objectStoreNames: {
            contains: jest.fn().mockReturnValue(true)
          }
        }
      });
      
      // Get all sessions
      const getAllSessionsPromise = GazeDB.getAllSessions();
      
      // Simulate successful database open
      mockIndexedDB.open.mock.results[0].value.onsuccess({
        target: {
          result: mockIndexedDB.open.mock.results[0].value.result
        }
      });
      
      // Simulate successful getAll request
      const getAllRequest = mockTransaction.objectStore().getAll.mock.results[0].value;
      getAllRequest.onsuccess({
        target: {
          result: getAllRequest.result
        }
      });
      
      // Simulate transaction complete
      mockTransaction.oncomplete();
      
      const sessions = await getAllSessionsPromise;
      expect(sessions).toHaveLength(2);
      expect(sessions[0].id).toBe('test-session-id-1');
      expect(sessions[1].id).toBe('test-session-id-2');
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('sessions');
      expect(mockTransaction.objectStore().getAll).toHaveBeenCalled();
    });
  });
  
  describe('deleteSession', () => {
    test('should delete a session and its data', async () => {
      // Mock the transaction and object store for sessions
      const mockSessionsTransaction = {
        objectStore: jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null
          })
        }),
        oncomplete: null,
        onerror: null
      };
      
      // Mock the transaction and object store for gazeData
      const mockGazeDataTransaction = {
        objectStore: jest.fn().mockReturnValue({
          index: jest.fn().mockReturnValue({
            getAll: jest.fn().mockReturnValue({
              onsuccess: null,
              onerror: null,
              result: [
                { id: 'data-1' },
                { id: 'data-2' }
              ]
            }),
            openCursor: jest.fn().mockReturnValue({
              onsuccess: null,
              onerror: null
            })
          }),
          delete: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null
          })
        }),
        oncomplete: null,
        onerror: null
      };
      
      // Mock the database
      mockIndexedDB.open.mockReturnValueOnce({
        onsuccess: null,
        onerror: null,
        result: {
          transaction: jest.fn()
            .mockReturnValueOnce(mockSessionsTransaction)
            .mockReturnValueOnce(mockGazeDataTransaction),
          objectStoreNames: {
            contains: jest.fn().mockReturnValue(true)
          }
        }
      });
      
      // Delete a session
      const deleteSessionPromise = GazeDB.deleteSession('test-session-id');
      
      // Simulate successful database open
      mockIndexedDB.open.mock.results[0].value.onsuccess({
        target: {
          result: mockIndexedDB.open.mock.results[0].value.result
        }
      });
      
      // Simulate successful delete request for sessions
      const deleteSessionRequest = mockSessionsTransaction.objectStore().delete.mock.results[0].value;
      deleteSessionRequest.onsuccess = jest.fn();
      
      // Trigger the success event
      deleteSessionRequest.onsuccess();
      
      // Simulate transaction complete for sessions
      mockSessionsTransaction.oncomplete();
      
      // Simulate successful getAll request for gazeData
      const getAllRequest = mockGazeDataTransaction.objectStore().index().getAll.mock.results[0].value;
      getAllRequest.onsuccess({
        target: {
          result: getAllRequest.result
        }
      });
      
      // Simulate successful delete requests for gazeData
      const deleteDataRequest1 = mockGazeDataTransaction.objectStore().delete.mock.results[0].value;
      deleteDataRequest1.onsuccess = jest.fn();
      
      // Trigger the success event
      deleteDataRequest1.onsuccess();
      
      const deleteDataRequest2 = mockGazeDataTransaction.objectStore().delete.mock.results[1].value;
      deleteDataRequest2.onsuccess = jest.fn();
      
      // Trigger the success event
      deleteDataRequest2.onsuccess();
      
      // Simulate transaction complete for gazeData
      mockGazeDataTransaction.oncomplete();
      
      await expect(deleteSessionPromise).resolves.toBe(true);
      expect(mockSessionsTransaction.objectStore).toHaveBeenCalledWith('sessions');
      expect(mockSessionsTransaction.objectStore().delete).toHaveBeenCalledWith('test-session-id');
      expect(mockGazeDataTransaction.objectStore).toHaveBeenCalledWith('gazeData');
      expect(mockGazeDataTransaction.objectStore().index).toHaveBeenCalledWith('sessionId');
      expect(mockGazeDataTransaction.objectStore().delete).toHaveBeenCalledTimes(2);
    });
  });
}); 