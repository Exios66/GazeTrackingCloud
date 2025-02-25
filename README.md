# GazeTrackingCloud

A web application for eye tracking using the GazeRecorder API. This application captures and stores gaze coordinates, head placement, and other eye-tracking data while generating heatmaps for visualization.

## Features

- Real-time eye tracking using webcam
- Heatmap generation for visualizing gaze patterns
- Data storage of all gaze coordinates and metrics
- User session management
- Export functionality for collected data
- Server-side storage of session data

## Setup and Running

### Prerequisites

- Node.js (v12 or higher)
- A modern web browser (Chrome, Firefox, Edge)
- Webcam access

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/GazeTrackingCloud.git
   cd GazeTrackingCloud
   ```

2. Install dependencies:
   ```
   npm install
   ```

### Running the Application

1. Start the local server:
   ```
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

3. Allow camera permissions when prompted

### Using the Application

1. Click "Start Tracking" to begin the calibration process
2. Follow the red dot with your eyes during calibration
3. After calibration, tracking will begin automatically
4. Click "Stop Tracking" to end the session
5. Use "Show Heatmap" to visualize gaze patterns
6. Use "Export Data" to download the collected data as JSON

### Data Storage

All gaze tracking data is stored in two locations:
- Browser's IndexedDB for client-side storage
- Server's `data` directory in JSON format (organized by session)

## Technologies Used

- HTML, CSS, JavaScript
- GazeRecorder API
- Chart.js for data visualization
- IndexedDB for local storage
- Node.js for server-side functionality

## API Reference

This project uses the GazeRecorder API available at:
- <https://app.gazerecorder.com/GazeRecorderAPI.js>
- Documentation: <https://gazerecorder.com/gazerecorder-api/>

## Keyboard Shortcuts

- `ESC` - Stop tracking

## License

See the [LICENSE](LICENSE) file for details.
