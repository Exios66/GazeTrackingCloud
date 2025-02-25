/**
 * Heatmap module for GazeTrackingCloud
 * Handles visualization of gaze data as heatmaps
 */

const GazeHeatmap = (() => {
    let heatmapInstance = null;
    let container = null;
    let isVisible = false;
    let pointsAdded = 0;
    
    // Performance optimization constants
    const MAX_POINTS_BEFORE_DOWNSAMPLE = 5000; // Maximum points before downsampling
    const REPAINT_INTERVAL = 500; // Minimum time between repaints in ms
    const DOWNSAMPLE_FACTOR = 0.5; // Keep 50% of points when downsampling
    
    let lastRepaintTime = 0;
    let pendingRepaint = false;
    let dataBuffer = []; // Buffer for data points to be added
    
    /**
     * Initialize the heatmap
     * @param {string} containerId - The ID of the container element
     */
    const init = (containerId) => {
        container = document.getElementById(containerId);
        
        if (!container) {
            console.error(`Heatmap container with ID "${containerId}" not found`);
            return;
        }
        
        // Configure heatmap
        const config = {
            container,
            radius: 40,
            maxOpacity: 0.8,
            minOpacity: 0,
            blur: 0.75,
            gradient: {
                '.1': 'blue',
                '.3': 'green',
                '.5': 'yellow',
                '.7': 'orange',
                '.9': 'red'
            }
        };
        
        // Create heatmap instance
        heatmapInstance = h337.create(config);
        
        // Set initial data
        heatmapInstance.setData({
            max: 10,
            min: 0,
            data: []
        });
        
        console.log('Heatmap initialized');
    };
    
    /**
     * Add a gaze point to the heatmap
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {number} value - The value (intensity) of the point
     */
    const addGazePoint = (x, y, value = 1) => {
        if (!heatmapInstance) {
            console.error('Heatmap not initialized');
            return;
        }
        
        // Add point to buffer
        dataBuffer.push({
            x: Math.round(x),
            y: Math.round(y),
            value
        });
        
        pointsAdded++;
        
        // Process buffer if we have enough points or enough time has passed
        if (dataBuffer.length >= 10) {
            processDataBuffer();
        }
    };
    
    /**
     * Process the data buffer and add points to the heatmap
     */
    const processDataBuffer = () => {
        if (!heatmapInstance || dataBuffer.length === 0) {
            return;
        }
        
        // Add all points from buffer to heatmap
        dataBuffer.forEach(point => {
            heatmapInstance.addData(point);
        });
        
        // Clear buffer
        dataBuffer = [];
        
        // Check if we need to repaint
        const now = Date.now();
        if (now - lastRepaintTime >= REPAINT_INTERVAL) {
            if (isVisible) {
                heatmapInstance.repaint();
            }
            lastRepaintTime = now;
            pendingRepaint = false;
        } else if (!pendingRepaint) {
            // Schedule a repaint for later
            pendingRepaint = true;
            setTimeout(() => {
                if (isVisible && pendingRepaint) {
                    heatmapInstance.repaint();
                    lastRepaintTime = Date.now();
                    pendingRepaint = false;
                }
            }, REPAINT_INTERVAL - (now - lastRepaintTime));
        }
        
        // Check if we need to downsample
        checkAndDownsample();
    };
    
    /**
     * Check if we need to downsample the heatmap data and do it if necessary
     */
    const checkAndDownsample = () => {
        if (!heatmapInstance) {
            return;
        }
        
        // Get current data
        const data = heatmapInstance.getData();
        
        // If we have too many points, downsample
        if (data.data && data.data.length > MAX_POINTS_BEFORE_DOWNSAMPLE) {
            console.log(`Downsampling heatmap from ${data.data.length} points`);
            
            // Sort by value (intensity) to keep the most important points
            const sortedData = [...data.data].sort((a, b) => b.value - a.value);
            
            // Keep a percentage of the points
            const pointsToKeep = Math.floor(sortedData.length * DOWNSAMPLE_FACTOR);
            const downsampledData = sortedData.slice(0, pointsToKeep);
            
            // Update the heatmap with downsampled data
            heatmapInstance.setData({
                max: data.max,
                min: data.min,
                data: downsampledData
            });
            
            console.log(`Downsampled to ${downsampledData.length} points`);
        }
    };
    
    /**
     * Generate heatmap from data array
     * @param {Array} data - Array of data points with x, y, and value properties
     */
    const generateFromData = (data) => {
        if (!heatmapInstance) {
            console.error('Heatmap not initialized');
            return;
        }
        
        // Clear existing data
        clear();
        
        // If we have too many points, downsample before setting
        let dataToUse = data;
        if (data.length > MAX_POINTS_BEFORE_DOWNSAMPLE) {
            console.log(`Downsampling input data from ${data.length} points`);
            
            // Sort by value (intensity) if available, otherwise random sample
            if (data[0] && data[0].value !== undefined) {
                const sortedData = [...data].sort((a, b) => b.value - a.value);
                dataToUse = sortedData.slice(0, MAX_POINTS_BEFORE_DOWNSAMPLE);
            } else {
                // Random sampling
                dataToUse = [];
                const step = data.length / MAX_POINTS_BEFORE_DOWNSAMPLE;
                for (let i = 0; i < data.length; i += step) {
                    dataToUse.push(data[Math.floor(i)]);
                }
            }
            
            console.log(`Downsampled to ${dataToUse.length} points`);
        }
        
        // Set new data
        heatmapInstance.setData({
            max: 10,
            min: 0,
            data: dataToUse
        });
        
        console.log(`Heatmap generated from ${dataToUse.length} data points`);
    };
    
    /**
     * Show the heatmap
     */
    const show = () => {
        if (!container) {
            console.error('Heatmap container not found');
            return;
        }
        
        container.classList.remove('hidden');
        isVisible = true;
        
        // Force repaint to ensure heatmap is visible
        if (heatmapInstance) {
            heatmapInstance.repaint();
            lastRepaintTime = Date.now();
        }
        
        console.log('Heatmap shown');
    };
    
    /**
     * Hide the heatmap
     */
    const hide = () => {
        if (!container) {
            console.error('Heatmap container not found');
            return;
        }
        
        container.classList.add('hidden');
        isVisible = false;
        
        console.log('Heatmap hidden');
    };
    
    /**
     * Clear the heatmap data
     */
    const clear = () => {
        if (!heatmapInstance) {
            console.error('Heatmap not initialized');
            return;
        }
        
        heatmapInstance.setData({
            max: 10,
            min: 0,
            data: []
        });
        
        dataBuffer = [];
        pointsAdded = 0;
        lastRepaintTime = 0;
        pendingRepaint = false;
        
        console.log('Heatmap cleared');
    };
    
    /**
     * Export heatmap as an image
     * @returns {string} - Data URL of the heatmap image
     */
    const exportAsImage = () => {
        if (!heatmapInstance || !container) {
            console.error('Heatmap not initialized');
            return null;
        }
        
        try {
            // Make sure the heatmap is visible for export
            const wasHidden = container.classList.contains('hidden');
            if (wasHidden) {
                container.classList.remove('hidden');
            }
            
            // Force repaint to ensure heatmap is rendered
            heatmapInstance.repaint();
            
            // Create a canvas element to draw the heatmap
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas dimensions to match container
            canvas.width = container.offsetWidth;
            canvas.height = container.offsetHeight;
            
            // Draw background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw heatmap
            const heatmapCanvas = container.querySelector('canvas');
            if (heatmapCanvas) {
                ctx.drawImage(heatmapCanvas, 0, 0);
            }
            
            // Add title and timestamp
            ctx.fillStyle = 'black';
            ctx.font = '16px Arial';
            ctx.fillText('Gaze Heatmap', 10, 20);
            
            const timestamp = new Date().toISOString();
            ctx.font = '12px Arial';
            ctx.fillText(`Generated: ${timestamp}`, 10, 40);
            
            // Add session info if available
            if (typeof GazeTracker !== 'undefined' && GazeTracker.getCurrentSessionId) {
                const sessionId = GazeTracker.getCurrentSessionId();
                if (sessionId) {
                    ctx.fillText(`Session ID: ${sessionId}`, 10, 60);
                }
            }
            
            // Convert canvas to data URL
            const dataUrl = canvas.toDataURL('image/png');
            
            // Restore visibility state
            if (wasHidden) {
                container.classList.add('hidden');
            }
            
            console.log('Heatmap exported as image');
            return dataUrl;
        } catch (error) {
            console.error('Error exporting heatmap as image:', error);
            return null;
        }
    };
    
    /**
     * Save heatmap as an image file
     */
    const saveAsImage = () => {
        const dataUrl = exportAsImage();
        if (!dataUrl) {
            console.error('Failed to export heatmap as image');
            return;
        }
        
        // Format date for filename
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS
        
        // Create session ID part of filename
        let sessionPart = '';
        if (typeof GazeTracker !== 'undefined' && GazeTracker.getCurrentSessionId) {
            const sessionId = GazeTracker.getCurrentSessionId();
            if (sessionId) {
                sessionPart = `_session_${sessionId}`;
            }
        }
        
        // Create filename
        const filename = `gaze_heatmap${sessionPart}_${dateStr}_${timeStr}.png`;
        
        // Create download link
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        link.style.display = 'none';
        
        // Add to document, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`Heatmap saved as ${filename}`);
        
        // Show success message if GazeTracker is available
        if (typeof GazeTracker !== 'undefined' && GazeTracker.showStatusMessage) {
            GazeTracker.showStatusMessage(`Heatmap saved as ${filename}`);
        }
    };
    
    /**
     * Generate a summary of the heatmap data
     * @returns {Object} - Summary object with statistics
     */
    const generateSummary = () => {
        if (!heatmapInstance) {
            console.error('Heatmap not initialized');
            return null;
        }
        
        try {
            const data = heatmapInstance.getData();
            if (!data || !data.data || data.data.length === 0) {
                return {
                    pointCount: 0,
                    averageValue: 0,
                    maxValue: 0,
                    minValue: 0,
                    coverage: 0
                };
            }
            
            // Calculate statistics
            const pointCount = data.data.length;
            let totalValue = 0;
            let maxValue = 0;
            let minValue = Infinity;
            
            // Calculate total value, max, and min
            data.data.forEach(point => {
                totalValue += point.value;
                maxValue = Math.max(maxValue, point.value);
                minValue = Math.min(minValue, point.value);
            });
            
            const averageValue = totalValue / pointCount;
            
            // Calculate coverage (percentage of screen area with gaze points)
            const containerArea = container.offsetWidth * container.offsetHeight;
            const pointArea = Math.PI * Math.pow(data.radius, 2) * pointCount;
            const coverage = Math.min(100, (pointArea / containerArea) * 100);
            
            return {
                pointCount,
                averageValue,
                maxValue,
                minValue,
                coverage
            };
        } catch (error) {
            console.error('Error generating heatmap summary:', error);
            return null;
        }
    };
    
    return {
        init,
        addGazePoint,
        generateFromData,
        show,
        hide,
        clear,
        exportAsImage,
        saveAsImage,
        generateSummary,
        processDataBuffer,
        checkAndDownsample
    };
})(); 