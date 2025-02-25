/**
 * Main application script for GazeTrackingCloud
 * Initializes and coordinates all modules
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Check for camera permissions
    checkCameraPermissions();
    
    // Initialize database
    try {
        await GazeDB.init();
        console.log('Database initialized');
    } catch (error) {
        console.error('Error initializing database:', error);
        showError('Failed to initialize database. Please refresh the page and try again.');
        return;
    }
    
    // Initialize tracker with error handling
    try {
        GazeTracker.init();
        console.log('GazeTracker initialized successfully');
    } catch (error) {
        console.error('Failed to initialize GazeTracker:', error);
        showError('Failed to initialize eye tracking API. Please refresh and try again.');
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize chart
    initializeChart();
    
    // Check if API is loaded correctly
    const apiStatus = GazeTracker.isAPIAvailable();
    console.log('GazeCloud API status:', apiStatus ? 'Available' : 'Unavailable');
    
    // Update API status with error handling
    try {
        updateAPIStatus();
        // Set interval to check API status periodically
        setInterval(updateAPIStatus, 5000);
    } catch (error) {
        console.error('Error checking API status:', error);
        showError('Error connecting to eye tracking service');
    }
    
    console.log('Application initialized');
});

/**
 * Check for camera permissions and ensure camera system is properly initialized
 */
