import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import re
import pytesseract
from PIL import Image
import os
import base64
import time

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class IndianPlateDetector:
    def __init__(self):
        logger.info("Initializing Indian License Plate Detector - Reference Implementation")
        
        # Load Haar Cascade for Indian license plates
        cascade_path = os.path.join(os.path.dirname(__file__), "model/haarcascade_russian_plate_number.xml")
        if not os.path.exists(cascade_path):
            cascade_path = cv2.data.haarcascades + "haarcascade_russian_plate_number.xml"
        
        self.plate_cascade = cv2.CascadeClassifier(cascade_path)
        logger.info(f"Cascade loaded: {not self.plate_cascade.empty()}")
        
        # Tesseract configuration for Indian plates (alphanumeric only)
        self.tesseract_config = r'--oem 3 --psm 7 -c tesseract_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        
    def extract_plate(self, img):
        """Extract plate using multiple detection methods"""
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Method 1: Try with reference repository parameters
            plates = self.plate_cascade.detectMultiScale(
                gray,
                scaleFactor=1.3,
                minNeighbors=7,
                minSize=(100, 30)
            )
            
            # Method 2: Try with more aggressive parameters
            if len(plates) == 0:
                logger.info("Trying with aggressive parameters...")
                plates = self.plate_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=3,
                    minSize=(80, 20),
                    maxSize=(400, 120)
                )
            
            # Method 3: Try contour-based detection
            if len(plates) == 0:
                logger.info("Trying contour-based detection...")
                plate_img = self.detect_plate_by_contours(img)
                if plate_img is not None:
                    return plate_img
            
            if len(plates) == 0:
                logger.warning("No plates detected by any method")
                return None
            
            # Get the largest detected plate
            plate = max(plates, key=lambda x: x[2] * x[3])
            x, y, w, h = plate
            
            # Apply margin adjustments (2% height, 2.5% width from reference)
            margin_h = int(h * 0.02)
            margin_w = int(w * 0.025)
            
            x = max(0, x - margin_w)
            y = max(0, y - margin_h)
            w = min(img.shape[1] - x, w + 2 * margin_w)
            h = min(img.shape[0] - y, h + 2 * margin_h)
            
            plate_img = img[y:y+h, x:x+w]
            logger.info(f"Plate extracted: {w}x{h}")
            return plate_img
            
        except Exception as e:
            logger.error(f"Error in extract_plate: {str(e)}")
            return None
    
    def detect_plate_by_contours(self, img):
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
            
            for contour in contours:
                peri = cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
                
                # Look for rectangular contours (4 corners) or approximate rectangles
                if len(approx) >= 4:
                    x, y, w, h = cv2.boundingRect(contour)
                    aspect_ratio = w / float(h)
                    area = w * h
                    
                    # More lenient: Indian plates are typically 2-6:1 aspect ratio, smaller minimum size
                    if 1.5 < aspect_ratio < 7.0 and w > 60 and h > 20 and area > 1500:
                        logger.info(f"Plate found by contours: {w}x{h}, aspect ratio: {aspect_ratio:.2f}")
                        plate_img = img[y:y+h, x:x+w]
                        return plate_img
            
            return None
            
        except Exception as e:
            logger.error(f"Error in detect_plate_by_contours: {str(e)}")
            return None
    
    def deskew_image(self, img):
        """Deskew rotated images"""
        try:
            if len(img.shape) == 3:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            else:
                gray = img
            
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            coords = cv2.findNonZero(thresh)
            
            if coords is None:
                return img
            
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = 90 + angle
            elif angle > 45:
                angle = angle - 90
            
            if abs(angle) > 0.5:
                (h, w) = img.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                rotated = cv2.warpAffine(img, M, (w, h), 
                                        flags=cv2.INTER_CUBIC,
                                        borderMode=cv2.BORDER_REPLICATE)
                logger.info(f"Deskewed by {angle:.2f} degrees")
                return rotated
            
            return img
        except Exception as e:
            logger.error(f"Deskew error: {e}")
            return img
        
    def segment_characters(self, image):
        """Segment characters from license plate - Reference Implementation"""
        # Preprocess cropped license plate image - EXACTLY from reference
        img = cv2.resize(image, (333, 75))  # Reference standard size
        img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Otsu's thresholding - Reference method
        _, img_binary = cv2.threshold(img_gray, 200, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Erosion and dilation - Reference method
        kernel = np.ones((3, 3), np.uint8)
        img_erode = cv2.erode(img_binary, kernel, iterations=1)
        img_dilate = cv2.dilate(img_erode, kernel, iterations=1)
        
        LP_WIDTH = img_dilate.shape[0]
        LP_HEIGHT = img_dilate.shape[1]
        
        # Make borders white - Reference technique
        img_dilate[0:3, :] = 255
        img_dilate[:, 0:3] = 255
        img_dilate[72:75, :] = 255
        img_dilate[:, 330:333] = 255
        
        # Estimations of character contours sizes - Reference parameters
        dimensions = [LP_WIDTH/6, LP_WIDTH/2, LP_HEIGHT/10, 2*LP_HEIGHT/3]
        
        # Find contours
        char_list = self.find_contours(dimensions, img_dilate)
        
        return char_list, img_dilate
    
    def find_contours(self, dimensions, img):
        """Find character contours - Reference Implementation"""
        # Find all contours in the image
        cntrs, _ = cv2.findContours(img.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        
        # Retrieve potential dimensions
        lower_width = dimensions[0]
        upper_width = dimensions[1]
        lower_height = dimensions[2]
        upper_height = dimensions[3]
        
        # Check largest 15 contours for characters
        cntrs = sorted(cntrs, key=cv2.contourArea, reverse=True)[:15]
        
        x_cntr_list = []
        target_contours = []
        img_res = []
        
        for cntr in cntrs:
            # Detects contour in binary image and returns coordinates
            intX, intY, intWidth, intHeight = cv2.boundingRect(cntr)
            
            # Check dimensions to filter characters by size
            if (intWidth > lower_width and intWidth < upper_width and 
                intHeight > lower_height and intHeight < upper_height):
                
                x_cntr_list.append(intX)
                
                char_copy = np.zeros((44, 24))
                # Extract each character using the enclosing rectangle's coordinates
                char = img[intY:intY+intHeight, intX:intX+intWidth]
                char = cv2.resize(char, (20, 40))
                
                # Invert colors for classification
                char = cv2.subtract(255, char)
                
                # Resize to 24x44 with black border
                char_copy[2:42, 2:22] = char
                char_copy[0:2, :] = 0
                char_copy[:, 0:2] = 0
                char_copy[42:44, :] = 0
                char_copy[:, 22:24] = 0
                
                img_res.append(char_copy)
        
        # Sort characters by x-coordinate (left to right)
        if len(x_cntr_list) > 0:
            indices = sorted(range(len(x_cntr_list)), key=lambda k: x_cntr_list[k])
            img_res_copy = []
            for idx in indices:
                img_res_copy.append(img_res[idx])
            img_res = np.array(img_res_copy)
        else:
            img_res = np.array([])
        
        return img_res
    
    def preprocess_for_ocr(self, plate_img):
        """Advanced preprocessing for better OCR - Multiple techniques"""
        results = []
        
        # Convert to grayscale
        gray = cv2.cvtColor(plate_img, cv2.COLOR_BGR2GRAY) if len(plate_img.shape) == 3 else plate_img
        
        # Technique 1: Otsu's thresholding
        _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        results.append(('otsu', otsu))
        
        # Technique 2: Adaptive thresholding
        adaptive = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        results.append(('adaptive', adaptive))
        
        # Technique 3: CLAHE + Otsu
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        _, clahe_otsu = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        results.append(('clahe_otsu', clahe_otsu))
        
        # Technique 4: Inverted (for white text on dark background)
        _, inv_otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        results.append(('inverted', inv_otsu))
        
        # Technique 5: Morphological operations
        kernel = np.ones((2, 2), np.uint8)
        morph = cv2.morphologyEx(otsu, cv2.MORPH_CLOSE, kernel)
        results.append(('morph', morph))
        
        return results
    
    def ocr_with_tesseract(self, processed_plate):
        """Perform OCR using Tesseract with multiple PSM modes"""
        results = []
        
        # Scale up 4x for better OCR (reference uses this)
        h, w = processed_plate.shape
        scaled = cv2.resize(processed_plate, (w * 4, h * 4), interpolation=cv2.INTER_CUBIC)
        
        # Try PSM 7 (single line), PSM 8 (single word), and PSM 6 (uniform block)
        psm_modes = [7, 8, 6, 11]
        
        for psm in psm_modes:
            try:
                config = f'--oem 3 --psm {psm} -c tesseract_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
                text = pytesseract.image_to_string(scaled, config=config)
                text = text.strip().upper()
                text = re.sub(r'[^A-Z0-9]', '', text)
                
                if text and len(text) >= 6:
                    results.append(text)
                    logger.info(f"PSM {psm}: {text}")
                    
            except Exception as e:
                logger.debug(f"PSM {psm} failed: {e}")
        
        return results
    
    def format_indian_plate(self, text):
        """Format detected text as Indian license plate - Reference patterns"""
        # Remove common noise
        text = text.replace('IND', '').replace('INDIA', '')
        text = re.sub(r'[^A-Z0-9]', '', text)

        if not text:
            return None

        # Common OCR confusions for license plates. We keep this conservative
        # because over-correcting can turn noise into a fake plate.
        substitution_maps = [
            str.maketrans({'O': '0', 'Q': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8', 'G': '6'}),
            str.maketrans({'O': '0', 'Q': '0', 'I': '1', 'S': '5', 'B': '8'}),
        ]

        candidate_texts = [text]
        for table in substitution_maps:
            candidate_texts.append(text.translate(table))

        patterns = [
            r'([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{3,5})',
            r'([A-Z]{2})(\d{2})([A-Z]{1,3})(\d{3,5})',
            r'([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{2,5})',
        ]

        for candidate in candidate_texts:
            for pattern in patterns:
                match = re.search(pattern, candidate)
                if match:
                    groups = match.groups()
                    if len(groups) == 4:
                        return f"{groups[0]}-{groups[1]}-{groups[2]}-{groups[3]}"
        
        # If no pattern matches, do not pretend it is a valid plate.
        return None

    def score_plate_candidate(self, text):
        """Score how likely OCR text is to be a real Indian plate."""
        if not text:
            return 0.0

        cleaned = re.sub(r'[^A-Z0-9]', '', text.upper())
        if len(cleaned) < 6:
            return 0.0

        score = 0.0

        # Strong bonus for plate-shaped candidates.
        if re.match(r'^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{3,5}$', cleaned):
            score += 2.5
        elif re.match(r'^[A-Z]{2}\d{2}[A-Z]{1,3}\d{2,5}$', cleaned):
            score += 2.0

        # Indian state codes are usually letters, not random OCR noise.
        if cleaned[:2].isalpha():
            score += 0.5

        digit_count = sum(ch.isdigit() for ch in cleaned)
        alpha_count = sum(ch.isalpha() for ch in cleaned)

        # Real plates usually have a mix of letters and digits.
        if digit_count >= 3:
            score += 0.5
        if alpha_count >= 3:
            score += 0.25

        # Penalize clearly noisy strings.
        if digit_count == 0 or alpha_count == 0:
            score -= 1.5

        return score
    
    def process_image_array(self, img):
        """Main processing method - Reference Implementation Pipeline"""
        try:
            # Step 1: Extract plate using Haar Cascade
            plate_img = self.extract_plate(img)
            
            if plate_img is None:
                logger.warning("No plate region detected, trying full image OCR...")
                # Fallback: Use the full image
                plate_img = img
            
            logger.info("Processing detected plate")
            
            # Step 2: Deskew if needed
            deskewed = self.deskew_image(plate_img)
            
            # Collect all OCR results from different preprocessing methods
            all_ocr_results = []
            
            # Method 1: Try reference implementation character segmentation
            try:
                char_list, processed = self.segment_characters(deskewed)
                logger.info(f"Segmented {len(char_list)} characters")
                if len(char_list) > 0:
                    ocr_results = self.ocr_with_tesseract(processed)
                    all_ocr_results.extend(ocr_results)
            except Exception as e:
                logger.error(f"Character segmentation failed: {e}")
            
            # Method 2: Try multiple preprocessing techniques
            logger.info("Trying multiple preprocessing techniques...")
            preprocessed_images = self.preprocess_for_ocr(deskewed)
            
            for technique_name, preprocessed in preprocessed_images:
                try:
                    logger.info(f"Trying {technique_name} preprocessing...")
                    ocr_results = self.ocr_with_tesseract(preprocessed)
                    all_ocr_results.extend(ocr_results)
                except Exception as e:
                    logger.debug(f"{technique_name} failed: {e}")
            
            # Remove duplicates while preserving order
            seen = set()
            unique_results = []
            for text in all_ocr_results:
                if text not in seen:
                    seen.add(text)
                    unique_results.append(text)
            
            logger.info(f"Total unique OCR results: {len(unique_results)}")
            
            # Step 3: Format and validate results
            best_result = None
            best_confidence = 0.0
            
            for text in unique_results:
                formatted = self.format_indian_plate(text)
                candidate_score = self.score_plate_candidate(text)

                if formatted:
                    candidate_score += 1.0
                    if re.match(r'[A-Z]{2}-\d{1,2}-[A-Z]{1,3}-\d{3,5}', formatted):
                        candidate_score += 0.75

                    if candidate_score > best_confidence:
                        best_confidence = candidate_score
                        best_result = formatted
                        logger.info(f"✓ Best result so far: {formatted} ({candidate_score:.2f})")
            
            # Reject obvious noise instead of returning a bad plate.
            if best_result and best_confidence >= 2.5:
                return best_result, best_confidence
            
            return None, 0.0
            
        except Exception as e:
            logger.error(f"Error in process_image_array: {e}")
            import traceback
            traceback.print_exc()
            return None, 0.0

# Initialize detector
detector = IndianPlateDetector()

@app.route('/detect_plate', methods=['POST'])
def detect_plate():
    """Flask endpoint for plate detection - Reference Implementation"""
    try:
        # Accept multiple upload field names commonly used by clients
        file_field_names = ['image', 'snapshot', 'file', 'photo']

        file = None
        for fname in file_field_names:
            if fname in request.files:
                file = request.files[fname]
                logger.info(f"Received upload in field: {fname}")
                break

        # If no known-named field was provided, fall back to any uploaded file
        if file is None and len(request.files) > 0:
            # pick the first uploaded file
            key = next(iter(request.files))
            file = request.files[key]
            logger.info(f"Received upload in fallback field: {key}")

        # Handle multipart file upload
        if file is not None:
            img_bytes = file.read()
            # Save incoming image for debugging/inspection
            try:
                debug_dir = os.path.join(os.path.dirname(__file__), 'debug_incoming')
                os.makedirs(debug_dir, exist_ok=True)
                tmp_path = os.path.join(debug_dir, f'in_{int(time.time())}.jpg')
                with open(tmp_path, 'wb') as f:
                    f.write(img_bytes)
                logger.info(f"Saved incoming image to {tmp_path}")
            except Exception:
                logger.debug('Failed to save incoming debug image', exc_info=True)

            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        else:
            # Handle JSON/base64 in request body
            base64_img = None
            if request.is_json:
                data = request.get_json(silent=True) or {}
                base64_img = data.get('image') or data.get('snapshot')
            else:
                # sometimes clients POST base64 via form fields
                base64_img = request.form.get('image') or request.form.get('snapshot')

            if not base64_img:
                return jsonify({'error': 'No image provided'}), 400

            if base64_img.startswith('data:image'):
                base64_img = base64_img.split(',')[1]
            img_bytes = base64.b64decode(base64_img)
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        logger.info(f"Processing image of shape: {img.shape}")
        
        # Process image using reference implementation
        plate_text, confidence = detector.process_image_array(img)
        
        if plate_text is None or plate_text == "UNKNOWN":
            logger.warning("No valid plate detected")
            return jsonify({
                'success': False,
                'plate_number': None,
                'confidence': 0,
                'noPlateDetected': True
            })
        
        logger.info(f"✓ Detected plate: {plate_text} (confidence: {confidence:.2f})")
        return jsonify({
            'success': True,
            'plate_number': plate_text,
            'confidence': float(confidence),
            'noPlateDetected': False
        })
    
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Indian License Plate Detection (Tesseract + Reference)',
        'cascade_ready': detector.plate_cascade is not None and not detector.plate_cascade.empty()
    })

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'service': 'Indian License Plate Detection API (Reference Implementation)',
        'status': 'active',
        'sample': 'MH-05-BB-9140',
        'methods': 'Haar Cascade + Character Segmentation + Tesseract OCR'
    })

if __name__ == '__main__':
    # Allow configuring host and port via environment variables so the service
    # can be started on a different port if 5002 is already in use.
    host = os.getenv('DETECTOR_HOST', '0.0.0.0')
    try:
        port = int(os.getenv('DETECTOR_PORT', '5002'))
    except ValueError:
        port = 5002

    logger.info(f"Starting Flask app on {host}:{port}...")
    app.run(host=host, port=port, debug=False)
