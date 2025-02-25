/**
 * Data cleaning module for GazeTrackingCloud
 * Handles cleaning and preprocessing of eye tracking data
 */

class DataCleaner {
    constructor(options = {}) {
        this.options = {
            removeOutliers: true,
            outlierThreshold: 2.5, // Standard deviations
            smoothingWindow: 5,    // Data points for smoothing
            fillGaps: true,        // Fill small gaps in data
            maxGapSize: 3,         // Maximum gap size to fill (in data points)
            removeInvalidData: true, // Remove data points with invalid gaze state
            interpolateMethod: 'linear', // Method for interpolation: 'linear', 'cubic'
            ...options
        };
    }

    /**
     * Clean and preprocess the gaze data
     * @param {Array} data - The raw gaze data
     * @returns {Array} - The cleaned gaze data
     */
    cleanData(data) {
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.warn('No data to clean');
            return [];
        }

        console.log(`Starting data cleaning process for ${data.length} points`);
        let cleanedData = [...data];

        // 1. Remove invalid data points
        if (this.options.removeInvalidData) {
            cleanedData = this.removeInvalidData(cleanedData);
            console.log(`After removing invalid data: ${cleanedData.length} points`);
        }

        // 2. Fill small gaps in the data
        if (this.options.fillGaps) {
            cleanedData = this.fillDataGaps(cleanedData);
            console.log(`After filling gaps: ${cleanedData.length} points`);
        }

        // 3. Remove outliers
        if (this.options.removeOutliers) {
            cleanedData = this.removeOutliers(cleanedData);
            console.log(`After removing outliers: ${cleanedData.length} points`);
        }

        // 4. Apply smoothing
        if (this.options.smoothingWindow > 1) {
            cleanedData = this.smoothData(cleanedData);
            console.log(`After smoothing: ${cleanedData.length} points`);
        }

        // 5. Ensure data is sorted by timestamp
        cleanedData.sort((a, b) => a.timestamp - b.timestamp);

