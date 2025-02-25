/**
 * Feature extraction module for GazeTrackingCloud
 * Identifies and extracts eye tracking features such as fixations, saccades, and more
 */

class FeatureExtractor {
    constructor(options = {}) {
        this.options = {
            fixationThreshold: 100,    // Minimum duration for fixation (ms)
            saccadeVelocityThreshold: 30, // Degrees per second
            areaOfInterestMap: null,   // Map of AOIs
            extractPupilData: true,    // Whether to extract pupil data
            velocityCalculationWindow: 3, // Points to use for velocity calculation
            accelerationCalculationWindow: 5, // Points to use for acceleration
            screenWidth: 1920,         // Screen width in pixels
            screenHeight: 1080,        // Screen height in pixels
            degPerPixel: 0.05,         // Approximate degrees per pixel (for velocity calculations)
            ...options
        };
    }

    /**
     * Extract features from cleaned gaze data
     * @param {Array} cleanedData - The cleaned gaze data
     * @returns {Object} - Extracted features
     */
    extractFeatures(cleanedData) {
        if (!cleanedData || cleanedData.length === 0) {
            console.warn('No data for feature extraction');
            return {};
        }

        console.log(`Starting feature extraction for ${cleanedData.length} data points`);
        
        // Calculate velocities and accelerations
        const dataWithVelocity = this.calculateVelocities(cleanedData);
        
        // Extract fixations
        const fixations = this.identifyFixations(dataWithVelocity);
        console.log(`Identified ${fixations.length} fixations`);
        
        // Extract saccades
        const saccades = this.identifySaccades(dataWithVelocity, fixations);
        console.log(`Identified ${saccades.length} saccades`);
        
        // Extract blinks (if available in the data)
        const blinks = this.identifyBlinks(dataWithVelocity);
        
        // Calculate areas of interest metrics
        let aoiMetrics = {};
        if (this.options.areaOfInterestMap) {
            aoiMetrics = this.calculateAOIMetrics(fixations, this.options.areaOfInterestMap);
            console.log(`Calculated metrics for ${Object.keys(aoiMetrics).length} areas of interest`);
        }
        
        // Extract pupil data if requested and available
        let pupilMetrics = null;
        if (this.options.extractPupilData && cleanedData[0].pupilSize !== undefined) {
            pupilMetrics = this.extractPupilMetrics(cleanedData);
            console.log('Extracted pupil metrics');
        }
        
        // Calculate scanpath metrics
        const scanpathMetrics = this.calculateScanpathMetrics(fixations, saccades);
        console.log('Calculated scanpath metrics');
        
        return {
            fixations,
            saccades,
            blinks,
            aoiMetrics,
            pupilMetrics,
            scanpathMetrics,
            totalDuration: cleanedData[cleanedData.length - 1].timestamp - cleanedData[0].timestamp,
            dataPointCount: cleanedData.length
        };
    }

    /**
     * Calculate velocities and accelerations for gaze points
     * @param {Array} data - The gaze data
     * @returns {Array} - Data with velocity and acceleration
     */
    calculateVelocities(data) {
        if (data.length < 3) return data;
        
        const result = [...data];
        const degPerPixel = this.options.degPerPixel;
        const velocityWindow = this.options.velocityCalculationWindow;
        const accelWindow = this.options.accelerationCalculationWindow;
        
        // Calculate velocity for each point
        for (let i = 0; i < result.length; i++) {
            // For points at the beginning, we can't calculate velocity accurately
            if (i < velocityWindow) {
                result[i].velocity = 0;
                continue;
            }
            
            // Get current and previous point with appropriate window
            const current = result[i];
            const prev = result[i - velocityWindow];
            
            // Calculate distance in pixels
            const dx = current.gazeX - prev.gazeX;
            const dy = current.gazeY - prev.gazeY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Convert to degrees
            const distDegrees = distance * degPerPixel;
            
            // Calculate time difference in seconds
            const timeDiff = (current.timestamp - prev.timestamp) / 1000;
            
            // Calculate velocity in degrees per second
            current.velocity = timeDiff > 0 ? distDegrees / timeDiff : 0;
        }
        
        // Calculate acceleration for each point
        for (let i = 0; i < result.length; i++) {
            // For points at the beginning, we can't calculate acceleration accurately
            if (i < accelWindow) {
                result[i].acceleration = 0;
                continue;
            }
            
            // Get current and previous point with appropriate window
            const current = result[i];
            const prev = result[i - accelWindow];
            
            // Calculate velocity difference
            const velocityDiff = current.velocity - prev.velocity;
            
            // Calculate time difference in seconds
            const timeDiff = (current.timestamp - prev.timestamp) / 1000;
            
            // Calculate acceleration in degrees per second squared
            current.acceleration = timeDiff > 0 ? velocityDiff / timeDiff : 0;
        }
        
        return result;
    }

