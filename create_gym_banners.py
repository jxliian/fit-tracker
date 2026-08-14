import os
from PIL import Image, ImageDraw

os.makedirs('assets/routines', exist_ok=True)

WIDTH, HEIGHT = 800, 400

themes = [
    {
        'filename': 'gym_1.png',
        'accent': (100, 210, 255), # Cyan
        'icon_type': 'bench'
    },
    {
        'filename': 'gym_2.png',
        'accent': (48, 209, 88), # Green
        'icon_type': 'pullup'
    },
    {
        'filename': 'gym_3.png',
        'accent': (255, 45, 85), # Pink/Red
        'icon_type': 'squat'
    },
    {
        'filename': 'gym_4.png',
        'accent': (191, 90, 242), # Purple
        'icon_type': 'dumbbell'
    },
    {
        'filename': 'gym_5.png',
        'accent': (255, 159, 10), # Amber
        'icon_type': 'kettlebell'
    }
]

for item in themes:
    img = Image.new('RGBA', (WIDTH, HEIGHT), (18, 18, 20, 255))
    draw = ImageDraw.Draw(img)

    ar, ag, ab = item['accent']

    # 1. Background linear dark gradient
    for y in range(HEIGHT):
        r = int(18 + (ar - 18) * 0.08 * (y / HEIGHT))
        g = int(18 + (ag - 18) * 0.08 * (y / HEIGHT))
        b = int(20 + (ab - 20) * 0.08 * (y / HEIGHT))
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b, 255))

    # 2. Geometric subtle dark gym grid pattern
    grid_size = 40
    for x in range(0, WIDTH, grid_size):
        draw.line([(x, 0), (x, HEIGHT)], fill=(255, 255, 255, 6))
    for y in range(0, HEIGHT, grid_size):
        draw.line([(0, y), (WIDTH, y)], fill=(255, 255, 255, 6))

    # 3. Dynamic glowing accent lines on right side
    draw.polygon([(WIDTH - 240, 0), (WIDTH, 0), (WIDTH, HEIGHT), (WIDTH - 360, HEIGHT)], fill=(ar, ag, ab, 22))
    draw.line([(WIDTH - 240, 0), (WIDTH - 360, HEIGHT)], fill=(ar, ag, ab, 160), width=4)
    draw.line([(WIDTH - 220, 0), (WIDTH - 340, HEIGHT)], fill=(ar, ag, ab, 80), width=2)

    # 4. Draw Gym Icon Silhouettes (Right side)
    icon_center_x, icon_center_y = WIDTH - 160, HEIGHT // 2
    
    if item['icon_type'] == 'bench': # Barbell + Plates
        draw.rectangle([icon_center_x - 100, icon_center_y - 8, icon_center_x + 100, icon_center_y + 8], fill=(200, 200, 200, 220))
        draw.rectangle([icon_center_x - 75, icon_center_y - 50, icon_center_x - 60, icon_center_y + 50], fill=(ar, ag, ab, 240))
        draw.rectangle([icon_center_x - 90, icon_center_y - 40, icon_center_x - 78, icon_center_y + 40], fill=(120, 120, 120, 240))
        draw.rectangle([icon_center_x + 60, icon_center_y - 50, icon_center_x + 75, icon_center_y + 50], fill=(ar, ag, ab, 240))
        draw.rectangle([icon_center_x + 78, icon_center_y - 40, icon_center_x + 90, icon_center_y + 40], fill=(120, 120, 120, 240))

    elif item['icon_type'] == 'squat': # Squat Rack & Bar
        draw.line([(icon_center_x - 60, icon_center_y - 80), (icon_center_x - 60, icon_center_y + 80)], fill=(180, 180, 180, 220), width=10)
        draw.line([(icon_center_x + 60, icon_center_y - 80), (icon_center_x + 60, icon_center_y + 80)], fill=(180, 180, 180, 220), width=10)
        draw.rectangle([icon_center_x - 110, icon_center_y - 20, icon_center_x + 110, icon_center_y - 8], fill=(ar, ag, ab, 240))
        draw.rectangle([icon_center_x - 85, icon_center_y - 55, icon_center_x - 70, icon_center_y + 15], fill=(220, 220, 220, 240))
        draw.rectangle([icon_center_x + 70, icon_center_y - 55, icon_center_x + 85, icon_center_y + 15], fill=(220, 220, 220, 240))

    elif item['icon_type'] == 'pullup': # Cable Pulley & Pullup Handles
        draw.ellipse([icon_center_x - 50, icon_center_y - 70, icon_center_x + 50, icon_center_y + 30], outline=(ar, ag, ab, 240), width=8)
        draw.line([(icon_center_x, icon_center_y - 70), (icon_center_x, icon_center_y + 80)], fill=(200, 200, 200, 220), width=6)
        draw.rectangle([icon_center_x - 40, icon_center_y + 70, icon_center_x + 40, icon_center_y + 82], fill=(ar, ag, ab, 240))

    elif item['icon_type'] == 'dumbbell': # Hex Dumbbell
        draw.rectangle([icon_center_x - 60, icon_center_y - 10, icon_center_x + 60, icon_center_y + 10], fill=(200, 200, 200, 220))
        draw.polygon([(icon_center_x - 85, icon_center_y - 45), (icon_center_x - 55, icon_center_y - 55), (icon_center_x - 55, icon_center_y + 55), (icon_center_x - 85, icon_center_y + 45)], fill=(ar, ag, ab, 240))
        draw.polygon([(icon_center_x + 55, icon_center_y - 55), (icon_center_x + 85, icon_center_y - 45), (icon_center_x + 85, icon_center_y + 45), (icon_center_x + 55, icon_center_y + 55)], fill=(ar, ag, ab, 240))

    else: # Kettlebell
        draw.ellipse([icon_center_x - 40, icon_center_y - 70, icon_center_x + 40, icon_center_y - 10], outline=(200, 200, 200, 240), width=12)
        draw.ellipse([icon_center_x - 60, icon_center_y - 25, icon_center_x + 60, icon_center_y + 75], fill=(ar, ag, ab, 240))

    # Save image
    file_path = os.path.join('assets/routines', item['filename'])
    img.convert('RGB').save(file_path, quality=95)
    print(f'Generated: {file_path}')

print('All 5 gym routine banner images generated successfully!')
