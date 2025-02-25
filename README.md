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

2. Run the setup script:
   ```
   npm run setup
   ```
   
   This script will:
   - Check if Node.js is installed
   - Create the data directory if it doesn't exist
   - Install all dependencies
   - Build the application

### Running the Application

Simply run:
```
npm start
```

This command will:
1. Start the local server
2. Automatically open the application in your default browser
3. Navigate to http://localhost:3000

### Manual Installation (Alternative)

If you prefer to install manually:

1. Install dependencies:
   ```
   npm install
   ```

2. Create data directory:
   ```
   npm run build
   ```

3. Start the server:
   ```
   npm run server
   ```

4. Open in browser:
   ```
   http://localhost:3000
   ```

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

## Development

To run the application in development mode with auto-reload:
```
npm run dev
```

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
