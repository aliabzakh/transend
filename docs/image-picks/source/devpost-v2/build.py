"""Devpost images, v2: the Held logo, real app screens and the dashboards.

- Every original Devpost image keeps its source line and explainer text; only the old family
  mark is swapped for the Held mark (same code as devpost-clean).
- 16-forecast gets the retrained model's numbers (US$23 vs US$54, from web/lib/risk/model.json).
- 13-sender and 14-shop are rebuilt around screenshots of the running app (screens/).
- 18-ops, 19-ops-shop and 20-admin-cash are new: the operations map and the admin forecast view.
- 00-thumbnail, 01-hero and 15-card show the card as it is printed: screens/card-*.png come from
  web/lib/cards/pdf.ts via card.ts (the designers' template, with sample codes).
- 17-grow is left out: Savings was removed from the product.

usage: python build.py <repo root> <out dir>
needs: pillow numpy fonttools brotli
"""
import io, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "devpost-clean"))
import clean  # noqa: E402

ROOT, OUT = sys.argv[1], sys.argv[2]
ORIG = os.path.join(ROOT, "docs/image-picks/1-devpost-original")
SCREENS = os.path.join(HERE, "screens")
os.makedirs(OUT, exist_ok=True)
clean.SRC = ORIG

BG = (11, 26, 19)
FRAME = (42, 61, 51)
LEAF = (47, 203, 122)
GOLD = (224, 165, 38)
WHITE = (243, 245, 240)
MUTED = (158, 172, 164)
CAPTION = (205, 214, 208)


def font(weight, size, _cache={}):
    if weight not in _cache:
        f = TTFont(os.path.join(ROOT, f"web/public/fonts/satoshi-{weight}.woff2"))
        f.flavor = None
        buf = io.BytesIO()
        f.save(buf)
        _cache[weight] = buf.getvalue()
    return ImageFont.truetype(io.BytesIO(_cache[weight]), size)


def text_w(f, s, track):
    return sum(f.getlength(c) for c in s) + track * (len(s) - 1)


def draw_text(d, xy, s, f, fill, track=0.0):
    """Left-aligned text with letter-spacing in px; xy is the top-left of the em box."""
    x, y = xy
    for c in s:
        d.text((x, y), c, font=f, fill=fill)
        x += f.getlength(c) + track
    return x


def wrap_runs(runs, f, track, width):
    """runs: [(text, colour)]. Greedy word wrap; returns lines of runs."""
    words = []
    for t, col in runs:
        for i, w in enumerate(t.split(" ")):
            words.append((w, col, i > 0 or (words and t.startswith(" "))))
    lines, cur, cur_w = [], [], 0.0
    space = f.getlength(" ") + track
    for w, col, _ in words:
        if not w:
            continue
        ww = text_w(f, w, track)
        add = ww + (space if cur else 0)
        if cur and cur_w + add > width:
            lines.append(cur)
            cur, cur_w = [], 0.0
            add = ww
        cur.append((w, col))
        cur_w += add
    if cur:
        lines.append(cur)
    return lines


def header(d, eyebrow, runs, x=96, y=88, width=1900, size=86):
    """Gold tracked eyebrow, then a two-colour Satoshi Bold headline, like the originals."""
    eb = font(700, 30)
    draw_text(d, (x, y), eyebrow.upper(), eb, GOLD, track=4.2)
    hf = font(700, size)
    track = -0.025 * size
    yy = y + 62
    for line in wrap_runs(runs, hf, track, width):
        xx = x
        for i, (w, col) in enumerate(line):
            if i:
                xx += hf.getlength(" ") + track
            xx = draw_text(d, (xx, yy), w, hf, col, track)
        yy += int(size * 0.95)
    return yy


def held_logo(img, right, bottom, h=46):
    m = clean.held(h, LEAF)
    wf = font(700, int(h * 0.95))
    word = "Transend"
    ww = text_w(wf, word, -0.02 * h)
    x0 = int(right - ww - m.width - h * 0.35)
    img.alpha_composite(m, (x0, bottom - m.height))
    d = ImageDraw.Draw(img)
    draw_text(d, (x0 + m.width + h * 0.35, bottom - h * 1.12), word, wf, WHITE, -0.02 * h)


