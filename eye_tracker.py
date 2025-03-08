import cv2
import numpy as np
from typing import Tuple, Optional, Dict, List
import os
import json
from datetime import datetime
import csv
import time

class EyeTracker:
    def __init__(self, data_dir: str = "data"):
        # Load the pre-trained eye cascade classifier from local directory
        eye_cascade_path = os.path.join('haarcascades', 'haarcascade_eye.xml')
        face_cascade_path = os.path.join('haarcascades', 'haarcascade_frontalface_default.xml')
        
        self.eye_cascade = cv2.CascadeClassifier(eye_cascade_path)
        self.face_cascade = cv2.CascadeClassifier(face_cascade_path)
        
        # Verify cascade files loaded successfully
        if self.eye_cascade.empty():
            raise ValueError(f"Error: Could not load eye cascade classifier from {eye_cascade_path}")
        if self.face_cascade.empty():
            raise ValueError(f"Error: Could not load face cascade classifier from {face_cascade_path}")
            
        # Initialize data storage
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        
        # Initialize tracking data
        self.tracking_data = {
            'session_start': datetime.now().isoformat(),
            'gaze_points': [],
            'fixations': [],
            'blinks': [],
            'metadata': {
                'frame_count': 0,
                'detection_rate': 0,
                'avg_pupil_size': 0
            }
        }
        
        # Tracking state
        self.last_gaze_point = None
        self.fixation_threshold = 30  # pixels
        self.fixation_duration = 0.3  # seconds
        self.current_fixation_start = None
        self.frame_times = []
        
    def detect_eyes(self, frame: np.ndarray) -> list:
        """
        Detect eyes in the given frame.
        
        Args:
            frame: Input image frame
            
        Returns:
            List of detected eye regions (x, y, w, h)
        """
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces first to limit eye detection region
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        eyes_list = []
        for (x, y, w, h) in faces:
            # Extract the region of interest (face region)
            roi_gray = gray[y:y+h, x:x+w]
            
            # Detect eyes within the face region
            eyes = self.eye_cascade.detectMultiScale(
                roi_gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )
            
            # Adjust coordinates relative to the original frame
            for (ex, ey, ew, eh) in eyes:
                eyes_list.append((x + ex, y + ey, ew, eh))
                
        return eyes_list
    
    def detect_blink(self, eyes: list) -> bool:
        """Detect if a blink occurred."""
        return len(eyes) < 2  # Simple blink detection based on eye count
        
    def is_fixation(self, current_point: Tuple[int, int], last_point: Tuple[int, int]) -> bool:
        """Determine if the gaze points represent a fixation."""
        if not last_point:
            return False
        distance = np.sqrt((current_point[0] - last_point[0])**2 + 
                         (current_point[1] - last_point[1])**2)
        return distance < self.fixation_threshold
        
    def update_tracking_data(self, gaze_point: Optional[Tuple[int, int]], 
                           eyes: list, timestamp: float):
        """Update tracking data with new measurements."""
        if gaze_point:
            self.tracking_data['gaze_points'].append({
                'timestamp': timestamp,
                'x': gaze_point[0],
                'y': gaze_point[1]
            })
            
            # Check for fixation
            if self.is_fixation(gaze_point, self.last_gaze_point):
                if not self.current_fixation_start:
                    self.current_fixation_start = timestamp
                elif timestamp - self.current_fixation_start >= self.fixation_duration:
                    self.tracking_data['fixations'].append({
                        'start_time': self.current_fixation_start,
                        'end_time': timestamp,
                        'x': gaze_point[0],
                        'y': gaze_point[1]
                    })
            else:
                self.current_fixation_start = None
                
            self.last_gaze_point = gaze_point
            
        # Update blink data
        if self.detect_blink(eyes):
            self.tracking_data['blinks'].append({
                'timestamp': timestamp
            })
            
        # Update metadata
        self.tracking_data['metadata']['frame_count'] += 1
        self.frame_times.append(timestamp)
        
    def save_session_data(self, format: str = 'json'):
        """Save the current session data to file."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        if format == 'json':
            filename = os.path.join(self.data_dir, f'eye_tracking_session_{timestamp}.json')
            with open(filename, 'w') as f:
                json.dump(self.tracking_data, f, indent=2)
        
        elif format == 'csv':
            # Save gaze points
            gaze_filename = os.path.join(self.data_dir, f'gaze_points_{timestamp}.csv')
            with open(gaze_filename, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=['timestamp', 'x', 'y'])
                writer.writeheader()
                writer.writerows(self.tracking_data['gaze_points'])
            
            # Save fixations
            fixation_filename = os.path.join(self.data_dir, f'fixations_{timestamp}.csv')
            with open(fixation_filename, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=['start_time', 'end_time', 'x', 'y'])
                writer.writeheader()
                writer.writerows(self.tracking_data['fixations'])
                
        return timestamp
    
    def get_eye_center(self, frame: np.ndarray, eye_rect: Tuple[int, int, int, int]) -> Optional[Tuple[int, int]]:
        """
        Calculate the center of the pupil for a given eye region.
        
        Args:
            frame: Input image frame
            eye_rect: Eye region coordinates (x, y, w, h)
            
        Returns:
            Tuple of (x, y) coordinates of the pupil center, or None if not found
        """
        x, y, w, h = eye_rect
        eye_roi = frame[y:y+h, x:x+w]
        
        # Convert to grayscale
        gray_eye = cv2.cvtColor(eye_roi, cv2.COLOR_BGR2GRAY)
        
        # Apply histogram equalization to enhance contrast
        gray_eye = cv2.equalizeHist(gray_eye)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray_eye, (7, 7), 0)
        
        # Use adaptive thresholding to identify dark regions (potential pupils)
        _, threshold = cv2.threshold(
            blurred, 
            0, 
            255, 
            cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
        )
        
        # Find contours in the thresholded image
        contours, _ = cv2.findContours(
            threshold,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        if not contours:
            return None
            
        # Find the largest contour (likely to be the pupil)
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Calculate the center of the contour
        M = cv2.moments(largest_contour)
        if M["m00"] == 0:
            return None
            
        cx = int(M["m10"] / M["m00"])
        cy = int(M["m01"] / M["m00"])
        
        # Return coordinates relative to the original frame
        return (x + cx, y + cy)
    
    def process_frame(self, frame: np.ndarray, timestamp: float = None) -> Tuple[np.ndarray, list]:
        """
        Process a video frame and detect eyes and pupils with tracking data.
        
        Args:
            frame: Input video frame
            
        Returns:
            Tuple of (processed frame, list of eye centers)
        """
        if timestamp is None:
            timestamp = time.time()
            
        # Make a copy of the frame for drawing
        output_frame = frame.copy()
        
        # Detect eyes
        eyes = self.detect_eyes(frame)
        
        # Track pupils and draw markers
        eye_centers = []
        for eye_rect in eyes:
            # Draw rectangle around detected eye
            x, y, w, h = eye_rect
            cv2.rectangle(output_frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            
            # Get pupil center
            pupil_center = self.get_eye_center(frame, eye_rect)
            if pupil_center:
                # Draw pupil center
                cv2.circle(output_frame, pupil_center, 3, (0, 0, 255), -1)
                eye_centers.append(pupil_center)
        
        # Calculate and update gaze point
        if len(eye_centers) == 2:
            gaze_point = (
                int((eye_centers[0][0] + eye_centers[1][0]) // 2),
                int((eye_centers[0][1] + eye_centers[1][1]) // 2)
            )
            self.update_tracking_data(gaze_point, eyes, timestamp)
        else:
            self.update_tracking_data(None, eyes, timestamp)
        
        return output_frame, eye_centers 