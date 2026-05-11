import cv2
import easyocr
import numpy as np
import re
import os
import sys
import time
from pathlib import Path
from flask import Flask, request, jsonify
import base64

# Disable YOLO to reduce memory usage and avoid Exit Code 137
YOLO_AVAILABLE = False
print("Using optimized cascade detection for Indian plates")

class IndianPlateDetector:
    def __init__(self):
        try:
            # Force CPU usage to avoid memory issues (Exit Code 137)
            self.device = 'cpu'
            print("Using CPU for stable performance")
            
            # Initialize EasyOCR with CPU-only mode for stability
            # Configure for better Indian plate recognition
            self.reader = easyocr.Reader(
                ['en'], 
                gpu=False,  # Force CPU to avoid memory crashes
                model_storage_directory='~/.EasyOCR/model',
                download_enabled=True,
                verbose=False,
                quantize=True  # Use quantized models for lower memory
            )
            print("EasyOCR initialized for English (Indian plates) - CPU mode")
            
            # Indian plate specific configurations
            self.allowlist = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'  # Only alphanumeric
            self.min_text_size = 8  # Reduced for better detection
            
            # YOLO disabled to prevent memory issues
            self.plate_detector = None
            
            # Always initialize cascade classifier as backup
            cascade_path = os.path.join(os.path.dirname(__file__), "model/haarcascade_russian_plate_number.xml")
            if not os.path.exists(cascade_path):
                cascade_path = cv2.data.haarcascades + "haarcascade_russian_plate_number.xml"
                
            if os.path.exists(cascade_path):
                self.plate_cascade = cv2.CascadeClassifier(cascade_path)
                print(f"Cascade classifier loaded from: {cascade_path}")
            else:
                self.plate_cascade = cv2.CascadeClassifier()
            
            # Indian license plate patterns
            # Standard format: XX00XX0000 (e.g., MH12AB1234)
            # Old format: XX-00-X-0000 (e.g., MH-12-A-1234)
            self.indian_plate_pattern = re.compile(r'[A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,2}\s*\d{1,4}')
            self.number_pattern = re.compile(r'\d+')
            
            # Parameters
            self.min_plate_area = 500
            self.min_confidence = 0.2
            
        except Exception as e:
            print(f"Error during initialization: {str(e)}")
            sys.exit(1)

    def ensure_image_format(self, img):
        """Make sure image is in the correct format for processing"""
        try:
            if img is None or img.size == 0:
                print("Invalid image input")
                return None
            
            if len(img.shape) == 3 and img.shape[2] == 4:
                img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
            elif len(img.shape) == 2:
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
            
            if img.dtype != np.uint8:
                img = img.astype(np.uint8)
                
            return img
        except Exception as e:
            print(f"Error in image format conversion: {e}")
            return np.ones((100, 100, 3), dtype=np.uint8) * 255

    def deskew_image(self, img):
        """Deskew (straighten) rotated images using minAreaRect"""
        try:
            # Convert to grayscale if needed
            if len(img.shape) == 3:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            else:
                gray = img
            
            # Threshold to get binary image
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            
            # Find contours
            coords = cv2.findNonZero(thresh)
            if coords is None:
                return img
            
            # Get rotation angle
            angle = cv2.minAreaRect(coords)[-1]
            
            # Adjust angle
            if angle < -45:
                angle = 90 + angle
            elif angle > 45:
                angle = angle - 90
            
            # Only rotate if angle is significant
            if abs(angle) > 0.5:
                # Get image center and rotation matrix
                (h, w) = img.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                
                # Perform rotation
                rotated = cv2.warpAffine(img, M, (w, h), 
                                        flags=cv2.INTER_CUBIC, 
                                        borderMode=cv2.BORDER_REPLICATE)
                print(f"Deskewed image by {angle:.2f} degrees")
                return rotated
            
            return img
        except Exception as e:
            print(f"Deskew error: {e}")
            return img

    def preprocess_plate_for_ocr(self, plate_img):
        """Enhanced preprocessing for Indian license plate OCR - Based on successful GitHub implementations"""
        try:
            # First, deskew the image if it's rotated
            deskewed = self.deskew_image(plate_img)
            
            # Resize to standard Indian plate dimensions (333x75 as per reference implementation)
            img = cv2.resize(deskewed, (333, 75))
            
            # Convert to grayscale
            if len(img.shape) == 3:
                img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            else:
                img_gray = img
            
            # Enhance contrast using CLAHE before thresholding
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            img_gray = clahe.apply(img_gray)
            
            # Apply Otsu's thresholding + binary threshold (reference method)
            # This works better for license plates than adaptive threshold
            _, img_binary = cv2.threshold(img_gray, 200, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Apply erosion to remove noise
            kernel_erode = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
            img_erode = cv2.erode(img_binary, kernel_erode, iterations=1)
            
            # Apply dilation to fill gaps
            kernel_dilate = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
            img_dilate = cv2.dilate(img_erode, kernel_dilate, iterations=1)
            
            # Make borders white to remove edge noise (reference technique)
            img_dilate[0:3, :] = 255
            img_dilate[:, 0:3] = 255
            img_dilate[72:75, :] = 255
            img_dilate[:, 330:333] = 255
            
            # Scale up for better OCR (4x magnification)
            h, w = img_dilate.shape
            scaled = cv2.resize(img_dilate, (w * 4, h * 4), interpolation=cv2.INTER_CUBIC)
            
            return scaled
        except Exception as e:
            print(f"Error in plate preprocessing: {e}")
            return plate_img

    def detect_plate(self, img):
        """Detect license plates using available methods"""
        try:
            height, width = img.shape[:2]
            max_dimension = 1600
            if max(height, width) > max_dimension:
                scale = max_dimension / max(height, width)
                img = cv2.resize(img, None, fx=scale, fy=scale)
            
            detected_plates = []
            
            # Method 1: Use cascade detection (YOLO disabled for stability)
            if not detected_plates:
                try:
                    detected_plates = self.detect_with_cascade(img)
                except Exception as e:
                    print(f"Cascade detection failed: {e}")
            
            # Method 2: Try contour-based detection
            if not detected_plates:
                try:
                    print("Attempting contour-based detection...")
                    contour_plates = self.detect_by_contours(img)
                    if contour_plates:
                        detected_plates = contour_plates
                except Exception as e:
                    print(f"Contour detection failed: {e}")
            
            # Method 3: If still no plates, try direct OCR on the full image
            if not detected_plates:
                try:
                    print("Attempting direct OCR on full image...")
                    h, w = img.shape[:2]
                    detected_plates.append((0, 0, w, h, 0.3))
                except Exception as e:
                    print(f"Direct OCR preparation failed: {e}")
            
            return detected_plates
            
        except Exception as e:
            print(f"Error in plate detection: {str(e)}")
            return []
    
    def detect_by_contours(self, img):
        """Fallback: Detect plate using contour analysis"""
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Apply bilateral filter to reduce noise
            bilateral = cv2.bilateralFilter(gray, 11, 17, 17)
            
            # Edge detection
            edged = cv2.Canny(bilateral, 30, 200)
            
            # Find contours
            contours, _ = cv2.findContours(edged.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            contours = sorted(contours, key=cv2.contourArea, reverse=True)[:30]
            
            detected_plates = []
            
            for contour in contours:
                peri = cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
                
                # Look for rectangular contours
                if len(approx) == 4:
                    x, y, w, h = cv2.boundingRect(contour)
                    aspect_ratio = w / float(h)
                    area = w * h
                    
                    # Indian plates are typically 2.5-5:1 aspect ratio, minimum size 100x30
                    if 2.0 < aspect_ratio < 6.0 and w > 100 and h > 30 and area > 3000:
                        print(f"Plate found by contours: {w}x{h}, aspect ratio: {aspect_ratio:.2f}")
                        detected_plates.append((x, y, w, h, 0.6))
                        break  # Take first valid plate
            
            return detected_plates
            
        except Exception as e:
            print(f"Error in detect_by_contours: {str(e)}")
            return []
    
    def detect_with_cascade(self, img):
        """Detect license plates using Haar cascade - Optimized for Indian plates with multiple parameter sets"""
        if self.plate_cascade is None or self.plate_cascade.empty():
            print("Cascade classifier not available, using full image")
            h, w = img.shape[:2]
            return [(0, 0, w, h, 0.3)]
        
        try:
            # Make copy to avoid modifying original
            plate_img = img.copy()
            
            # Convert to grayscale
            img_gray = cv2.cvtColor(plate_img, cv2.COLOR_BGR2GRAY)
            
            # Try multiple parameter sets
            plate_rects = []
            
            # Set 1: Reference implementation (scaleFactor=1.3, minNeighbors=7)
            plate_rects = self.plate_cascade.detectMultiScale(
                img_gray,
                scaleFactor=1.3,
                minNeighbors=7,
                minSize=(100, 30)
            )
            
            # Set 2: More aggressive if nothing found
            if len(plate_rects) == 0:
                print("Trying more aggressive cascade parameters...")
                plate_rects = self.plate_cascade.detectMultiScale(
                    img_gray,
                    scaleFactor=1.1,
                    minNeighbors=3,
                    minSize=(80, 20),
                    maxSize=(400, 120)
                )
            
            # Set 3: Very aggressive if still nothing
            if len(plate_rects) == 0:
                print("Trying very aggressive cascade parameters...")
                plate_rects = self.plate_cascade.detectMultiScale(
                    img_gray,
                    scaleFactor=1.05,
                    minNeighbors=2,
                    minSize=(60, 15)
                )
            
            filtered_plates = []
            
            for (x, y, w, h) in plate_rects:
                # Parameter tuning from reference: 2% height, 2.5% width margins
                a, b = (int(0.02 * img.shape[0]), int(0.025 * img.shape[1]))
                
                # Adjust coordinates with margins
                x_adj = max(0, x + b)
                y_adj = max(0, y + a)
                w_adj = min(img.shape[1] - x_adj, w - 2*b)
                h_adj = min(img.shape[0] - y_adj, h - 2*a)
                
                # Validate dimensions
                if w_adj > 0 and h_adj > 0:
                    aspect_ratio = w_adj / float(h_adj)
                    area = w_adj * h_adj
                    
                    # Indian plates: aspect ratio ~3:1 to 4.5:1
                    if 2.5 <= aspect_ratio <= 5.0 and area > self.min_plate_area:
                        filtered_plates.append((x_adj, y_adj, w_adj, h_adj, 0.7))
                        print(f"Found plate: ({x_adj}, {y_adj}, {w_adj}, {h_adj}), aspect ratio: {aspect_ratio:.2f}")
            
            if filtered_plates:
                print(f"✓ Cascade detected {len(filtered_plates)} plate region(s)")
                return filtered_plates
            else:
                print("No plates detected by cascade, trying full image")
                h, w = img.shape[:2]
                return [(0, 0, w, h, 0.3)]
                
        except Exception as e:
            print(f"Error in cascade detection: {e}")
            # Fallback to full image
            h, w = img.shape[:2]
            return [(0, 0, w, h, 0.3)]
    
    def preprocess_image(self, img):
        """Apply minimal preprocessing techniques for detection"""
        try:
            img = self.ensure_image_format(img)
            if img is None:
                return [np.ones((100, 100, 3), dtype=np.uint8) * 255]
            
            preprocessed_images = []
            preprocessed_images.append(img.copy())
            
            # Add grayscale variant
            try:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                gray_3ch = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
                preprocessed_images.append(gray_3ch)
            except Exception as e:
                print(f"Grayscale conversion error: {e}")
            
            return preprocessed_images
        except Exception as e:
            print(f"Critical error in preprocessing: {str(e)}")
            if img is not None and img.size > 0:
                return [img.copy()]
            return [np.ones((100, 100, 3), dtype=np.uint8) * 255]
    
    def process_ocr_results(self, ocr_results):
        """Process OCR results to extract Indian license plate information"""
        # Sort results by confidence
        sorted_results = sorted(ocr_results, key=lambda x: x[2], reverse=True)
        
        # Debug OCR results
        print("OCR Results:", [(text, conf) for _, text, conf in sorted_results])
        
        # Extract all text and combine
        all_text = ' '.join([item[1] for item in sorted_results]).upper()
        print(f"Combined OCR text: {all_text}")
        
        # Remove Arabic characters, spaces, and common noise
        cleaned_text = re.sub(r'[\u0600-\u06FF]', '', all_text)
        cleaned_text = re.sub(r'\s+', '', cleaned_text)
        # Remove common misreads like "IND" watermark
        cleaned_text = re.sub(r'^IND+', '', cleaned_text)  # Remove IND from start
        cleaned_text = re.sub(r'IND+$', '', cleaned_text)  # Remove IND from end
        
        print(f"Cleaned text (no Arabic, no IND): {cleaned_text}")
        
        # Try to match standard Indian plate patterns
        # Pattern 1: XX00XX0000 (e.g., MH14F02071)
        # Pattern 2: XX-00-XX-0000 (with hyphens)
        indian_patterns = [
            r'([A-Z]{2})[\s\-]?(\d{1,2})[\s\-]?([A-Z]{1,2})[\s\-]?(\d{3,4})',  # Standard
            r'([A-Z]{2})(\d{2})([A-Z]{1,2})(\d{4})',  # Compact
        ]
        
        plate_text = ""
        confidence = 0.0
        
        for pattern in indian_patterns:
            match = re.search(pattern, cleaned_text)
            if match:
                groups = match.groups()
                plate_text = ''.join(groups)
                confidence = 0.8
                print(f"Matched Indian plate pattern: {plate_text}")
                break
        
        # If no pattern match, check if we have reasonable alphanumeric text
        if not plate_text and len(cleaned_text) >= 6:
            # Try to extract something that looks like a plate
            # Look for pattern: letters + numbers + letters + numbers
            alphanumeric = re.findall(r'[A-Z]+|\d+', cleaned_text)
            if len(alphanumeric) >= 4:
                plate_text = ''.join(alphanumeric[:4])  # Take first 4 groups
                confidence = 0.6
                print(f"Extracted from alphanumeric groups: {plate_text}")
            else:
                plate_text = cleaned_text[:12]  # Take first 12 chars
                confidence = 0.4
                print(f"Using cleaned text: {plate_text}")
        elif not plate_text:
            plate_text = "UNKNOWN"
            confidence = 0.1
            print("Not enough characters detected")
        
        # Try to format it nicely
        formatted_text = self.format_indian_plate(plate_text)
        
        print(f"Final plate text: '{formatted_text}' with confidence: {confidence}")
        
        return formatted_text, [plate_text], "", confidence
    
    def format_indian_plate(self, plate_text):
        """Format Indian plate text to standard format: XX-00-XX-0000"""
        # Remove all spaces and hyphens first
        cleaned = re.sub(r'[\s\-]', '', plate_text)
        
        if len(cleaned) < 6:
            return cleaned
        
        # Try to extract components
        # State code: first 2 letters
        state = cleaned[:2] if len(cleaned) >= 2 and cleaned[:2].isalpha() else ""
        remaining = cleaned[2:]
        
        # RTO code: next 1-2 digits
        rto_match = re.match(r'(\d{1,2})', remaining)
        rto = rto_match.group(1) if rto_match else ""
        remaining = remaining[len(rto):]
        
        # Series: next 1-2 letters
        series_match = re.match(r'([A-Z]{1,2})', remaining)
        series = series_match.group(1) if series_match else ""
        remaining = remaining[len(series):]
        
        # Number: remaining digits (usually 4)
        number = remaining[:4] if remaining else ""
        
        # Format with hyphens
        if state and rto and series and number:
            return f"{state}-{rto}-{series}-{number}"
        elif state and rto and number:
            return f"{state}-{rto}-{number}"
        else:
            return cleaned
    
    def detect_indian_plate_text(self, text):
        """Validate if text matches Indian plate pattern"""
        # Check if text matches Indian plate pattern
        match = self.indian_plate_pattern.search(text.upper())
        if match:
            return match.group(0), True, 0.9
        
        return text, False, 0.0
    
    def process_image_array(self, img):
        """Process an image array directly with improved detection and OCR"""
        if img is None:
            return None, 0.0
            
        try:
            # First ensure valid image format
            img = self.ensure_image_format(img)
            if img is None:
                return None, 0.0
            
            # Detect plate regions with confidence scores
            plate_regions = self.detect_plate(img)
            if not plate_regions:
                print("No license plates detected")
                return None, 0.0
                
            best_confidence = 0.0
            best_plate_text = None
            
            for idx, (x, y, w, h, detection_conf) in enumerate(plate_regions):
                try:
                    # Make sure coordinates are valid
                    x, y, w, h = int(x), int(y), int(w), int(h)
                    if x < 0: x = 0
                    if y < 0: y = 0
                    if w <= 0 or h <= 0 or x+w > img.shape[1] or y+h > img.shape[0]:
                        print(f"Invalid plate region #{idx}: ({x}, {y}, {w}, {h}) for image of size {img.shape}")
                        continue
                    
                    # Extract plate region
                    plate_roi = img[y:y+h, x:x+w].copy()
                    
                    # Apply enhanced preprocessing for Indian plates
                    preprocessed_plate = self.preprocess_plate_for_ocr(plate_roi)
                    
                    # Apply OCR with optimized parameters for Indian plates
                    # Try multiple preprocessing approaches for better accuracy
                    ocr_results = []
                    try:
                        # Approach 1: Preprocessed image with strict parameters
                        results1 = self.reader.readtext(
                            preprocessed_plate,
                            allowlist=self.allowlist,
                            paragraph=False,
                            min_size=self.min_text_size,
                            text_threshold=0.4,  # Lowered threshold
                            low_text=0.2,
                            link_threshold=0.1,
                            canvas_size=3200,
                            mag_ratio=2.0,
                            slope_ths=0.5,  # More tolerance for rotated text
                            ycenter_ths=0.5,
                            height_ths=0.5,
                            width_ths=0.8,
                            add_margin=0.2
                        )
                        ocr_results.extend(results1)
                        print(f"OCR Approach 1: {len(results1)} text regions detected")
                        
                        # Approach 2: Try on original plate with inverted colors
                        if len(results1) < 4:  # If we didn't get enough characters
                            print(f"Trying OCR Approach 2: inverted colors...")
                            plate_gray = cv2.cvtColor(plate_roi, cv2.COLOR_BGR2GRAY)
                            plate_inverted = cv2.bitwise_not(plate_gray)
                            # Scale up
                            plate_inverted_scaled = cv2.resize(plate_inverted, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
                            
                            results2 = self.reader.readtext(
                                plate_inverted_scaled,
                                allowlist=self.allowlist,
                                paragraph=False,
                                min_size=5
                            )
                            ocr_results.extend(results2)
                            print(f"OCR Approach 2: {len(results2)} text regions detected")
                        
                        # Approach 3: Try on deskewed original
                        if len(ocr_results) < 4:
                            print(f"Trying OCR Approach 3: deskewed original...")
                            deskewed_roi = self.deskew_image(plate_roi)
                            deskewed_scaled = cv2.resize(deskewed_roi, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
                            
                            results3 = self.reader.readtext(
                                deskewed_scaled,
                                allowlist=self.allowlist,
                                paragraph=False,
                                min_size=5
                            )
                            ocr_results.extend(results3)
                            print(f"OCR Approach 3: {len(results3)} text regions detected")
                            
                    except Exception as e:
                        print(f"OCR error: {e}")
                    
                    if ocr_results:
                        # Process the text with confidence scoring
                        plate_text, numbers, india_text, text_conf = self.process_ocr_results(ocr_results)
                        
                        # Combine detection and OCR confidence
                        combined_conf = detection_conf * 0.3 + text_conf * 0.7
                        
                        if combined_conf > best_confidence:
                            best_confidence = combined_conf
                            best_plate_text = plate_text
                except Exception as e:
                    print(f"Error processing plate region #{idx}: {e}")
                    continue
                        
            if best_plate_text:
                return best_plate_text, best_confidence
            
            return None, 0.0
        except Exception as e:
            print(f"Error in image processing: {e}")
            return None, 0.0

# Initialize Flask application
app = Flask(__name__)
detector = IndianPlateDetector()

@app.route('/detect_plate', methods=['POST'])
def detect_plate():
    try:
        # Check if the request contains an image
        if 'image' not in request.files and 'image' not in request.json:
            return jsonify({'error': 'No image provided'}), 400
        
        # Handle file upload
        if 'image' in request.files:
            file = request.files['image']
            img_bytes = file.read()
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        # Handle base64 encoded image
        elif 'image' in request.json:
            base64_img = request.json['image']
            if base64_img.startswith('data:image'):
                base64_img = base64_img.split(',')[1]
            img_bytes = base64.b64decode(base64_img)
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Process the image
        print(f"Processing image of shape: {img.shape}")
        plate_text, confidence = detector.process_image_array(img)
        
        if plate_text is None or plate_text == "UNKNOWN":
            print("No valid plate detected")
            return jsonify({
                'success': False,
                'plate_number': None,
                'confidence': 0,
                'noPlateDetected': True
            })
        
        print(f"✓ Detected plate: {plate_text} (confidence: {confidence:.2f})")
        return jsonify({
            'success': True,
            'plate_number': plate_text,  # Changed from plateText to match backend expectations
            'confidence': float(confidence),
            'noPlateDetected': False
        })
    
    except Exception as e:
        print(f"Error processing request: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Indian License Plate Detection',
        'ocr_ready': detector.reader is not None,
        'cascade_ready': detector.plate_cascade is not None and not detector.plate_cascade.empty()
    })

# Add a basic root route
@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'service': 'Indian License Plate Detection API',
        'status': 'active',
        'sample': 'MH-12-AB-1234'  # Sample Indian plate format
    })

if __name__ == '__main__':
    # Run Flask app with UTF-8 support on port 5001 (5000 is used by macOS AirPlay)
    app.run(host='0.0.0.0', port=5001, debug=False)

