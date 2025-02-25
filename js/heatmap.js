/**
 * Heatmap module for GazeTrackingCloud
 * Handles generation and display of gaze heatmaps
 */

const GazeHeatmap = (() => {
    let heatmapInstance = null;
    let container = null;
    let gazePoints = [];
    
    /**
     * Initialize the heatmap
     * @param {string} containerId - The ID of the container element
     */
    const init = (containerId) => {
        container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container element with ID ${containerId} not found`);
            return;
        }
        
        // Configure and create heatmap instance
        const config = {
            container,
            radius: 40,
            maxOpacity: 0.8,
            minOpacity: 0,
            blur: 0.75,
            gradient: {
                '.5': 'blue',
                '.8': 'red',
                '.95': 'white'
            }
        };
        
        heatmapInstance = h337.create(config);
        console.log('Heatmap initialized');
    };
    
    /**
     * Add a gaze point to the heatmap
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {number} value - The intensity value (optional, defaults to 1)
     */
    const addGazePoint = (x, y, value = 1) => {
        if (!heatmapInstance) {
            console.error('Heatmap not initialized');
            return;
        }
        
        // Ensure coordinates are within the container bounds
        const rect = container.getBoundingClientRect();
        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
            return; // Skip points outside the container
        }
        
        const dataPoint = {
            x: Math.round(x),
            y: Math.round(y),
            value
        };
        
        gazePoints.push(dataPoint);
        heatmapInstance.addData(dataPoint);
    };
    
    /**
     * Clear the heatmap
     */
    const clear = () => {
        if (!heatmapInstance) {
            console.error('Heatmap not initialized');
            return;
        }
        
        heatmapInstance.setData({ data: [] });
        gazePoints = [];
    };
    
    /**
     * Generate a heatmap from an array of gaze data
     * @param {Array} gazeData - Array of gaze data objects
     */
    const generateFromData = (gazeData) => {
        if (!heatmapInstance) {
            console.error('Heatmap not initialized');
            return;
        }
        
        clear();
        
        // Get container dimensions
        const rect = container.getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;
        
        // Process each gaze data point
        gazeData.forEach(data => {
            // Convert normalized coordinates to container coordinates if needed
            let x, y;
            
            if (data.x >= 0 && data.x <= 1 && data.y >= 0 && data.y <= 1) {
                // Normalized coordinates (0-1)
                x = data.x * containerWidth;
                y = data.y * containerHeight;
            } else {
                // Absolute coordinates
                x = data.x;
                y = data.y;
            }
            
            addGazePoint(x, y, data.value || 1);
        });
    };
    
    /**
     * Show the heatmap container
     */
    const show = () => {
        if (container) {
            container.classList.remove('hidden');
        }
    };
    
    /**
     * Hide the heatmap container
     */
    const hide = () => {
        if (container) {
            container.classList.add('hidden');
        }
    };
    
    /**
     * Export the heatmap as an image
     * @returns {string} - Data URL of the heatmap image
     */
    const exportAsImage = () => {
        if (!heatmapInstance) {
            console.error('Heatmap not initialized');
            return null;
        }
        
        return heatmapInstance.getDataURL();
    };
    
    /**
     * Get all gaze points
     * @returns {Array} - Array of gaze points
     */
    const getGazePoints = () => {
        return [...gazePoints];
    };
    
    return {
        init,
        addGazePoint,
        clear,
        generateFromData,
        show,
        hide,
        exportAsImage,
        getGazePoints
    };
})(); 