from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import base64
import pandas as pd
from datetime import datetime
from ultralytics import YOLO
import easyocr
import logging
import os
import asyncio
import signal
import torch
from typing import Dict, List, Optional
import time
import json
from pathlib import Path

# Initialize FastAPI app
app = FastAPI()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fix for Windows connection reset errors
if os.name == 'nt':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    signal.signal(signal.SIGINT, signal.SIG_DFL)
    signal.signal(signal.SIGTERM, signal.SIG_DFL)

# Constants
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
EXCEL_PATH = os.path.join(BASE_DIR, "vehicle_data.xlsx")
MIN_CONFIDENCE = 0.4
FRAME_WIDTH = 1280
FRAME_HEIGHT = 720

# Ensure directories exist
os.makedirs(MODEL_DIR, exist_ok=True)

# Custom JSON encoder for NumPy types
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.float32):
            return float(obj)
        if np.isnan(obj):
            return None
        return super().default(obj)

# Initialize device and models
try:
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"Using device: {device}")
    
    # Initialize models with full paths
    plate_model_path = os.path.join(BASE_DIR, "best.pt")
    object_model_path = os.path.join(BASE_DIR, "yolov8n.pt")
    
    plate_model = YOLO(plate_model_path).to(device)
    object_model = YOLO(object_model_path).to(device)
    reader = easyocr.Reader(['en'])
    
    logger.info("Models loaded successfully")
except Exception as e:
    logger.error(f"Error initializing models: {str(e)}")
    raise

# Initialize Excel file if not exists
if not os.path.exists(EXCEL_PATH):
    initial_data = {
        "Plate Number": [],
        "Timestamp": [],
        "Location": [],
        "Vehicle Type": [],
        "Confidence": [],
        "Detection Type": []
    }
    df = pd.DataFrame(initial_data)
    df.to_excel(EXCEL_PATH, index=False)
    logger.info(f"Created new Excel file at {EXCEL_PATH}")

def preprocess_frame(frame: np.ndarray) -> np.ndarray:
    """
    Enhanced frame preprocessing for better detection
    """
    try:
        if frame is None:
            raise ValueError("Input frame is None")
            
        # Resize for consistency
        frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))
        
        # Convert to LAB color space
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        cl = clahe.apply(l)
        
        # Merge channels
        enhanced = cv2.merge((cl,a,b))
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        # Denoise
        denoised = cv2.fastNlMeansDenoisingColored(enhanced)
        
        return denoised
    except Exception as e:
        logger.error(f"Frame preprocessing error: {str(e)}")
        return frame if frame is not None else np.zeros((FRAME_HEIGHT, FRAME_WIDTH, 3), dtype=np.uint8)

def enhance_plate_region(roi: np.ndarray) -> np.ndarray:
    """
    Enhance license plate region for better OCR
    """
    try:
        if roi is None or roi.size == 0:
            raise ValueError("Invalid ROI")
            
        # Convert to grayscale
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        
        # Apply bilateral filter
        denoised = cv2.bilateralFilter(gray, 11, 17, 17)
        
        # Apply adaptive threshold
        thresh = cv2.adaptiveThreshold(
            denoised, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )
        
        # Morphological operations
        kernel = np.ones((2,2), np.uint8)
        morph = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        return morph
    except Exception as e:
        logger.error(f"ROI enhancement error: {str(e)}")
        return roi if roi is not None else np.array([])

def get_ocr_text(img: np.ndarray) -> tuple[str, float]:
    """
    Improved OCR function with confidence score
    """
    try:
        if img is None or img.size == 0:
            return "", 0.0
            
        results = reader.readtext(img)
        
        if not results:
            return "", 0.0
            
        valid_plates = []
        for (bbox, text, conf) in results:
            # Clean text
            cleaned_text = ''.join(c for c in text if c.isalnum() or c.isspace())
            
            # Validation rules
            if (len(cleaned_text) >= 5 and
                conf > MIN_CONFIDENCE and
                any(c.isdigit() for c in cleaned_text)):
                valid_plates.append((cleaned_text, conf))
        
        if valid_plates:
            best_result = max(valid_plates, key=lambda x: x[1])
            return best_result[0], float(best_result[1])
            
        return "", 0.0
    except Exception as e:
        logger.error(f"OCR error: {str(e)}")
        return "", 0.0
