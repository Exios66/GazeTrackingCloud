# GazeTrackingCloud Data Processing Pipeline

This directory contains modules for processing and analyzing eye tracking data collected by the GazeTrackingCloud application.

## Overview

The data processing pipeline provides functionality for:

- **Data Cleaning**: Remove invalid data points, smooth data, fill gaps, and remove outliers
- **Feature Extraction**: Identify fixations, saccades, and other eye movement patterns
- **Visualization**: Generate heatmaps, gaze plots, scanpath visualizations, and more
- **Data Export**: Export processed data in various formats (CSV, JSON)
- **Statistics**: Calculate various metrics and statistics from eye tracking data

## Modules

The pipeline consists of the following modules:

- `processor.js`: Main module that orchestrates the entire processing pipeline
- `cleaner.js`: Module for data cleaning and preprocessing
- `extractor.js`: Module for feature extraction (fixations, saccades, etc.)
- `visualizer.js`: Module for generating visualizations
- `utils.js`: Utility module with helper functions

## Installation

Before using the data processing pipeline, make sure you have installed all dependencies:

```bash
npm install
```

This will install all required packages, including the `canvas` library needed for visualizations.

## Usage

### Basic Usage

To process a session's data:

```javascript
const GazeDataProcessor = require('./data/processing/processor');

// Create a processor instance
const processor = new GazeDataProcessor();

// Process a session
const result = await processor.processSession('session_id', {
    generateVisualizations: true
});

console.log(`Processing complete! Output saved to: ${result.outputPath}`);
```

### Running the Test Script

A test script is included to demonstrate the pipeline:

```bash
node data/processing/test-pipeline.js [sessionId]
```

If no session ID is provided, it will default to 'test'.

### Options

You can customize the processing by passing options to the `GazeDataProcessor` constructor:

```javascript
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
        fixationThreshold: 100, // ms
        saccadeVelocityThreshold: 30, // deg/sec
        areaOfInterestMap: {
            // Define areas of interest
            header: { x: 0, y: 0, width: 1920, height: 100 },
            content: { x: 200, y: 100, width: 1520, height: 800 }
        }
    }
});
```

## Generated Output

The pipeline generates processed data in a subdirectory under `data/processed/session_[id]/`. This includes:

- `cleaned_data.json`: The cleaned eye tracking data
- `cleaned_data.csv`: CSV version of the cleaned data
- `features.json`: Extracted features (fixations, saccades, etc.)
- `features.csv`: CSV version of the extracted features
- `statistics.json`: Statistical metrics calculated from the data
- `visualizations/`: Directory containing generated visualizations

## Visualizations

The pipeline can generate several types of visualizations:

1. **Gaze Plot**: Shows all gaze points with connecting lines
2. **Heatmap**: Heat map of gaze density
3. **Fixation Plot**: Visualization of identified fixations
4. **Scanpath**: Visualization of fixations and connecting saccades
5. **Timeline**: Timeline of eye movements (fixations, saccades, blinks)

## Batch Processing

To process multiple sessions at once:

```javascript
const results = await processor.batchProcess(['session1', 'session2', 'session3'], {
    generateVisualizations: true
});

console.log(`Processed ${results.length} sessions`);
```

## Example Integration with Web App

```javascript
// In your web app code:
const GazeDataProcessor = require('./data/processing/processor');

async function processAndDisplayResults(sessionId) {
    const processor = new GazeDataProcessor();
    const result = await processor.processSession(sessionId, {
        generateVisualizations: true
    });
    
    // Display results in web interface
    document.getElementById('fixation-count').textContent = result.features.fixations.length;
    document.getElementById('heatmap-img').src = `processed/session_${sessionId}/visualizations/heatmap.png`;
    
    return result;
}
```

## Notes

- The processing pipeline is designed to work with data in the format provided by GazeCloudAPI
- If you're processing data from a different source, you may need to adapt the data format
- For large datasets, consider adjusting options like smoothing window size for optimal performance 