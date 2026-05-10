import os
from PIL import Image
import math

def create_team_composite(input_dir, output_path, profile_images):
    """
    Create a composite image from team profile images
    """
    images = []

    # Load specified profile images
    for img_name in profile_images:
        img_path = os.path.join(input_dir, img_name)
        if os.path.exists(img_path):
            try:
                img = Image.open(img_path)
                # Convert to RGB if necessary
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                images.append(img)
                print(f"Loaded: {img_name}")
            except Exception as e:
                print(f"Error loading {img_name}: {e}")
        else:
            print(f"Image not found: {img_name}")

    if not images:
        print("No images could be loaded")
        return False

    print(f"Creating composite from {len(images)} team member images")

    # Calculate grid dimensions (2x4 grid for 8 images)
    num_images = len(images)
    cols = 4  # 4 columns
    rows = math.ceil(num_images / cols)

    # Cell dimensions
    cell_width = 200
    cell_height = 250

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
        new_width = max(new_width, 150)
        new_height = max(new_height, 200)

        resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Center the image in the cell
        x_offset = col * cell_width + (cell_width - new_width) // 2
        y_offset = row * cell_height + (cell_height - new_height) // 2

        composite.paste(resized_img, (x_offset, y_offset))

    # Save the composite image
    composite.save(output_path, 'PNG', quality=95)
    print(f"Team composite image saved to: {output_path}")
    print(f"Dimensions: {composite_width}x{composite_height}")

    return True

if __name__ == "__main__":
    # Directory containing the profile images
    input_directory = "/Users/prathamved/Downloads/Parkini-main/Front-end-Front-Office-/public/images"

    # List of team member profile images
    profile_images = [
        "pp (2).jpg",    # Sarah Mitchell
        "sanket.png",    # John Anderson
        "atharva.jpeg",  # Emily Parker
        "pp (5).jpg",    # Michael Chen
        "pp (6).jpg",    # Lisa Thompson
        "pp (7).jpg",    # David Wilson
        "pp (8).jpg",    # Rachel Barnes
        "pp (1).jpg"     # James Cooper
    ]

    # Output path for the composite image
    output_image = "/Users/prathamved/Downloads/Parkini-main/Front-end-Front-Office-/public/images/team_composite.png"

    # Create the composite image
    success = create_team_composite(input_directory, output_image, profile_images)

    if success:
        print("✅ Team composite image created successfully!")
        print(f"📁 Location: {output_image}")
    else:
        print("❌ Failed to create team composite image")