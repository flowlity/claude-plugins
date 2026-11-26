#!/usr/bin/env python3
"""
Generate branding assets for the SC Operations Review deck.

Reads deck_data.json and writes three PNGs into the deck working dir:
  - cover_bg.png   : dynamic cover background (dark base + diagonal accent sweep)
  - logo_white.png : wordmark lockup for the dark cover
  - logo_dark.png  : wordmark lockup for light-slide footers

The wordmark is a FALLBACK. If the customer's real logo file is available
(downloaded from their domain in the runtime environment, or dropped into the
deck dir as `logo_white.png` / `logo_dark.png`), skip this and use that instead.

Usage:  python generate_assets.py --config deck_data.json --out .
"""
import argparse, json, os
from PIL import Image, ImageDraw, ImageFont

def hx(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def font(sz):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        try: return ImageFont.truetype(p, sz)
        except Exception: pass
    return ImageFont.load_default()

def lighten(c, f):  return tuple(min(255, int(x + (255 - x) * f)) for x in c)
def darken(c, f):   return tuple(int(x * (1 - f)) for x in c)

def cover(out, ink, accent):
    W, H = 1920, 1080
    accent_d = darken(accent, 0.22); accent_h = lighten(accent, 0.30); ink2 = lighten(ink, 0.06)
    bg = Image.new("RGB", (W, H), ink); d = ImageDraw.Draw(bg, "RGBA")
    d.polygon([(1180, 0), (W, 0), (W, 420), (1480, 0)], fill=ink2 + (255,))
    for i, off in enumerate(range(-200, 700, 90)):
        d.line([(1150 + off, 0), (1150 + off - 300, 520)], fill=accent + (22 if i % 2 == 0 else 12,), width=3)
    tl, tr = 858, 690
    grad = Image.new("RGB", (W, H), accent_d); gd = ImageDraw.Draw(grad)
    for y in range(H):
        t = max(0.0, min(1.0, (y - 650) / (H - 650)))
        gd.line([(0, y), (W, y)], fill=tuple(int(accent[k] + t * (accent_d[k] - accent[k])) for k in range(3)))
    mask = Image.new("L", (W, H), 0); md = ImageDraw.Draw(mask)
    md.polygon([(0, tl), (W, tr), (W, H), (0, H)], fill=255)
    bg.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(bg, "RGBA")
    d.line([(0, tl - 26), (W, tr - 26)], fill=accent_h + (230,), width=7)
    d.line([(0, tl - 70), (W, tr - 70)], fill=accent + (90,), width=4)
    bg.save(out)

def wordmark(out, main, suffix, main_col, accent):
    f = font(150); tmp = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    w1 = tmp.textlength(main, font=f); w2 = tmp.textlength(suffix, font=f) if suffix else 0
    gap, barw, barpad, pad, Hh = 36, 26, 26, 18, 210
    Wd = int(barw + barpad + w1 + (gap + w2 if suffix else 0) + pad * 2)
    img = Image.new("RGBA", (Wd, Hh), (0, 0, 0, 0)); dd = ImageDraw.Draw(img)
    x = pad
    dd.rectangle([x, 40, x + barw, Hh - 40], fill=accent + (255,)); x += barw + barpad
    dd.text((x, 28), main, font=f, fill=main_col + (255,)); x += w1 + gap
    if suffix: dd.text((x, 28), suffix, font=f, fill=accent + (255,))
    img.save(out)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="deck_data.json")
    ap.add_argument("--out", default=".")
    a = ap.parse_args()
    cfg = json.load(open(a.config))
    b = cfg.get("brand", {})
    ink = hx(b.get("ink", "141A23")); accent = hx(b.get("accent", "E2231A"))
    wm = b.get("wordmark") or {}
    company = cfg.get("meta", {}).get("company", "COMPANY")
    main = wm.get("main", company.upper()); suffix = wm.get("suffix", "")
    os.makedirs(a.out, exist_ok=True)
    cover(os.path.join(a.out, "cover_bg.png"), ink, accent)
    wordmark(os.path.join(a.out, "logo_white.png"), main, suffix, (255, 255, 255), accent)
    wordmark(os.path.join(a.out, "logo_dark.png"), main, suffix, hx("23282F"), accent)
    print("assets written to", a.out)
