/**
 * Database module for GazeTrackingCloud
 * Handles storage and retrieval of gaze tracking data using IndexedDB
 */

const GazeDB = (() => {
    const DB_NAME = 'GazeTrackingDB';
    const DB_VERSION = 1;
    const GAZE_STORE = 'gazeData';
    const SESSION_STORE = 'sessions';
    
    let db = null;

    /**
     * Initialize the database
     * @returns {Promise} - Resolves when the database is ready
     */
    const init = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('Database opened successfully');
                resolve(db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object store for gaze data
                if (!db.objectStoreNames.contains(GAZE_STORE)) {
                    const gazeStore = db.createObjectStore(GAZE_STORE, { keyPath: 'id', autoIncrement: true });
                    gazeStore.createIndex('sessionId', 'sessionId', { unique: false });
                    gazeStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                // Create object store for sessions
                if (!db.objectStoreNames.contains(SESSION_STORE)) {
                    const sessionStore = db.createObjectStore(SESSION_STORE, { keyPath: 'id', autoIncrement: true });
                    sessionStore.createIndex('startTime', 'startTime', { unique: false });
                    sessionStore.createIndex('endTime', 'endTime', { unique: false });
                }
            };
        });
    };

    /**
     * Create a new session
     * @returns {Promise<number>} - Resolves with the session ID
     */
    const createSession = () => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = db.transaction([SESSION_STORE], 'readwrite');
            const store = transaction.objectStore(SESSION_STORE);
            
            const session = {
                startTime: Date.now(),
                endTime: null,
                dataPoints: 0
            };
            
            const request = store.add(session);
            
            request.onsuccess = (event) => {
                resolve(event.target.result); // Return the session ID
            };
            
            request.onerror = (event) => {
                console.error('Error creating session:', event.target.error);
                reject(event.target.error);
            };
        });
    };

    /**
     * End a session
     * @param {number} sessionId - The ID of the session to end
     * @param {number} dataPoints - The number of data points collected
     * @returns {Promise} - Resolves when the session is updated
     */
    const endSession = (sessionId, dataPoints) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = db.transaction([SESSION_STORE], 'readwrite');
            const store = transaction.objectStore(SESSION_STORE);
            
            const request = store.get(sessionId);
            
            request.onsuccess = (event) => {
                const session = event.target.result;
                if (!session) {
                    reject(new Error(`Session with ID ${sessionId} not found`));
                    return;
                }
                
                session.endTime = Date.now();
                session.dataPoints = dataPoints;
                
                const updateRequest = store.put(session);
                
                updateRequest.onsuccess = () => {
                    resolve();
                };
                
                updateRequest.onerror = (event) => {
                    console.error('Error updating session:', event.target.error);
                    reject(event.target.error);
                };
            };
            
            request.onerror = (event) => {
                console.error('Error retrieving session:', event.target.error);
                reject(event.target.error);
            };
        });
    };

    /**
     * Store gaze data
     * @param {number} sessionId - The ID of the current session
     * @param {Object} gazeData - The gaze data to store
     * @returns {Promise} - Resolves when the data is stored
     */
    const storeGazeData = (sessionId, gazeData) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = db.transaction([GAZE_STORE], 'readwrite');
            const store = transaction.objectStore(GAZE_STORE);
            
            const dataToStore = {
                sessionId,
                timestamp: Date.now(),
                ...gazeData
            };
            
            const request = store.add(dataToStore);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Error storing gaze data:', event.target.error);
                reject(event.target.error);
            };
        });
    };

    /**
     * Get all gaze data for a session
     * @param {number} sessionId - The ID of the session
     * @returns {Promise<Array>} - Resolves with an array of gaze data
     */
    const getSessionData = (sessionId) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = db.transaction([GAZE_STORE], 'readonly');
            const store = transaction.objectStore(GAZE_STORE);
            const index = store.index('sessionId');
            
            const request = index.getAll(sessionId);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                console.error('Error retrieving session data:', event.target.error);
                reject(event.target.error);
            };
        });
    };

    /**
     * Get all sessions
     * @returns {Promise<Array>} - Resolves with an array of sessions
     */
    const getAllSessions = () => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = db.transaction([SESSION_STORE], 'readonly');
            const store = transaction.objectStore(SESSION_STORE);
            
            const request = store.getAll();
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                console.error('Error retrieving sessions:', event.target.error);
                reject(event.target.error);
            };
        });
    };

    /**
     * Export session data as JSON
     * @param {number} sessionId - The ID of the session to export
     * @returns {Promise<string>} - Resolves with the JSON string
     */
    const exportSessionData = async (sessionId) => {
        try {
            const sessionData = await getSessionData(sessionId);
            return JSON.stringify(sessionData, null, 2);
        } catch (error) {
            console.error('Error exporting session data:', error);
            throw error;
        }
    };

    return {
        init,
        createSession,
        endSession,
        storeGazeData,
        getSessionData,
        getAllSessions,
        exportSessionData
    };
})(); 