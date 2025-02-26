import cv2
from eye_tracker import EyeTracker

def main():
    # Initialize the eye tracker
    tracker = EyeTracker()
    
    # Open webcam
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open webcam")
        return
    
    print("Press 'q' to quit")
    
    while True:
        # Read frame from webcam
        ret, frame = cap.read()
        if not ret:
            print("Error: Could not read frame")
            break
            
        # Process frame
        processed_frame, eye_centers = tracker.process_frame(frame)
        
        # Display number of eyes detected
        cv2.putText(
            processed_frame,
            f"Eyes detected: {len(eye_centers)}",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0),
            2
        )
        
        # Show the frame
        cv2.imshow('Eye Tracking Demo', processed_frame)
        
        # Break loop on 'q' press
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    # Clean up
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main() 