/**
 * Visualization module for GazeTrackingCloud
 * Generates visualizations for eye tracking data
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

class Visualizer {
    constructor(options = {}) {
        this.options = {
            width: 1920,          // Default canvas width
            height: 1080,         // Default canvas height
            heatmapColors: [      // Color gradient for heatmap
                { r: 0, g: 0, b: 255, a: 0.0 },   // Start with transparent blue
                { r: 0, g: 255, b: 255, a: 0.5 }, // Cyan
                { r: 0, g: 255, b: 0, a: 0.6 },   // Green
                { r: 255, g: 255, b: 0, a: 0.8 }, // Yellow
                { r: 255, g: 0, b: 0, a: 1.0 }    // Red (hottest)
            ],
            fixationRadiusScale: 0.5, // Scale factor for fixation radius (duration-based)
            saccadeLineWidth: 2,     // Line width for saccades
            gazePlotPointSize: 3,    // Size of individual gaze points
            backgroundColor: 'rgba(255, 255, 255, 1)', // Background color
            fixationColor: 'rgba(255, 0, 0, 0.7)',    // Color for fixations
            saccadeColor: 'rgba(0, 0, 255, 0.5)',     // Color for saccades
            gazePlotColor: 'rgba(0, 0, 0, 0.2)',      // Color for gaze plot points
            aoiColors: [             // Colors for different AOIs
                'rgba(255, 0, 0, 0.3)',
                'rgba(0, 255, 0, 0.3)',
                'rgba(0, 0, 255, 0.3)',
                'rgba(255, 255, 0, 0.3)',
                'rgba(0, 255, 255, 0.3)',
                'rgba(255, 0, 255, 0.3)'
            ],
            drawAOIs: true,          // Whether to draw AOIs
            drawFixationNumbers: true, // Whether to number fixations
            drawFixationDurations: false, // Whether to display fixation durations
            heatmapBlurFactor: 15,    // Blur factor for heatmap
            heatmapOpacity: 0.7,      // Overall heatmap opacity
            ...options
        };
    }

    /**
     * Generate a gaze plot visualization
     * @param {Array} data - The gaze data
     * @param {string} outputPath - Path to save the visualization
     * @param {Object} options - Additional options
     * @returns {Promise<string>} - Path to the visualization
     */
    async generateGazePlot(data, outputPath, options = {}) {
        const width = options.width || this.options.width;
        const height = options.height || this.options.height;
        const pointSize = options.pointSize || this.options.gazePlotPointSize;
        const backgroundColor = options.backgroundColor || this.options.backgroundColor;
        const pointColor = options.pointColor || this.options.gazePlotColor;
        
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Draw background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        
        // Draw AOIs if available
        if (this.options.drawAOIs && options.aoiMap) {
            this.drawAOIs(ctx, options.aoiMap);
        }
        
        // Draw each gaze point
        ctx.fillStyle = pointColor;
        
        for (const point of data) {
            if (point.gazeX >= 0 && point.gazeX <= width && 
                point.gazeY >= 0 && point.gazeY <= height) {
                ctx.beginPath();
                ctx.arc(point.gazeX, point.gazeY, pointSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw connecting lines if requested
        if (options.drawLines && data.length > 1) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(data[0].gazeX, data[0].gazeY);
            
            for (let i = 1; i < data.length; i++) {
                if (data[i].gazeX >= 0 && data[i].gazeX <= width && 
                    data[i].gazeY >= 0 && data[i].gazeY <= height &&
                    data[i-1].gazeX >= 0 && data[i-1].gazeX <= width && 
                    data[i-1].gazeY >= 0 && data[i-1].gazeY <= height) {
                    ctx.lineTo(data[i].gazeX, data[i].gazeY);
                } else {
                    ctx.moveTo(data[i].gazeX, data[i].gazeY);
                }
            }
            
            ctx.stroke();
        }
        
        // Save to file
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        
        return outputPath;
    }

    /**
     * Generate a heatmap visualization
     * @param {Array} data - The gaze data
     * @param {string} outputPath - Path to save the visualization
     * @param {Object} options - Additional options
     * @returns {Promise<string>} - Path to the visualization
     */
    async generateHeatmap(data, outputPath, options = {}) {
        const width = options.width || this.options.width;
        const height = options.height || this.options.height;
        const colors = options.colors || this.options.heatmapColors;
        const blurFactor = options.blurFactor || this.options.heatmapBlurFactor;
        const opacity = options.opacity || this.options.heatmapOpacity;
        const backgroundColor = options.backgroundColor || this.options.backgroundColor;
        
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Draw background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        
        // Draw AOIs if available
        if (this.options.drawAOIs && options.aoiMap) {
            this.drawAOIs(ctx, options.aoiMap);
        }
        
        // Create density map
        const densityMap = this.createDensityMap(data, width, height);
        
        // Apply blur to density map
        const blurredMap = this.blurDensityMap(densityMap, blurFactor);
        
        // Draw heatmap
        const heatmapCanvas = createCanvas(width, height);
        const heatmapCtx = heatmapCanvas.getContext('2d');
        
        // Find maximum value in density map for normalization
        let maxValue = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (blurredMap[y][x] > maxValue) {
                    maxValue = blurredMap[y][x];
                }
            }
        }
        
        // Create heatmap image data
        const imageData = heatmapCtx.createImageData(width, height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const normalizedValue = blurredMap[y][x] / maxValue;
                const color = this.getColorFromGradient(normalizedValue, colors);
                
                const index = (y * width + x) * 4;
                imageData.data[index] = color.r;
                imageData.data[index + 1] = color.g;
                imageData.data[index + 2] = color.b;
                imageData.data[index + 3] = Math.floor(color.a * 255 * opacity);
            }
        }
        
        heatmapCtx.putImageData(imageData, 0, 0);
        
        // Overlay heatmap on background
        ctx.drawImage(heatmapCanvas, 0, 0);
        
        // Save to file
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        
        return outputPath;
    }

    /**
     * Create a density map from gaze data
     * @param {Array} data - The gaze data
     * @param {number} width - The canvas width
     * @param {number} height - The canvas height
     * @returns {Array} - 2D density map
     */
    createDensityMap(data, width, height) {
        // Initialize density map
        const densityMap = Array(height).fill().map(() => Array(width).fill(0));
        
        // Populate density map
        for (const point of data) {
            const x = Math.floor(point.gazeX);
            const y = Math.floor(point.gazeY);
            
            if (x >= 0 && x < width && y >= 0 && y < height) {
                densityMap[y][x]++;
            }
        }
        
        return densityMap;
    }

    /**
     * Apply a blur to the density map
     * @param {Array} densityMap - The density map
     * @param {number} radius - The blur radius
     * @returns {Array} - Blurred density map
     */
    blurDensityMap(densityMap, radius) {
        const height = densityMap.length;
        const width = densityMap[0].length;
        
        // Create a new map for the result
        const result = Array(height).fill().map(() => Array(width).fill(0));
        
        // Apply a simple box blur
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                let count = 0;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            sum += densityMap[ny][nx];
                            count++;
                        }
                    }
                }
                
                result[y][x] = sum / count;
            }
        }
        
        return result;
    }

    /**
     * Interpolate a color from the gradient based on a value
     * @param {number} value - The normalized value (0-1)
     * @param {Array} colors - The color gradient
     * @returns {Object} - RGBA color
     */
    getColorFromGradient(value, colors) {
        if (value <= 0) return colors[0];
        if (value >= 1) return colors[colors.length - 1];
        
        const segmentCount = colors.length - 1;
        const segment = Math.min(Math.floor(value * segmentCount), segmentCount - 1);
        const segmentValue = (value - segment / segmentCount) * segmentCount;
        
        const c1 = colors[segment];
        const c2 = colors[segment + 1];
        
        return {
            r: Math.floor(c1.r + (c2.r - c1.r) * segmentValue),
            g: Math.floor(c1.g + (c2.g - c1.g) * segmentValue),
            b: Math.floor(c1.b + (c2.b - c1.b) * segmentValue),
            a: c1.a + (c2.a - c1.a) * segmentValue
        };
    }

    /**
     * Draw Areas of Interest on a canvas
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     * @param {Object} aoiMap - Map of AOIs
     */
    drawAOIs(ctx, aoiMap) {
        const colors = this.options.aoiColors;
        let colorIndex = 0;
        
        for (const [name, aoi] of Object.entries(aoiMap)) {
            const color = colors[colorIndex % colors.length];
            
            // Draw rectangle
            ctx.fillStyle = color;
            ctx.fillRect(aoi.x, aoi.y, aoi.width, aoi.height);
            
            // Draw label
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.font = '14px Arial';
            ctx.fillText(name, aoi.x + 5, aoi.y + 20);
            
            colorIndex++;
        }
    }

    /**
     * Generate a fixation plot visualization
     * @param {Array} fixations - The fixation data
     * @param {string} outputPath - Path to save the visualization
     * @param {Object} options - Additional options
     * @returns {Promise<string>} - Path to the visualization
     */
    async generateFixationPlot(fixations, outputPath, options = {}) {
        const width = options.width || this.options.width;
        const height = options.height || this.options.height;
        const fixationColor = options.fixationColor || this.options.fixationColor;
        const backgroundColor = options.backgroundColor || this.options.backgroundColor;
        const radiusScale = options.radiusScale || this.options.fixationRadiusScale;
        const drawNumbers = options.drawFixationNumbers !== undefined ? 
            options.drawFixationNumbers : this.options.drawFixationNumbers;
        const drawDurations = options.drawFixationDurations !== undefined ? 
            options.drawFixationDurations : this.options.drawFixationDurations;
        
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Draw background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        
        // Draw AOIs if available
        if (this.options.drawAOIs && options.aoiMap) {
            this.drawAOIs(ctx, options.aoiMap);
        }
        
        // Find the longest fixation for radius scaling
        const maxDuration = Math.max(...fixations.map(f => f.duration));
        
        // Draw each fixation
        for (let i = 0; i < fixations.length; i++) {
            const fixation = fixations[i];
            
            // Calculate radius based on duration
            const radius = 5 + (fixation.duration / maxDuration) * 50 * radiusScale;
            
            // Draw fixation circle
            ctx.fillStyle = fixationColor;
            ctx.beginPath();
            ctx.arc(fixation.x, fixation.y, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw fixation number if requested
            if (drawNumbers) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.font = '12px Arial';
                ctx.fillText(i + 1, fixation.x - 4, fixation.y + 4);
            }
            
            // Draw fixation duration if requested
            if (drawDurations) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.font = '10px Arial';
                ctx.fillText(`${Math.round(fixation.duration)}ms`, 
                    fixation.x + radius + 2, 
                    fixation.y);
            }
        }
        
        // Save to file
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        
        return outputPath;
    }

    /**
     * Generate a scanpath visualization (fixations + saccades)
     * @param {Array} fixations - The fixation data
     * @param {Array} saccades - The saccade data
     * @param {string} outputPath - Path to save the visualization
     * @param {Object} options - Additional options
     * @returns {Promise<string>} - Path to the visualization
     */
    async generateScanpath(fixations, saccades, outputPath, options = {}) {
        const width = options.width || this.options.width;
        const height = options.height || this.options.height;
        const fixationColor = options.fixationColor || this.options.fixationColor;
        const saccadeColor = options.saccadeColor || this.options.saccadeColor;
        const backgroundColor = options.backgroundColor || this.options.backgroundColor;
        const lineWidth = options.lineWidth || this.options.saccadeLineWidth;
        const radiusScale = options.radiusScale || this.options.fixationRadiusScale;
        const drawNumbers = options.drawFixationNumbers !== undefined ? 
            options.drawFixationNumbers : this.options.drawFixationNumbers;
        
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Draw background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        
        // Draw AOIs if available
        if (this.options.drawAOIs && options.aoiMap) {
            this.drawAOIs(ctx, options.aoiMap);
        }
        
        // Find the longest fixation for radius scaling
        const maxDuration = Math.max(...fixations.map(f => f.duration));
        
        // Draw saccades first (so they're underneath fixations)
        ctx.strokeStyle = saccadeColor;
        ctx.lineWidth = lineWidth;
        
        for (const saccade of saccades) {
            ctx.beginPath();
            ctx.moveTo(saccade.startX, saccade.startY);
            ctx.lineTo(saccade.endX, saccade.endY);
            ctx.stroke();
            
            // Draw arrow at end of saccade
            this.drawArrowhead(ctx, 
                saccade.startX, saccade.startY, 
                saccade.endX, saccade.endY, 
                10);
        }
        
        // Draw fixations
        for (let i = 0; i < fixations.length; i++) {
            const fixation = fixations[i];
            
            // Calculate radius based on duration
            const radius = 5 + (fixation.duration / maxDuration) * 50 * radiusScale;
            
            // Draw fixation circle
            ctx.fillStyle = fixationColor;
            ctx.beginPath();
            ctx.arc(fixation.x, fixation.y, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw fixation number if requested
            if (drawNumbers) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.font = '12px Arial';
                ctx.fillText(i + 1, fixation.x - 4, fixation.y + 4);
            }
        }
        
        // Save to file
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        
        return outputPath;
    }

    /**
     * Draw an arrowhead at the end of a line
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     * @param {number} fromX - Starting X coordinate
     * @param {number} fromY - Starting Y coordinate
     * @param {number} toX - Ending X coordinate
     * @param {number} toY - Ending Y coordinate
     * @param {number} size - Size of arrowhead
     */
    drawArrowhead(ctx, fromX, fromY, toX, toY, size) {
        // Calculate angle
        const angle = Math.atan2(toY - fromY, toX - fromX);
        
        // Draw arrowhead
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            toX - size * Math.cos(angle - Math.PI / 6),
            toY - size * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            toX - size * Math.cos(angle + Math.PI / 6),
            toY - size * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Generate a timeline visualization of eye movements
     * @param {Object} features - The extracted features
     * @param {string} outputPath - Path to save the visualization
     * @param {Object} options - Additional options
     * @returns {Promise<string>} - Path to the visualization
     */
    async generateTimeline(features, outputPath, options = {}) {
        const width = options.width || 1200;
        const height = options.height || 300;
        const backgroundColor = options.backgroundColor || 'rgba(255, 255, 255, 1)';
        const marginTop = options.marginTop || 40;
        const marginBottom = options.marginBottom || 40;
        const marginLeft = options.marginLeft || 60;
        const marginRight = options.marginRight || 20;
        
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Draw background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        
        // Get data
        const { fixations, saccades, blinks } = features;
        
        if (!fixations || fixations.length === 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.font = '14px Arial';
            ctx.fillText('No fixation data available', width / 2 - 80, height / 2);
            
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(outputPath, buffer);
            return outputPath;
        }
        
        // Find timeline extents
        const startTime = fixations[0].startTime;
        const endTime = fixations[fixations.length - 1].endTime;
        const duration = endTime - startTime;
        
        // Define drawing area
        const drawWidth = width - marginLeft - marginRight;
        const drawHeight = height - marginTop - marginBottom;
        
        // Draw timeline axis
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(marginLeft, height - marginBottom);
        ctx.lineTo(marginLeft + drawWidth, height - marginBottom);
        ctx.stroke();
        
        // Draw time markers
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.font = '12px Arial';
        
        // Draw start time
        ctx.fillText('0ms', marginLeft, height - marginBottom + 15);
        
        // Draw end time
        ctx.fillText(`${duration}ms`, marginLeft + drawWidth - 30, height - marginBottom + 15);
        
        // Draw fixations on timeline
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        
        for (const fixation of fixations) {
            const x1 = marginLeft + ((fixation.startTime - startTime) / duration) * drawWidth;
            const x2 = marginLeft + ((fixation.endTime - startTime) / duration) * drawWidth;
            
            // Draw fixation bar
            ctx.fillRect(x1, marginTop, x2 - x1, drawHeight / 3);
        }
        
        // Draw saccades on timeline (if available)
        if (saccades && saccades.length > 0) {
            ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
            
            for (const saccade of saccades) {
                const x1 = marginLeft + ((saccade.startTime - startTime) / duration) * drawWidth;
                const x2 = marginLeft + ((saccade.endTime - startTime) / duration) * drawWidth;
                
                // Draw saccade bar
                ctx.fillRect(x1, marginTop + drawHeight / 3, x2 - x1, drawHeight / 3);
            }
        }
        
        // Draw blinks on timeline (if available)
        if (blinks && blinks.length > 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            
            for (const blink of blinks) {
                const x1 = marginLeft + ((blink.startTime - startTime) / duration) * drawWidth;
                const x2 = marginLeft + ((blink.endTime - startTime) / duration) * drawWidth;
                
                // Draw blink bar
                ctx.fillRect(x1, marginTop + 2 * drawHeight / 3, x2 - x1, drawHeight / 3);
            }
        }
        
        // Draw labels
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.font = '12px Arial';
        
        ctx.fillText('Fixations', marginLeft - 55, marginTop + drawHeight / 6);
        ctx.fillText('Saccades', marginLeft - 55, marginTop + drawHeight / 2);
        ctx.fillText('Blinks', marginLeft - 55, marginTop + 5 * drawHeight / 6);
        
        // Draw title
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.font = '14px Arial';
        ctx.fillText('Eye Movement Timeline', width / 2 - 80, 20);
        
        // Save to file
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        
        return outputPath;
    }
}

module.exports = Visualizer; 