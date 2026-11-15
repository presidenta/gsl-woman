"""Нарезка картинки «Женские и мужские архетипы» (Gemini, прислал владелец 15.11.2026) на фигуры без подписей → assets/archetypes/
python crop_arch.py <картинка> <папка-проба> [<папка-выход>]"""
import sys, os
from PIL import Image

src, probe = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else None
im = Image.open(src).convert('RGB')

BOXES = {
    # Женщина плюс / ноль / минус
    'woman-plus': (24, 80, 179, 245),
    'woman-zero': (183, 80, 337, 245),
    'woman-minus': (341, 80, 496, 245),
    # Ранги мужчин 1–4
    'man-1': (528, 94, 644, 230),
    'man-2': (648, 94, 764, 230),
    'man-3': (769, 94, 887, 230),
    'man-4': (891, 94, 1009, 230),
    # Четыре типа женщин: пилорама, ломовая лошадь, праздник, муза
    'woman-saw': (24, 354, 139, 485),
    'woman-horse': (144, 354, 259, 485),
    'woman-party': (264, 354, 379, 485),
    'woman-muse': (383, 354, 499, 485),
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
