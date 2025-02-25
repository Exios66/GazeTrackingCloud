/**
 * Test script for the GazeTrackingCloud data processing pipeline
 * Run with: node data/processing/test-pipeline.js [sessionId]
 */

const GazeDataProcessor = require('./processor');
const fs = require('fs');
const path = require('path');

// Get session ID from command line arguments, default to test if not provided
const sessionId = process.argv[2] || 'test';

async function runTest() {
    console.log(`Starting test of data processing pipeline for session ${sessionId}...`);
    
    // Create processor with custom options
    const processor = new GazeDataProcessor({
        outputDir: path.join(__dirname, '../processed'),
        cleaningParams: {
            removeOutliers: true,
            outlierThreshold: 2.5,
            smoothingWindow: 5,
            fillGaps: true,
            maxGapSize: 3
        },
        featureExtractionParams: {
            fixationThreshold: 100,
            saccadeVelocityThreshold: 30
        }
    });
    
    try {
        // Process the session
        const result = await processor.processSession(sessionId, {
            generateVisualizations: true
        });
        
        console.log('\nProcessing completed successfully!');
        console.log('Results:');
        console.log(`- Session ID: ${result.sessionId}`);
        console.log(`- Data points processed: ${result.dataPoints}`);
        console.log(`- Processing time: ${result.processingTime.toFixed(2)} seconds`);
        console.log(`- Output directory: ${result.outputPath}`);
        
        // Print a summary of extracted features
        if (result.features.fixations) {
            console.log(`- Fixations: ${result.features.fixations.length}`);
        }
        
        if (result.features.saccades) {
            console.log(`- Saccades: ${result.features.saccades.length}`);
        }
        
        if (result.features.scanpathMetrics) {
            console.log('\nScanpath Metrics:');
            Object.entries(result.features.scanpathMetrics).forEach(([key, value]) => {
                if (typeof value === 'number') {
                    console.log(`  ${key}: ${value.toFixed(2)}`);
                }
            });
        }
        
        console.log(`\nTo view the generated visualizations, check the folder: ${result.outputPath}/visualizations`);
    } catch (error) {
        console.error('Error during processing:', error);
    }
}

// Run the test
runTest().catch(console.error); 