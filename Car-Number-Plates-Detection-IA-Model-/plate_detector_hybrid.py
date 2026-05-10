import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import re
import pytesseract
import tempfile
import os

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class HybridPlateDetector:
    def __init__(self):
        logger.info("Initializing Hybrid Indian License Plate Detector")
        # Configure Tesseract
        self.tesseract_config = r'--oem 3 --psm 7 -c tesseract_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        
    def preprocess_for_detection(self, image):
        """Preprocessing to find plate regions"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply bilateral filter
        bilateral = cv2.bilateralFilter(gray, 11, 17, 17)
        
        # Edge detection
        edged = cv2.Canny(bilateral, 30, 200)
        
        return gray, edged
    
    def find_plate_regions(self, image, edged):
        """Find potential plate regions using contours"""
        contours, _ = cv2.findContours(edged.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:30]
        
        plate_candidates = []
        height, width = image.shape[:2]
        
        for contour in contours:
            # Approximate the contour
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
            
            # Get bounding rectangle
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = w / float(h) if h > 0 else 0
            area = w * h
            
            # Indian plate characteristics:
            # - Aspect ratio between 2:1 and 5:1
            # - Minimum size
            # - Not too close to edges
            if (2.0 <= aspect_ratio <= 5.5 and 
                area > 1000 and 
                w > 80 and h > 20 and
                x > 10 and y > 10 and
                x + w < width - 10 and y + h < height - 10):
                
                # Extract ROI with padding
                padding = 10
                y1 = max(0, y - padding)
                y2 = min(height, y + h + padding)
                x1 = max(0, x - padding)
                x2 = min(width, x + w + padding)
                
                plate_roi = image[y1:y2, x1:x2]
                
                plate_candidates.append({
                    'roi': plate_roi,
                    'coords': (x, y, w, h),
                    'area': area,
                    'aspect_ratio': aspect_ratio
                })
        
        logger.info(f"Found {len(plate_candidates)} potential plate regions")
        return plate_candidates
    
    def enhance_plate(self, plate_roi):
        """Enhanced preprocessing for OCR"""
        # Resize to larger size
        scale = 3
        plate_roi = cv2.resize(plate_roi, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        
        # Convert to grayscale
        if len(plate_roi.shape) == 3:
            gray = cv2.cvtColor(plate_roi, cv2.COLOR_BGR2GRAY)
        else:
            gray = plate_roi
        
        # Multiple preprocessing techniques
        techniques = []
        
        # 1. CLAHE + Adaptive Threshold
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        clahe_img = clahe.apply(gray)
        techniques.append(cv2.adaptiveThreshold(clahe_img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                                cv2.THRESH_BINARY, 11, 2))
        
        # 2. Bilateral + Otsu
        bilateral = cv2.bilateralFilter(gray, 9, 75, 75)
        _, otsu = cv2.threshold(bilateral, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        techniques.append(otsu)
        
        # 3. Morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        morph = cv2.morphologyEx(bilateral, cv2.MORPH_CLOSE, kernel)
        techniques.append(morph)
        
        # 4. Simple threshold
        _, simple = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
        techniques.append(simple)
        
        # 5. Inverted adaptive threshold
        techniques.append(cv2.adaptiveThreshold(clahe_img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                                cv2.THRESH_BINARY_INV, 11, 2))
        
        return techniques
    
    def ocr_plate(self, plate_roi):
        """Perform OCR on plate region"""
        enhanced_images = self.enhance_plate(plate_roi)
        
        all_texts = []
        
        for idx, img in enumerate(enhanced_images):
            try:
                # Get text with Tesseract
                text = pytesseract.image_to_string(img, config=self.tesseract_config)
                
                # Also try PSM 8 (single word)
                config_psm8 = r'--oem 3 --psm 8 -c tesseract_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
                text2 = pytesseract.image_to_string(img, config=config_psm8)
                
                # Get detailed data for confidence
                data = pytesseract.image_to_data(img, config=self.tesseract_config, 
                                                output_type=pytesseract.Output.DICT)
                
                # Clean texts
                for t in [text, text2]:
                    cleaned = t.strip().upper()
                    cleaned = re.sub(r'[^A-Z0-9]', '', cleaned)
                    
                    if cleaned and len(cleaned) >= 6:
                        # Calculate confidence
                        confidences = [int(c) for c in data['conf'] if str(c) != '-1']
                        avg_conf = sum(confidences) / len(confidences) if confidences else 0
                        
                        all_texts.append({
                            'text': cleaned,
                            'confidence': avg_conf / 100.0,
                            'technique': idx
                        })
                        logger.debug(f"Technique {idx}: {cleaned} (conf: {avg_conf:.1f})")
                        
            except Exception as e:
                logger.debug(f"OCR technique {idx} failed: {e}")
                continue
        
        return all_texts
    
    def format_indian_plate(self, text):
        """Format text as Indian license plate"""
        # Remove watermarks
        text = text.replace('IND', '').replace('INDIA', '').replace('BHARAT', '')
        text = re.sub(r'[^A-Z0-9]', '', text)
        
        logger.info(f"Formatting text: {text}")
        
        # Reject obvious non-plate text
        # Valid Indian plates MUST have both letters and numbers
        if not any(c.isalpha() for c in text) or not any(c.isdigit() for c in text):
            logger.info(f"Rejected: no mix of letters and numbers")
            return None
        
        # Reject if it's all letters or all numbers
        if text.isalpha() or text.isdigit():
            logger.info(f"Rejected: all letters or all digits")
            return None
        
        # Must start with 2 letters (state code)
        if len(text) < 8 or not text[:2].isalpha():
            logger.info(f"Rejected: doesn't start with 2 letters or too short")
            return None
        
        # Indian plate patterns
        patterns = [
            (r'([A-Z]{2})(\d{1,2})([A-Z]{1,2})(\d{4})', 4),  # MH14F2071 -> MH-14-F-2071
            (r'([A-Z]{2})(\d{2})([A-Z])(\d{4})', 4),         # MH06B7079 -> MH-06-B-7079
            (r'([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{3,4})', 4), # Variations
        ]
        
        for pattern, groups in patterns:
            match = re.search(pattern, text)
            if match and len(match.groups()) == groups:
                g = match.groups()
                # Validate district code is numeric
                if not g[1].isdigit():
                    continue
                # Validate number part is numeric
                if not g[3].isdigit():
                    continue
                formatted = f"{g[0]}-{g[1]}-{g[2]}-{g[3]}"
                logger.info(f"✅ Matched pattern, formatted: {formatted}")
                return formatted
        
        # Manual formatting if we have the right structure
        if len(text) >= 8 and text[:2].isalpha():
            state = text[:2]
            remaining = text[2:]
            
            # Find district code (1-2 digits)
            district = ''
            for i, c in enumerate(remaining):
                if c.isdigit():
                    district += c
                else:
                    break
            
            if district and len(district) <= 2:
                remaining = remaining[len(district):]
                
                # Find series (1-2 letters)
                series = ''
                for i, c in enumerate(remaining):
                    if c.isalpha():
                        series += c
                    else:
                        break
                
                if series:
                    number = remaining[len(series):]
                    # Remove any remaining letters from number
                    number = re.sub(r'[^0-9]', '', number)
                    
                    if number:
                        formatted = f"{state}-{district}-{series}-{number}"
                        logger.info(f"Manual format: {formatted}")
                        return formatted
        
        # Return as-is if >= 8 chars
        if len(text) >= 8:
            logger.info(f"Returning raw text: {text}")
            return text
        
        return None
    
    def detect_plate_number(self, image_path):
        """Main detection pipeline"""
        try:
            # Read image
            image = cv2.imread(image_path)
            if image is None:
                logger.error(f"Failed to load image: {image_path}")
                return {"error": "Failed to load image"}
            
            logger.info(f"Processing image: {image_path}, shape: {image.shape}")
            
            # Preprocess
            gray, edged = self.preprocess_for_detection(image)
            
            # Find plate regions
            plate_candidates = self.find_plate_regions(image, edged)
            
            all_detections = []
            
            # Process top candidates
            for idx, candidate in enumerate(plate_candidates[:10]):
                logger.info(f"Processing candidate {idx+1}: aspect_ratio={candidate['aspect_ratio']:.2f}, area={candidate['area']}")
                
                # OCR on this region
                ocr_results = self.ocr_plate(candidate['roi'])
                
                for result in ocr_results:
                    formatted = self.format_indian_plate(result['text'])
                    if formatted:
                        all_detections.append({
                            'plate_number': formatted,
                            'confidence': result['confidence'],
                            'raw_text': result['text'],
                            'candidate_rank': idx + 1
                        })
            
            # Also try full image OCR
            logger.info("Trying OCR on full image")
            full_ocr = self.ocr_plate(image)
            for result in full_ocr:
                formatted = self.format_indian_plate(result['text'])
                if formatted:
                    all_detections.append({
                        'plate_number': formatted,
                        'confidence': result['confidence'],
                        'raw_text': result['text'],
                        'candidate_rank': 0  # Full image
                    })
            
            # Sort by confidence
            if all_detections:
                all_detections.sort(key=lambda x: x['confidence'], reverse=True)
                best = all_detections[0]
                
                logger.info(f"✅ DETECTED: {best['plate_number']} (confidence: {best['confidence']:.2f})")
                
                return {
                    'plate_number': best['plate_number'],
                    'confidence': float(best['confidence']),
                    'raw_text': best['raw_text'],
                    'all_candidates': all_detections[:5]
                }
            
            logger.warning("❌ No valid plate detected")
            return {
                'plate_number': 'UNKNOWN',
                'confidence': 0.0,
                'message': 'No valid Indian license plate detected in image'
            }
            
        except Exception as e:
            logger.error(f"Error in detection: {str(e)}", exc_info=True)
            return {"error": str(e)}

# Initialize detector
detector = HybridPlateDetector()

@app.route('/detect_plate', methods=['POST'])
def detect_plate():
    """Flask endpoint for plate detection"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        logger.info(f"Received image upload: {file.filename}")
        
        # Save temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name
        
        logger.info(f"Saved to temp file: {tmp_path}")
        
        # Detect plate
        result = detector.detect_plate_number(tmp_path)
        
        # Clean up
        os.unlink(tmp_path)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        'status': 'healthy', 
        'service': 'Hybrid Indian License Plate Detection API (Tesseract + Contours)',
        'version': '2.0'
    })

if __name__ == '__main__':
    logger.info("🚀 Starting Hybrid Indian Plate Detection API on port 5001")
    app.run(host='0.0.0.0', port=5001, debug=True)
