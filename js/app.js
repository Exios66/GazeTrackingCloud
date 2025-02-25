/**
 * Main application script for GazeTrackingCloud
 * Initializes and coordinates all modules
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing application...');
    
    // Add global error handler for debugging
    window.onerror = function(message, source, lineno, colno, error) {
        console.error('Global error:', message, 'at', source, lineno, colno);
        console.error('Error object:', error);
        showError('An error occurred: ' + message);
        return true;
    };
    
    // Check for camera permissions
    checkCameraPermissions();
    
    // Initialize database
    try {
        await GazeDB.init();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        showError('Failed to initialize database. Please refresh the page and try again.');
        return;
    }
    
    // Initialize tracker with error handling
    try {
        GazeTracker.init();
        console.log('GazeTracker initialization started');
    } catch (error) {
        console.error('Failed to initialize GazeTracker:', error);
        showError('Failed to initialize eye tracking API. Please refresh and try again.');
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize chart
    initializeChart();
    
    // Check if API is loaded correctly
    setTimeout(() => {
        const apiStatus = GazeTracker.isAPIAvailable();
        console.log('GazeCloud API status check:', apiStatus ? 'Available' : 'Unavailable');
        
        // Update API status with error handling
        try {
            updateAPIStatus();
            // Set interval to check API status periodically
            setInterval(updateAPIStatus, 5000);
        } catch (error) {
            console.error('Error checking API status:', error);
            showError('Error connecting to eye tracking service');
        }
    }, 2000); // Give the API some time to load
    
    // Add CSS for disabled buttons
    addButtonStyles();
    
    console.log('Application initialization completed');
});

/**
 * Add CSS styles for disabled buttons
 */
function addButtonStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .disabled {
            opacity: 0.6;
            cursor: not-allowed;
            pointer-events: none;
        }
        
        #video-container {
            position: relative;
            width: 100%;
            min-height: 240px;
            background-color: #f0f0f0;
            border-radius: 8px;
            overflow: hidden;
        }
        
        #video-container video {
            width: 100%;
            height: auto;
            display: block;
        }
        
        .recording-indicator {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: #e74c3c;
            animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Check for camera permissions and ensure camera system is properly initialized
 */
function checkCameraPermissions() {
    console.log('Checking camera permissions...');
    
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
    console.log('Setting up event listeners...');
    
    // Start tracking button
    const startTrackingBtn = document.getElementById('start-tracking');
    if (startTrackingBtn) {
        startTrackingBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            try {
                console.log('Start tracking button clicked');
                
                if (!GazeTracker.isAPIAvailable()) {
                    console.log('API not available, attempting to load...');
                    GazeTracker.showError('GazeCloud API not loaded. Attempting to reload the API...');
                    
                    // Try to reload the API
                    try {
                        await GazeTracker.loadGazeCloudAPI();
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
                        await GazeTracker.checkAndInitializeAPI();
                    } catch (error) {
                        console.error('Failed to load API:', error);
                        GazeTracker.showError('Failed to load GazeCloud API. Please refresh the page and try again.');
                        return;
                    }
                }
                
                if (!GazeTracker.isTrackingActive() && !GazeTracker.isCalibrationActive()) {
                    // Disable button during calibration and tracking
                    startTrackingBtn.classList.add('disabled');
                    startTrackingBtn.textContent = 'Calibrating...';
                    
                    // Clear any previous recording indicator
                    const videoContainer = document.getElementById('video-container');
                    if (videoContainer) {
                        const placeholder = document.getElementById('video-placeholder');
                        if (placeholder) {
                            videoContainer.removeChild(placeholder);
                        }
                    }
                    
                    // Start calibration first
                    console.log('Starting calibration...');
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
                console.log('Stop tracking button clicked');
                
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
                    
                    // Remove recording indicator if it exists
                    const recordingIndicator = document.querySelector('.recording-indicator');
                    if (recordingIndicator) {
                        recordingIndicator.remove();
                    }
                    
                    // Show placeholder if video container is empty
                    const videoContainer = document.getElementById('video-container');
                    if (videoContainer && videoContainer.children.length === 0) {
                        const placeholder = document.createElement('div');
                        placeholder.id = 'video-placeholder';
                        const placeholderText = document.createElement('p');
                        placeholderText.textContent = 'Your webcam feed will appear here';
                        placeholder.appendChild(placeholderText);
                        videoContainer.appendChild(placeholder);
                    }
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
                    
                    // Add heatmap controls if they don't exist
                    addHeatmapControls(heatmapContainer);
                    
                    // Display heatmap summary
                    displayHeatmapSummary();
                    
                    showHeatmapBtn.textContent = 'Hide Heatmap';
                } else {
                    GazeTracker.hideHeatmap();
                    showHeatmapBtn.textContent = 'Show Heatmap';
                    
                    // Hide summary
                    const summaryElement = document.getElementById('heatmap-summary');
                    if (summaryElement) {
                        summaryElement.classList.add('hidden');
                    }
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
        exportDataBtn.addEventListener('click', handleExportData);
    } else {
        console.error('Export data button not found in the DOM');
    }
    
    // Reload API button
    const reloadAPIBtn = document.getElementById('reload-api');
    if (reloadAPIBtn) {
        reloadAPIBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            try {
                console.log('Reload API button clicked');
                reloadAPIBtn.textContent = 'Loading...';
                reloadAPIBtn.classList.add('disabled');
                
                await GazeTracker.loadGazeCloudAPI();
                await GazeTracker.checkAndInitializeAPI();
                updateAPIStatus();
                
                GazeTracker.showStatusMessage('GazeCloud API reloaded successfully');
            } catch (error) {
                console.error('Error reloading API:', error);
                GazeTracker.showError('Failed to reload API: ' + error.message);
            } finally {
                reloadAPIBtn.textContent = 'Reload API';
                reloadAPIBtn.classList.remove('disabled');
            }
        });
    } else {
        console.error('Reload API button not found in the DOM');
    }
    
    // Check API status button
    const checkAPIStatusBtn = document.getElementById('check-api-status');
    if (checkAPIStatusBtn) {
        checkAPIStatusBtn.addEventListener('click', () => {
            console.log('Check API status button clicked');
            updateAPIStatus();
            GazeTracker.showStatusMessage('API status updated');
        });
    }
}

/**
 * Update API status display
 */
function updateAPIStatus() {
    const statusIndicator = document.getElementById('api-status-indicator');
    const statusText = document.getElementById('api-status-text');
    
    if (!statusIndicator || !statusText) {
        console.error('API status elements not found');
        return;
    }
    
    const apiAvailable = GazeTracker.isAPIAvailable();
    console.log('Updating API status display. API available:', apiAvailable);
    
    if (apiAvailable) {
        statusIndicator.style.backgroundColor = '#2ecc71'; // Green
        statusText.textContent = 'API Available';
        
        if (GazeTracker.isTrackingActive()) {
            statusText.textContent += ' (Tracking Active)';
            
            // Add recording indicator to video container if not already present
            const videoContainer = document.getElementById('video-container');
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
}

/**
 * Initialize chart for visualization
 */
function initializeChart() {
    const chartCanvas = document.getElementById('gaze-chart');
    if (!chartCanvas) {
        console.error('Chart canvas not found');
        return;
    }
    
    try {
        window.gazeChart = new Chart(chartCanvas, {
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
                        min: 0,
                        max: window.innerWidth,
                        title: {
                            display: true,
                            text: 'X Coordinate'
                        }
                    },
                    y: {
                        min: 0,
                        max: window.innerHeight,
                        title: {
                            display: true,
                            text: 'Y Coordinate'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Gaze Point Distribution'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `(${Math.round(context.parsed.x)}, ${Math.round(context.parsed.y)})`;
                            }
                        }
                    }
                }
            }
        });
        
        console.log('Chart initialized');
    } catch (error) {
        console.error('Error initializing chart:', error);
    }
}

/**
 * Update chart with session data
 */
