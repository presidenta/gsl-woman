# ЗНАЧКИ ДЛЯ ТЕЛЕФОНА из assets/icons/icon.svg: `npm run icons`.
# Рисует SVG браузером Edge без окна (так градиенты выходят ровно такими, как в исходнике),
# затем Pillow уменьшает картинку до нужных размеров:
#   icon-512 / icon-192 — значок на экран (Android, вкладка), icon-180 — iPhone,
#   maskable-512 — для круглой/скруглённой маски Android, badge-96 — белый силуэт для строки уведомлений;
#   и значки приложения для Android (android-app/launcher-icon/mipmap-*): обычный, круглый и передний слой
#   адаптивного значка (подложку-цвет ставит сборка в облаке, .github/workflows/gsl-woman-android.yml в planner).
import base64
import io
import os
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, 'assets', 'icons')
LAUNCHER = os.path.join(ROOT, 'android-app', 'launcher-icon')
# Плотности Android: обычный значок 48dp, передний слой адаптивного — 108dp
DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
# Рисунок значка (фигуры и плюс) — в круге радиусом 168 из 256 от центра: в адаптивном слое он должен уместиться
# в безопасный круг 66dp из 108 — поэтому весь значок кладётся с масштабом 0.9
FOREGROUND_SCALE = 0.9
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
SIZE = 1024


def shoot(html, out):
    with tempfile.TemporaryDirectory() as tmp:
        page = os.path.join(tmp, 'icon.html')
        with open(page, 'w', encoding='utf-8') as f:
            f.write(html)
        subprocess.run([
            EDGE, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
            f'--user-data-dir={os.path.join(tmp, "profile")}',
            '--default-background-color=00000000',
            f'--window-size={SIZE},{SIZE}', f'--screenshot={out}', 'file:///' + page.replace('\\', '/'),
        ], check=True, capture_output=True, timeout=60)


def page(svg, extra_css=''):
    return (f'<!doctype html><html><head><style>html,body{{margin:0;background:transparent}}'
            f'svg{{width:{SIZE}px;height:{SIZE}px;display:block}}{extra_css}</style></head><body>{svg}</body></html>')


def main():
    with open(os.path.join(ICONS, 'icon.svg'), encoding='utf-8') as f:
        svg = f.read()
    # Текстуры металла — внутрь SVG: страница отрисовки лежит во временной папке, ссылка бы не нашлась.
    # Металл для значка — светлее и контрастнее, чем в кнопках: маленький значок на рабочем столе тёмным не читается.
    # Розовое золото — женщина (GSL Woman+), классическое — мужчина (GSL Man+)
    from PIL import ImageEnhance
    for name, light in (('rose-gold.jpg', 1.22), ('gold.jpg', 1.18)):
        tex = Image.open(os.path.join(ROOT, 'assets', 'textures', name)).convert('RGB')
        tex = ImageEnhance.Contrast(ImageEnhance.Brightness(tex).enhance(light)).enhance(1.12)
        buf = io.BytesIO()
        tex.save(buf, 'JPEG', quality=92)
        texture = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()
        svg = svg.replace(f'href="../textures/{name}"', f'href="{texture}"')
    with tempfile.TemporaryDirectory() as tmp:
        full = os.path.join(tmp, 'full.png')
        mono = os.path.join(tmp, 'mono.png')
        mark = os.path.join(tmp, 'mark.png')
        shoot(page(svg), full)
        # Только рисунок, без фона — передний слой адаптивного значка Android
        shoot(page(svg, '.bg{display:none}'), mark)
        # Силуэт: без фона, все лепестки белые — Android сам красит значок уведомления
        shoot(page(svg, '.bg{display:none} .mark *{fill:#fff !important;stroke:#fff !important}'), mono)

        big = Image.open(full).convert('RGBA')
        for name, size in (('icon-512.png', 512), ('maskable-512.png', 512), ('icon-192.png', 192), ('icon-180.png', 180)):
            img = big.resize((size, size), Image.LANCZOS)
            if name == 'icon-180.png':
                img = img.convert('RGB')  # iPhone не любит прозрачность в значке
            img.save(os.path.join(ICONS, name), optimize=True)
        Image.open(mono).convert('RGBA').resize((96, 96), Image.LANCZOS).save(os.path.join(ICONS, 'badge-96.png'), optimize=True)
        launcher(big, Image.open(mark).convert('RGBA'))
    print('значки готовы:', ', '.join(sorted(n for n in os.listdir(ICONS) if n.endswith('.png'))))


def launcher(full, mark):
    """Значки приложения для Android: ic_launcher (квадрат), ic_launcher_round (круг), ic_launcher_foreground
    (рисунок на прозрачном — передний слой адаптивного значка, подложка — цвет из сборки в облаке)."""
    from PIL import ImageDraw
    for folder, k in DENSITIES.items():
        out = os.path.join(LAUNCHER, f'mipmap-{folder}')
        os.makedirs(out, exist_ok=True)
        size = round(48 * k)
        full.resize((size, size), Image.LANCZOS).save(os.path.join(out, 'ic_launcher.png'), optimize=True)
        big = full.resize((size * 4, size * 4), Image.LANCZOS)
        mask = Image.new('L', big.size, 0)
        ImageDraw.Draw(mask).ellipse((0, 0, big.size[0] - 1, big.size[1] - 1), fill=255)
        round_icon = Image.new('RGBA', big.size, (0, 0, 0, 0))
        round_icon.paste(big, (0, 0), mask)
        round_icon.resize((size, size), Image.LANCZOS).save(os.path.join(out, 'ic_launcher_round.png'), optimize=True)
        fg = round(108 * k)
        inner = round(fg * FOREGROUND_SCALE)
        layer = Image.new('RGBA', (fg, fg), (0, 0, 0, 0))
        layer.paste(mark.resize((inner, inner), Image.LANCZOS), ((fg - inner) // 2, (fg - inner) // 2))
        layer.save(os.path.join(out, 'ic_launcher_foreground.png'), optimize=True)


if __name__ == '__main__':
    sys.exit(main())
