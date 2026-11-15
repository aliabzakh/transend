"""Clean variants of the Devpost images: no source lines, no captions, no grey explainer paragraph,
and the Held mark in place of the old family mark.

usage: clean.py <devpost dir> <out dir>
"""
import os, sys, math
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blocks import blocks
from findmark import find

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
LEAF, GOLD, FOREST = (47, 203, 122), (224, 165, 38), (15, 81, 50)

# content bands (indices from blocks.py) to drop: grey explainer paragraphs, phone captions, sources + old logo
DROP = {
    "02-haiti": [8], "03-cost": [2, 5], "04-size": [8], "05-waterfall": [2, 5], "06-breakeven": [8],
    "07-growth": [2, 4], "08-corridors": [6], "09-market": [3], "10-architecture": [2, 5], "11-money": [5],
    "12-redeem": [3], "13-sender": [4, 5], "14-shop": [3, 4], "15-card": [3], "16-forecast": [2, 6],
    "17-grow": [3, 4],
}
# marks inside the art that sit on a tilted card
ANGLE = {("01-hero", 1199): 8.0, ("15-card", 142): 3.0}
SKIP = {("04-size", 1497), ("04-size", 1587)}  # gold dots on a chart, not logos


def held(height_px, arms, angle=0.0):
    """Held mark as RGBA, content box (78 x 69 units of the 96 grid) scaled to height_px."""
    k = 8
    s = height_px / 69 * k
    W = int(96 * s)
    im = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy, r = 48 * s, 27 * s, 15 * s
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=GOLD + (255,))
    rw = 7 * s
    for i in range(241):
        t = i / 240
        x = (1 - t) ** 2 * 16 + 2 * (1 - t) * t * 48 + t * t * 80
        y = (1 - t) ** 2 * 44 + 2 * (1 - t) * t * 104 + t * t * 44
        d.ellipse((x * s - rw, y * s - rw, x * s + rw, y * s + rw), fill=arms + (255,))
    im = im.crop((int(9 * s), int(12 * s), int(87 * s), int(81 * s)))
    if angle:
        im = im.rotate(angle, resample=Image.BICUBIC, expand=True)
    return im.resize((max(1, im.width // k), max(1, im.height // k)), Image.LANCZOS)


def swap_marks(img, name):
    a = np.asarray(img).astype(int)
    for h in find(os.path.join(SRC, name + ".png")):
        x0, y0, x1, y1 = h["bbox"]
        if (name, x0) in SKIP:
            continue
        pad = 4
        X0, Y0, X1, Y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
        # fill by blending the four edges (Coons patch), so gradients and card shading carry through
        top, bot = a[Y0 - 1, X0:X1, :3].astype(float), a[Y1, X0:X1, :3].astype(float)
        lef, rig = a[Y0:Y1, X0 - 1, :3].astype(float), a[Y0:Y1, X1, :3].astype(float)
        h, w = Y1 - Y0, X1 - X0
        u = (np.arange(w) + .5)[None, :, None] / w
        v = (np.arange(h) + .5)[:, None, None] / h
        c00, c10 = a[Y0 - 1, X0 - 1, :3], a[Y0 - 1, X1, :3]
        c01, c11 = a[Y1, X0 - 1, :3], a[Y1, X1, :3]
        patch = ((1 - v) * top[None] + v * bot[None] + (1 - u) * lef[:, None] + u * rig[:, None]
                 - ((1 - u) * (1 - v) * c00 + u * (1 - v) * c10 + (1 - u) * v * c01 + u * v * c11))
        arr = np.asarray(img).copy()
        arr[Y0:Y1, X0:X1, :3] = np.clip(patch, 0, 255).astype(np.uint8)
        img = Image.fromarray(arr)
        bg = np.median(np.concatenate([top, bot, lef, rig]), axis=0)
        light = bg.sum() > 450
        m = held(y1 - y0, FOREST if light else LEAF, ANGLE.get((name, x0), 0.0))
        img.alpha_composite(m, (x1 - m.width, (y0 + y1) // 2 - m.height // 2))
        a = np.asarray(img).astype(int)
    return img


def drop_bands(img, name):
    bl = blocks(os.path.join(SRC, name + ".png"))
    drop = set(DROP.get(name, []))
    if not drop:
        return img
    keep = [i for i in range(len(bl)) if i not in drop]
    top = bl[0][0]
    rows = []
    # walk kept blocks; between two kept blocks keep the gap that followed the last dropped one
    a = np.asarray(img)
    pieces = [a[:bl[keep[0]][1]]]
    for prev, cur in zip(keep, keep[1:]):
        if cur == prev + 1:
            pieces.append(a[bl[prev][1]:bl[cur][1]])
        else:
            # skip prev's end .. last dropped block's end; keep the gap before cur
            last_dropped = cur - 1
            pieces.append(a[bl[last_dropped][1]:bl[cur][1]])
    end = bl[keep[-1]][1]
    nxt = bl[keep[-1] + 1][0] if keep[-1] + 1 < len(bl) else a.shape[0]
    gap = a[end:min(nxt - 4, end + top)]
    if len(gap) < top:  # pad with copies of the last clean background row
        gap = np.concatenate([gap, np.repeat(gap[-1:], top - len(gap), axis=0)], axis=0)
    pieces.append(gap)
    out = np.concatenate(pieces, axis=0)
    return Image.fromarray(out)


def blank_bottom_line(img, box):
    """Paint over a small text line with the colour of its own row at the left margin."""
    a = np.asarray(img).copy()
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        a[y, x0:x1] = a[y, 20]
    return Image.fromarray(a)


for f in sorted(os.listdir(SRC)):
    if not f.endswith(".png"):
        continue
    name = f[:-4]
    img = Image.open(os.path.join(SRC, f)).convert("RGBA")
    img = swap_marks(img, name)
    img = drop_bands(img, name)
    if name == "00-thumbnail":
        img = blank_bottom_line(img, (80, 860, 640, 930))
    img.convert("RGB").save(os.path.join(OUT, name + "-clean.png"), optimize=True)
    print(name, Image.open(os.path.join(SRC, f)).size, "->", img.size)
