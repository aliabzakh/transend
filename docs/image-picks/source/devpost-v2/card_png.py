"""Rasterize the sample card PDF from card.ts: page 1 -> screens/card-front.png, page 2 -> card-back.png.

usage: python card_png.py <card.pdf>   (needs pymupdf)
"""
import os, sys
import pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
doc = pymupdf.open(sys.argv[1])
for page, side in zip(doc, ["front", "back"]):
    pix = page.get_pixmap(dpi=400)
    pix.save(os.path.join(HERE, "screens", f"card-{side}.png"))
    print(side, pix.width, pix.height)
