import os
import cv2
import numpy as np
from PIL import Image

def generate_production_icons():
    assets_dir = r'C:\Users\ankit\Downloads\project\dotynotes\assets'
    mark_path = os.path.join(assets_dir, 'dotynotes-mark.png')
    
    if not os.path.exists(mark_path):
        raise FileNotFoundError(f"Missing {mark_path}")

    mark_img = Image.open(mark_path).convert('RGBA')
    mark_w, mark_h = mark_img.size
    aspect = mark_w / mark_h

    # =========================================================================
    # 1. Master Expo App Icon (1024 x 1024)
    # Pure white background, mark centered within standard iOS/Android safe area (~58% height)
    # =========================================================================
    canvas_size = 1024
    app_icon = Image.new('RGBA', (canvas_size, canvas_size), (255, 255, 255, 255))
    target_h = int(canvas_size * 0.58) # ~594 px height
    target_w = int(target_h * aspect)   # ~448 px width
    resized_mark = mark_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    paste_x = (canvas_size - target_w) // 2
    paste_y = (canvas_size - target_h) // 2
    app_icon.paste(resized_mark, (paste_x, paste_y), resized_mark)
    
    icon_out = os.path.join(assets_dir, 'icon.png')
    app_icon.save(icon_out, 'PNG')
    print(f"Generated {icon_out} ({canvas_size}x{canvas_size})")

    # =========================================================================
    # 2. Android Adaptive Icon Foreground (1024 x 1024)
    # Transparent background, mark scaled strictly inside Android 66% (72dp/108dp) circular safe zone.
    # Safe zone circle radius = 1024 * 0.333 = 341px.
    # With target_h = 490px and target_w ≈ 370px, corner distance from center is ~284px << 341px!
    # No launcher mask (circle, squircle, rounded-rect) can EVER clip the logo.
    # =========================================================================
    adaptive_fg = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    fg_target_h = int(canvas_size * 0.48) # 491 px
    fg_target_w = int(fg_target_h * aspect) # 370 px
    resized_fg_mark = mark_img.resize((fg_target_w, fg_target_h), Image.Resampling.LANCZOS)
    
    fg_x = (canvas_size - fg_target_w) // 2
    fg_y = (canvas_size - fg_target_h) // 2
    adaptive_fg.paste(resized_fg_mark, (fg_x, fg_y), resized_fg_mark)
    
    fg_out = os.path.join(assets_dir, 'android-icon-foreground.png')
    adaptive_fg.save(fg_out, 'PNG')
    print(f"Generated {fg_out} ({canvas_size}x{canvas_size}, safe centered)")

    # =========================================================================
    # 3. Android Adaptive Icon Monochrome (1024 x 1024)
    # Used for Android 13+ "Themed icons" (Material You / Dynamic Theming).
    # Must have the exact same shape and position as the foreground, but solid white with alpha mask.
    # Android applies the user's wallpaper dynamic palette to this layer.
    # =========================================================================
    mono_np = np.array(adaptive_fg)
    alpha_channel = mono_np[:, :, 3]
    # Set RGB to pure solid white (255, 255, 255) wherever alpha > 0
    mono_layer = np.zeros_like(mono_np)
    mono_layer[:, :, :3] = 255
    mono_layer[:, :, 3] = alpha_channel
    
    adaptive_mono = Image.fromarray(mono_layer, 'RGBA')
    mono_out = os.path.join(assets_dir, 'android-icon-monochrome.png')
    adaptive_mono.save(mono_out, 'PNG')
    print(f"Generated {mono_out} ({canvas_size}x{canvas_size}, themed icon ready)")

    # =========================================================================
    # 4. Native Splash Screen Icon (1024 x 1024)
    # Transparent background with mark centered at elegant splash scale (~40% of canvas)
    # =========================================================================
    splash_icon = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    splash_target_h = int(canvas_size * 0.40) # 409 px
    splash_target_w = int(splash_target_h * aspect) # 309 px
    resized_splash = mark_img.resize((splash_target_w, splash_target_h), Image.Resampling.LANCZOS)
    
    splash_x = (canvas_size - splash_target_w) // 2
    splash_y = (canvas_size - splash_target_h) // 2
    splash_icon.paste(resized_splash, (splash_x, splash_y), resized_splash)
    
    splash_out = os.path.join(assets_dir, 'splash-icon.png')
    splash_icon.save(splash_out, 'PNG')
    print(f"Generated {splash_out} ({canvas_size}x{canvas_size})")

    # =========================================================================
    # 5. Favicon (48 x 48)
    # =========================================================================
    fav_out = os.path.join(assets_dir, 'favicon.png')
    favicon = app_icon.resize((48, 48), Image.Resampling.LANCZOS)
    favicon.save(fav_out, 'PNG')
    print(f"Generated {fav_out} (48x48)")

if __name__ == '__main__':
    generate_production_icons()
