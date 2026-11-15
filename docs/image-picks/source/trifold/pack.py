"""Pack every piece at 100% size onto letter and tabloid pages. Solid pieces get a hairline to cut along."""
import os, sys, json
import pymupdf
from PIL import Image
PIECES, OUT, MAN = sys.argv[1], sys.argv[2], sys.argv[3]
man = json.load(open(MAN))
COPIES = {"17-arrow": 2}
M, GAP = 0.24, 0.25  # page margin and gap, inches
LETTER, TABLOID = (8.5, 11), (11, 17)
items = []
for m in man:
    for _ in range(COPIES.get(m["id"], 1)):
        items.append(m)

def fits(w, h, page):
    W, H = page
    return (w <= W - 2*M + 1e-6 and h <= H - 2*M + 1e-6) or (w <= H - 2*M + 1e-6 and h <= W - 2*M + 1e-6)

letter_items = [m for m in items if fits(m["w"], m["h"], LETTER)]
tab_items = [m for m in items if m not in letter_items]

def pack(its, paper):
    """Shelf packing; each page portrait or landscape, whichever the first item needs."""
    pages = []
    its = sorted(its, key=lambda m: -max(m["w"], m["h"]) * min(m["w"], m["h"]))
    for m in its:
        placed = False
        for pg in pages:
            if place(pg, m): placed = True; break
        if not placed:
            W, H = paper
            if not (m["w"] <= W - 2*M + 1e-6 and m["h"] <= H - 2*M + 1e-6):
                W, H = H, W
            pg = {"size": (W, H), "shelves": [], "items": []}
            assert place(pg, m), m
            pages.append(pg)
    return pages

def place(pg, m):
    W, H = pg["size"]
    w, h = m["w"], m["h"]
    for sh in pg["shelves"]:
        if h <= sh["h"] + 1e-6 and sh["x"] + w <= W - M + 1e-6:
            pg["items"].append((m, sh["x"], sh["y"])); sh["x"] += w + GAP; return True
    y = M if not pg["shelves"] else pg["shelves"][-1]["y"] + pg["shelves"][-1]["h"] + GAP
    if y + h <= H - M + 1e-6 and M + w <= W - M + 1e-6:
        pg["shelves"].append({"y": y, "h": h, "x": M + w + GAP}); pg["items"].append((m, M, y)); return True
    return False

def write(pages, path):
    doc = pymupdf.open()
    for pg in pages:
        W, H = pg["size"]
        page = doc.new_page(width=W * 72, height=H * 72)
        for m, x, y in pg["items"]:
            r = pymupdf.Rect(x * 72, y * 72, (x + m["w"]) * 72, (y + m["h"]) * 72)
            page.insert_image(r, filename=os.path.join(PIECES, m["id"] + ".png"))
            if m["kind"] == "solid":
                page.draw_rect(r, color=(0.72, 0.72, 0.72), width=0.4)
    doc.save(path, deflate=True, garbage=3)
    print(path, len(pages), "pages")

write(pack(letter_items, LETTER), os.path.join(OUT, "print-letter.pdf"))
write(pack(tab_items, TABLOID), os.path.join(OUT, "print-tabloid.pdf"))
