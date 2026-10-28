import cv2
import numpy as np
import os
import subprocess
from PIL import Image

def contour_to_svg_path(cnt):
    """Converts a numpy contour to an SVG path d string."""
    pts = cnt.reshape(-1, 2)
    if len(pts) == 0:
        return ""
    d = [f"M {pts[0][0]:.2f} {pts[0][1]:.2f}"]
    for pt in pts[1:]:
        d.append(f"L {pt[0]:.2f} {pt[1]:.2f}")
    d.append("Z")
    return " ".join(d)

def generate_svg():
    src_path = r'C:\Users\ankit\.gemini\antigravity-ide\brain\2c248978-0fc2-4b0d-9636-5dfb10460260\.user_uploaded\media_1792786226248.png'
    img = cv2.imread(src_path)[1:, :] # Skip 1px border at top
    h, w, _ = img.shape # 299 x 852

    # Color thresholding
    # 1. Vibrant Orange Dot: #FF6346
    # 2. Coral Doty Text: #F99773
    # 3. Slate Navy d-icon + Notes Text: #182E3A

    mask_dot = cv2.inRange(img, (50, 70, 230), (90, 120, 255))
    mask_doty = cv2.inRange(img, (90, 130, 230), (140, 170, 255))
    mask_navy = cv2.inRange(img, (40, 30, 10), (80, 60, 40))

    # Dot is a mathematically perfect circle
    # Measured center: (183.0, 50.0), radius: 15.5
    dot_svg = '<circle cx="183" cy="50" r="15.5" fill="#FF6346" />'

    # Extract Doty text paths
    cnts_doty, _ = cv2.findContours(mask_doty, cv2.RETR_TREE, cv2.CHAIN_APPROX_NONE)
    doty_paths = []
    for c in cnts_doty:
        if cv2.contourArea(c) > 20:
            c_approx = cv2.approxPolyDP(c, 0.45, True)
            doty_paths.append(contour_to_svg_path(c_approx))
    doty_d = " ".join(doty_paths)

    # Extract Navy paths (d-icon + Notes text)
    cnts_navy, _ = cv2.findContours(mask_navy, cv2.RETR_TREE, cv2.CHAIN_APPROX_NONE)
    navy_paths = []
    d_icon_paths = []
    for c in cnts_navy:
        if cv2.contourArea(c) > 20:
            c_approx = cv2.approxPolyDP(c, 0.45, True)
            p_str = contour_to_svg_path(c_approx)
            navy_paths.append(p_str)
            # Check if this contour belongs to the 'd' icon (x < 220)
            x, y, cw, ch = cv2.boundingRect(c)
            if x < 220:
                d_icon_paths.append(p_str)

    navy_d = " ".join(navy_paths)
    d_icon_d = " ".join(d_icon_paths)

    # 1. Full Logo SVG (Transparent)
    svg_full = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
  <!-- DotyNotes Logo: Exact Vector Reproduction -->
  <!-- Orange Dot -->
  {dot_svg}
  <!-- Navy Slate Elements: 'd' Icon & 'Notes' Wordmark -->
  <path d="{navy_d}" fill="#182E3A" fill-rule="evenodd" />
  <!-- Coral Peach Element: 'Doty' Wordmark -->
  <path d="{doty_d}" fill="#F99773" fill-rule="evenodd" />
</svg>'''

    # 2. Standalone App Icon SVG ('d' + orange dot, centered in 512x512)
    # The 'd' icon bounds: x in [36..199] (width 164), y in [35..258] (height 224)
    # Icon center: x ≈ 118, y ≈ 147
    icon_w = 164
    icon_h = 224
    # Let's create a 512x512 canvas with icon centered
    scale = 1.8
    tx = (512 - (icon_w * scale)) / 2 - 36 * scale
    ty = (512 - (icon_h * scale)) / 2 - 35 * scale

    svg_icon = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- DotyNotes Standalone App Icon -->
  <rect width="512" height="512" rx="112" fill="#FFFFFF" />
  <g transform="translate({tx:.2f}, {ty:.2f}) scale({scale})">
    {dot_svg}
    <path d="{d_icon_d}" fill="#182E3A" fill-rule="evenodd" />
  </g>
</svg>'''

    # Save SVG files
    out_dir = r'C:\Users\ankit\Downloads\project\dotynotes\assets'
    svg_full_path = os.path.join(out_dir, 'dotynotes-logo.svg')
    svg_icon_path = os.path.join(out_dir, 'dotynotes-icon.svg')

    with open(svg_full_path, 'w', encoding='utf-8') as f:
        f.write(svg_full)
    with open(svg_icon_path, 'w', encoding='utf-8') as f:
        f.write(svg_icon)

    print(f"Generated {svg_full_path}")
    print(f"Generated {svg_icon_path}")

if __name__ == '__main__':
    generate_svg()
