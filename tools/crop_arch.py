"""Нарезка картинки «Женские и мужские архетипы» (Gemini, прислал владелец 15.11.2026) на фигуры без подписей → assets/archetypes/
python crop_arch.py <картинка> <папка-проба> [<папка-выход>]"""
import sys, os
from PIL import Image

src, probe = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else None
im = Image.open(src).convert('RGB')

BOXES = {
    # Женщина плюс / ноль / минус
    'woman-plus': (24, 78, 179, 244),
    'woman-zero': (183, 78, 337, 244),
    'woman-minus': (341, 78, 496, 244),
    # Ранги мужчин 1–4
    'man-1': (528, 77, 644, 237),
    'man-2': (648, 77, 764, 237),
    'man-3': (769, 87, 887, 237),
    'man-4': (891, 87, 1009, 237),
    # Четыре типа женщин: пилорама, ломовая лошадь, праздник, муза
    'woman-saw': (24, 333, 139, 487),
    'woman-horse': (144, 343, 259, 487),
    'woman-party': (264, 343, 379, 487),
    'woman-muse': (383, 333, 499, 487),
}

os.makedirs(probe, exist_ok=True)
tiles = []
for name, box in BOXES.items():
    c = im.crop(box)
    tiles.append(c)
    if out:
        os.makedirs(out, exist_ok=True)
        # Вдвое крупнее для чёткости на телефоне: увеличение с LANCZOS, сжатие webp
        big = c.resize((c.width * 2, c.height * 2), Image.LANCZOS)
        big.save(os.path.join(out, f'{name}.webp'), 'WEBP', quality=82, method=6)
sheet = Image.new('RGB', (sum(t.width for t in tiles) + 4 * len(tiles), max(t.height for t in tiles)), (255, 0, 255))
x = 0
for t in tiles:
    sheet.paste(t, (x, 0))
    x += t.width + 4
sheet.save(os.path.join(probe, 'sheet.png'))
print('ok', len(tiles))