async function updateChartWithSessionData() {
    if (!window.gazeChart) {
        console.error('Chart not initialized');
        return;
    }
    
    try {
        const sessionId = GazeTracker.getCurrentSessionId();
        if (!sessionId) {
            console.warn('No session ID available for chart update');
            return;
        }
        
        const sessionData = await GazeDB.getSessionData(sessionId);
        if (!sessionData || sessionData.length === 0) {
            console.warn('No session data available for chart');
            return;
        }
        
        // Sample data (take every 10th point to avoid overloading the chart)
        const sampledData = sessionData.filter((_, index) => index % 10 === 0);
        
        // Format data for chart
        const chartData = sampledData.map(data => ({
            x: data.gazeX,
            y: data.gazeY
        }));
        
        // Update chart
        window.gazeChart.data.datasets[0].data = chartData;
        window.gazeChart.update();
        
        console.log(`Chart updated with ${chartData.length} data points`);
    } catch (error) {
        console.error('Error updating chart:', error);
    }
}

/**
 * Show error message to the user
 * @param {string} message - The error message
 * @param {Error} error - Optional error object
 * @param {string} level - Error level (error, warning, info)
 */
function showError(message, error, level = 'error') {
    // Log to console
    if (error) {
        console.error(message, error);
    } else {
        console.error(message);
    }
    
    // Create error container if it doesn't exist
    let errorContainer = document.getElementById('error-container');
    if (!errorContainer) {
        errorContainer = createErrorContainer();
    }
    
    // Create error message element
    const errorElement = document.createElement('div');
    errorElement.className = `error-message ${level}`;
    
    // Set background color based on level
    switch (level) {
        case 'error':
            errorElement.style.backgroundColor = 'rgba(231, 76, 60, 0.9)';
            break;
        case 'warning':
            errorElement.style.backgroundColor = 'rgba(241, 196, 15, 0.9)';
            break;
        case 'info':
            errorElement.style.backgroundColor = 'rgba(52, 152, 219, 0.9)';
            break;
    }
    
    // Add message
    errorElement.textContent = message;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'error-close';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
        errorContainer.removeChild(errorElement);
        
        // Hide container if no more errors
        if (errorContainer.children.length === 0) {
            errorContainer.style.display = 'none';
        }
    });
    
    errorElement.appendChild(closeButton);
    errorContainer.appendChild(errorElement);
    errorContainer.style.display = 'block';
    
    // Auto-hide after 5 seconds for warnings and info
    if (level !== 'error') {
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorContainer.removeChild(errorElement);
                
                // Hide container if no more errors
                if (errorContainer.children.length === 0) {
                    errorContainer.style.display = 'none';
                }
            }
        }, 5000);
    }
}

/**
 * Create error container for displaying error messages
 * @returns {HTMLElement} - The error container element
 */