    /**
     * Identify fixations in the gaze data
     * @param {Array} data - The gaze data with velocities
     * @returns {Array} - Array of identified fixations
     */
    identifyFixations(data) {
        const fixations = [];
        const velocityThreshold = this.options.saccadeVelocityThreshold;
        const minFixationDuration = this.options.fixationThreshold;
        
        let currentFixation = null;
        
        for (let i = 0; i < data.length; i++) {
            const point = data[i];
            
            // If velocity is below threshold, it's a potential fixation point
            if (point.velocity < velocityThreshold) {
                if (!currentFixation) {
                    // Start a new fixation
                    currentFixation = {
                        startIndex: i,
                        startTime: point.timestamp,
                        points: [point],
                        endIndex: i,
                        endTime: point.timestamp
                    };
                } else {
                    // Add to current fixation
                    currentFixation.points.push(point);
                    currentFixation.endIndex = i;
                    currentFixation.endTime = point.timestamp;
                }
            } else if (currentFixation) {
                // Check if the fixation meets minimum duration
                const duration = currentFixation.endTime - currentFixation.startTime;
                
                if (duration >= minFixationDuration) {
                    // Calculate centroid and add fixation
                    this.finalizeFixation(currentFixation);
                    fixations.push(currentFixation);
                }
                
                // Reset current fixation
                currentFixation = null;
            }
        }
        
        // Check for fixation at the end of the data
        if (currentFixation) {
            const duration = currentFixation.endTime - currentFixation.startTime;
            
            if (duration >= minFixationDuration) {
                this.finalizeFixation(currentFixation);
                fixations.push(currentFixation);
            }
        }
        
        return fixations;
    }
    
    /**
     * Finalize a fixation by calculating centroid and other metrics
     * @param {Object} fixation - The fixation object to finalize
     */
    finalizeFixation(fixation) {
        // Calculate centroid (average position)
        let sumX = 0, sumY = 0;
        
        for (const point of fixation.points) {
            sumX += point.gazeX;
            sumY += point.gazeY;
        }
        
        fixation.x = sumX / fixation.points.length;
        fixation.y = sumY / fixation.points.length;
        
        // Calculate duration
        fixation.duration = fixation.endTime - fixation.startTime;
        
        // Calculate dispersion (maximum distance between any two points)
        let maxDistance = 0;
        
        for (let i = 0; i < fixation.points.length; i++) {
            for (let j = i + 1; j < fixation.points.length; j++) {
                const p1 = fixation.points[i];
                const p2 = fixation.points[j];
                
                const dx = p1.gazeX - p2.gazeX;
                const dy = p1.gazeY - p2.gazeY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                maxDistance = Math.max(maxDistance, distance);
            }
        }
        
        fixation.dispersion = maxDistance;
        
        // Check which AOI this fixation belongs to (if AOI map is defined)
        if (this.options.areaOfInterestMap) {
            fixation.aoi = this.findContainingAOI(fixation.x, fixation.y);
        }
    }
    
    /**
     * Find which Area of Interest contains the given coordinates
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @returns {string|null} - The AOI name or null if not in any AOI
     */
    findContainingAOI(x, y) {
        if (!this.options.areaOfInterestMap) return null;
        
        for (const [name, aoi] of Object.entries(this.options.areaOfInterestMap)) {
            if (x >= aoi.x && x <= aoi.x + aoi.width &&
                y >= aoi.y && y <= aoi.y + aoi.height) {
                return name;
            }
        }
        
        return null;
    }

