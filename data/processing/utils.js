/**
 * Utility module for GazeTrackingCloud data processing
 * Common functions and helper methods for processing eye tracking data
 */

const fs = require('fs');
const path = require('path');

class Utils {
    /**
     * Calculate statistics from eye tracking data
     * @param {Array} cleanedData - The cleaned gaze data
     * @param {Object} features - The extracted features
     * @returns {Object} - Statistics object
     */
    static calculateStatistics(cleanedData, features) {
        const stats = {
            general: {
                dataPoints: cleanedData.length,
                duration: cleanedData.length > 0 ? 
                    cleanedData[cleanedData.length - 1].timestamp - cleanedData[0].timestamp : 0,
                samplingRate: 0
            },
            gaze: {
                meanX: 0,
                meanY: 0,
                stdDevX: 0,
                stdDevY: 0,
                minX: Infinity,
                maxX: -Infinity,
                minY: Infinity,
                maxY: -Infinity,
                coverage: 0
            },
            fixations: {
                count: features.fixations ? features.fixations.length : 0,
                meanDuration: 0,
                totalDuration: 0,
                minDuration: Infinity,
                maxDuration: -Infinity,
                stdDevDuration: 0
            },
            saccades: {
                count: features.saccades ? features.saccades.length : 0,
                meanAmplitude: 0,
                meanDuration: 0,
                meanVelocity: 0,
                peakVelocity: 0
            },
            scanpath: features.scanpathMetrics || {}
        };
        
        // Calculate general statistics
        if (cleanedData.length > 1) {
            const duration = stats.general.duration / 1000; // Convert to seconds
            stats.general.samplingRate = cleanedData.length / duration;
        }
        
        // Calculate gaze statistics
        if (cleanedData.length > 0) {
            // Calculate mean
            let sumX = 0, sumY = 0;
            
            for (const point of cleanedData) {
                sumX += point.gazeX;
                sumY += point.gazeY;
                
                stats.gaze.minX = Math.min(stats.gaze.minX, point.gazeX);
                stats.gaze.maxX = Math.max(stats.gaze.maxX, point.gazeX);
                stats.gaze.minY = Math.min(stats.gaze.minY, point.gazeY);
                stats.gaze.maxY = Math.max(stats.gaze.maxY, point.gazeY);
            }
            
            stats.gaze.meanX = sumX / cleanedData.length;
            stats.gaze.meanY = sumY / cleanedData.length;
            
            // Calculate standard deviation
            let sumSqDiffX = 0, sumSqDiffY = 0;
            
            for (const point of cleanedData) {
                sumSqDiffX += Math.pow(point.gazeX - stats.gaze.meanX, 2);
                sumSqDiffY += Math.pow(point.gazeY - stats.gaze.meanY, 2);
            }
            
            stats.gaze.stdDevX = Math.sqrt(sumSqDiffX / cleanedData.length);
            stats.gaze.stdDevY = Math.sqrt(sumSqDiffY / cleanedData.length);
            
            // Calculate screen coverage (percentage of screen area covered)
            const areaWidth = stats.gaze.maxX - stats.gaze.minX;
            const areaHeight = stats.gaze.maxY - stats.gaze.minY;
            const screenWidth = 1920; // Assuming standard screen dimensions
            const screenHeight = 1080;
            
            stats.gaze.coverage = (areaWidth * areaHeight) / (screenWidth * screenHeight) * 100;
        }
        
        // Calculate fixation statistics
        if (features.fixations && features.fixations.length > 0) {
            const fixations = features.fixations;
            let sumDuration = 0;
            
            for (const fixation of fixations) {
                sumDuration += fixation.duration;
                stats.fixations.minDuration = Math.min(stats.fixations.minDuration, fixation.duration);
                stats.fixations.maxDuration = Math.max(stats.fixations.maxDuration, fixation.duration);
            }
            
            stats.fixations.totalDuration = sumDuration;
            stats.fixations.meanDuration = sumDuration / fixations.length;
            
            // Calculate standard deviation of fixation durations
            let sumSqDiff = 0;
            
            for (const fixation of fixations) {
                sumSqDiff += Math.pow(fixation.duration - stats.fixations.meanDuration, 2);
            }
            
            stats.fixations.stdDevDuration = Math.sqrt(sumSqDiff / fixations.length);
        } else {
            stats.fixations.minDuration = 0;
        }
        
        // Calculate saccade statistics
        if (features.saccades && features.saccades.length > 0) {
            const saccades = features.saccades;
            let sumAmplitude = 0;
            let sumDuration = 0;
            let sumVelocity = 0;
            let maxVelocity = 0;
            
            for (const saccade of saccades) {
                sumAmplitude += saccade.amplitude;
                sumDuration += saccade.duration;
                
                // Calculate average velocity for this saccade
                const velocity = saccade.amplitude / (saccade.duration / 1000);
                sumVelocity += velocity;
                
                maxVelocity = Math.max(maxVelocity, saccade.peakVelocity);
            }
            
            stats.saccades.meanAmplitude = sumAmplitude / saccades.length;
            stats.saccades.meanDuration = sumDuration / saccades.length;
            stats.saccades.meanVelocity = sumVelocity / saccades.length;
            stats.saccades.peakVelocity = maxVelocity;
        }
        
        return stats;
    }

