/**
 * Tracking module for GazeTrackingCloud
 * Handles integration with the GazeCloudAPI
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
    const MAX_API_LOAD_ATTEMPTS = 5;
    const API_LOAD_TIMEOUT = 10000; // 10 seconds timeout
    
    // DOM elements
    let gazeXElement = null;
    let gazeYElement = null;
    let headXElement = null;
    let headYElement = null;
    let headZElement = null;
    let sessionDurationElement = null;
    let dataPointsElement = null;
    let videoContainer = null;
    let statusIndicator = null;
    
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
        videoContainer = document.getElementById('video-container');
        statusIndicator = document.getElementById('api-status-indicator');
        
        // Set up UI event listeners
        document.getElementById('check-api-status').addEventListener('click', updateAPIStatusDisplay);
        
        // Check if GazeCloudAPI is loaded
        checkAndInitializeAPI();
        
        console.log('Gaze tracker initialized');
    };
    
    /**
     * Check if GazeCloudAPI is loaded and initialize it
     */
    const checkAndInitializeAPI = () => {
        if (typeof GazeCloudAPI !== 'undefined') {
            // API is loaded, set up event listeners
            try {
                // Set up the callback for gaze data
                GazeCloudAPI.OnResult = handleGazeData;
                
                // Set up additional callbacks
                GazeCloudAPI.OnCalibrationComplete = handleCalibrationEnd;
                GazeCloudAPI.OnCamDenied = () => {
                    showError('Camera access denied. Please allow camera access to use eye tracking.');
                };
                GazeCloudAPI.OnError = (errorMessage) => {
                    showError(`GazeCloudAPI error: ${errorMessage}`);
                };
                
                // Enable click recalibration
                GazeCloudAPI.UseClickRecalibration = true;
                
                // Set up video feed container
                GazeCloudAPI.SetFeedbackLink(null); // Remove feedback link
                
                console.log('GazeCloudAPI initialized successfully');
                showStatusMessage('GazeCloudAPI loaded successfully. Click "Start Tracking" to begin.');
                updateAPIStatusDisplay();
                return true;
            } catch (error) {
                console.error('Error initializing GazeCloudAPI:', error);
                showError('Error initializing GazeCloudAPI. Please refresh the page.');
                return false;
            }
        } else {
            apiLoadAttempts++;
            console.error(`GazeCloudAPI not found. Attempt ${apiLoadAttempts} of ${MAX_API_LOAD_ATTEMPTS}`);
            
            if (apiLoadAttempts < MAX_API_LOAD_ATTEMPTS) {
                // Try to reload the API with exponential backoff
                const delay = Math.min(1000 * Math.pow(2, apiLoadAttempts - 1), 8000);
                showStatusMessage(`Loading GazeCloudAPI... Attempt ${apiLoadAttempts} of ${MAX_API_LOAD_ATTEMPTS}`);
                
                setTimeout(() => {
                    loadGazeCloudAPI().then(() => {
                        checkAndInitializeAPI();
                    }).catch(error => {
                        console.error('Failed to load GazeCloudAPI:', error);
                        if (apiLoadAttempts >= MAX_API_LOAD_ATTEMPTS) {
                            redirectToErrorPage();
                        } else {
                            checkAndInitializeAPI(); // Try again
                        }
                    });
                }, delay);
                
                return false;
            } else {
                redirectToErrorPage();
                return false;
            }
        }
    };
    
    /**
     * Update API status display
     */
    const updateAPIStatusDisplay = () => {
        const statusText = document.getElementById('api-status-text');
        
        if (typeof GazeCloudAPI !== 'undefined') {
            statusIndicator.style.backgroundColor = '#2ecc71'; // Green
            statusText.textContent = 'API Available';
            
            if (isTracking) {
                statusText.textContent += ' (Tracking Active)';
            }
        } else {
            statusIndicator.style.backgroundColor = '#e74c3c'; // Red
            statusText.textContent = 'API Unavailable';
        }
    };
    
    /**
     * Redirect to the API error page
     */
    const redirectToErrorPage = () => {
        showError('GazeCloudAPI could not be loaded. Redirecting to error page...');
        // Save a flag in sessionStorage to indicate API loading failure
        sessionStorage.setItem('gazecloud_api_failed', 'true');
        // Redirect after a short delay to allow the error message to be seen
        setTimeout(() => {
            window.location.href = 'api-error.html';
        }, 2000);
    };
    
    /**
     * Load the GazeCloudAPI dynamically
     * @returns {Promise} - Resolves when the API is loaded
     */
    const loadGazeCloudAPI = () => {
        return new Promise((resolve, reject) => {
            // Check if API is already loaded
            if (typeof GazeCloudAPI !== 'undefined') {
                console.log('GazeCloudAPI already loaded');
                resolve();
                return;
            }
            
            // Create script element
            const script = document.createElement('script');
            script.src = 'https://api.gazerecorder.com/GazeCloudAPI.js';
            script.async = true;
            
            // Set up timeout
            const timeoutId = setTimeout(() => {
                console.error('GazeCloudAPI load timeout');
                reject(new Error('Timeout loading GazeCloudAPI'));
            }, API_LOAD_TIMEOUT);
            
            // Set up load handler
            script.onload = () => {
                clearTimeout(timeoutId);
                console.log('GazeCloudAPI loaded successfully');
                
                // Verify the API is actually available
                if (typeof GazeCloudAPI !== 'undefined') {
                    resolve();
                } else {
                    console.error('GazeCloudAPI loaded but not available');
                    reject(new Error('GazeCloudAPI loaded but not available'));
                }
            };
            
            // Set up error handler
            script.onerror = () => {
                clearTimeout(timeoutId);
                console.error('Failed to load GazeCloudAPI');
                reject(new Error('Failed to load GazeCloudAPI'));
            };
            
            // Add script to document
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
            showError('GazeCloudAPI not loaded. Please wait for it to load or refresh the page.');
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
            
            // Start GazeCloudAPI
            if (typeof GazeCloudAPI !== 'undefined') {
                // Configure video container
                if (videoContainer) {
                    // Clear any existing content
                    videoContainer.innerHTML = '';
                    // Set the video container for GazeCloudAPI
                    GazeCloudAPI.SetVideoContainerElement(videoContainer);
                }
                
                // Start tracking
                GazeCloudAPI.StartEyeTracking();
                
                // Initialize heatmap
                GazeHeatmap.init('heatmap-container');
                GazeHeatmap.clear();
                
                isTracking = true;
                console.log('Tracking started');
                
                // Update UI to reflect tracking state
                updateTrackingUI(true);
                
                // Show status message
                showStatusMessage('Tracking started. Look around the screen to generate data.');
            } else {
                console.error('GazeCloudAPI not found');
                showError('GazeCloudAPI not found. Please refresh the page and try again.');
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
            // Stop GazeCloudAPI
            if (typeof GazeCloudAPI !== 'undefined') {
                GazeCloudAPI.StopEyeTracking();
            }
            
            // Stop duration timer
            clearInterval(durationInterval);
            
            // End session in database
            if (currentSessionId) {
                await GazeDB.endSession(currentSessionId, dataPointsCount);
                
                // Save data to server
                await saveSessionToServer(currentSessionId, allGazeData);
                
                // Generate and save CSV file
                const csvData = generateCSV(allGazeData);
                saveCSVLocally(csvData, `gaze_data_session_${currentSessionId}.csv`);
            }
            
            isTracking = false;
            console.log('Tracking stopped');
            
            // Update UI to reflect tracking state
            updateTrackingUI(false);
            
            // Show status message
            showStatusMessage('Tracking stopped. Data has been saved.');
        } catch (error) {
            console.error('Error stopping tracking:', error);
            showError('Failed to stop tracking properly. Some data may not be saved.');
        }
    };
    
    /**
     * Update UI elements based on tracking state
     * @param {boolean} isActive - Whether tracking is active
     */
    const updateTrackingUI = (isActive) => {
        const startButton = document.getElementById('start-tracking');
        const stopButton = document.getElementById('stop-tracking');
        const exportButton = document.getElementById('export-data');
        
        if (startButton && stopButton) {
            if (isActive) {
                startButton.classList.add('disabled');
                stopButton.classList.remove('disabled');
                if (exportButton) {
                    exportButton.classList.add('disabled');
                }
            } else {
                startButton.classList.remove('disabled');
                stopButton.classList.add('disabled');
                if (exportButton) {
                    exportButton.classList.remove('disabled');
                }
            }
        }
        
        // Update API status display
        updateAPIStatusDisplay();
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
            showError('GazeCloudAPI not loaded. Please wait for it to load or refresh the page.');
            return;
        }
        
        // Show calibration overlay
        const calibrationOverlay = document.getElementById('calibration-overlay');
        if (calibrationOverlay) {
            calibrationOverlay.classList.remove('hidden');
        }
        
        // Configure video container
        if (videoContainer) {
            // Clear any existing content
            videoContainer.innerHTML = '';
            // Set the video container for GazeCloudAPI
            GazeCloudAPI.SetVideoContainerElement(videoContainer);
        }
        
        // GazeCloudAPI handles calibration automatically when starting tracking
        if (typeof GazeCloudAPI !== 'undefined') {
            isCalibrating = true;
            GazeCloudAPI.StartEyeTracking();
            console.log('Calibration started');
            
            // Show status message
            showStatusMessage('Calibration started. Please follow the instructions on screen.');
        } else {
            console.error('GazeCloudAPI not found');
            showError('GazeCloudAPI not found. Please refresh the page and try again.');
        }
    };
    
    /**
     * Handle gaze data from GazeCloudAPI
     * @param {Object} gazeData - The gaze data from GazeCloudAPI
     */
    const handleGazeData = (gazeData) => {
        if (!isTracking && !isCalibrating) {
            return;
        }
        
        // Extract data
        const { docX, docY, state } = gazeData;
        
        // Only process valid gaze data
        if (state !== 0) {
            return; // Invalid gaze data
        }
        
        // Update UI
        updateGazeDisplay(docX, docY);
        
        // Add to heatmap if tracking (not just calibrating)
        if (isTracking) {
            GazeHeatmap.addGazePoint(docX, docY);
            
            // Store in database and memory
            storeGazeData(gazeData);
            
            // Increment counter
            dataPointsCount++;
            updateDataPointsDisplay();
        }
    };
    
    /**
     * Handle calibration end event
     */
    const handleCalibrationEnd = () => {
        // Hide calibration overlay
        const calibrationOverlay = document.getElementById('calibration-overlay');
        if (calibrationOverlay) {
            calibrationOverlay.classList.add('hidden');
        }
        
        isCalibrating = false;
        console.log('Calibration completed');
        
        // If we weren't already tracking, start a new session
        if (!isTracking) {
            startTracking();
        }
        
        // Show status message
        showStatusMessage('Calibration completed successfully. Tracking is now active.');
    };
    
    /**
     * Store gaze data in the database and memory
     * @param {Object} gazeData - The gaze data to store
     */
    const storeGazeData = async (gazeData) => {
        try {
            // Extract relevant data
            const { 
                docX, docY, state, time
            } = gazeData;
            
            // Create data object
            const dataObject = {
                gazeX: docX,
                gazeY: docY,
                gazeState: state,
                timestamp: time || Date.now()
            };
            
            // Store in database
            await GazeDB.storeGazeData(currentSessionId, dataObject);
            
            // Store in memory
            allGazeData.push(dataObject);
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
     * Generate CSV data from gaze data
     * @param {Array} gazeData - The gaze data array
     * @returns {string} - CSV string
     */
    const generateCSV = (gazeData) => {
        if (!gazeData || gazeData.length === 0) {
            return 'No data available';
        }
        
        // CSV header
        const headers = ['timestamp', 'gazeX', 'gazeY', 'gazeState'];
        
        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...gazeData.map(data => {
                return [
                    data.timestamp,
                    data.gazeX,
                    data.gazeY,
                    data.gazeState
                ].join(',');
            })
        ].join('\n');
        
        return csvContent;
    };
    
    /**
     * Save CSV data locally by triggering a download
     * @param {string} csvData - The CSV data string
     * @param {string} filename - The filename to save as
     */
    const saveCSVLocally = (csvData, filename) => {
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
     * Export session data as CSV
     */
    const exportCSV = async () => {
        if (!currentSessionId && allGazeData.length === 0) {
            console.warn('No session data to export');
            showError('No session data to export. Start tracking first.');
            return;
        }
        
        try {
            let dataToExport = allGazeData;
            
            // If we have a session ID but no data in memory, try to get it from the database
            if (allGazeData.length === 0 && currentSessionId) {
                dataToExport = await GazeDB.getSessionData(currentSessionId);
            }
            
            // Generate CSV
            const csvData = generateCSV(dataToExport);
            
            // Save CSV file
            const filename = `gaze_data_session_${currentSessionId || Date.now()}.csv`;
            saveCSVLocally(csvData, filename);
            
            showStatusMessage(`Data exported as ${filename}`);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            showError('Failed to export data as CSV. Please try again.');
        }
    };
    
    /**
     * Export session data as JSON
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
     * Check if GazeCloudAPI is available
     * @returns {boolean} - True if GazeCloudAPI is available
     */
    const isAPIAvailable = () => {
        return typeof GazeCloudAPI !== 'undefined';
    };
    
    return {
        init,
        startTracking,
        stopTracking,
        startCalibration,
        showHeatmap,
        hideHeatmap,
        exportSessionData,
        exportCSV,
        isTrackingActive,
        isCalibrationActive,
        getCurrentSessionId,
        showStatusMessage,
        showError,
        isAPIAvailable,
        loadGazeCloudAPI,
        checkAndInitializeAPI,
        updateAPIStatusDisplay
    };
})(); 