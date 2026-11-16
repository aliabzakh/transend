# Image picks

Every image for the pitch, in one place. Open `index.html` to compare them side by side and tick the ones you want. "Copy picks" copies your list of file names.

The page loads its images by relative path, so open it from a local server rather than straight from disk:

```bash
python3 -m http.server 8790 --directory docs/image-picks
```

Then go to http://localhost:8790.

| Folder | What's in it |
|---|---|
| `1-devpost-original` | The 18 Devpost images as published (the only copy in the repo) |
| `2-devpost-clean` | The same 18 without source lines, the old logo, grey explainer paragraphs or phone captions, using the Held mark |
| `3-trifold-board` | The finished 36 × 48 in board and the flat layout guide to glue from |
| `4-trifold-pieces` | Every trifold print piece at 300 dpi and actual size |
| `5-print` | Letter and tabloid PDFs of the pieces; print at Actual size |
| `source/trifold` | Rebuilds the pieces, board and PDFs (`build.py`, `compose.py`, `pack.py`) |
| `source/trifold-ops` | Builds `4-trifold-pieces/27-ops-map.png`, the operations map with four call-outs (`capture-map.mjs` needs the dev server; then `build.mjs`) |
| `source/devpost-clean` | Rebuilds `2-devpost-clean` from `1-devpost-original` (`clean.py`) |
| `source/devpost-v2` | Builds `docs/devpost/images`, the images the Devpost story now uses: Held mark with sources kept, real app screens, the operations map and the admin forecast view |

`transend-image-picks.zip` (not committed) bundles all of it for sending.
