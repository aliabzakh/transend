# Devpost images, v2

Builds `docs/devpost/images/`, the images the Devpost story links to.

- The original Devpost images keep their source lines and explainer text. Only the old family mark changes, to the Held mark, using the same code as `../devpost-clean`.
- `16-forecast` shows the retrained model's held-out error: US$23 a day against US$54 for the rules (`web/lib/risk/model.json`).
- `13-sender` and `14-shop` are rebuilt from screenshots of the running app, in place of the design mock-ups.
- `18-ops`, `19-ops-shop` and `20-admin-cash` are new: the operations map and the admin forecast view.
- `17-grow` is left out, because Savings was removed.

```bash
python capture.py screens            # needs the web dev server on :3000
python build.py ../../../.. ../../../devpost/images
```

`screens/admin-cash.png` comes from `/admin/cash`, which needs `ADMIN_PASSWORD`. The page was saved as HTML from a signed-in browser and rendered at 2x in the same way (see the note in `capture.py`).

Python packages: `pillow numpy fonttools brotli playwright`.
