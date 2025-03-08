import cv2
import numpy as np
from eye_tracker import EyeTracker
from collections import deque
import time
from datetime import datetime
import os

class GazeVisualizer:
    def __init__(self, window_size=(800, 600), history_size=50):
        self.window_size = window_size
        self.history = deque(maxlen=history_size)
        self.background = np.zeros((window_size[1], window_size[0], 3), dtype=np.uint8)
        self.log_entries = []
        self.fixation_points = []
        self.blink_times = []
        self.stats = {
            'fixation_count': 0,
            'blink_count': 0,
            'tracking_duration': 0
        }
        
    def add_gaze_point(self, point, is_fixation=False, is_blink=False):
        if point:
            timestamp = time.strftime("%H:%M:%S", time.localtime())
            self.history.append(point)
            self.log_entries.append(f"{timestamp} - Gaze at: x={point[0]}, y={point[1]}")
            
            if is_fixation:
                self.fixation_points.append(point)
                self.stats['fixation_count'] += 1
            if is_blink:
                self.blink_times.append(time.time())
                self.stats['blink_count'] += 1
    
    def draw_visualization(self):
        # Create fresh background
        self.background.fill(0)
        
        # Draw coordinate grid
        grid_color = (50, 50, 50)
        grid_spacing = 50
        for x in range(0, self.window_size[0], grid_spacing):
            cv2.line(self.background, (x, 0), (x, self.window_size[1]), grid_color, 1)
        for y in range(0, self.window_size[1], grid_spacing):
            cv2.line(self.background, (0, y), (self.window_size[0], y), grid_color, 1)
        
        # Draw gaze trail
        points = list(self.history)
        if len(points) > 1:
            for i in range(1, len(points)):
                # Draw line between consecutive points
                cv2.line(self.background, points[i-1], points[i], (0, 255, 0), 2)
                
        # Draw fixation points with heat map effect
        for point in self.fixation_points[-20:]:  # Show last 20 fixations
            cv2.circle(self.background, point, 10, (0, 0, 255), -1, cv2.LINE_AA)
            cv2.circle(self.background, point, 15, (0, 0, 255), 2, cv2.LINE_AA)
            
        # Draw points over lines
        for point in points:
            cv2.circle(self.background, point, 3, (255, 255, 0), -1)
            
        # Draw statistics
        stats_text = [
            f"Fixations: {self.stats['fixation_count']}",
            f"Blinks: {self.stats['blink_count']}",
            f"Duration: {self.stats['tracking_duration']:.1f}s"
        ]
        
        for i, text in enumerate(stats_text):
            cv2.putText(
                self.background,
                text,
                (self.window_size[0] - 200, 30 + i * 25),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (200, 200, 200),
                1
            )
            
        # Draw latest coordinates
        if points:
            latest = points[-1]
            cv2.putText(
                self.background,
                f"Current: ({latest[0]}, {latest[1]})",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 255),
                2
            )
            
        # Draw log entries
        log_start_y = 60
        for i, entry in enumerate(self.log_entries[-10:]):
            cv2.putText(
                self.background,
                entry,
                (10, log_start_y + i * 25),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (200, 200, 200),
                1
            )
        
        return self.background

def main():
    # Create data directory if it doesn't exist
    data_dir = "data"
    os.makedirs(data_dir, exist_ok=True)
    
    # Initialize the eye tracker and visualizer
    tracker = EyeTracker(data_dir=data_dir)
    visualizer = GazeVisualizer()
    
    # Open webcam
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open webcam")
        return
    
    print("Press 'q' to quit, 's' to save data")
    start_time = time.time()
    
    while True:
        # Read frame from webcam
        ret, frame = cap.read()
        if not ret:
            print("Error: Could not read frame")
            break
            
        # Get current timestamp
        current_time = time.time()
        elapsed_time = current_time - start_time
        visualizer.stats['tracking_duration'] = elapsed_time
            
        # Process frame
        processed_frame, eye_centers = tracker.process_frame(frame, timestamp=current_time)
        
        # Calculate average gaze point if both eyes are detected
        if len(eye_centers) == 2:
            gaze_point = (
                int((eye_centers[0][0] + eye_centers[1][0]) // 2),
                int((eye_centers[0][1] + eye_centers[1][1]) // 2)
            )
            # Check if this is a fixation point
            is_fixation = tracker.is_fixation(gaze_point, tracker.last_gaze_point) if tracker.last_gaze_point else False
            is_blink = tracker.detect_blink(eye_centers)
            visualizer.add_gaze_point(gaze_point, is_fixation, is_blink)
        
        # Display number of eyes detected and tracking status
        cv2.putText(
            processed_frame,
            f"Eyes detected: {len(eye_centers)} | Time: {elapsed_time:.1f}s",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0),
            2
        )
        
        # Show the frames
        cv2.imshow('Eye Tracking Demo', processed_frame)
        cv2.imshow('Gaze Visualization', visualizer.draw_visualization())
        
        # Handle key presses
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            # Save session data in both formats
            timestamp = tracker.save_session_data(format='json')
            tracker.save_session_data(format='csv')
            print(f"Data saved with timestamp: {timestamp}")
    
    # Final save before cleanup
    tracker.save_session_data(format='json')
    tracker.save_session_data(format='csv')
    
    # Clean up
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main() 