/**
 * Main data processor module for GazeTrackingCloud
 * Orchestrates the data processing pipeline for eye tracking data
 */

const DataCleaner = require('./cleaner');
const FeatureExtractor = require('./extractor');
const Visualizer = require('./visualizer');
const Utils = require('./utils');
const fs = require('fs');
const path = require('path');

class GazeDataProcessor {
    constructor(options = {}) {
        this.options = {
            outputDir: path.join(__dirname, '../processed'),
            cleaningParams: {
                removeOutliers: true,
                outlierThreshold: 2.5, // Standard deviations
                smoothingWindow: 5,    // Data points for smoothing
                fillGaps: true,        // Fill small gaps in data
                maxGapSize: 3          // Maximum gap size to fill (in data points)
            },
            featureExtractionParams: {
                fixationThreshold: 100,    // Minimum duration for fixation (ms)
                saccadeVelocityThreshold: 30, // Degrees per second
                areaOfInterestMap: null,   // Map of AOIs
                extractPupilData: true     // Whether to extract pupil data
            },
            ...options
        };

        // Initialize components
        this.cleaner = new DataCleaner(this.options.cleaningParams);
        this.extractor = new FeatureExtractor(this.options.featureExtractionParams);
        this.visualizer = new Visualizer();
        
        // Ensure output directory exists
        if (!fs.existsSync(this.options.outputDir)) {
            fs.mkdirSync(this.options.outputDir, { recursive: true });
        }
    }

    /**
     * Process a session's data
     * @param {string|number} sessionId - The session ID to process
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} - The processing results
     */
    async processSession(sessionId, options = {}) {
        console.log(`Starting processing for session ${sessionId}`);
        const startTime = Date.now();
        
        try {
            // 1. Load the raw data
            const rawData = await this.loadSessionData(sessionId);
            console.log(`Loaded ${rawData.length} data points`);
            
            // 2. Clean the data
            const cleanedData = this.cleaner.cleanData(rawData);
            console.log(`Cleaned data: ${cleanedData.length} data points remain`);
            
            // 3. Extract features
            const features = this.extractor.extractFeatures(cleanedData);
            console.log(`Extracted ${Object.keys(features).length} feature sets`);
            
            // 4. Generate visualizations if requested
            if (options.generateVisualizations) {
                await this.generateVisualizations(sessionId, cleanedData, features);
            }
            
            // 5. Save processed data
            const outputPath = await this.saveProcessedData(sessionId, {
                raw: rawData,
                cleaned: cleanedData,
                features: features
            });
            
            const processingTime = (Date.now() - startTime) / 1000;
            console.log(`Processing completed in ${processingTime.toFixed(2)} seconds`);
            
            return {
                sessionId,
                dataPoints: cleanedData.length,
                features: features,
                outputPath,
                processingTime
            };
        } catch (error) {
            console.error(`Error processing session ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Load raw session data
     * @param {string|number} sessionId - The session ID to load
     * @returns {Promise<Array>} - The raw session data
     */
    async loadSessionData(sessionId) {
        // Check if we're in browser or Node environment
        if (typeof window !== 'undefined' && window.GazeDB) {
            // Browser environment - use GazeDB
            return await window.GazeDB.getSessionData(sessionId);
        } else {
            // Node environment - load from file
            const sessionDir = path.join(__dirname, '..', `session_${sessionId}`);
            
            if (!fs.existsSync(sessionDir)) {
                throw new Error(`Session directory not found: ${sessionDir}`);
            }
            
            const dataFile = path.join(sessionDir, 'gaze_data.json');
            
            if (!fs.existsSync(dataFile)) {
                throw new Error(`Data file not found: ${dataFile}`);
            }
            
            const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
            return data;
        }
    }

    /**
     * Generate visualizations for the processed data
     * @param {string|number} sessionId - The session ID
     * @param {Array} cleanedData - The cleaned data
     * @param {Object} features - The extracted features
     * @returns {Promise<Object>} - Paths to generated visualizations
     */
    async generateVisualizations(sessionId, cleanedData, features) {
        const outputDir = path.join(this.options.outputDir, `session_${sessionId}`, 'visualizations');
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const visualizations = {};
        
        // Generate gaze plot
        visualizations.gazePlot = await this.visualizer.generateGazePlot(
            cleanedData,
            path.join(outputDir, 'gaze_plot.png')
        );
        
        // Generate heatmap
        visualizations.heatmap = await this.visualizer.generateHeatmap(
            cleanedData,
            path.join(outputDir, 'heatmap.png')
        );
        
        // Generate fixation plot
        if (features.fixations) {
            visualizations.fixationPlot = await this.visualizer.generateFixationPlot(
                features.fixations,
                path.join(outputDir, 'fixation_plot.png')
            );
        }
        
        // Generate scanpath visualization
        visualizations.scanpath = await this.visualizer.generateScanpath(
            features.fixations,
            features.saccades,
            path.join(outputDir, 'scanpath.png')
        );
        
        // Generate timeline visualization
        visualizations.timeline = await this.visualizer.generateTimeline(
            features,
            path.join(outputDir, 'timeline.png')
        );
        
        console.log(`Generated ${Object.keys(visualizations).length} visualizations`);
        return visualizations;
    }

    /**
     * Save processed data to files
     * @param {string|number} sessionId - The session ID
     * @param {Object} data - The data to save
     * @returns {Promise<string>} - The output directory path
     */
    async saveProcessedData(sessionId, data) {
        const outputDir = path.join(this.options.outputDir, `session_${sessionId}`);
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Save cleaned data
        fs.writeFileSync(
            path.join(outputDir, 'cleaned_data.json'),
            JSON.stringify(data.cleaned, null, 2)
        );
        
        // Save features
        fs.writeFileSync(
            path.join(outputDir, 'features.json'),
            JSON.stringify(data.features, null, 2)
        );
        
        // Save summary statistics
        const stats = Utils.calculateStatistics(data.cleaned, data.features);
        fs.writeFileSync(
            path.join(outputDir, 'statistics.json'),
            JSON.stringify(stats, null, 2)
        );
        
        // Save in CSV format for compatibility with other tools
        const csvData = Utils.convertToCSV(data.cleaned);
        fs.writeFileSync(
            path.join(outputDir, 'cleaned_data.csv'),
            csvData
        );
        
        // Save features in CSV format
        const featuresCsv = Utils.convertFeaturesToCSV(data.features);
        fs.writeFileSync(
            path.join(outputDir, 'features.csv'),
            featuresCsv
        );
        
        console.log(`Saved processed data to ${outputDir}`);
        return outputDir;
    }

    /**
     * Batch process multiple sessions
     * @param {Array<string|number>} sessionIds - Array of session IDs to process
     * @param {Object} options - Processing options
     * @returns {Promise<Array>} - Array of processing results
     */
    async batchProcess(sessionIds, options = {}) {
        console.log(`Starting batch processing for ${sessionIds.length} sessions`);
        const results = [];
        
        for (const sessionId of sessionIds) {
            try {
                const result = await this.processSession(sessionId, options);
                results.push(result);
            } catch (error) {
                console.error(`Error processing session ${sessionId}:`, error);
                results.push({
                    sessionId,
                    error: error.message,
                    success: false
                });
            }
        }
        
        // Generate batch summary
        const summaryPath = path.join(this.options.outputDir, 'batch_summary.json');
        fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
        
        console.log(`Batch processing completed. Summary saved to ${summaryPath}`);
        return results;
    }
}

module.exports = GazeDataProcessor; 