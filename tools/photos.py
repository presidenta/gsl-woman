"""ФОТО GEMINI ДЛЯ ПРИЛОЖЕНИЯ (владелец 15.11.2026): из кадров разбора («Фото Gemini — разбор/Все кадры», 001.jpg … 125.jpg)
делает assets/photos/NNN.webp и js/photos/sizes.js (ширина и высота — чтобы вёрстка знала, широкий кадр или нет).

Номера — те же, что на листах разбора: владелец говорит «поменяй 17» — это файл 017. Красные (брак) не берутся.
У кадров 014–029 Gemini впечатал номер в левый верхний угол («1.5.1», «1.7 Ж1») — срезаем: сверху (голова ниже)
или слева (голова у самого верха). Головы не резать (память: photos-never-crop-text-wraps).
32 и 33 — одна сцена на два кадра (она и он в креслах у моря) — склеиваются в 032, 033 отдельно не нужен.

Запуск: python -I tools/photos.py "<папка Все кадры>"   (из корня gsl-woman; нужен Pillow)
"""
import os
import sys
from PIL import Image, ImageFilter

# 33 — внутри склейки 032; 22 и 24 — номер Gemini лежит на волосах: ни срезать (голова), ни закрасить чисто —
# ждут перегенерации без номера
RED = {4, 39, 56, 57, 58, 72, 74, 75, 78, 79, 80, 81, 33, 22, 24,
       128, 129, 148, 150}  # 16.11.2026: камин на лужайке, двое мужчин, машина без людей, он один у двери водителя
LABEL_LEFT = {23, 25}  # голова у верхнего края — номер срезаем слева
# Второй заход (126–161, 16.11.2026): Gemini ставит в угол букву или цифру («A», «B», «4.») прямо на картинку —
# срезаем 36 точек сверху; у кого голова у верхнего края — слева. Проверено глазами на увеличенном листе.
GLYPH_TOP = {126, 130, 132, 134, 136, 137, 138, 139, 140, 141, 142, 143, 145, 146, 147, 149, 151, 152}
GLYPH_LEFT = {131, 133, 156, 158, 159, 160, 161}
GLYPH = 36
PORTRAIT_W = 340  # как «Архетипы»: на телефоне фото ≈ 42 % ширины, до 170 px, с запасом на чёткость
WIDE_W = 640      # широкий кадр — во всю ширину карточки


def label_box(im):
    """Чёрная плашка с номером в левом верхнем углу: (ширина, высота) или None."""
    g = im.convert('L')
    dark = lambda x, y: g.getpixel((x, y)) < 10  # плашка чисто чёрная; ночное небо светлее
    if not (dark(2, 2) and dark(6, 4)):
        return None
    w = 0
    while w < im.width // 2 and dark(w, 2):
        w += 1
    h = 0
    while h < im.height // 3 and dark(2, h):
        h += 1
    # Плашка — 30 точек высотой и до ~90 шириной; тёмный фон рядом (зал, ночь) не продолжает её
    return (min(w, 92), min(h, 31)) if w > 20 and h > 10 else None


def clean(n, im):
    if n in GLYPH_TOP:
        return im.crop((0, GLYPH, im.width, im.height))
    if n in GLYPH_LEFT:
        return im.crop((GLYPH, 0, im.width, im.height))
    box = label_box(im) if 14 <= n <= 29 else None
    if not box:
        return im
    w, h = box
    return im.crop((w + 3, 0, im.width, im.height)) if n in LABEL_LEFT else im.crop((0, h + 3, im.width, im.height))


def stitch(a, b):
    a, b = a.crop((0, 0, a.width - 3, a.height)), b.crop((3, 0, b.width, b.height))  # без белой рамки на стыке
    out = Image.new('RGB', (a.width + b.width, max(a.height, b.height)))
    out.paste(a, (0, 0))
    out.paste(b, (a.width, 0))
    return out


def main(src):
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(root, 'assets', 'photos')
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        os.remove(os.path.join(out_dir, f))
    sizes = {}
    for f in sorted(os.listdir(src)):
        n = int(f[:3])
        if n in RED:
            continue
        im = Image.open(os.path.join(src, f)).convert('RGB')
        if n == 32:
            im = stitch(im, Image.open(os.path.join(src, '033.jpg')).convert('RGB'))
        im = clean(n, im)
        wide = im.width / im.height > 1.15
        tw = WIDE_W if wide else PORTRAIT_W
        th = round(im.height * tw / im.width)
        im = im.resize((tw, th), Image.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
        name = f'{n:03d}'
        im.save(os.path.join(out_dir, name + '.webp'), 'WEBP', quality=80, method=6)
        sizes[name] = (tw, th)
    js = ['/* Размеры фото assets/photos/ — делает tools/photos.py, руками не править. */', 'export const SIZES = {']
    js += [f"  '{k}': [{w}, {h}]," for k, (w, h) in sizes.items()]
    js.append('};')
    with open(os.path.join(root, 'js', 'photos', 'sizes.js'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('\n'.join(js) + '\n')
    total = sum(os.path.getsize(os.path.join(out_dir, x)) for x in os.listdir(out_dir))
    print(len(sizes), 'фото,', round(total / 1024), 'КБ')


if __name__ == '__main__':
    main(sys.argv[1])
