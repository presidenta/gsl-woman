# ЗНАЧКИ ДЛЯ ТЕЛЕФОНА из assets/icons/icon.svg: `npm run icons`.
# Рисует SVG браузером Edge без окна (так градиенты выходят ровно такими, как в исходнике),
# затем Pillow уменьшает картинку до нужных размеров:
#   icon-512 / icon-192 — значок на экран (Android, вкладка), icon-180 — iPhone,
#   maskable-512 — для круглой/скруглённой маски Android, badge-96 — белый силуэт для строки уведомлений.
import os
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, 'assets', 'icons')
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
    with tempfile.TemporaryDirectory() as tmp:
        full = os.path.join(tmp, 'full.png')
        mono = os.path.join(tmp, 'mono.png')
        shoot(page(svg), full)
        # Силуэт: без фона, все лепестки белые — Android сам красит значок уведомления
        shoot(page(svg, '.bg{display:none} .mark *{fill:#fff !important;stroke:#fff !important}'), mono)

        big = Image.open(full).convert('RGBA')
        for name, size in (('icon-512.png', 512), ('maskable-512.png', 512), ('icon-192.png', 192), ('icon-180.png', 180)):
            img = big.resize((size, size), Image.LANCZOS)
            if name == 'icon-180.png':
                img = img.convert('RGB')  # iPhone не любит прозрачность в значке
            img.save(os.path.join(ICONS, name), optimize=True)
        Image.open(mono).convert('RGBA').resize((96, 96), Image.LANCZOS).save(os.path.join(ICONS, 'badge-96.png'), optimize=True)
    print('значки готовы:', ', '.join(sorted(n for n in os.listdir(ICONS) if n.endswith('.png'))))


if __name__ == '__main__':
    sys.exit(main())