def update_excel(
    plate_text: str, 
    confidence: float, 
    location: str = "Unknown", 
    vehicle_type: str = "Unknown",
    detection_type: str = "Automatic"
):
    """
    Update Excel with detection results
    """
    try:
        # Read existing data or create new DataFrame
        try:
            df = pd.read_excel(EXCEL_PATH)
        except Exception as e:
            logger.error(f"Error reading Excel file: {e}")
            df = pd.DataFrame(columns=[
                "Plate Number", 
                "Timestamp", 
                "Location", 
                "Vehicle Type", 
                "Confidence",
                "Detection Type"
            ])

        current_time = datetime.now()
        
        # Check for recent duplicates
        recent_entries = df[df["Plate Number"] == plate_text] if not df.empty else pd.DataFrame()
        
        if recent_entries.empty or (current_time - pd.to_datetime(recent_entries.iloc[-1]["Timestamp"])).total_seconds() > 10:
            new_row = {
                "Plate Number": str(plate_text) if plate_text else "Unknown",
                "Timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "Location": str(location) if location else "Unknown",
                "Vehicle Type": str(vehicle_type) if vehicle_type else "Unknown",
                "Confidence": float(confidence) if isinstance(confidence, (int, float)) else 0.0,
                "Detection Type": str(detection_type)
            }
            
            # Add new row to DataFrame
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
            
            # Handle NaN values
            df = df.fillna({
                'Plate Number': 'Unknown',
                'Location': 'Unknown',
                'Vehicle Type': 'Unknown',
                'Confidence': 0.0,
                'Timestamp': current_time.strftime("%Y-%m-%d %H:%M:%S"),
                'Detection Type': 'Unknown'
            })
            
            try:
                # Save to Excel with error handling
                df.to_excel(EXCEL_PATH, index=False)
                logger.info(f"Successfully updated Excel with plate: {plate_text}")
            except Exception as e:
                logger.error(f"Error saving to Excel: {e}")
                # Try to save with a timestamp in filename as backup
                backup_path = f"vehicle_data_backup_{current_time.strftime('%Y%m%d_%H%M%S')}.xlsx"
                df.to_excel(backup_path, index=False)
                logger.info(f"Saved backup to: {backup_path}")
    except Exception as e:
        logger.error(f"Excel update error: {str(e)}")

