import cv2
import numpy as np
from PIL import Image

def get_contours_data():
    img = cv2.imread(r'C:\Users\ankit\.gemini\antigravity-ide\brain\2c248978-0fc2-4b0d-9636-5dfb10460260\.user_uploaded\media_1792786226248.png')
    # Exclude top row which is a border artifact
    img = img[1:, :]
    h, w, _ = img.shape

    # Masks for the three color groups
    # 1. Orange Dot: #FF6346
    mask_dot = cv2.inRange(img, (50, 70, 230), (90, 120, 255))
    # 2. Coral Doty Text: #F99773
    mask_doty = cv2.inRange(img, (90, 130, 230), (140, 170, 255))
    # 3. Navy Slate d-icon & Notes Text: #182E3A
    mask_navy = cv2.inRange(img, (40, 30, 10), (80, 60, 40))

    return w, h, mask_dot, mask_doty, mask_navy

print("Loaded contour extractor")