def footer(img, note, y, x=96, width=1500):
    d = ImageDraw.Draw(img)
    f = font(400, 27)
    for i, line in enumerate(wrap_runs([(note, MUTED)], f, 0, width)):
        draw_text(d, (x, y + i * 38), " ".join(w for w, _ in line), f, MUTED)


def rounded(im, r):
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, fill=255)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.paste(im.convert("RGBA"), (0, 0), mask)
    return out


def phone(screen_path, w=560):
    """Screen at width w inside a rounded frame like the original mock-ups."""
    s = Image.open(screen_path).convert("RGB")
    s = s.resize((w, round(s.height * w / s.width)), Image.LANCZOS)
    pad, r = 16, 64
    fw, fh = w + 2 * pad, s.height + 2 * pad
    out = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    d = ImageDraw.Draw(out)
    d.rounded_rectangle((0, 0, fw - 1, fh - 1), r, fill=BG, outline=FRAME, width=12)
    out.alpha_composite(rounded(s, r - pad), (pad, pad))
    return out


def phones_image(name, eyebrow, runs, screens, captions, note):
    W, H = 2200, 1900
    img = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(img)
    header(d, eyebrow, runs)
    ps = [phone(os.path.join(SCREENS, s)) for s in screens]
    gap = 84
    total = sum(p.width for p in ps) + gap * (len(ps) - 1)
    x, top = (W - total) // 2, 360
    cf = font(500, 33)
    for p, cap in zip(ps, captions):
        img.alpha_composite(p, (x, top))
        cw = cf.getlength(cap)
        d.text((x + (p.width - cw) / 2, top + p.height + 34), cap, font=cf, fill=CAPTION)
        x += p.width + gap
    footer(img, note, 1745)
    held_logo(img, W - 96, 1800)
    img.convert("RGB").save(os.path.join(OUT, name + ".png"), optimize=True)
    print(name, img.size)


def screen_image(name, eyebrow, runs, shot, note, crop=None, fmt="png"):
    s = Image.open(os.path.join(SCREENS, shot)).convert("RGB")
    if crop:
        s = s.crop(crop)
    W, inner = 2200, 2008
    s = s.resize((inner, round(s.height * inner / s.width)), Image.LANCZOS)
    # measure the headline first, so the screenshot always starts below it
    top = header(ImageDraw.Draw(Image.new("RGB", (W, 600))), eyebrow, runs) + 80
    H = top + s.height + 230
    img = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(img)
    header(d, eyebrow, runs)
    framed = rounded(s, 28)
    d.rounded_rectangle((96 - 6, top - 6, 96 + inner + 5, top + s.height + 5), 32, outline=FRAME, width=6)
    img.alpha_composite(framed, (96, top))
    footer(img, note, top + s.height + 70)
    held_logo(img, W - 96, H - 76)
    path = os.path.join(OUT, f"{name}.{fmt}")
    if fmt == "jpg":
        img.convert("RGB").save(path, quality=90, optimize=True, progressive=True)
    else:
        img.convert("RGB").save(path, optimize=True)
    print(name, img.size)


def fix_forecast(img):
    """Swap the headline's second line for the retrained model's numbers."""
    a = np.asarray(img).copy()
    a[235:318, 90:1960, :3] = BG
    img = Image.fromarray(a)
    d = ImageDraw.Draw(img)
    size, track = 76, -2.3  # matches line 1: 1605 px wide, 73 px tall
    f = font(700, size)
    top_of_dollar = f.getbbox("$")[1]
    y = 235 - top_of_dollar
    x = draw_text(d, (102 - f.getbbox("U")[0], y), "US$23 a day", f, LEAF, track)
    draw_text(d, (x + track, y), ". The rules missed by US$54.", f, WHITE, track)
    return img