    /**
     * Convert gaze data array to CSV format
     * @param {Array} data - The gaze data
     * @returns {string} - CSV string
     */
    static convertToCSV(data) {
        if (!data || data.length === 0) {
            return 'No data';
        }
        
        // Get all possible headers from the data
        const sample = data[0];
        const headers = Object.keys(sample).filter(key => 
            typeof sample[key] !== 'object' && 
            typeof sample[key] !== 'function'
        );
        
        // Create CSV header row
        let csv = headers.join(',') + '\n';
        
        // Add data rows
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                
                // Handle different data types
                if (value === null || value === undefined) {
                    return '';
                } else if (typeof value === 'string') {
                    return `"${value.replace(/"/g, '""')}"`;
                } else if (typeof value === 'number') {
                    return value.toString();
                } else if (typeof value === 'boolean') {
                    return value ? 'true' : 'false';
                } else {
                    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                }
            });
            
            csv += values.join(',') + '\n';
        }
        
        return csv;
    }

    /**
     * Convert extracted features to CSV format
     * @param {Object} features - The extracted features
     * @returns {string} - CSV string
     */
    static convertFeaturesToCSV(features) {
        const result = {};
        
        // Process fixations
        if (features.fixations && features.fixations.length > 0) {
            const fixationHeaders = Object.keys(features.fixations[0]).filter(key => 
                typeof features.fixations[0][key] !== 'object' && 
                typeof features.fixations[0][key] !== 'function'
            );
            
            let fixationsCsv = fixationHeaders.join(',') + '\n';
            
            for (const fixation of features.fixations) {
                const values = fixationHeaders.map(header => {
                    const value = fixation[header];
                    
                    if (value === null || value === undefined) {
                        return '';
                    } else if (typeof value === 'number') {
                        return value.toString();
                    } else {
                        return `"${value}"`;
                    }
                });
                
                fixationsCsv += values.join(',') + '\n';
            }
            
            result.fixationsCsv = fixationsCsv;
        }
        
        // Process saccades
        if (features.saccades && features.saccades.length > 0) {
            const saccadeHeaders = Object.keys(features.saccades[0]).filter(key => 
                typeof features.saccades[0][key] !== 'object' && 
                typeof features.saccades[0][key] !== 'function'
            );
            
            let saccadesCsv = saccadeHeaders.join(',') + '\n';
            
            for (const saccade of features.saccades) {
                const values = saccadeHeaders.map(header => {
                    const value = saccade[header];
                    
                    if (value === null || value === undefined) {
                        return '';
                    } else if (typeof value === 'number') {
                        return value.toString();
                    } else {
                        return `"${value}"`;
                    }
                });
                
                saccadesCsv += values.join(',') + '\n';
            }
            
            result.saccadesCsv = saccadesCsv;
        }
        
        // Return combined result or individual CSVs
        if (features.fixations && features.saccades) {
            return {
                fixations: result.fixationsCsv,
                saccades: result.saccadesCsv
            };
        } else if (features.fixations) {
            return result.fixationsCsv;
        } else if (features.saccades) {
            return result.saccadesCsv;
        } else {
            return 'No feature data available';
        }
    }

    /**
     * Format a timestamp to human-readable date/time
     * @param {number} timestamp - The timestamp to format
     * @returns {string} - Formatted date/time
     */
    static formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    /**
     * Format duration in milliseconds to human-readable format
     * @param {number} ms - Duration in milliseconds
     * @returns {string} - Formatted duration
     */
    static formatDuration(ms) {
        if (ms < 1000) {
            return `${ms}ms`;
        } else if (ms < 60000) {
            return `${(ms / 1000).toFixed(2)}s`;
        } else {
            const minutes = Math.floor(ms / 60000);
            const seconds = ((ms % 60000) / 1000).toFixed(2);
            return `${minutes}m ${seconds}s`;
        }
    }

    /**
     * Check if a directory exists, and create it if it doesn't
     * @param {string} dirPath - The directory path
     */
    static ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Save a JSON object to a file
     * @param {string} filePath - The file path
     * @param {Object} data - The data to save
     */
    static saveJsonToFile(filePath, data) {
        const dirPath = path.dirname(filePath);
        this.ensureDirectoryExists(dirPath);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    /**
     * Load a JSON object from a file
     * @param {string} filePath - The file path
     * @returns {Object} - The loaded data
     */
    static loadJsonFromFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    }

    /**
     * Calculate distance between two points
     * @param {number} x1 - X coordinate of first point
     * @param {number} y1 - Y coordinate of first point
     * @param {number} x2 - X coordinate of second point
     * @param {number} y2 - Y coordinate of second point
     * @returns {number} - Distance
     */
    static calculateDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    /**
     * Calculate angle between two points (in degrees)
     * @param {number} x1 - X coordinate of first point
     * @param {number} y1 - Y coordinate of first point
     * @param {number} x2 - X coordinate of second point
     * @param {number} y2 - Y coordinate of second point
     * @returns {number} - Angle in degrees
     */
    static calculateAngle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    }

    /**
     * Check if a point is inside a rectangle
     * @param {number} x - X coordinate of point
     * @param {number} y - Y coordinate of point
     * @param {number} rectX - X coordinate of rectangle top-left corner
     * @param {number} rectY - Y coordinate of rectangle top-left corner
     * @param {number} rectWidth - Width of rectangle
     * @param {number} rectHeight - Height of rectangle
     * @returns {boolean} - True if point is inside rectangle
     */
    static isPointInRect(x, y, rectX, rectY, rectWidth, rectHeight) {
        return x >= rectX && x <= rectX + rectWidth && 
               y >= rectY && y <= rectY + rectHeight;
    }

    /**
     * Round a number to a specified precision
     * @param {number} num - The number to round
     * @param {number} precision - Number of decimal places
     * @returns {number} - Rounded number
     */
    static round(num, precision = 2) {
        const factor = Math.pow(10, precision);
        return Math.round(num * factor) / factor;
    }
}

module.exports = Utils; 