    /**
     * Identify saccades in the gaze data
     * @param {Array} data - The gaze data with velocities
     * @param {Array} fixations - The identified fixations
     * @returns {Array} - Array of identified saccades
     */
    identifySaccades(data, fixations) {
        const saccades = [];
        const velocityThreshold = this.options.saccadeVelocityThreshold;
        
        // If there are fewer than 2 fixations, there can't be any saccades
        if (fixations.length < 2) return saccades;
        
        // Create saccades between consecutive fixations
        for (let i = 0; i < fixations.length - 1; i++) {
            const startFixation = fixations[i];
            const endFixation = fixations[i + 1];
            
            // Find the data points between these fixations
            const startIndex = startFixation.endIndex;
            const endIndex = endFixation.startIndex;
            
            if (endIndex <= startIndex) continue;
            
            // Get points between fixations
            const saccadePoints = data.slice(startIndex, endIndex + 1);
            
            // Only consider it a saccade if there are points with velocity above threshold
            const highVelocityPoints = saccadePoints.filter(p => p.velocity >= velocityThreshold);
            
            if (highVelocityPoints.length > 0) {
                // Calculate peak velocity
                const peakVelocity = Math.max(...saccadePoints.map(p => p.velocity));
                
                // Create saccade object
                const saccade = {
                    startIndex: startIndex,
                    endIndex: endIndex,
                    startTime: data[startIndex].timestamp,
                    endTime: data[endIndex].timestamp,
                    duration: data[endIndex].timestamp - data[startIndex].timestamp,
                    startX: startFixation.x,
                    startY: startFixation.y,
                    endX: endFixation.x,
                    endY: endFixation.y,
                    peakVelocity: peakVelocity,
                    amplitude: Math.sqrt(
                        Math.pow(endFixation.x - startFixation.x, 2) + 
                        Math.pow(endFixation.y - startFixation.y, 2)
                    ) * this.options.degPerPixel,
                    points: saccadePoints
                };
                
                saccades.push(saccade);
            }
        }
        
        return saccades;
    }
    
    /**
     * Identify blinks in the gaze data
     * @param {Array} data - The gaze data
     * @returns {Array} - Array of identified blinks
     */
    identifyBlinks(data) {
        const blinks = [];
        
        // Look for sequences where pupil data is missing or invalid
        // This implementation depends on how blinks are marked in your data
        // Here we use a simple approach looking for invalid gaze state
        
        let currentBlink = null;
        
        for (let i = 0; i < data.length; i++) {
            const point = data[i];
            const isBlinkPoint = 
                point.gazeState === 1 || // Invalid state in GazeCloudAPI
                point.pupilSize === 0 || // Pupil not detected
                point.pupilSize === undefined; // No pupil data
            
            if (isBlinkPoint) {
                if (!currentBlink) {
                    // Start a new blink
                    currentBlink = {
                        startIndex: i,
                        startTime: point.timestamp,
                        endIndex: i,
                        endTime: point.timestamp
                    };
                } else {
                    // Extend current blink
                    currentBlink.endIndex = i;
                    currentBlink.endTime = point.timestamp;
                }
            } else if (currentBlink) {
                // Finalize blink
                currentBlink.duration = currentBlink.endTime - currentBlink.startTime;
                blinks.push(currentBlink);
                currentBlink = null;
            }
        }
        
        // Check for blink at the end of the data
        if (currentBlink) {
            currentBlink.duration = currentBlink.endTime - currentBlink.startTime;
            blinks.push(currentBlink);
        }
        
        return blinks;
    }
    
    /**
     * Calculate metrics for areas of interest
     * @param {Array} fixations - The identified fixations
     * @param {Object} aoiMap - Map of areas of interest
     * @returns {Object} - Metrics for each AOI
     */
    calculateAOIMetrics(fixations, aoiMap) {
        const metrics = {};
        
        // Initialize metrics for each AOI
        for (const aoiName of Object.keys(aoiMap)) {
            metrics[aoiName] = {
                fixationCount: 0,
                totalFixationDuration: 0,
                averageFixationDuration: 0,
                timeToFirstFixation: Infinity,
                fixations: []
            };
        }
        
        // Add a category for fixations outside any AOI
        metrics['outside'] = {
            fixationCount: 0,
            totalFixationDuration: 0,
            averageFixationDuration: 0,
            fixations: []
        };
        
        // Process each fixation
        for (const fixation of fixations) {
            const aoiName = fixation.aoi || 'outside';
            
            // Update AOI metrics
            if (metrics[aoiName]) {
                metrics[aoiName].fixationCount++;
                metrics[aoiName].totalFixationDuration += fixation.duration;
                metrics[aoiName].fixations.push(fixation);
                
                // Update time to first fixation
                if (aoiName !== 'outside') {
                    metrics[aoiName].timeToFirstFixation = Math.min(
                        metrics[aoiName].timeToFirstFixation,
                        fixation.startTime
                    );
                }
            }
        }
        
        // Calculate averages and finalize metrics
        for (const aoiName of Object.keys(metrics)) {
            const aoi = metrics[aoiName];
            
            if (aoi.fixationCount > 0) {
                aoi.averageFixationDuration = aoi.totalFixationDuration / aoi.fixationCount;
            }
            
            // If no fixations in this AOI, set time to first fixation to null
            if (aoi.timeToFirstFixation === Infinity) {
                aoi.timeToFirstFixation = null;
            }
        }
        
        return metrics;
    }
    