function createErrorContainer() {
    const container = document.createElement('div');
    container.id = 'error-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.maxWidth = '400px';
    container.style.zIndex = '1000';
    container.style.display = 'none';
    
    // Add styles for error messages
    const style = document.createElement('style');
    style.textContent = `
        .error-message {
            position: relative;
            margin-bottom: 10px;
            padding: 15px 35px 15px 15px;
            border-radius: 4px;
            color: white;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            animation: slideIn 0.3s ease-out;
        }
        
        .error-close {
            position: absolute;
            top: 5px;
            right: 5px;
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            line-height: 24px;
            text-align: center;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(container);
    
    return container;
}

/**
 * Add controls to the heatmap container
 * @param {HTMLElement} container - The heatmap container element
 */
function addHeatmapControls(container) {
    // Check if controls already exist
    if (document.getElementById('heatmap-controls')) {
        return;
    }
    
    // Create controls container
    const controls = document.createElement('div');
    controls.id = 'heatmap-controls';
    controls.style.position = 'absolute';
    controls.style.top = '10px';
    controls.style.right = '10px';
    controls.style.zIndex = '100';
    controls.style.display = 'flex';
    controls.style.gap = '10px';
    
    // Create export button
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export as Image';
    exportBtn.className = 'heatmap-btn';
    exportBtn.style.backgroundColor = '#3498db';
    exportBtn.style.color = 'white';
    exportBtn.style.border = 'none';
    exportBtn.style.borderRadius = '4px';
    exportBtn.style.padding = '5px 10px';
    exportBtn.style.cursor = 'pointer';
    exportBtn.style.fontSize = '14px';
    
    // Add click event to export button
    exportBtn.addEventListener('click', () => {
        try {
            GazeHeatmap.saveAsImage();
        } catch (error) {
            console.error('Error exporting heatmap:', error);
            GazeTracker.showError('Failed to export heatmap: ' + error.message);
        }
    });
    
    // Add buttons to controls
    controls.appendChild(exportBtn);
    
    // Add controls to container
    container.appendChild(controls);
    
    // Create summary container if it doesn't exist
    if (!document.getElementById('heatmap-summary')) {
        const summary = document.createElement('div');
        summary.id = 'heatmap-summary';
        summary.style.position = 'absolute';
        summary.style.bottom = '10px';
        summary.style.left = '10px';
        summary.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        summary.style.padding = '10px';
        summary.style.borderRadius = '4px';
        summary.style.maxWidth = '300px';
        summary.style.fontSize = '14px';
        summary.style.zIndex = '100';
        
        container.appendChild(summary);
    }
}

/**
 * Display a summary of the heatmap data
 */
function displayHeatmapSummary() {
    const summaryElement = document.getElementById('heatmap-summary');
    if (!summaryElement) {
        return;
    }
    
    try {
        const summary = GazeHeatmap.generateSummary();
        if (!summary) {
            summaryElement.textContent = 'No heatmap data available';
            return;
        }
        
        // Format the summary data
        const { pointCount, averageValue, maxValue, coverage } = summary;
        
        // Create summary HTML
        summaryElement.innerHTML = `
            <h3 style="margin-top: 0; margin-bottom: 10px;">Gaze Data Summary</h3>
            <p><strong>Data Points:</strong> ${pointCount.toLocaleString()}</p>
            <p><strong>Average Intensity:</strong> ${averageValue.toFixed(2)}</p>
            <p><strong>Max Intensity:</strong> ${maxValue.toFixed(2)}</p>
            <p><strong>Coverage:</strong> ${coverage.toFixed(2)}%</p>
            <p><strong>Session ID:</strong> ${GazeTracker.getCurrentSessionId() || 'N/A'}</p>
        `;
        
        summaryElement.classList.remove('hidden');
    } catch (error) {
        console.error('Error displaying heatmap summary:', error);
        summaryElement.textContent = 'Error generating summary';
    }
}

/**
 * Export data button event handler
 * @param {Event} e - The click event
 */
function handleExportData(e) {
    e.preventDefault();
    
    try {
        const sessionId = GazeTracker.getCurrentSessionId();
        
        // Show export options
        const exportOptions = document.createElement('div');
        exportOptions.className = 'export-options';
        exportOptions.style.position = 'absolute';
        exportOptions.style.top = `${e.clientY + 10}px`;
        exportOptions.style.left = `${e.clientX}px`;
        exportOptions.style.backgroundColor = 'white';
        exportOptions.style.border = '1px solid #ccc';
        exportOptions.style.borderRadius = '4px';
        exportOptions.style.padding = '10px';
        exportOptions.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        exportOptions.style.zIndex = '1000';
        
        const csvOption = document.createElement('button');
        csvOption.textContent = 'Export as CSV';
        csvOption.style.display = 'block';
        csvOption.style.width = '100%';
        csvOption.style.padding = '8px';
        csvOption.style.marginBottom = '5px';
        csvOption.style.backgroundColor = '#3498db';
        csvOption.style.color = 'white';
        csvOption.style.border = 'none';
        csvOption.style.borderRadius = '4px';
        csvOption.style.cursor = 'pointer';
        
        const jsonOption = document.createElement('button');
        jsonOption.textContent = 'Export as JSON';
        jsonOption.style.display = 'block';
        jsonOption.style.width = '100%';
        jsonOption.style.padding = '8px';
        jsonOption.style.marginBottom = '5px';
        jsonOption.style.backgroundColor = '#3498db';
        jsonOption.style.color = 'white';
        jsonOption.style.border = 'none';
        jsonOption.style.borderRadius = '4px';
        jsonOption.style.cursor = 'pointer';
        
        const heatmapOption = document.createElement('button');
        heatmapOption.textContent = 'Export Heatmap';
        heatmapOption.style.display = 'block';
        heatmapOption.style.width = '100%';
        heatmapOption.style.padding = '8px';
        heatmapOption.style.backgroundColor = '#3498db';
        heatmapOption.style.color = 'white';
        heatmapOption.style.border = 'none';
        heatmapOption.style.borderRadius = '4px';
        heatmapOption.style.cursor = 'pointer';
        
        exportOptions.appendChild(csvOption);
        exportOptions.appendChild(jsonOption);
        exportOptions.appendChild(heatmapOption);
        document.body.appendChild(exportOptions);
        
        // Close options when clicking outside
        const closeOptions = (event) => {
            if (!exportOptions.contains(event.target) && event.target !== e.target) {
                document.body.removeChild(exportOptions);
                document.removeEventListener('click', closeOptions);
            }
        };
        
        // Add a small delay before adding the event listener to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', closeOptions);
        }, 100);
        
        // CSV export
        csvOption.addEventListener('click', async () => {
            document.body.removeChild(exportOptions);
            document.removeEventListener('click', closeOptions);
            
            const exportBtn = document.getElementById('export-data');
            if (exportBtn) {
                exportBtn.textContent = 'Exporting CSV...';
                exportBtn.classList.add('disabled');
            }
            
            try {
                await GazeTracker.exportCSV();
                GazeTracker.showStatusMessage('CSV data exported successfully');
            } catch (error) {
                console.error('Error exporting CSV:', error);
                GazeTracker.showError('Failed to export CSV: ' + error.message);
            } finally {
                if (exportBtn) {
                    exportBtn.textContent = 'Export Data';
                    exportBtn.classList.remove('disabled');
                }
            }
        });
        
        // JSON export
        jsonOption.addEventListener('click', async () => {
            document.body.removeChild(exportOptions);
            document.removeEventListener('click', closeOptions);
            
            const exportBtn = document.getElementById('export-data');
            if (exportBtn) {
                exportBtn.textContent = 'Exporting JSON...';
                exportBtn.classList.add('disabled');
            }
            
            try {
                if (!sessionId) {
                    GazeTracker.showError('No active session to export');
                    return;
                }
                
                const jsonData = await GazeTracker.exportSessionData();
                if (!jsonData) {
                    GazeTracker.showError('No data to export');
                    return;
                }
                
                // Format date for filename
                const now = new Date();
                const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
                const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS
                
                // Create download link
                const blob = new Blob([jsonData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gaze_data_session_${sessionId}_${dateStr}_${timeStr}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                GazeTracker.showStatusMessage('JSON data exported successfully');
            } catch (error) {
                console.error('Error exporting JSON:', error);
                GazeTracker.showError('Failed to export JSON: ' + error.message);
            } finally {
                if (exportBtn) {
                    exportBtn.textContent = 'Export Data';
                    exportBtn.classList.remove('disabled');
                }
            }
        });
        
        // Heatmap export
        heatmapOption.addEventListener('click', () => {
            document.body.removeChild(exportOptions);
            document.removeEventListener('click', closeOptions);
            
            const exportBtn = document.getElementById('export-data');
            if (exportBtn) {
                exportBtn.textContent = 'Exporting Heatmap...';
                exportBtn.classList.add('disabled');
            }
            
            try {
                // Show heatmap if it's not already visible
                const heatmapContainer = document.getElementById('heatmap-container');
                const wasHidden = heatmapContainer && heatmapContainer.classList.contains('hidden');
                
                if (wasHidden) {
                    GazeTracker.showHeatmap();
                }
                
                // Export heatmap as image
                GazeHeatmap.saveAsImage();
                
                // Hide heatmap again if it was hidden before
                if (wasHidden) {
                    GazeTracker.hideHeatmap();
                }
            } catch (error) {
                console.error('Error exporting heatmap:', error);
                GazeTracker.showError('Failed to export heatmap: ' + error.message);
            } finally {
                if (exportBtn) {
                    exportBtn.textContent = 'Export Data';
                    exportBtn.classList.remove('disabled');
                }
            }
        });
    } catch (error) {
        console.error('Error showing export options:', error);
        GazeTracker.showError('Failed to show export options: ' + error.message);
    }
}

// Make showError available globally for GazeTracker to use
window.showError = showError;