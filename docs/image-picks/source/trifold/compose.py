"""Compose the pieces onto a 48 x 36 in tri-fold board: a flat gluing guide and a standing 3D mock-up."""
import os, sys
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

PIECES, OUT = sys.argv[1], sys.argv[2]
K = 50  # px per inch on the board image
BW, BH = 48, 36

# (piece, x, y, rotation) in board inches; later entries sit on top
LAYOUT = [
    # left panel: the problem, who it's for, her card
    ("10-problem", 0.75, 1.9, 0), ("04-tab-problem", 1.15, 1.3, -2),
    ("11-who", 0.75, 15.25, 0), ("05-tab-who", 1.15, 14.65, 1.5),
    ("18-scratch-card", 1.25, 28.7, -5),
    # centre: brand, headline, the two things, how it works, Stellar, QR
    ("01-logo", 19.3, 0.55, 0),
    ("02-headline-cash-home", 12.55, 3.4, -1.5), ("03-headline-hand-to-hand", 23.15, 4.85, 1.2),
    ("12-two-things", 15.75, 8.35, 0), ("19-shop-phone", 12.3, 9.7, -4),
    ("14-step-send", 12.75, 19.75, 0), ("15-step-stellar", 20.45, 19.75, 0), ("16-step-shop", 28.15, 19.75, 0),
    ("06-tab-how", 13.15, 19.15, -1.5),
    ("17-arrow", 19.05, 21.0, 0), ("17-arrow", 26.75, 21.0, 0),
    ("20-why-stellar", 12.4, 28.55, 0), ("21-qr", 27.3, 28.7, 2),
    # right panel: gains, partners, money, next
    ("23-gain", 36.75, 1.8, 0), ("07-tab-gain", 37.15, 1.2, -1.5),
    ("24-partners", 36.75, 13.0, 0), ("08-tab-partners", 37.15, 12.4, 1.5),
    ("25-pays", 36.75, 22.85, 0), ("09-tab-pays", 37.15, 22.25, -1.5),
    ("26-pilot", 43.45, 31.75, 8),
]


def load(pid):
    im = Image.open(os.path.join(PIECES, pid + ".png")).convert("RGBA")
    return im.resize((round(im.width / 300 * K), round(im.height / 300 * K)), Image.LANCZOS)


def board_flat():
    b = Image.new("RGBA", (BW * K, BH * K), (250, 249, 245, 255))
    # faint paper grain
    rng = np.random.default_rng(3)
    grain = (rng.normal(0, 2.2, (BH * K, BW * K))).astype(np.int16)
    arr = np.array(b).astype(np.int16)
    arr[..., :3] += grain[..., None]
    b = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    for pid, x, y, rot in LAYOUT:
        im = load(pid)
        if rot:
            im = im.rotate(-rot, resample=Image.BICUBIC, expand=True)
        # paper shadow
        a = im.split()[3]
        sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
        sh.putalpha(a.point(lambda v: int(v * 0.32)))
        pad = 12
        canvas = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
        canvas.alpha_composite(sh, (pad, pad))
        canvas = canvas.filter(ImageFilter.GaussianBlur(4))
        px, py = round(x * K), round(y * K)
        # centre of the unrotated piece stays put when rotated
        w0 = load(pid).size
        px -= (im.width - w0[0]) // 2
        py -= (im.height - w0[1]) // 2
        b.alpha_composite(canvas, (px - pad + 2, py - pad + 5))
        b.alpha_composite(im, (px, py))
    return b


def persp_coeffs(src, dst):
    """Coefficients for PIL PERSPECTIVE mapping output (dst) points back to input (src) points."""
    m = []
    for (x, y), (u, v) in zip(dst, src):
        m.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); m.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    A = np.array(m, float); B = np.array([c for p in src for c in p], float)
    return np.linalg.solve(A, B).tolist()


def standing(flat):
    W, H = flat.size
    L = flat.crop((0, 0, 12 * K, H)); C = flat.crop((12 * K, 0, 36 * K, H)); R = flat.crop((36 * K, 0, W, H))
    cw, ch = C.size
    side_w = int(12 * K * 0.80)  # foreshortened
    grow = int(H * 0.045)        # outer edges come toward the viewer
    margin_x, margin_top = 260, 220
    out_w = cw + 2 * side_w + 2 * margin_x
    out_h = H + 2 * grow + margin_top + 260
    bg = Image.new("RGBA", (out_w, out_h), (226, 221, 211, 255))
    # table
    d = ImageDraw.Draw(bg)
    table_y = margin_top + grow + H - 40
    d.rectangle((0, table_y, out_w, out_h), fill=(196, 186, 170, 255))
    cx0 = margin_x + side_w
    top = margin_top + grow

    # left panel quad: outer edge at x=margin_x taller
    lq = [(margin_x, top - grow), (cx0, top), (cx0, top + H), (margin_x, top + H + grow)]
    rq = [(cx0 + cw, top), (cx0 + cw + side_w, top - grow), (cx0 + cw + side_w, top + H + grow), (cx0 + cw, top + H)]

    # soft shadow of the whole board on the table
    sh = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).polygon([(margin_x + 40, top + H + grow - 10), (cx0 + cw + side_w - 40, top + H + grow - 10),
                                (cx0 + cw + side_w + 120, top + H + grow + 120), (margin_x - 120, top + H + grow + 120)],
                               fill=(0, 0, 0, 70))
    bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(40)))

    def warp(img, quad, shade):
        w, h = img.size
        co = persp_coeffs([(0, 0), (w, 0), (w, h), (0, h)], quad)
        t = img.transform(bg.size, Image.PERSPECTIVE, co, Image.BICUBIC)
        mask = Image.new("L", bg.size, 0); ImageDraw.Draw(mask).polygon(quad, fill=255)
        t.putalpha(mask)
        if shade:
            dark = Image.new("RGBA", bg.size, (0, 0, 0, 0)); dark.putalpha(mask.point(lambda v: int(v * shade)))
            t.alpha_composite(dark)
        return t

    bg.alpha_composite(warp(L, lq, 0.06))
    bg.alpha_composite(warp(R, rq, 0.10))
    bg.alpha_composite(C, (cx0, top))
    # fold lines
    d = ImageDraw.Draw(bg)
    d.line([(cx0, top), (cx0, top + H)], fill=(0, 0, 0, 40), width=3)
    d.line([(cx0 + cw, top), (cx0 + cw, top + H)], fill=(0, 0, 0, 40), width=3)
    return bg


flat = board_flat()
flat.convert("RGB").save(os.path.join(OUT, "layout-guide.png"))
standing(flat).convert("RGB").save(os.path.join(OUT, "finished-board.png"))
print("ok", flat.size)