    /**
     * Extract pupil metrics from the data
     * @param {Array} data - The gaze data
     * @returns {Object} - Pupil metrics
     */
    extractPupilMetrics(data) {
        // Check if pupil data exists
        if (!data[0].pupilSize) {
            return null;
        }
        
        // Extract pupil sizes
        const pupilSizes = data.map(point => point.pupilSize).filter(size => size > 0);
        
        if (pupilSizes.length === 0) {
            return null;
        }
        
        // Calculate statistics
        const mean = pupilSizes.reduce((sum, size) => sum + size, 0) / pupilSizes.length;
        
        const variance = pupilSizes.reduce((sum, size) => sum + Math.pow(size - mean, 2), 0) / pupilSizes.length;
        const stdDev = Math.sqrt(variance);
        
        const min = Math.min(...pupilSizes);
        const max = Math.max(...pupilSizes);
        
        // Calculate pupil dilation events (significant increases in pupil size)
        const dilationEvents = [];
        const baselineWindow = 20; // Points to use for baseline
        const dilationThreshold = 0.1; // 10% increase from baseline
        
        for (let i = baselineWindow; i < data.length; i++) {
            // Calculate baseline as average of previous points
            const baseline = data
                .slice(i - baselineWindow, i)
                .map(p => p.pupilSize)
                .filter(size => size > 0)
                .reduce((sum, size, _, arr) => sum + size / arr.length, 0);
            
            const current = data[i].pupilSize;
            
            if (current > 0 && baseline > 0 && (current - baseline) / baseline > dilationThreshold) {
                dilationEvents.push({
                    index: i,
                    timestamp: data[i].timestamp,
                    baseline: baseline,
                    pupilSize: current,
                    percentChange: (current - baseline) / baseline * 100
                });
            }
        }
        
        return {
            mean,
            stdDev,
            min,
            max,
            dilationEvents,
            dataPoints: pupilSizes.length
        };
    }
    
    /**
     * Calculate scanpath metrics
     * @param {Array} fixations - The identified fixations
     * @param {Array} saccades - The identified saccades
     * @returns {Object} - Scanpath metrics
     */
    calculateScanpathMetrics(fixations, saccades) {
        if (fixations.length === 0) {
            return {
                scanpathLength: 0,
                fixationCount: 0,
                saccadeCount: 0,
                averageFixationDuration: 0,
                averageSaccadeAmplitude: 0,
                scanpathDuration: 0
            };
        }
        
        // Calculate total fixation duration
        const totalFixationDuration = fixations.reduce(
            (sum, fixation) => sum + fixation.duration, 0
        );
        
        // Calculate average fixation duration
        const averageFixationDuration = totalFixationDuration / fixations.length;
        
        // Calculate scanpath length (sum of saccade amplitudes)
        const scanpathLength = saccades.reduce(
            (sum, saccade) => sum + saccade.amplitude, 0
        );
        
        // Calculate average saccade amplitude
        const averageSaccadeAmplitude = saccades.length > 0 ? 
            scanpathLength / saccades.length : 0;
        
        // Calculate scanpath duration
        const scanpathDuration = fixations.length > 0 ? 
            fixations[fixations.length - 1].endTime - fixations[0].startTime : 0;
        
        return {
            scanpathLength,
            fixationCount: fixations.length,
            saccadeCount: saccades.length,
            averageFixationDuration,
            averageSaccadeAmplitude,
            scanpathDuration,
            ratioFixationSaccade: totalFixationDuration / scanpathDuration
        };
    }
}

module.exports = FeatureExtractor; 