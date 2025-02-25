/**
 * Tracking module for GazeTrackingCloud
 * Handles integration with the GazeRecorder API
 */

const GazeTracker = (() => {
    let isTracking = false;
    let currentSessionId = null;
    let dataPointsCount = 0;
    let startTime = null;
    let durationInterval = null;
    
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
        
        // Set up GazeRecorder event listeners
        GazeRecorder.setGazeListener(handleGazeData);
        GazeRecorder.setCalibrationEndListener(handleCalibrationEnd);
        
        console.log('Gaze tracker initialized');
    };
    
    /**
     * Start tracking
     */
    const startTracking = async () => {
        if (isTracking) {
            console.warn('Tracking is already active');
            return;
        }
        
        try {
            // Create a new session in the database
            currentSessionId = await GazeDB.createSession();
            
            // Reset counters
            dataPointsCount = 0;
            startTime = Date.now();
            updateDataPointsDisplay();
            
            // Start duration timer
            durationInterval = setInterval(updateDurationDisplay, 1000);
            
            // Start GazeRecorder
            GazeRecorder.startTracking();
            
            // Initialize heatmap
            GazeHeatmap.init('heatmap-container');
            GazeHeatmap.clear();
            
            isTracking = true;
            console.log('Tracking started');
        } catch (error) {
            console.error('Error starting tracking:', error);
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
            GazeRecorder.stopTracking();
            
            // Stop duration timer
            clearInterval(durationInterval);
            
            // End session in database
            if (currentSessionId) {
                await GazeDB.endSession(currentSessionId, dataPointsCount);
            }
            
            isTracking = false;
            console.log('Tracking stopped');
        } catch (error) {
            console.error('Error stopping tracking:', error);
        }
    };
    
    /**
     * Start calibration
     */
    const startCalibration = () => {
        // Show calibration overlay
        const calibrationOverlay = document.getElementById('calibration-overlay');
        calibrationOverlay.classList.remove('hidden');
        
        // Start GazeRecorder calibration
        GazeRecorder.startCalibration();
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
        
        // Store in database
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
        
        console.log('Calibration completed');
    };
    
    /**
     * Store gaze data in the database
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
            
            // Store in database
            await GazeDB.storeGazeData(currentSessionId, {
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
                eyeRightY: eyeRightY || 0
            });
            
            // Update head position display if available
            if (headX !== undefined && headY !== undefined && headZ !== undefined) {
                updateHeadPositionDisplay(headX, headY, headZ);
            }
        } catch (error) {
            console.error('Error storing gaze data:', error);
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
     * Show heatmap
     */
    const showHeatmap = async () => {
        if (!currentSessionId) {
            console.warn('No active session');
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
        } catch (error) {
            console.error('Error showing heatmap:', error);
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
            return null;
        }
        
        try {
            return await GazeDB.exportSessionData(currentSessionId);
        } catch (error) {
            console.error('Error exporting session data:', error);
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
     * Get current session ID
     * @returns {number|null} - The current session ID or null
     */
    const getCurrentSessionId = () => {
        return currentSessionId;
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
        getCurrentSessionId
    };
})(); 