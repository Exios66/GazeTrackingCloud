import cv2
import numpy as np
from typing import Tuple, Optional
import os

class EyeTracker:
    def __init__(self):
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
    
    def process_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, list]:
        """
        Process a video frame and detect eyes and pupils.
        
        Args:
            frame: Input video frame
            
        Returns:
            Tuple of (processed frame, list of eye centers)
        """
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
        
        return output_frame, eye_centers 