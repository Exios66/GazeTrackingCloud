/**
 * Tracking module for GazeTrackingCloud
 * Handles integration with the GazeRecorder API
 */

const GazeTracker = (() => {
    let isTracking = false;
    let isCalibrating = false;
    let currentSessionId = null;
    let dataPointsCount = 0;
    let startTime = null;
    let durationInterval = null;
    let allGazeData = []; // Store all gaze data for the current session
    let apiLoadAttempts = 0;
    const MAX_API_LOAD_ATTEMPTS = 3;
    
    // DOM elements
    let gazeXElement = null;
    let gazeYElement = null;
    let headXElement = null;
    let headYElement = null;
    let headZElement = null;
    let sessionDurationElement = null;
    let dataPointsElement = null;
    
    /**
     * Initialize the tracker
     */
    const init = () => {
        // Get DOM elements
        gazeXElement = document.getElementById('gaze-x');
        gazeYElement = document.getElementById('gaze-y');
        headXElement = document.getElementById('head-x');
        headYElement = document.getElementById('head-y');
        headZElement = document.getElementById('head-z');
        sessionDurationElement = document.getElementById('session-duration');
        dataPointsElement = document.getElementById('data-points');
        
        // Check if GazeRecorder API is loaded
        checkAndInitializeAPI();
        
        console.log('Gaze tracker initialized');
    };
    
    /**
     * Check if GazeRecorder API is loaded and initialize it
     */
    const checkAndInitializeAPI = () => {
        if (typeof GazeRecorder !== 'undefined') {
            // API is loaded, set up event listeners
            GazeRecorder.setGazeListener(handleGazeData);
            GazeRecorder.setCalibrationEndListener(handleCalibrationEnd);
            console.log('GazeRecorder API initialized successfully');
            showStatusMessage('GazeRecorder API loaded successfully. Click "Start Tracking" to begin.');
            return true;
        } else {
            apiLoadAttempts++;
            console.error(`GazeRecorder API not found. Attempt ${apiLoadAttempts} of ${MAX_API_LOAD_ATTEMPTS}`);
            
            if (apiLoadAttempts < MAX_API_LOAD_ATTEMPTS) {
                // Try to reload the API
                showStatusMessage(`Loading GazeRecorder API... Attempt ${apiLoadAttempts} of ${MAX_API_LOAD_ATTEMPTS}`);
                loadGazeRecorderAPI().then(() => {
                    checkAndInitializeAPI();
                }).catch(error => {
                    console.error('Failed to load GazeRecorder API:', error);
                    if (apiLoadAttempts >= MAX_API_LOAD_ATTEMPTS) {
                        redirectToErrorPage();
                    }
                });
                return false;
            } else {
                redirectToErrorPage();
                return false;
            }
        }
    };
    
    /**
     * Redirect to the API error page
     */
    const redirectToErrorPage = () => {
        showError('GazeRecorder API could not be loaded. Redirecting to error page...');
        // Save a flag in sessionStorage to indicate API loading failure
        sessionStorage.setItem('gazerecorder_api_failed', 'true');
        // Redirect after a short delay to allow the error message to be seen
        setTimeout(() => {
            window.location.href = 'api-error.html';
        }, 2000);
    };
    
    /**
     * Load the GazeRecorder API dynamically
     * @returns {Promise} - Resolves when the API is loaded
     */
    const loadGazeRecorderAPI = () => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://app.gazerecorder.com/GazeRecorderAPI.js';
            script.async = true;
            script.onload = () => {
                console.log('GazeRecorder API loaded successfully');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load GazeRecorder API'));
            };
            document.head.appendChild(script);
        });
    };
    
    /**
     * Start tracking
     */
    const startTracking = async () => {
        if (isTracking) {
            console.warn('Tracking is already active');
            return;
        }
        
        // Check if API is loaded
        if (!checkAndInitializeAPI()) {
            showError('GazeRecorder API not loaded. Please wait for it to load or refresh the page.');
            return;
        }
        
        try {
            // Create a new session in the database
            currentSessionId = await GazeDB.createSession();
            
            // Reset counters and data array
            dataPointsCount = 0;
            allGazeData = [];
            startTime = Date.now();
            updateDataPointsDisplay();
            
            // Start duration timer
            durationInterval = setInterval(updateDurationDisplay, 1000);
            
            // Start GazeRecorder
            if (typeof GazeRecorder !== 'undefined') {
                GazeRecorder.startTracking();
                
                // Initialize heatmap
                GazeHeatmap.init('heatmap-container');
                GazeHeatmap.clear();
                
                isTracking = true;
                console.log('Tracking started');
                
                // Show status message
                showStatusMessage('Tracking started. Look around the screen to generate data.');
            } else {
                console.error('GazeRecorder API not found');
                showError('GazeRecorder API not found. Please refresh the page and try again.');
            }
        } catch (error) {
            console.error('Error starting tracking:', error);
            showError('Failed to start tracking. Please try again.');
        }
    };
    
    /**
     * Stop tracking
     */
    const stopTracking = async () => {
        if (!isTracking) {
            console.warn('Tracking is not active');
            return;
        }
        
        try {
            // Stop GazeRecorder
            if (typeof GazeRecorder !== 'undefined') {
                GazeRecorder.stopTracking();
            }
            
            // Stop duration timer
            clearInterval(durationInterval);
            
            // End session in database
            if (currentSessionId) {
                await GazeDB.endSession(currentSessionId, dataPointsCount);
                
                // Save data to server
                await saveSessionToServer(currentSessionId, allGazeData);
            }
            
            isTracking = false;
            console.log('Tracking stopped');
            
            // Show status message
            showStatusMessage('Tracking stopped. Data has been saved.');
        } catch (error) {
            console.error('Error stopping tracking:', error);
            showError('Failed to stop tracking properly. Some data may not be saved.');
        }
    };
    
    /**
     * Start calibration
     */
    const startCalibration = () => {
        if (isCalibrating) {
            console.warn('Calibration is already in progress');
            return;
        }
        
        // Check if API is loaded
        if (!checkAndInitializeAPI()) {
            showError('GazeRecorder API not loaded. Please wait for it to load or refresh the page.');
            return;
        }
        
        // Show calibration overlay
        const calibrationOverlay = document.getElementById('calibration-overlay');
        calibrationOverlay.classList.remove('hidden');
        
        // Start GazeRecorder calibration
        if (typeof GazeRecorder !== 'undefined') {
            isCalibrating = true;
            GazeRecorder.startCalibration();
            console.log('Calibration started');
            
            // Show status message
            showStatusMessage('Calibration started. Please follow the red dot with your eyes.');
        } else {
            console.error('GazeRecorder API not found');
            showError('GazeRecorder API not found. Please refresh the page and try again.');
        }
    };
    
    /**
     * Handle gaze data from GazeRecorder
     * @param {Object} gazeData - The gaze data from GazeRecorder
     */
    const handleGazeData = (gazeData) => {
        if (!isTracking || !currentSessionId) {
            return;
        }
        
        // Extract data
        const { x, y, state } = gazeData;
        
        // Only process valid gaze data
        if (state !== 0) {
            return; // Invalid gaze data
        }
        
        // Update UI
        updateGazeDisplay(x, y);
        
        // Add to heatmap
        GazeHeatmap.addGazePoint(x, y);
        
        // Store in database and memory
        storeGazeData(gazeData);
        
        // Increment counter
        dataPointsCount++;
        updateDataPointsDisplay();
    };
    
    /**
     * Handle calibration end event
     */
    const handleCalibrationEnd = () => {
        // Hide calibration overlay
        const calibrationOverlay = document.getElementById('calibration-overlay');
        calibrationOverlay.classList.add('hidden');
        
        isCalibrating = false;
        console.log('Calibration completed');
        
        // Show status message
        showStatusMessage('Calibration completed successfully. Tracking will start automatically.');
        
        // Start tracking automatically after calibration
        startTracking();
    };
    
    /**
     * Store gaze data in the database and memory
     * @param {Object} gazeData - The gaze data to store
     */
    const storeGazeData = async (gazeData) => {
        try {
            // Extract relevant data
            const { 
                x, y, state, 
                headX, headY, headZ, 
                pupilLeftX, pupilLeftY, pupilRightX, pupilRightY,
                eyeLeftX, eyeLeftY, eyeRightX, eyeRightY
            } = gazeData;
            
            // Create data object
            const dataObject = {
                gazeX: x,
                gazeY: y,
                gazeState: state,
                headX: headX || 0,
                headY: headY || 0,
                headZ: headZ || 0,
                pupilLeftX: pupilLeftX || 0,
                pupilLeftY: pupilLeftY || 0,
                pupilRightX: pupilRightX || 0,
                pupilRightY: pupilRightY || 0,
                eyeLeftX: eyeLeftX || 0,
                eyeLeftY: eyeLeftY || 0,
                eyeRightX: eyeRightX || 0,
                eyeRightY: eyeRightY || 0,
                timestamp: Date.now()
            };
            
            // Store in database
            await GazeDB.storeGazeData(currentSessionId, dataObject);
            
            // Store in memory
            allGazeData.push(dataObject);
            
            // Update head position display if available
            if (headX !== undefined && headY !== undefined && headZ !== undefined) {
                updateHeadPositionDisplay(headX, headY, headZ);
            }
        } catch (error) {
            console.error('Error storing gaze data:', error);
        }
    };
    
    /**
     * Save session data to server
     * @param {number} sessionId - The session ID
     * @param {Array} sessionData - The session data
     * @returns {Promise} - Resolves when the data is saved
     */
    const saveSessionToServer = async (sessionId, sessionData) => {
        try {
            const response = await fetch('/api/save-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId,
                    sessionData
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`Session data saved to server: ${result.filePath}`);
                return result;
            } else {
                throw new Error(result.error || 'Failed to save session data to server');
            }
        } catch (error) {
            console.error('Error saving session to server:', error);
            showError('Failed to save session data to server. Data is still available in the browser.');
            throw error;
        }
    };
    
    /**
     * Update gaze coordinates display
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     */
    const updateGazeDisplay = (x, y) => {
        if (gazeXElement && gazeYElement) {
            gazeXElement.textContent = Math.round(x);
            gazeYElement.textContent = Math.round(y);
        }
    };
    
    /**
     * Update head position display
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {number} z - The z coordinate
     */
    const updateHeadPositionDisplay = (x, y, z) => {
        if (headXElement && headYElement && headZElement) {
            headXElement.textContent = x.toFixed(2);
            headYElement.textContent = y.toFixed(2);
            headZElement.textContent = z.toFixed(2);
        }
    };
    
    /**
     * Update data points display
     */
    const updateDataPointsDisplay = () => {
        if (dataPointsElement) {
            dataPointsElement.textContent = dataPointsCount;
        }
    };
    
    /**
     * Update duration display
     */
    const updateDurationDisplay = () => {
        if (!sessionDurationElement || !startTime) {
            return;
        }
        
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        
        sessionDurationElement.textContent = `${minutes}:${seconds}`;
    };
    
    /**
     * Show status message
     * @param {string} message - The message to display
     */
    const showStatusMessage = (message) => {
        // Create status message element if it doesn't exist
        let statusElement = document.getElementById('status-message');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'status-message';
            statusElement.style.position = 'fixed';
            statusElement.style.bottom = '20px';
            statusElement.style.left = '50%';
            statusElement.style.transform = 'translateX(-50%)';
            statusElement.style.backgroundColor = 'rgba(52, 152, 219, 0.9)';
            statusElement.style.color = 'white';
            statusElement.style.padding = '10px 20px';
            statusElement.style.borderRadius = '4px';
            statusElement.style.zIndex = '1000';
            statusElement.style.transition = 'opacity 0.3s';
            document.body.appendChild(statusElement);
        }
        
        // Set message and show
        statusElement.textContent = message;
        statusElement.style.opacity = '1';
        
        // Hide after 3 seconds
        setTimeout(() => {
            statusElement.style.opacity = '0';
        }, 3000);
    };
    
    /**
     * Show error message
     * @param {string} message - The error message to display
     */
    const showError = (message) => {
        alert(message);
    };
    
    /**
     * Show heatmap
     */
    const showHeatmap = async () => {
        if (!currentSessionId) {
            console.warn('No active session');
            showError('No active session. Start tracking first.');
            return;
        }
        
        try {
            // Get session data from database
            const sessionData = await GazeDB.getSessionData(currentSessionId);
            
            // Format data for heatmap
            const heatmapData = sessionData.map(data => ({
                x: data.gazeX,
                y: data.gazeY,
                value: 1
            }));
            
            // Generate heatmap
            GazeHeatmap.generateFromData(heatmapData);
            GazeHeatmap.show();
            
            // Show status message
            showStatusMessage('Heatmap generated from current session data.');
        } catch (error) {
            console.error('Error showing heatmap:', error);
            showError('Failed to generate heatmap. Please try again.');
        }
    };
    
    /**
     * Hide heatmap
     */
    const hideHeatmap = () => {
        GazeHeatmap.hide();
    };
    
    /**
     * Export session data
     * @returns {Promise<string>} - Resolves with the JSON string
     */
    const exportSessionData = async () => {
        if (!currentSessionId) {
            console.warn('No active session');
            showError('No active session to export. Start tracking first.');
            return null;
        }
        
        try {
            return await GazeDB.exportSessionData(currentSessionId);
        } catch (error) {
            console.error('Error exporting session data:', error);
            showError('Failed to export session data. Please try again.');
            return null;
        }
    };
    
    /**
     * Check if tracking is active
     * @returns {boolean} - True if tracking is active
     */
    const isTrackingActive = () => {
        return isTracking;
    };
    
    /**
     * Check if calibration is in progress
     * @returns {boolean} - True if calibration is in progress
     */
    const isCalibrationActive = () => {
        return isCalibrating;
    };
    
    /**
     * Get current session ID
     * @returns {number|null} - The current session ID or null
     */
    const getCurrentSessionId = () => {
        return currentSessionId;
    };
    
    /**
     * Check if GazeRecorder API is available
     * @returns {boolean} - True if GazeRecorder API is available
     */
    const isAPIAvailable = () => {
        return typeof GazeRecorder !== 'undefined';
    };
    
    return {
        init,
        startTracking,
        stopTracking,
        startCalibration,
        showHeatmap,
        hideHeatmap,
        exportSessionData,
        isTrackingActive,
        isCalibrationActive,
        getCurrentSessionId,
        showStatusMessage,
        showError,
        isAPIAvailable,
        loadGazeRecorderAPI,
        checkAndInitializeAPI
    };
})(); 