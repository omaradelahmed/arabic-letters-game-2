"""توليد أيقونات «وين الحرف؟» — تشغيل:

    python tools/make_icons.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"
OUT.mkdir(exist_ok=True)

S = 1024

TEAL_TOP = (140, 232, 216)
TEAL_BOT = (23, 165, 140)
AMBER = (255, 206, 84)
AMBER_EDGE = (255, 183, 3)
NAVY = (18, 58, 86)
WHITE = (255, 255, 255)

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\tahomabd.ttf",
    r"C:\Windows\Fonts\segoeuib.ttf",
]


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def background() -> Image.Image:
    img = Image.new("RGB", (S, S), TEAL_BOT)
    draw = ImageDraw.Draw(img)
    for y in range(S):
        t = y / (S - 1)
        color = tuple(round(TEAL_TOP[i] + (TEAL_BOT[i] - TEAL_TOP[i]) * t) for i in range(3))
        draw.line([(0, y), (S, y)], fill=color)
    return img


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def draw_content(scale: float = 1.0) -> Image.Image:
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    cx, cy = S // 2, S // 2 - 26
    r = 310

    draw.ellipse([cx - r - 28, cy - r - 28, cx + r + 28, cy + r + 28], fill=WHITE)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=AMBER)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=AMBER_EDGE, width=18)

    font = load_font(540)
    glyph = "ح"
    box = draw.textbbox((0, 0), glyph, font=font)
    gw, gh = box[2] - box[0], box[3] - box[1]
    draw.text((cx - gw / 2 - box[0], cy - gh / 2 - box[1] - 10), glyph, font=font, fill=NAVY)

    # عدسة مكبّرة (علامة «دوّر واختار»)
    lx, ly, lr = 232, 792, 96
    draw.ellipse([lx - lr - 22, ly - lr - 22, lx + lr + 22, ly + lr + 22], fill=WHITE)
    draw.ellipse([lx - lr, ly - lr, lx + lr, ly + lr], fill=(235, 251, 248), outline=NAVY, width=22)

    hx1, hy1 = lx + 74, ly + 74
    hx2, hy2 = lx + 168, ly + 168
    draw.line([(hx1, hy1), (hx2, hy2)], fill=NAVY, width=40)
    for px, py in ((hx1, hy1), (hx2, hy2)):
        draw.ellipse([px - 20, py - 20, px + 20, py + 20], fill=NAVY)

    if scale != 1.0:
        inner = round(S * scale)
        layer = layer.resize((inner, inner), Image.LANCZOS)
        canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        off = (S - inner) // 2
        canvas.alpha_composite(layer, (off, off))
        layer = canvas

    return layer


def save(name: str, size: int, *, scale: float = 1.0, radius: int = 0) -> None:
    img = background().convert("RGBA")
    img.alpha_composite(draw_content(scale))
    img = img.convert("RGB").resize((size, size), Image.LANCZOS).convert("RGBA")
    if radius:
        img.putalpha(rounded_mask(size, radius))
    target = OUT / name
    img.save(target, format="PNG", optimize=True)
    print(f"{target.name}: {size}x{size}")


if __name__ == "__main__":
    save("icon-192.png", 192, radius=40)
    save("icon-512.png", 512, radius=104)
    save("icon-maskable-512.png", 512, scale=0.82)
    save("apple-touch-icon.png", 180)
    save("favicon-32.png", 32, radius=6)