function checkCameraPermissions() {
    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera API not supported in this browser');
        showError('Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, or Edge.');
        return;
    }
    
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            // Camera access granted
            console.log('Camera access granted');
            
            // Verify we have video tracks
            if (stream.getVideoTracks().length === 0) {
                console.error('No video tracks found in camera stream');
                showError('Camera detected but no video stream available. Please check your camera settings.');
                return;
            }
            
            // Check camera resolution
            const videoTrack = stream.getVideoTracks()[0];
            console.log('Camera details:', videoTrack.getSettings());
            
            // Stop the stream after verification
            stream.getTracks().forEach(track => track.stop());
        })
        .catch(error => {
            console.error('Camera access denied or error:', error);
            
            // Provide more specific error messages based on the error
            if (error.name === 'NotAllowedError') {
                showError('Camera access was denied. Please allow camera access and refresh the page.');
            } else if (error.name === 'NotFoundError') {
                showError('No camera detected. Please connect a camera and refresh the page.');
            } else if (error.name === 'NotReadableError') {
                showError('Camera is in use by another application. Please close other applications using the camera and refresh.');
            } else {
                showError('Camera error: ' + error.message + '. Please check your camera and refresh the page.');
            }
        });
}

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners() {
    // Start tracking button
    const startTrackingBtn = document.getElementById('start-tracking');
    if (startTrackingBtn) {
        startTrackingBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            try {
                if (!GazeTracker.isAPIAvailable()) {
                    GazeTracker.showError('GazeRecorder API not loaded. Please reload the API and try again.');
                    return;
                }
                
                if (!GazeTracker.isTrackingActive() && !GazeTracker.isCalibrationActive()) {
                    // Disable button during calibration and tracking
                    startTrackingBtn.classList.add('disabled');
                    startTrackingBtn.textContent = 'Calibrating...';
                    
                    // Start calibration first
                    await GazeTracker.startCalibration();
                }
            } catch (error) {
                console.error('Error starting tracking:', error);
                GazeTracker.showError('Failed to start tracking: ' + error.message);
                // Reset button state
                startTrackingBtn.classList.remove('disabled');
                startTrackingBtn.textContent = 'Start Tracking';
            }
        });
    } else {
        console.error('Start tracking button not found in the DOM');
    }
    
    // Stop tracking button
    const stopTrackingBtn = document.getElementById('stop-tracking');
    if (stopTrackingBtn) {
        stopTrackingBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            try {
                if (GazeTracker.isTrackingActive()) {
                    // Disable button during processing
                    stopTrackingBtn.classList.add('disabled');
                    stopTrackingBtn.textContent = 'Stopping...';
                    
                    await GazeTracker.stopTracking();
                    
                    // Update chart with session data
                    await updateChartWithSessionData();
                    
                    // Reset buttons
                    if (startTrackingBtn) {
                        startTrackingBtn.classList.remove('disabled');
                        startTrackingBtn.textContent = 'Start Tracking';
                    }
                    stopTrackingBtn.classList.remove('disabled');
                    stopTrackingBtn.textContent = 'Stop Tracking';
                }
            } catch (error) {
                console.error('Error stopping tracking:', error);
                GazeTracker.showError('Failed to stop tracking: ' + error.message);
                // Reset button state
                stopTrackingBtn.classList.remove('disabled');
                stopTrackingBtn.textContent = 'Stop Tracking';
            }
        });
    } else {
        console.error('Stop tracking button not found in the DOM');
    }
    
    // Show heatmap button
    const showHeatmapBtn = document.getElementById('show-heatmap');
    if (showHeatmapBtn) {
        showHeatmapBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            try {
                const heatmapContainer = document.getElementById('heatmap-container');
                if (!heatmapContainer) {
                    throw new Error('Heatmap container not found');
                }
                
                if (heatmapContainer.classList.contains('hidden')) {
                    showHeatmapBtn.textContent = 'Generating...';
                    await GazeTracker.showHeatmap();
                    showHeatmapBtn.textContent = 'Hide Heatmap';
                } else {
                    GazeTracker.hideHeatmap();
                    showHeatmapBtn.textContent = 'Show Heatmap';
                }
            } catch (error) {
                console.error('Error with heatmap:', error);
                GazeTracker.showError('Failed to handle heatmap: ' + error.message);
                showHeatmapBtn.textContent = 'Show Heatmap';
            }
        });
    } else {
        console.error('Show heatmap button not found in the DOM');
    }
    
    // Export data button
    const exportDataBtn = document.getElementById('export-data');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            try {
                const sessionId = GazeTracker.getCurrentSessionId();
                if (!sessionId) {
                    GazeTracker.showError('No active session to export');
                    return;
                }
                
                exportDataBtn.textContent = 'Exporting...';
                
                const jsonData = await GazeTracker.exportSessionData();
                if (!jsonData) {
                    GazeTracker.showError('No data to export');
                    exportDataBtn.textContent = 'Export Data';
                    return;
                }
                
                // Create download link
                const blob = new Blob([jsonData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gaze-data-session-${sessionId}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                GazeTracker.showStatusMessage('Data exported successfully');
            } catch (error) {
                console.error('Error exporting data:', error);
                GazeTracker.showError('Failed to export data: ' + error.message);
            } finally {
                exportDataBtn.textContent = 'Export Data';
            }
        });
    } else {
        console.error('Export data button not found in the DOM');
    }
    
    // Reload API button
    const reloadAPIBtn = document.getElementById('reload-api');
    if (reloadAPIBtn) {
        reloadAPIBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            reloadAPIBtn.classList.add('disabled');
            reloadAPIBtn.textContent = 'Loading...';
            
            try {
                await GazeTracker.loadGazeRecorderAPI();
                GazeTracker.checkAndInitializeAPI();
                updateAPIStatus();
                GazeTracker.showStatusMessage('GazeRecorder API reloaded successfully');
            } catch (error) {
                console.error('Error reloading API:', error);
                GazeTracker.showError('Failed to reload GazeRecorder API: ' + error.message);
            } finally {
                reloadAPIBtn.classList.remove('disabled');
                reloadAPIBtn.textContent = 'Reload API';
            }
        });
    } else {
        console.error('Reload API button not found in the DOM');
    }
    
    // Check API status button
    const checkAPIStatusBtn = document.getElementById('check-api-status');
    if (checkAPIStatusBtn) {
        checkAPIStatusBtn.addEventListener('click', (e) => {
            e.preventDefault();
            try {
                updateAPIStatus();
                GazeTracker.showStatusMessage('API status updated');
            } catch (error) {
                console.error('Error checking API status:', error);
                GazeTracker.showError('Failed to check API status: ' + error.message);
            }
        });
    } else {
        console.error('Check API status button not found in the DOM');
    }
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        try {
            // ESC key to stop tracking
            if (e.key === 'Escape' && GazeTracker.isTrackingActive() && stopTrackingBtn) {
                stopTrackingBtn.click();
            }
        } catch (error) {
            console.error('Error handling keyboard shortcut:', error);
        }
    });
}

