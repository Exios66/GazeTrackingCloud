# GazeTrackingCloud

<div align="center">

![GazeTrackingCloud Logo](https://img.shields.io/badge/GazeTrackingCloud-Eye%20Tracking%20Platform-blue?style=for-the-badge)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-v12%2B-green)](https://nodejs.org/)
[![Dependencies](https://img.shields.io/badge/dependencies-up%20to%20date-brightgreen)](package.json)
[![Test Coverage](https://img.shields.io/badge/tests-passing-brightgreen)](tests/)
[![GitHub last commit](https://img.shields.io/github/last-commit/username/GazeTrackingCloud.svg)](https://github.com/username/GazeTrackingCloud/commits/main)
[![Issues](https://img.shields.io/github/issues/username/GazeTrackingCloud.svg)](https://github.com/username/GazeTrackingCloud/issues)

</div>

A web application for eye tracking using webcam technology. GazeTrackingCloud captures and processes eye movement data, generates visualizations, and provides comprehensive analysis tools for understanding gaze patterns.

## 📋 Table of Contents

- [GazeTrackingCloud](#gazetrackingcloud)
  - [📋 Table of Contents](#-table-of-contents)
  - [✨ Features](#-features)
  - [📂 Repository Structure](#-repository-structure)
    - [Directory Details](#directory-details)
      - [`/css`](#css)
      - [`/data`](#data)
      - [`/js`](#js)
      - [`/tests`](#tests)
      - [Root Files](#root-files)
  - [🔧 Technologies](#-technologies)
  - [📥 Installation](#-installation)
    - [Prerequisites](#prerequisites)
    - [Quick Start](#quick-start)
      - [On macOS/Linux](#on-macoslinux)
      - [On Windows](#on-windows)
    - [Manual Installation](#manual-installation)
  - [🚀 Usage](#-usage)
    - [Keyboard Shortcuts](#keyboard-shortcuts)
  - [📊 Data Processing Pipeline](#-data-processing-pipeline)
  - [📚 API Reference](#-api-reference)
    - [Key API Methods](#key-api-methods)
  - [💻 Development](#-development)
    - [Project Structure](#project-structure)
  - [🧪 Testing](#-testing)
  - [📄 License](#-license)

## ✨ Features

- **Real-time Eye Tracking**: Capture gaze data using standard webcams
- **Advanced Data Processing**: Clean, filter, and extract features from raw eye tracking data
- **Feature Extraction**: Identify fixations, saccades, and other eye movement patterns
- **Rich Visualizations**: Generate heatmaps, gaze plots, scanpaths, and timeline visualizations
- **Data Export**: Export processed data in various formats (CSV, JSON)
- **Session Management**: Organize and manage multiple tracking sessions
- **Comprehensive Analysis**: Calculate metrics and statistics from eye tracking data
- **Server-side Storage**: Persistent storage of all session data and derived analytics

## 📂 Repository Structure

```bash
GazeTrackingCloud/
├── css/                     # CSS stylesheets
│   └── styles.css           # Main stylesheet for the application
├── data/                    # Data storage and processing
│   ├── examples/            # Example datasets
│   ├── processing/          # Data processing pipeline
│   │   ├── cleaner.js       # Data cleaning module
│   │   ├── extractor.js     # Feature extraction module
│   │   ├── processor.js     # Main processing orchestration
│   │   ├── test-pipeline.js # Test script for the pipeline
│   │   ├── utils.js         # Utility functions
│   │   └── visualizer.js    # Visualization generation
│   ├── session_1/           # Data for session 1
│   ├── session_2/           # Data for session 2
│   └── session_test/        # Test session data
├── js/                      # JavaScript source files
│   ├── app.js               # Main application logic
│   ├── database.js          # Database operations
│   ├── heatmap.js           # Heatmap generation
│   └── tracking.js          # Eye tracking functionality
├── tests/                   # Test suites
│   ├── app.test.js          # Tests for app.js
│   ├── database.test.js     # Tests for database.js
│   ├── heatmap.test.js      # Tests for heatmap.js
│   ├── tracking.test.js     # Tests for tracking.js
│   └── ...                  # Additional tests
├── coverage/                # Test coverage reports
├── node_modules/            # Node.js dependencies
├── .gitattributes           # Git attributes configuration
├── .gitignore               # Git ignore patterns
├── 404.html                 # 404 error page
├── api-error.html           # API error page
├── babel.config.js          # Babel configuration
├── index.html               # Main application page
├── install.js               # Installation script
├── jest.config.js           # Jest testing configuration
├── LICENSE                  # MIT license
├── open-browser.js          # Browser opener utility
├── package-lock.json        # Dependency lock file
├── package.json             # Project metadata and dependencies
├── requriements.txt         # Python dependencies (if applicable)
├── server.js                # Express server
├── start.bat                # Windows startup script
├── start.js                 # Node.js startup script
├── start.sh                 # Unix startup script
└── test-api.html            # API testing page
```

### Directory Details

#### `/css`

Contains the application's styles and visual presentation layer. The main stylesheet (`styles.css`) defines the application's appearance and layout.

#### `/data`

Houses all data-related files and folders, including:

- **Session directories**: Contain raw and processed eye tracking data for each session
- **Processing pipeline**: A sophisticated set of modules for analyzing eye tracking data
- **Examples**: Sample datasets for testing and demonstration

#### `/js`

Core JavaScript files that power the application:

- **app.js**: Main application logic and UI interactions
- **database.js**: Handles data storage and retrieval
- **heatmap.js**: Generates visual heatmaps from gaze data
- **tracking.js**: Core eye tracking functionality

#### `/tests`

Comprehensive test suite ensuring the application's reliability:

- Tests for each main JavaScript module
- Coverage testing
- API endpoint tests
- Integration tests

#### Root Files

- **HTML files**: Application pages and error screens
- **Configuration files**: Setup for various tools (Babel, Jest)
- **Server scripts**: Node.js Express server implementation
- **Startup scripts**: Platform-specific launcher scripts

## 🔧 Technologies

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express
- **Eye Tracking**: GazeRecorder API
- **Visualization**: Canvas API, custom visualization algorithms
- **Storage**: IndexedDB (client-side), JSON (server-side)
- **Testing**: Jest, Puppeteer
- **Build Tools**: Babel, npm

## 📥 Installation

### Prerequisites

- Node.js (v12 or higher)
- A modern web browser (Chrome, Firefox, Edge)
- Webcam access
- For the data processing pipeline: Cairo and other dependencies

### Quick Start

#### On macOS/Linux

```bash
./start.sh
```

#### On Windows

```bash
start.bat
```

### Manual Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/username/GazeTrackingCloud.git
   cd GazeTrackingCloud
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

   Note: For the data processing pipeline with canvas support, you'll need additional system dependencies:

   ```bash
   # On macOS with Homebrew
   brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman
   
   # On Ubuntu/Debian
   sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
   ```

3. Start the application:

   ```bash
   npm start
   ```

## 🚀 Usage

1. Navigate to the application in your browser (<http://localhost:3000> by default)
2. Click "Start Tracking" to begin eye tracking
3. Follow the calibration process if prompted
4. Record your eye movements as needed
5. Stop tracking when finished
6. View visualizations or export data as needed

### Keyboard Shortcuts

- `ESC` - Stop tracking

## 📊 Data Processing Pipeline

The `/data/processing` directory contains a powerful data processing pipeline for eye tracking data:

- **processor.js**: Orchestrates the entire pipeline
- **cleaner.js**: Removes invalid data points, fills gaps, and smooths data
- **extractor.js**: Identifies fixations, saccades, and other eye movement patterns
- **visualizer.js**: Generates various visualizations
- **utils.js**: Provides utility functions for working with eye tracking data
- **test-pipeline.js**: Demonstrates pipeline usage

Process data using:

```javascript
const GazeDataProcessor = require('./data/processing/processor');
const processor = new GazeDataProcessor();
const result = await processor.processSession('session_id');
```

## 📚 API Reference

This project uses the GazeRecorder API:

- **Source**: <https://app.gazerecorder.com/GazeRecorderAPI.js>
- **Documentation**: <https://gazerecorder.com/gazerecorder-api/>

### Key API Methods

```javascript
// Initialize tracking
GazeCloudAPI.StartEyeTracking();

// Stop tracking
GazeCloudAPI.StopEyeTracking();

// Handle gaze data
GazeCloudAPI.OnResult = (data) => {
  // Process gaze data
};
```

## 💻 Development

To run the application in development mode with auto-reload:

```bash
npm run dev
```

### Project Structure

- Frontend code is in `js/` and `css/` directories
- Server implementation is in `server.js`
- Data processing pipeline is in `data/processing/`

## 🧪 Testing

Run tests with:

```bash
npm test
```

View test coverage:

```bash
npm test -- --coverage
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ for eye tracking research and applications</sub>
</div>