def printed_card(side, w, angle=0.0, shadow=0.55):
    """The printed card (A6, from pdf.ts) at width w, trimmed corners, a soft shadow, rotated."""
    c = Image.open(os.path.join(SCREENS, f"card-{side}.png")).convert("RGBA")
    c = rounded(c.resize((w, round(c.height * w / c.width)), Image.LANCZOS), max(6, w // 45))
    pad = w // 6
    out = Image.new("RGBA", (c.width + 2 * pad, c.height + 2 * pad), (0, 0, 0, 0))
    a = Image.new("L", out.size, 0)
    a.paste(c.getchannel("A").point(lambda v: int(v * shadow)), (pad, pad + w // 40))
    out.putalpha(a.filter(ImageFilter.GaussianBlur(w / 28)))
    out = Image.composite(out, Image.new("RGBA", out.size, (0, 0, 0, 0)), out.getchannel("A"))
    out = Image.merge("RGBA", (*Image.new("RGB", out.size, (0, 0, 0)).split(), out.getchannel("A")))
    out.alpha_composite(c, (pad, pad))
    return out.rotate(angle, Image.BICUBIC, expand=True) if angle else out


def place(img, layer, cx, cy):
    """Composite layer centred on (cx, cy), clipped to the image."""
    big = Image.new("RGBA", img.size, (0, 0, 0, 0))
    big.paste(layer, (round(cx - layer.width / 2), round(cy - layer.height / 2)), layer)
    img.alpha_composite(big)


def _box(x, r, axis):
    """Box mean of width 2r+1 along axis, edges clamped."""
    pad = [(0, 0)] * x.ndim
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(x, pad, mode="edge"), axis=axis)
    n = x.shape[axis]
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return (hi - lo) / (2 * r + 1)


def _smooth(x, radius):
    """Float Gaussian-like blur: three box passes each way."""
    r = max(1, int(radius / 1.7))
    for _ in range(3):
        x = _box(_box(x, r, 0), r, 1)
    return x


def erase(img, region=None, lum=45, grow=41, radius=160, poly=None):
    """Remove the old card (bright pixels in region, or everything inside poly) and refill the hole
    with the smooth background around it."""
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    if poly:
        # a flat fill in the background colour, feathered, so no seam shows where the old shadow was
        m = Image.new("L", img.size, 0)
        ImageDraw.Draw(m).polygon(poly, fill=255)
        t = np.asarray(m.filter(ImageFilter.GaussianBlur(8)), np.float32)[..., None] / 255
        a = a * (1 - t) + np.array((10, 25, 18), np.float32) * t
        return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")
    else:
        x0, y0, x1, y1 = region
        m = np.zeros(a.shape[:2], np.uint8)
        m[y0:y1, x0:x1] = (a[y0:y1, x0:x1].mean(axis=2) > lum) * 255
        hole = np.asarray(Image.fromarray(m).filter(ImageFilter.MaxFilter(grow))) > 0
    keep = (~hole).astype(np.float32)
    blur = lambda x: _smooth(x, radius)
    w = blur(keep)
    fill = np.stack([blur(a[..., i] * keep) for i in range(3)], 2) / np.maximum(w, 1e-4)[..., None]
    a[hole] = fill[hole]
    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")
    return out


def card_thumbnail(img):
    # the old card and its shadow: everything right of a line just left of its slanted edge
    img = erase(img, poly=[(630, 0), (1500, 0), (1500, 1000), (760, 1000)])
    place(img, printed_card("back", 980, 10), 1335, 740)
    return img


def card_hero(img):
    phone_box, r = (1481, 76, 1947, 1074), 70
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(phone_box, r, fill=255)
    phone_px = img.copy()
    img = erase(img, (1100, 540, 1480, 1120), radius=140)
    place(img, printed_card("back", 560, 8), 1450, 990)
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((phone_box[0] - 4, phone_box[1] + 18, phone_box[2], phone_box[3] + 18), r, fill=(0, 0, 0, 150))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(22)))
    img.paste(phone_px, (0, 0), mask)
    return img


def card_image():
    W = 2000
    runs = [("Her whole account fits on a card. ", WHITE),
            ("No phone, no app, no national ID needed, and no balance printed on it.", LEAF)]
    top = header(ImageDraw.Draw(Image.new("RGB", (W, 600))), "The recipient's side · a printed card", runs, width=1808) + 90
    cw = 700
    front, back = printed_card("front", cw), printed_card("back", cw)
    pad = cw // 6
    ch = front.height - 2 * pad
    H = top + ch + 330
    img = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(img)
    header(d, "The recipient's side · a printed card", runs, width=1808)
    gap = 150
    x0 = (W - 2 * cw - gap) // 2
    cf = font(500, 33)
    for i, (layer, cap) in enumerate([(front, "Front · how to use it, in Kreyòl, French and English"),
                                      (back, "Back · ID and QR, 20 one-time codes, renewal, limits")]):
        x = x0 + i * (cw + gap)
        img.alpha_composite(layer, (x - pad, top - pad))
        cwid = cf.getlength(cap)
        d.text((x + (cw - cwid) / 2, top + ch + 40), cap, font=cf, fill=CAPTION)
    footer(img, "A6 card, 105 × 148 mm, printed from the PDF the sender downloads once: two A6 pages, or front "
           "and back on one Letter sheet to cut and fold. Rendered by the app's own card code with sample codes. "
           "The server keeps only hashes of the codes.", H - 160, width=1480)
    held_logo(img, W - 96, H - 76)
    img.convert("RGB").save(os.path.join(OUT, "15-card.png"), optimize=True)
    print("15-card", img.size)


# ---- 1. originals with the Held mark, sources kept ----
KEEP = ["00-thumbnail", "01-hero", "02-haiti", "03-cost", "04-size", "05-waterfall", "06-breakeven",
        "07-growth", "08-corridors", "09-market", "10-architecture", "11-money", "12-redeem",
        "16-forecast"]
for n in KEEP:
    img = Image.open(os.path.join(ORIG, n + ".png")).convert("RGBA")
    img = clean.swap_marks(img, n)
    if n == "16-forecast":
        img = fix_forecast(img)
    if n == "00-thumbnail":
        img = card_thumbnail(img)
    if n == "01-hero":
        img = card_hero(img)
    img.convert("RGB").save(os.path.join(OUT, n + ".png"), optimize=True)
    print(n, img.size)

# ---- 1b. the printed card ----
card_image()

# ---- 2. phone images from the running app ----
phones_image(
    "13-sender", "Sender app · Jean in Montréal",
    [("He sees the exact fee and the exact dollars ", WHITE), ("before he taps send.", LEAF)],
    ["sender-quote.png", "sender-card.png", "sender-pickup.png"],
    ["Quote, held for 30 seconds", "Her card: the balance, never the codes", "Pickup confirmed"],
    "Screenshots of the running app at 360 px, on the testnet demo. Rate is a labelled demo rate.",
)
phones_image(
    "14-shop", "Shop app · Boutik Marie-Ange, Môle-Saint-Nicolas",
    [("A corner shop pays out cash ", WHITE), ("with the phone it already owns.", LEAF)],
    ["shop-home.png", "shop-pin.png", "shop-approved.png"],
    ["One tap sets the area's status", "She sees the amount, then her PIN", "Approved, paid back digitally"],
    "Screenshots of the running app at 360 px, built for low-end Android phones on 2G or 3G. "
    "Today's cash limit, US$203.82, is the AI forecast's ceiling for this shop.",
)

# ---- 3. dashboards ----
screen_image(
    "18-ops", "Operations map · /ops, no log-in",
    [("Every shop's cash, forecast and top-ups ", WHITE), ("on one map.", LEAF)],
    "ops-top.png",
    "26 shops: the 3 real demo shops plus 23 simulated shops in real towns, labelled. Sample data. "
    "The week plays back in 15-minute steps: payouts drawn from each shop's forecast band, capped at "
    "its ceiling, with shopkeepers topping up their own cash. No cash is delivered.",
    fmt="jpg",
)
screen_image(
    "19-ops-shop", "Operations map · one shop",
    [("Pick a shop: its forecast, its backtest ", WHITE), ("and a week of its cash.", LEAF)],
    "ops-shop.png",
    "Backtest: each of the last 14 days forecast only from earlier days. For Boutik Marie-Ange, "
    "12 of 14 days fell inside the p10-p90 band, with an average error of US$15 a day. Sample data.",
    fmt="jpg",
)
screen_image(
    "20-admin-cash", "Admin · cash distribution",
    [("The forecast sets each shop's cash ceiling. ", WHITE), ("It never approves a payout.", LEAF)],
    "admin-cash.png",
    "Per shop: paid out in the last 7 days, the ceiling now and the suggested one, two weeks of payouts, "
    "the p10-p90 band with the likely line, restock windows and the day table. Synthetic data, labelled.",
    crop=(300, 0, 2260, 2085),
)