        return cleanedData;
    }

    /**
     * Remove data points with invalid gaze state
     * @param {Array} data - The gaze data
     * @returns {Array} - Data with invalid points removed
     */
    removeInvalidData(data) {
        return data.filter(point => {
            // Check if the point has valid coordinates
            const hasValidCoordinates = 
                point.gazeX !== undefined && 
                point.gazeY !== undefined && 
                !isNaN(point.gazeX) && 
                !isNaN(point.gazeY);
            
            // Check if the point has a valid gaze state (0 is valid in GazeCloudAPI)
            const hasValidState = 
                point.gazeState !== undefined && 
                (point.gazeState === 0 || point.gazeState === 'Valid');
            
            return hasValidCoordinates && hasValidState;
        });
    }

    /**
     * Fill small gaps in the data using interpolation
     * @param {Array} data - The gaze data
     * @returns {Array} - Data with gaps filled
     */
    fillDataGaps(data) {
        if (data.length < 2) return data;
        
        const result = [...data];
        const maxGapSize = this.options.maxGapSize;
        
        // Sort by timestamp to ensure proper gap detection
        result.sort((a, b) => a.timestamp - b.timestamp);
        
        // Find and fill gaps
        const filledData = [];
        filledData.push(result[0]);
        
        for (let i = 1; i < result.length; i++) {
            const current = result[i];
            const previous = result[i - 1];
            
            // Calculate time difference between consecutive points
            const timeDiff = current.timestamp - previous.timestamp;
            
            // Estimate expected time between samples (using median of differences)
            const expectedDiff = this.getMedianTimeDiff(result);
            
            // If gap is too large, skip interpolation
            if (timeDiff > expectedDiff * maxGapSize) {
                filledData.push(current);
                continue;
            }
            
            // Calculate number of missing points
            const missingPoints = Math.round(timeDiff / expectedDiff) - 1;
            
            if (missingPoints <= 0) {
                filledData.push(current);
                continue;
            }
            
            // Interpolate missing points
            for (let j = 1; j <= missingPoints; j++) {
                const ratio = j / (missingPoints + 1);
                const interpolatedPoint = this.interpolatePoint(previous, current, ratio);
                filledData.push(interpolatedPoint);
            }
            
            filledData.push(current);
        }
        
        return filledData;
    }

    /**
     * Get the median time difference between consecutive data points
     * @param {Array} data - The gaze data
     * @returns {number} - The median time difference
     */
    getMedianTimeDiff(data) {
        if (data.length < 2) return 33; // Default to ~30fps
        
        const diffs = [];
        for (let i = 1; i < data.length; i++) {
            diffs.push(data[i].timestamp - data[i - 1].timestamp);
        }
        
        diffs.sort((a, b) => a - b);
        const mid = Math.floor(diffs.length / 2);
        
        if (diffs.length % 2 === 0) {
            return (diffs[mid - 1] + diffs[mid]) / 2;
        } else {
            return diffs[mid];
        }
    }

    /**
     * Interpolate between two data points
     * @param {Object} point1 - The first point
     * @param {Object} point2 - The second point
     * @param {number} ratio - The interpolation ratio (0-1)
     * @returns {Object} - The interpolated point
     */
    interpolatePoint(point1, point2, ratio) {
        const interpolated = { ...point1 };
        
        // Interpolate timestamp
        interpolated.timestamp = Math.round(
            point1.timestamp + (point2.timestamp - point1.timestamp) * ratio
        );
        
        // Interpolate gaze coordinates
        interpolated.gazeX = point1.gazeX + (point2.gazeX - point1.gazeX) * ratio;
        interpolated.gazeY = point1.gazeY + (point2.gazeY - point1.gazeY) * ratio;
        
        // Interpolate other numerical properties if they exist
        if (point1.pupilSize !== undefined && point2.pupilSize !== undefined) {
            interpolated.pupilSize = point1.pupilSize + (point2.pupilSize - point1.pupilSize) * ratio;
        }
        
        if (point1.headX !== undefined && point2.headX !== undefined) {
            interpolated.headX = point1.headX + (point2.headX - point1.headX) * ratio;
            interpolated.headY = point1.headY + (point2.headY - point1.headY) * ratio;
            interpolated.headZ = point1.headZ + (point2.headZ - point1.headZ) * ratio;
        }
        
        // Mark as interpolated
        interpolated.interpolated = true;
        
        return interpolated;
    }

    /**
     * Remove outliers from the data
     * @param {Array} data - The gaze data
     * @returns {Array} - Data with outliers removed
     */
    removeOutliers(data) {
        if (data.length < 3) return data;
        
        // Calculate mean and standard deviation for X and Y coordinates
        const stats = this.calculateStats(data);
        
        // Filter out points that are too far from the mean
        const threshold = this.options.outlierThreshold;
        
        return data.filter(point => {
            const zScoreX = Math.abs((point.gazeX - stats.meanX) / stats.stdDevX);
            const zScoreY = Math.abs((point.gazeY - stats.meanY) / stats.stdDevY);
            
            return zScoreX <= threshold && zScoreY <= threshold;
        });
    }

    /**
     * Calculate statistics for the dataset
     * @param {Array} data - The gaze data
     * @returns {Object} - Statistics object
     */
    calculateStats(data) {
        // Calculate mean
        let sumX = 0, sumY = 0;
        for (const point of data) {
            sumX += point.gazeX;
            sumY += point.gazeY;
        }
        
        const meanX = sumX / data.length;
        const meanY = sumY / data.length;
        
        // Calculate standard deviation
        let sumSqDiffX = 0, sumSqDiffY = 0;
        for (const point of data) {
            sumSqDiffX += Math.pow(point.gazeX - meanX, 2);
            sumSqDiffY += Math.pow(point.gazeY - meanY, 2);
        }
        
        const stdDevX = Math.sqrt(sumSqDiffX / data.length);
        const stdDevY = Math.sqrt(sumSqDiffY / data.length);
        
        return { meanX, meanY, stdDevX, stdDevY };
    }

    /**
     * Apply smoothing to the data
     * @param {Array} data - The gaze data
     * @returns {Array} - Smoothed data
     */
    smoothData(data) {
        if (data.length < this.options.smoothingWindow) return data;
        
        const smoothed = [];
        const halfWindow = Math.floor(this.options.smoothingWindow / 2);
        
        for (let i = 0; i < data.length; i++) {
            // Get window of points centered on current point
            const windowStart = Math.max(0, i - halfWindow);
            const windowEnd = Math.min(data.length - 1, i + halfWindow);
            const window = data.slice(windowStart, windowEnd + 1);
            
            // Calculate average coordinates
            let sumX = 0, sumY = 0;
            for (const point of window) {
                sumX += point.gazeX;
                sumY += point.gazeY;
            }
            
            const avgX = sumX / window.length;
            const avgY = sumY / window.length;
            
            // Create smoothed point
            const smoothedPoint = { ...data[i] };
            smoothedPoint.gazeX = avgX;
            smoothedPoint.gazeY = avgY;
            smoothedPoint.smoothed = true;
            
            smoothed.push(smoothedPoint);
        }
        
        return smoothed;
    }

    /**
     * Normalize coordinates to a standard range (0-1)
     * @param {Array} data - The gaze data
     * @param {Object} screenDimensions - The screen dimensions
     * @returns {Array} - Data with normalized coordinates
     */
    normalizeCoordinates(data, screenDimensions = { width: 1920, height: 1080 }) {
        return data.map(point => {
            const normalized = { ...point };
            normalized.normalizedX = point.gazeX / screenDimensions.width;
            normalized.normalizedY = point.gazeY / screenDimensions.height;
            return normalized;
        });
    }
}

module.exports = DataCleaner; 