import os
import cv2
import numpy as np
from PIL import Image

def make_transparent_logo(img_rgb):
    """
    Converts a white-background logo into a crisp RGBA image with smooth anti-aliased transparency.
    """
    # Calculate luminance/whiteness
    # Since background is (255, 255, 255), white pixels should have alpha 0
    # Darker pixels have higher alpha
    r = img_rgb[:, :, 0].astype(np.float32)
    g = img_rgb[:, :, 1].astype(np.float32)
    b = img_rgb[:, :, 2].astype(np.float32)

    # Invert RGB distance from white (255, 255, 255)
    # Background is white (r=255, g=255, b=255) -> distance = 0 -> alpha = 0
    # Any content has r,g,b < 255
    min_channel = np.minimum(r, np.minimum(g, b))
    # Alpha goes from 0 (when min_channel=255) to 255 (when min_channel <= 40)
    alpha = np.clip((255.0 - min_channel) * 1.25, 0, 255).astype(np.uint8)

    # For pixels with alpha > 0, un-blend the white background from RGB
    # observed_color = foreground * (alpha/255) + white * (1 - alpha/255)
    # => foreground = (observed_color - 255 * (1 - alpha/255)) / (alpha/255)
    a_norm = np.maximum(alpha.astype(np.float32) / 255.0, 1e-5)
    unblended_r = np.clip((r - 255.0 * (1.0 - a_norm)) / a_norm, 0, 255).astype(np.uint8)
    unblended_g = np.clip((g - 255.0 * (1.0 - a_norm)) / a_norm, 0, 255).astype(np.uint8)
    unblended_b = np.clip((b - 255.0 * (1.0 - a_norm)) / a_norm, 0, 255).astype(np.uint8)

    rgba = np.dstack((unblended_r, unblended_g, unblended_b, alpha))
    return rgba

def run():
    src_path = r'C:\Users\ankit\.gemini\antigravity-ide\brain\2c248978-0fc2-4b0d-9636-5dfb10460260\.user_uploaded\media_1792786226248.png'
    raw_img = Image.open(src_path)
    
    # Exclude top row border line
    cropped_img = raw_img.crop((0, 1, raw_img.width, raw_img.height)).convert('RGB')
    cropped_np = np.array(cropped_img)

    assets_dir = r'C:\Users\ankit\Downloads\project\dotynotes\assets'

    # 1. Full Logo PNG (White Background)
    cropped_img.save(os.path.join(assets_dir, 'dotynotes-logo-white.png'), 'PNG')
    print("Saved dotynotes-logo-white.png")

    # 2. Full Logo PNG (Transparent Alpha Background)
    transparent_np = make_transparent_logo(cropped_np)
    transparent_img = Image.fromarray(transparent_np, 'RGBA')
    transparent_img.save(os.path.join(assets_dir, 'dotynotes-logo.png'), 'PNG')
    print("Saved dotynotes-logo.png (transparent)")

    # 3. Standalone Mark ('d' icon + orange dot)
    # Bounding box of the mark: x in [36, 205], y in [35, 258]
    mark_bbox = (36, 35, 205, 259)
    mark_img = transparent_img.crop(mark_bbox)
    mark_img.save(os.path.join(assets_dir, 'dotynotes-mark.png'), 'PNG')
    print(f"Saved dotynotes-mark.png ({mark_img.width}x{mark_img.height})")

    # 4. High-Res App Icon (1024x1024)
    # Clean white background with centered mark at comfortable iOS/Android scale (~60% of canvas)
    icon_size = 1024
    app_icon = Image.new('RGBA', (icon_size, icon_size), (255, 255, 255, 255))
    target_mark_h = int(icon_size * 0.62) # ~635px height
    aspect = mark_img.width / mark_img.height
    target_mark_w = int(target_mark_h * aspect)
    resized_mark = mark_img.resize((target_mark_w, target_mark_h), Image.Resampling.LANCZOS)
    
    paste_x = (icon_size - target_mark_w) // 2
    paste_y = (icon_size - target_mark_h) // 2
    app_icon.paste(resized_mark, (paste_x, paste_y), resized_mark)
    app_icon.save(os.path.join(assets_dir, 'icon.png'), 'PNG')
    print("Updated icon.png (1024x1024)")

    # 5. Android Adaptive Icons
    # Foreground image (transparent with centered mark ~48% safe area)
    fg_size = 512
    fg_target_h = int(fg_size * 0.48)
    fg_target_w = int(fg_target_h * aspect)
    resized_fg_mark = mark_img.resize((fg_target_w, fg_target_h), Image.Resampling.LANCZOS)
    fg_img = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
    fg_paste_x = (fg_size - fg_target_w) // 2
    fg_paste_y = (fg_size - fg_target_h) // 2
    fg_img.paste(resized_fg_mark, (fg_paste_x, fg_paste_y), resized_fg_mark)
    fg_img.save(os.path.join(assets_dir, 'android-icon-foreground.png'), 'PNG')
    print("Updated android-icon-foreground.png")

    # Background image (pure clean solid white #FFFFFF or soft ivory #F8FAFC)
    bg_img = Image.new('RGBA', (fg_size, fg_size), (255, 255, 255, 255))
    bg_img.save(os.path.join(assets_dir, 'android-icon-background.png'), 'PNG')
    print("Updated android-icon-background.png")

    # Splash Icon (centered mark)
    splash_size = 512
    splash_target_h = int(splash_size * 0.45)
    splash_target_w = int(splash_target_h * aspect)
    resized_splash = mark_img.resize((splash_target_w, splash_target_h), Image.Resampling.LANCZOS)
    splash_img = Image.new('RGBA', (splash_size, splash_size), (0, 0, 0, 0))
    splash_img.paste(resized_splash, ((splash_size - splash_target_w) // 2, (splash_size - splash_target_h) // 2), resized_splash)
    splash_img.save(os.path.join(assets_dir, 'splash-icon.png'), 'PNG')
    print("Updated splash-icon.png")

    # Favicon (48x48)
    favicon = app_icon.resize((48, 48), Image.Resampling.LANCZOS)
    favicon.save(os.path.join(assets_dir, 'favicon.png'), 'PNG')
    print("Updated favicon.png")

if __name__ == '__main__':
    run()