/**
 * Update API status indicator
 */
function updateAPIStatus() {
    const statusIndicator = document.getElementById('api-status-indicator');
    const statusText = document.getElementById('api-status-text');
    
    if (GazeTracker.isAPIAvailable()) {
        statusIndicator.className = 'status-dot status-online';
        statusText.textContent = 'GazeRecorder API is loaded and ready';
    } else {
        statusIndicator.className = 'status-dot status-offline';
        statusText.textContent = 'GazeRecorder API is not loaded';
    }
}

/**
 * Initialize the gaze pattern chart
 */
function initializeChart() {
    const ctx = document.getElementById('gaze-chart').getContext('2d');
    
    window.gazeChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Gaze Points',
                data: [],
                backgroundColor: 'rgba(52, 152, 219, 0.5)',
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'X Coordinate'
                    }
                },
                y: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Y Coordinate'
                    },
                    reverse: true // Reverse Y axis to match screen coordinates
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Gaze Pattern Visualization'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `X: ${context.parsed.x}, Y: ${context.parsed.y}`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update chart with session data
 */
async function updateChartWithSessionData() {
    const sessionId = GazeTracker.getCurrentSessionId();
    if (!sessionId) {
        return;
    }
    
    try {
        // Get session data from database
        const sessionData = await GazeDB.getSessionData(sessionId);
        
        // Format data for chart
        const chartData = sessionData.map(data => ({
            x: data.gazeX,
            y: data.gazeY
        }));
        
        // Update chart
        window.gazeChart.data.datasets[0].data = chartData;
        window.gazeChart.update();
        
        GazeTracker.showStatusMessage('Chart updated with session data');
    } catch (error) {
        console.error('Error updating chart:', error);
        GazeTracker.showError('Failed to update chart with session data');
    }
}

/**
 * Show error message with enhanced error handling
 * @param {string} message - The error message to display
 * @param {Error} [error] - Optional error object for detailed logging
 * @param {string} [level='error'] - Error severity level: 'error', 'warning', or 'info'
 */
function showError(message, error, level = 'error') {
    // Log to console with appropriate level
    if (level === 'warning') {
        console.warn(`Warning: ${message}`);
    } else if (level === 'info') {
        console.info(`Info: ${message}`);
    } else {
        console.error(`Error: ${message}`);
    }
    
    // Log detailed error if provided
    if (error) {
        console.error('Error details:', error);
        console.error('Stack trace:', error.stack);
    }
    
    // Create UI notification instead of using alert
    const errorContainer = document.getElementById('error-container') || createErrorContainer();
    
    // Create error message element
    const errorElement = document.createElement('div');
    errorElement.className = `notification ${level}`;
    errorElement.innerHTML = `
        <span class="notification-icon">${level === 'error' ? '❌' : level === 'warning' ? '⚠️' : 'ℹ️'}</span>
        <span class="notification-message">${message}</span>
        <button class="notification-close">×</button>
    `;
    
    // Add close button functionality
    const closeButton = errorElement.querySelector('.notification-close');
    closeButton.addEventListener('click', () => {
        errorElement.remove();
    });
    
    // Auto-remove after 10 seconds for non-critical errors
    if (level !== 'error') {
        setTimeout(() => {
            errorElement.remove();
        }, 10000);
    }
    
    // Add to container
    errorContainer.appendChild(errorElement);
}

/**
 * Creates error container if it doesn't exist
 * @returns {HTMLElement} The error container element
 */
function createErrorContainer() {
    const container = document.createElement('div');
    container.id = 'error-container';
    container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
    document.body.appendChild(container);
    return container;
}