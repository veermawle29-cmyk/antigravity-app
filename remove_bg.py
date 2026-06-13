from PIL import Image

def remove_black_bg(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        # Calculate luminance
        lum = (0.299 * item[0] + 0.587 * item[1] + 0.114 * item[2])
        if lum < 50:
            # Map luminance to alpha (smooth transition for dark pixels)
            # If lum is 0 (pitch black), alpha is 0. If lum is 50, alpha is 255.
            alpha = int((lum / 50.0) * 255)
            new_data.append((item[0], item[1], item[2], alpha))
        else:
            new_data.append((item[0], item[1], item[2], 255))
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

remove_black_bg("assets/logo.jpg", "assets/logo.png")
print("Background removed and saved to logo.png")
