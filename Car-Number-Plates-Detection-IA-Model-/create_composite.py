import os
import cv2
import numpy as np
from PIL import Image
import math

def create_composite_image(input_dir, output_path, max_width=2000):
    """
    Create a composite image from all images in a directory
    """
    # Get all image files
    image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp']
    image_files = []

    for file in os.listdir(input_dir):
        if any(file.lower().endswith(ext) for ext in image_extensions):
            image_files.append(os.path.join(input_dir, file))

    if not image_files:
        print("No image files found in the directory")
        return False

    print(f"Found {len(image_files)} images to combine")

    # Load all images and get their dimensions
    images = []
    max_height = 0
    total_width = 0

    for img_path in image_files:
        try:
            img = Image.open(img_path)
            # Convert to RGB if necessary
            if img.mode != 'RGB':
                img = img.convert('RGB')
            images.append(img)
            max_height = max(max_height, img.height)
            total_width += img.width
        except Exception as e:
            print(f"Error loading {img_path}: {e}")
            continue

    if not images:
        print("No valid images could be loaded")
        return False

    # Calculate grid dimensions
    num_images = len(images)
    cols = math.ceil(math.sqrt(num_images))
    rows = math.ceil(num_images / cols)

    print(f"Creating grid: {rows} rows x {cols} columns")

    # Calculate cell dimensions
    cell_width = max_width // cols
    cell_height = int(cell_width * 0.75)  # Maintain aspect ratio

    # Create the composite image
    composite_width = cols * cell_width
    composite_height = rows * cell_height

    composite = Image.new('RGB', (composite_width, composite_height), (255, 255, 255))

    # Place images in grid
    for idx, img in enumerate(images):
        row = idx // cols
        col = idx % cols

        # Resize image to fit cell while maintaining aspect ratio
        img_ratio = img.width / img.height
        if img_ratio > 1:  # Wider than tall
            new_width = cell_width - 20  # Leave some padding
            new_height = int(new_width / img_ratio)
        else:  # Taller than wide
            new_height = cell_height - 20
            new_width = int(new_height * img_ratio)

        # Ensure minimum size
        new_width = max(new_width, 100)
        new_height = max(new_height, 100)

        resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Center the image in the cell
        x_offset = col * cell_width + (cell_width - new_width) // 2
        y_offset = row * cell_height + (cell_height - new_height) // 2

        composite.paste(resized_img, (x_offset, y_offset))

    # Save the composite image
    composite.save(output_path, 'JPEG', quality=95)
    print(f"Composite image saved to: {output_path}")
    print(f"Dimensions: {composite_width}x{composite_height}")

    return True

if __name__ == "__main__":
    # Directory containing the plate images
    input_directory = "/Users/prathamved/Downloads/Parkini-main/Car-Number-Plates-Detection-IA-Model-/plates"

    # Output path for the composite image
    output_image = "/Users/prathamved/Downloads/Parkini-main/Car-Number-Plates-Detection-IA-Model-/composite_plates.jpg"

    # Create the composite image
    success = create_composite_image(input_directory, output_image)

    if success:
        print("✅ Composite image created successfully!")
        print(f"📁 Location: {output_image}")
    else:
        print("❌ Failed to create composite image")