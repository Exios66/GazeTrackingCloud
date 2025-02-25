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
    
    // Performance optimization constants
    const BATCH_SIZE = 100; // Number of data points to batch before storing
    const MEMORY_LIMIT = 10000; // Maximum number of data points to keep in memory
    const HEATMAP_UPDATE_INTERVAL = 30; // Update heatmap every N points
    const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // Auto-save every 5 minutes (in ms)
    
    let gazeDataBatch = []; // Batch for efficient database writes
    let autoSaveTimer = null; // Timer for auto-saving during long sessions
    let lastPerformanceCheck = 0; // Timestamp of last performance check
    let performanceCheckInterval = 60000; // Check performance every minute
    let lastMemoryUsage = 0; // Last recorded memory usage
    
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
        console.log('Initializing GazeTracker...');
        
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
        const checkApiStatusBtn = document.getElementById('check-api-status');
        if (checkApiStatusBtn) {
            checkApiStatusBtn.addEventListener('click', updateAPIStatusDisplay);
        }
        
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                // Check if GazeCloudAPI is loaded
                setTimeout(checkAndInitializeAPI, 1000); // Give it a second to load
            });
        } else {
            // DOM already loaded, check API
            setTimeout(checkAndInitializeAPI, 1000); // Give it a second to load
        }
        
        console.log('Gaze tracker initialization started');
    };
    
    /**
     * Check if GazeCloudAPI is loaded and initialize it
     */
    const checkAndInitializeAPI = () => {
        console.log('Checking GazeCloudAPI availability...');
        console.log('GazeCloudAPI defined?', typeof GazeCloudAPI !== 'undefined');
        
        if (typeof GazeCloudAPI !== 'undefined') {
            // API is loaded, set up event listeners
            try {
                console.log('GazeCloudAPI found, setting up callbacks...');
                
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
                
                // Enable click recalibration if available
                if (typeof GazeCloudAPI.UseClickRecalibration !== 'undefined') {
                    GazeCloudAPI.UseClickRecalibration = true;
                }
                
                // No longer using SetFeedbackLink as it's not available
                
                console.log('GazeCloudAPI initialized successfully');
                showStatusMessage('GazeCloudAPI loaded successfully. Click "Start Tracking" to begin.');
                updateAPIStatusDisplay();
                return true;
            } catch (error) {
                console.error('Error initializing GazeCloudAPI:', error);
                showError('Error initializing GazeCloudAPI: ' + error.message);
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
                            showError('Failed to load GazeCloudAPI after multiple attempts. Please refresh the page.');
                        } else {
                            checkAndInitializeAPI(); // Try again
                        }
                    });
                }, delay);
                
                return false;
            } else {
                showError('Failed to load GazeCloudAPI after multiple attempts. Please refresh the page.');
                return false;
            }
        }
    };
    
    /**
     * Update API status display
     */
    const updateAPIStatusDisplay = () => {
        const statusText = document.getElementById('api-status-text');
        
        if (!statusIndicator || !statusText) {
            console.error('Status elements not found');
            return;
        }
        
        console.log('Updating API status display. API available:', isAPIAvailable());
        
        if (isAPIAvailable()) {
            statusIndicator.style.backgroundColor = '#2ecc71'; // Green
            statusText.textContent = 'API Available';
            
            if (isTracking) {
                statusText.textContent += ' (Tracking Active)';
                
                // Add recording indicator to video container if not already present
                if (videoContainer && !document.querySelector('.recording-indicator')) {
                    const recordingIndicator = document.createElement('div');
                    recordingIndicator.className = 'recording-indicator';
                    videoContainer.appendChild(recordingIndicator);
                }
            }
        } else {
            statusIndicator.style.backgroundColor = '#e74c3c'; // Red
            statusText.textContent = 'API Unavailable';
        }
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
            
            console.log('Attempting to load GazeCloudAPI dynamically...');
            
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
                console.log('GazeCloudAPI script loaded successfully');
                
                // Verify the API is actually available
                if (typeof GazeCloudAPI !== 'undefined') {
                    console.log('GazeCloudAPI object is available');
                    resolve();
                } else {
                    console.error('GazeCloudAPI script loaded but API object not available');
                    reject(new Error('GazeCloudAPI loaded but not available'));
                }
            };
            
            // Set up error handler
            script.onerror = () => {
                clearTimeout(timeoutId);
                console.error('Failed to load GazeCloudAPI script');
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
        
        // Check if API is available
        if (!isAPIAvailable()) {
            console.warn('GazeCloudAPI not available, attempting to load...');
            
            try {
                const apiLoaded = await loadGazeCloudAPI();
                if (!apiLoaded) {
                    console.error('Failed to load GazeCloudAPI');
                    showError('Failed to load eye tracking API. Please check your internet connection and try again.');
                    return;
                }
            } catch (error) {
                console.error('Error loading GazeCloudAPI:', error);
                showError('Failed to load eye tracking API. Please check your internet connection and try again.');
                return;
            }
        }
        
        try {
            console.log('Starting tracking session...');
            
            // Create a new session in the database
            currentSessionId = await GazeDB.createSession();
            console.log('Created session with ID:', currentSessionId);
            
            // Reset counters and data arrays
            dataPointsCount = 0;
            allGazeData = [];
            gazeDataBatch = [];
            startTime = Date.now();
            lastPerformanceCheck = Date.now();
            lastMemoryUsage = getMemoryUsage();
            updateDataPointsDisplay();
            
            // Start duration timer
            durationInterval = setInterval(updateDurationDisplay, 1000);
            
            // Start auto-save timer for long sessions
            autoSaveTimer = setInterval(autoSaveSession, AUTO_SAVE_INTERVAL);
            
            // Start GazeCloudAPI
            if (typeof GazeCloudAPI !== 'undefined') {
                // Configure video container
                if (videoContainer) {
                    // Clear any existing content
                    videoContainer.innerHTML = '';
                    
                    // Set the video container for GazeCloudAPI if the method exists
                    console.log('Setting video container for GazeCloudAPI');
                    if (typeof GazeCloudAPI.SetVideoContainerElement === 'function') {
                        GazeCloudAPI.SetVideoContainerElement(videoContainer);
                    } else {
                        console.warn('GazeCloudAPI.SetVideoContainerElement is not available');
                        
                        // Create a message to inform the user
                        const message = document.createElement('div');
                        message.className = 'api-message';
                        message.textContent = 'Calibration will appear in a separate window. Please follow the instructions there.';
                        message.style.padding = '10px';
                        message.style.backgroundColor = '#f8f9fa';
                        message.style.border = '1px solid #dee2e6';
                        message.style.borderRadius = '4px';
                        message.style.marginBottom = '10px';
                        videoContainer.appendChild(message);
                        
                        // Create an observer to watch for when GazeCloudAPI adds video elements to the body
                        setupVideoObserver();
                    }
                }
                
                // Start tracking
                console.log('Calling GazeCloudAPI.StartEyeTracking()');
                GazeCloudAPI.StartEyeTracking();
                
                // Initialize heatmap
                GazeHeatmap.init('heatmap-container');
                GazeHeatmap.clear();
                
                isTracking = true;
                console.log('Tracking started successfully');
                
                // Update UI to reflect tracking state
                updateTrackingUI(true);
                
                // Show status message
                showStatusMessage('Tracking started. Look around the screen to generate data.');
            } else {
                console.error('GazeCloudAPI not found after loading attempt');
                showError('GazeCloudAPI not found. Please refresh the page and try again.');
            }
        } catch (error) {
            console.error('Error starting tracking:', error);
            showError('Failed to start tracking: ' + error.message);
        }
    };
    
    /**
     * Set up an observer to watch for video elements added by GazeCloudAPI
     */
    const setupVideoObserver = () => {
        // Create a MutationObserver to watch for changes to the DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        
                        // Check if the added node is a video element or contains video elements
                        if (node.nodeName === 'VIDEO' || (node.querySelector && node.querySelector('video'))) {
                            const videoElement = node.nodeName === 'VIDEO' ? node : node.querySelector('video');
                            
                            if (videoElement && videoContainer) {
                                console.log('Found video element added by GazeCloudAPI');
                                
                                // Clone the video element
                                const clonedVideo = videoElement.cloneNode(true);
                                
                                // Style the cloned video
                                clonedVideo.style.width = '100%';
                                clonedVideo.style.height = 'auto';
                                clonedVideo.style.borderRadius = '8px';
                                
                                // Clear the container and add the cloned video
                                videoContainer.innerHTML = '';
                                videoContainer.appendChild(clonedVideo);
                                
                                // Add recording indicator
                                const recordingIndicator = document.createElement('div');
                                recordingIndicator.className = 'recording-indicator';
                                videoContainer.appendChild(recordingIndicator);
                                
                                // We found what we were looking for, so disconnect the observer
                                observer.disconnect();
                            }
                        }
                    }
                }
            });
        });
        
        // Start observing the document body for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Store the observer so we can disconnect it later if needed
        window.gazeVideoObserver = observer;
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
            console.log('Stopping tracking...');
            
            // Stop GazeCloudAPI
            if (typeof GazeCloudAPI !== 'undefined') {
                GazeCloudAPI.StopEyeTracking();
            }
            
            // Stop timers
            clearInterval(durationInterval);
            clearInterval(autoSaveTimer);
            
            // Disconnect video observer if it exists
            if (window.gazeVideoObserver) {
                window.gazeVideoObserver.disconnect();
                window.gazeVideoObserver = null;
            }
            
            // Flush any remaining data in the batch
            if (gazeDataBatch.length > 0) {
                await flushGazeDataBatch();
            }
            
            // End session in database
            if (currentSessionId) {
                await GazeDB.endSession(currentSessionId, dataPointsCount);
                
                // Save data to server
                try {
                    await saveSessionToServer(currentSessionId, allGazeData);
                } catch (error) {
                    console.error('Error saving to server, continuing with local save:', error);
                }
                
                // Generate and save CSV file with improved formatting
                const csvData = await generateCSV(currentSessionId);
                
                // Format date for filename
                const now = new Date();
                const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
                const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS
                
                // Save CSV file with better filename
                const filename = `gaze_data_session_${currentSessionId}_${dateStr}_${timeStr}.csv`;
                saveCSVLocally(csvData, filename);
            }
            
            isTracking = false;
            console.log('Tracking stopped successfully');
            
            // Update UI to reflect tracking state
            updateTrackingUI(false);
            
            // Show status message
            showStatusMessage('Tracking stopped. Data has been saved.');
            
            // Remove recording indicator if it exists
            const recordingIndicator = document.querySelector('.recording-indicator');
            if (recordingIndicator && recordingIndicator.parentNode) {
                recordingIndicator.parentNode.removeChild(recordingIndicator);
            }
            
            // Show placeholder if video container is empty
            if (videoContainer && videoContainer.children.length === 0) {
                const placeholder = document.createElement('div');
                placeholder.id = 'video-placeholder';
                const placeholderText = document.createElement('p');
                placeholderText.textContent = 'Your webcam feed will appear here';
                placeholder.appendChild(placeholderText);
                videoContainer.appendChild(placeholder);
            }
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
        if (!isAPIAvailable()) {
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
            
            // Set the video container for GazeCloudAPI if the method exists
            if (typeof GazeCloudAPI.SetVideoContainerElement === 'function') {
                GazeCloudAPI.SetVideoContainerElement(videoContainer);
            } else {
                console.warn('GazeCloudAPI.SetVideoContainerElement is not available');
                
                // Create a message to inform the user
                const message = document.createElement('div');
                message.className = 'api-message';
                message.textContent = 'Calibration will appear in a separate window. Please follow the instructions there.';
                message.style.padding = '10px';
                message.style.backgroundColor = '#f8f9fa';
                message.style.border = '1px solid #dee2e6';
                message.style.borderRadius = '4px';
                message.style.marginBottom = '10px';
                videoContainer.appendChild(message);
                
                // Set up observer to watch for video elements
                setupVideoObserver();
            }
        }
        
        // GazeCloudAPI handles calibration automatically when starting tracking
        if (typeof GazeCloudAPI !== 'undefined') {
            isCalibrating = true;
            console.log('Starting calibration...');
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
            // Update heatmap less frequently for better performance
            if (dataPointsCount % HEATMAP_UPDATE_INTERVAL === 0) {
                GazeHeatmap.addGazePoint(docX, docY);
            }
            
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
            
            // Add to batch
            gazeDataBatch.push(dataObject);
            
            // Store in memory (with limit check)
            if (allGazeData.length < MEMORY_LIMIT) {
                allGazeData.push(dataObject);
            }
            
            // Flush batch when it reaches the batch size
            if (gazeDataBatch.length >= BATCH_SIZE) {
                await flushGazeDataBatch();
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
     * Generate CSV from session data
     * @param {string} sessionId - The session ID to generate CSV for
     * @returns {string} - The CSV content
     */
    const generateCSV = async (sessionId) => {
        try {
            // Get session data from database instead of using in-memory data
            // This ensures we have all data even if memory was trimmed
            const sessionData = await GazeDB.getSessionData(sessionId);
            
            if (!sessionData || sessionData.length === 0) {
                console.warn('No session data found for CSV generation');
                return '';
            }
            
            // Get session start time
            const sessionStartTime = sessionData[0].timestamp;
            
            // Generate CSV header
            const header = [
                'timestamp',          // Unix timestamp (milliseconds)
                'datetime',           // ISO date format
                'elapsed_time',       // Elapsed time from session start (HH:MM:SS.mmm)
                'gaze_x',             // Gaze X coordinate
                'gaze_y',             // Gaze Y coordinate
                'gaze_state',         // Gaze state (descriptive)
                'session_id'          // Session ID
            ].join(',');
            
            // Process data in chunks to avoid memory issues with large datasets
            const CHUNK_SIZE = 5000;
            let csvContent = header + '\n';
            
            for (let i = 0; i < sessionData.length; i += CHUNK_SIZE) {
                const chunk = sessionData.slice(i, i + CHUNK_SIZE);
                
                // Process chunk
                const chunkContent = chunk.map(data => {
                    // Calculate elapsed time from session start
                    const elapsedMs = data.timestamp - sessionStartTime;
                    const elapsedSec = Math.floor(elapsedMs / 1000);
                    const hours = Math.floor(elapsedSec / 3600).toString().padStart(2, '0');
                    const minutes = Math.floor((elapsedSec % 3600) / 60).toString().padStart(2, '0');
                    const seconds = (elapsedSec % 60).toString().padStart(2, '0');
                    const milliseconds = (elapsedMs % 1000).toString().padStart(3, '0');
                    const elapsedFormatted = `${hours}:${minutes}:${seconds}.${milliseconds}`;
                    
                    // Format date and time
                    const date = new Date(data.timestamp);
                    const dateFormatted = date.toISOString();
                    
                    return [
                        data.timestamp,                      // Unix timestamp (milliseconds)
                        dateFormatted,                       // ISO date format (YYYY-MM-DDTHH:MM:SS.sssZ)
                        elapsedFormatted,                    // Elapsed time (HH:MM:SS.mmm)
                        data.gazeX.toFixed(2),               // Gaze X coordinate with 2 decimal places
                        data.gazeY.toFixed(2),               // Gaze Y coordinate with 2 decimal places
                        getGazeStateDescription(data.gazeState), // Descriptive gaze state
                        sessionId                            // Session ID
                    ].join(',');
                }).join('\n');
                
                csvContent += chunkContent + '\n';
            }
            
            return csvContent;
        } catch (error) {
            console.error('Error generating CSV:', error);
            return '';
        }
    };
    
    /**
     * Get descriptive text for gaze state value
     * @param {number} state - The gaze state value
     * @returns {string} - Descriptive text
     */
    const getGazeStateDescription = (state) => {
        switch (state) {
            case 0:
                return 'Valid';
            case 1:
                return 'Invalid';
            case 2:
                return 'Calibrating';
            case 3:
                return 'Tracking Paused';
            case 4:
                return 'Tracking Resumed';
            default:
                return `Unknown (${state})`;
        }
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
        
        // Show success message
        showStatusMessage(`CSV file "${filename}" downloaded successfully`);
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
        console.log('Status message:', message);
        
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
        console.error('Error:', message);
        
        // Use the app's showError function if available
        if (typeof window.showError === 'function') {
            window.showError(message, null, 'error');
        } else {
            // Fallback to alert
            alert(message);
        }
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
            const csvData = await generateCSV(currentSessionId);
            
            // Format date for filename
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
            const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS
            
            // Save CSV file with better filename
            const filename = `gaze_data_session_${currentSessionId}_${dateStr}_${timeStr}.csv`;
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
    
    /**
     * Auto-save session data during long recordings
     */
    const autoSaveSession = async () => {
        if (!isTracking || !currentSessionId) {
            return;
        }
        
        try {
            console.log('Auto-saving session data...');
            
            // Flush any pending data
            if (gazeDataBatch.length > 0) {
                await flushGazeDataBatch();
            }
            
            // Check memory usage and performance
            checkPerformance();
            
            console.log(`Auto-saved ${dataPointsCount} data points`);
            showStatusMessage('Session data auto-saved');
        } catch (error) {
            console.error('Error during auto-save:', error);
        }
    };
    
    /**
     * Check system performance during long sessions
     */
    const checkPerformance = () => {
        const now = Date.now();
        
        // Only check every minute
        if (now - lastPerformanceCheck < performanceCheckInterval) {
            return;
        }
        
        lastPerformanceCheck = now;
        
        // Check memory usage
        const currentMemoryUsage = getMemoryUsage();
        const memoryDelta = currentMemoryUsage - lastMemoryUsage;
        lastMemoryUsage = currentMemoryUsage;
        
        console.log(`Memory usage: ${currentMemoryUsage.toFixed(2)} MB (${memoryDelta > 0 ? '+' : ''}${memoryDelta.toFixed(2)} MB)`);
        
        // If memory usage is growing too fast, trim the in-memory data
        if (memoryDelta > 10 && allGazeData.length > MEMORY_LIMIT) {
            console.log(`Memory usage growing too fast, trimming in-memory data from ${allGazeData.length} points`);
            allGazeData = allGazeData.slice(-MEMORY_LIMIT);
            console.log(`Trimmed to ${allGazeData.length} points`);
        }
    };
    
    /**
     * Get current memory usage in MB
     */
    const getMemoryUsage = () => {
        if (window.performance && window.performance.memory) {
            return window.performance.memory.usedJSHeapSize / (1024 * 1024);
        }
        return 0;
    };
    
    /**
     * Flush batched gaze data to database
     */
    const flushGazeDataBatch = async () => {
        if (gazeDataBatch.length === 0) {
            return;
        }
        
        try {
            // Store batch in database
            await GazeDB.storeBatchGazeData(currentSessionId, gazeDataBatch);
            
            // Clear the batch
            gazeDataBatch = [];
        } catch (error) {
            console.error('Error flushing gaze data batch:', error);
        }
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
        updateAPIStatusDisplay,
        autoSaveSession,
        checkPerformance,
        flushGazeDataBatch
    };
})(); 