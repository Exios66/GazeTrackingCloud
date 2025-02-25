/**
 * Main application script for GazeTrackingCloud
 * Initializes and coordinates all modules
 */

document.addEventListener('DOMContentLoaded', async () => {
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
    
    console.log('Application initialized');
});

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners() {
    // Start tracking button
    const startTrackingBtn = document.getElementById('start-tracking');
    startTrackingBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (!GazeTracker.isTrackingActive()) {
            // Start calibration first
            GazeTracker.startCalibration();
            
            // After calibration, tracking will start automatically
            setTimeout(() => {
                GazeTracker.startTracking();
            }, 100); // Small delay to ensure calibration starts first
        }
    });
    
    // Stop tracking button
    const stopTrackingBtn = document.getElementById('stop-tracking');
    stopTrackingBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (GazeTracker.isTrackingActive()) {
            await GazeTracker.stopTracking();
            
            // Update chart with session data
            updateChartWithSessionData();
        }
    });
    
    // Show heatmap button
    const showHeatmapBtn = document.getElementById('show-heatmap');
    showHeatmapBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const heatmapContainer = document.getElementById('heatmap-container');
        
        if (heatmapContainer.classList.contains('hidden')) {
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
            showError('No active session to export');
            return;
        }
        
        try {
            const jsonData = await GazeTracker.exportSessionData();
            if (!jsonData) {
                showError('No data to export');
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
        } catch (error) {
            console.error('Error exporting data:', error);
            showError('Failed to export data');
        }
    });
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
    } catch (error) {
        console.error('Error updating chart:', error);
    }
}

/**
 * Show error message
 * @param {string} message - The error message to display
 */
function showError(message) {
    alert(message);
} 