@app.get("/get-ip-camera-frame/")
async def get_ip_camera_frame(camera_url: str = Query(..., description="Camera URL")):
    """
    Process camera frame for plate and object detection
    """
    cap = None
    try:
        if not camera_url:
            raise HTTPException(status_code=400, detail="Camera URL is required")

        cap = cv2.VideoCapture(camera_url)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Unable to open camera")

        ret, frame = cap.read()
        if not ret or frame is None:
            raise HTTPException(status_code=400, detail="Failed to capture frame")

        # Process frame
        processed_frame = preprocess_frame(frame)
        
        # Detect plates
        results = plate_model(processed_frame, conf=0.6)
        
        detected_plates = []
        object_counts = {}

        # Process plate detections
        for result in results:
            boxes = result.boxes
            for box in boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                detection_conf = float(box.conf[0])
                
                # Process plate region
                plate_roi = processed_frame[y1:y2, x1:x2]
                enhanced_roi = enhance_plate_region(plate_roi)
                
                # Get plate text
                plate_text, ocr_conf = get_ocr_text(enhanced_roi)
                if not plate_text:
                    plate_text, ocr_conf = get_ocr_text(plate_roi)

                if plate_text and detection_conf > 0.6:
                    # Annotate frame
                    cv2.rectangle(processed_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    label = f"{plate_text} (D:{detection_conf:.2f}, O:{ocr_conf:.2f})"
                    cv2.putText(processed_frame, label, (x1, y1-10),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                    
                    # Store detection
                    detected_plates.append({
                        'text': plate_text,
                        'detection_confidence': float(detection_conf),
                        'ocr_confidence': float(ocr_conf),
                        'bbox': [int(x1), int(y1), int(x2), int(y2)]
                    })
                    
                    # Update Excel
                    update_excel(
                        plate_text,
                        min(float(detection_conf), float(ocr_conf)),
                        camera_url
                    )

        # Detect objects
        object_results = object_model(processed_frame)
        for obj_result in object_results:
            for obj_box in obj_result.boxes:
                cls = int(obj_box.cls[0])
                label = object_model.names[cls]
                if label in ['car', 'truck', 'bus', 'motorcycle']:
                    object_counts[label] = object_counts.get(label, 0) + 1

        # Prepare response
        _, buffer = cv2.imencode('.jpg', processed_frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        return {
            "success": True,
            "image": img_base64,
            "plates": [plate['text'] for plate in detected_plates],
            "object_count": object_counts,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "details": detected_plates
        }

    except Exception as e:
        logger.error(f"Detection error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "plates": [],
            "object_count": {},
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    finally:
        if cap is not None:
            cap.release()

@app.get("/search-number-plate/")
async def search_number_plate(
    plate: Optional[str] = Query(None, description="Number plate to search"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1)
):
    """
    Search for number plates in the database
    """
    try:
        # Verify Excel file exists
        if not os.path.exists(EXCEL_PATH):
            logger.error("Excel file not found")
            return {
                "success": False,
                "error": "Database file not found",
                "data": []
            }

        # Read Excel file
        df = pd.read_excel(EXCEL_PATH)
        logger.info(f"Read {len(df)} records from Excel")
        
        if df.empty:
            return {
                "success": True,
                "data": [],
                "total": 0,
                "page": page,
                "limit": limit
            }

        # Handle NaN values
        df = df.fillna({
            'Plate Number': 'Unknown',
            'Location': 'Unknown',
            'Vehicle Type': 'Unknown',
            'Confidence': 0.0,
            'Timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'Detection Type': 'Unknown'
        })

        # Filter by plate number if provided
        if plate:
            df = df[df['Plate Number'].str.contains(plate, case=False, na=False)]

        # Calculate pagination
        total_items = len(df)
        start_index = (page - 1) * limit
        end_index = min(start_index + limit, total_items)

        # Slice dataframe for current page
        paginated_df = df.iloc[start_index:end_index].copy()

        # Convert to records and ensure all values are JSON serializable
        results = []
        for _, row in paginated_df.iterrows():
            cleaned_record = {
                "Plate Number": str(row["Plate Number"]),
                "Timestamp": str(row["Timestamp"]),
                "Location": str(row["Location"]),
                "Vehicle Type": str(row["Vehicle Type"]),
                "Confidence": float(row["Confidence"]) if not pd.isna(row["Confidence"]) else 0.0,
                "Detection Type": str(row.get("Detection Type", "Unknown"))
            }
            results.append(cleaned_record)

        logger.info(f"Returning {len(results)} records")
        
        return {
            "success": True,
            "data": results,
            "total": total_items,
            "page": page,
            "limit": limit
        }

    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "data": []
        }

# Debug endpoints
@app.get("/debug/excel-path")
async def get_excel_path():
    """
    Debug endpoint to check Excel file path and status
    """
    return {
        "excel_path": EXCEL_PATH,
        "exists": os.path.exists(EXCEL_PATH),
        "size": os.path.getsize(EXCEL_PATH) if os.path.exists(EXCEL_PATH) else 0,
        "base_dir": BASE_DIR
    }

@app.get("/debug/excel-content")
async def get_excel_content():
    """
    Debug endpoint to check Excel file content
    """
    try:
        df = pd.read_excel(EXCEL_PATH)
        return {
            "success": True,
            "row_count": len(df),
            "columns": list(df.columns),
            "sample_data": df.head().to_dict(orient="records")
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)