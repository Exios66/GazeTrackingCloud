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
    
    // Initialize tracker
    GazeTracker.init();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize chart
    initializeChart();
    
    // Update API status
    updateAPIStatus();
    
    // Set interval to check API status periodically
    setInterval(updateAPIStatus, 5000);
    
    console.log('Application initialized');
});

/**
 * Check for camera permissions
 */
function checkCameraPermissions() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            // Camera access granted
            console.log('Camera access granted');
            stream.getTracks().forEach(track => track.stop()); // Stop the stream
        })
        .catch(error => {
            console.error('Camera access denied:', error);
            showError('Camera access is required for eye tracking. Please allow camera access and refresh the page.');
        });
}

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners() {
    // Start tracking button
    const startTrackingBtn = document.getElementById('start-tracking');
    startTrackingBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (!GazeTracker.isAPIAvailable()) {
            GazeTracker.showError('GazeRecorder API not loaded. Please reload the API and try again.');
            return;
        }
        
        if (!GazeTracker.isTrackingActive() && !GazeTracker.isCalibrationActive()) {
            // Disable button during calibration and tracking
            startTrackingBtn.classList.add('disabled');
            startTrackingBtn.textContent = 'Calibrating...';
            
            // Start calibration first
            GazeTracker.startCalibration();
        }
    });
    
    // Stop tracking button
    const stopTrackingBtn = document.getElementById('stop-tracking');
    stopTrackingBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (GazeTracker.isTrackingActive()) {
            // Disable button during processing
            stopTrackingBtn.classList.add('disabled');
            stopTrackingBtn.textContent = 'Stopping...';
            
            await GazeTracker.stopTracking();
            
            // Update chart with session data
            await updateChartWithSessionData();
            
            // Reset buttons
            startTrackingBtn.classList.remove('disabled');
            startTrackingBtn.textContent = 'Start Tracking';
            stopTrackingBtn.classList.remove('disabled');
            stopTrackingBtn.textContent = 'Stop Tracking';
        }
    });
    
    // Show heatmap button
    const showHeatmapBtn = document.getElementById('show-heatmap');
    showHeatmapBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const heatmapContainer = document.getElementById('heatmap-container');
        
        if (heatmapContainer.classList.contains('hidden')) {
            showHeatmapBtn.textContent = 'Generating...';
            await GazeTracker.showHeatmap();
            showHeatmapBtn.textContent = 'Hide Heatmap';
        } else {
            GazeTracker.hideHeatmap();
            showHeatmapBtn.textContent = 'Show Heatmap';
        }
    });
    
    // Export data button
    const exportDataBtn = document.getElementById('export-data');
    exportDataBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const sessionId = GazeTracker.getCurrentSessionId();
        if (!sessionId) {
            GazeTracker.showError('No active session to export');
            return;
        }
        
        try {
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
            
            exportDataBtn.textContent = 'Export Data';
            GazeTracker.showStatusMessage('Data exported successfully');
        } catch (error) {
            console.error('Error exporting data:', error);
            GazeTracker.showError('Failed to export data');
            exportDataBtn.textContent = 'Export Data';
        }
    });
    
    // Reload API button
    const reloadAPIBtn = document.getElementById('reload-api');
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
            GazeTracker.showError('Failed to reload GazeRecorder API. Please check your internet connection and try again.');
        } finally {
            reloadAPIBtn.classList.remove('disabled');
            reloadAPIBtn.textContent = 'Reload API';
        }
    });
    
    // Check API status button
    const checkAPIStatusBtn = document.getElementById('check-api-status');
    checkAPIStatusBtn.addEventListener('click', (e) => {
        e.preventDefault();
        updateAPIStatus();
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // ESC key to stop tracking
        if (e.key === 'Escape' && GazeTracker.isTrackingActive()) {
            stopTrackingBtn.click();
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
 * Show error message
 * @param {string} message - The error message to display
 */
function showError(message) {
    alert(message);
} 