"""Trifold pieces for Transend: one HTML page per piece, rendered at 300 dpi by headless Chrome.

Sizes are in inches at print size. Text is never smaller than 24 pt (32 CSS px).
"cut" pieces have transparent corners (circles, pills, rotated cards); "solid" pieces fill their rectangle.
"""
import os, subprocess, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]
HTML = os.path.join(HERE, "html")
os.makedirs(HTML, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DPI = 300
PX = 96  # CSS px per inch

NIGHT, CANOPY, FG, MUTED = "#0B1A13", "#12291E", "#F3F5F0", "#A8B8AE"
LEAF, TINT, GOLD, ONGOLD = "#2FCB7A", "#9FE3BE", "#E0A526", "#3A2805"
FOREST, CREAM, CLAY = "#0F5132", "#FFF7E8", "#C2462B"

QR = {n: open(os.path.join(HERE, f"qr-{n}.svg")).read() for n in ("try", "proof")}


def mark(arms=LEAF, coin=GOLD, size=100):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 96 96">'
            f'<circle cx="48" cy="27" r="15" fill="{coin}"/>'
            f'<path d="M16 44 Q48 104 80 44" fill="none" stroke="{arms}" stroke-width="14" stroke-linecap="round"/></svg>')


def person(body, head, size):
    """A figure in the Held style: head over shoulders."""
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 96 96">'
            f'<circle cx="48" cy="30" r="17" fill="{head}"/>'
            f'<path d="M18 92 Q18 56 48 56 Q78 56 78 92 Z" fill="{body}"/></svg>')


BASE = f"""
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=block');
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{background:transparent}}
body{{font-family:Satoshi,system-ui,sans-serif;-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}}
.p{{position:relative;overflow:hidden}}
.night{{background:{NIGHT};color:{FG}}}
.cream{{background:{CREAM};color:{NIGHT}}}
.leaf{{background:{LEAF};color:{NIGHT}}}
.forest{{background:{FOREST};color:{FG}}}
.gold{{background:{GOLD};color:{ONGOLD}}}
.kick{{font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:34px}}
h1,h2,h3{{font-weight:700;letter-spacing:-.02em;line-height:1.02}}
.big{{font-weight:700;letter-spacing:-.035em;line-height:.9}}
.row{{display:flex}}
svg{{flex:none}}
"""

pieces = []  # (id, w_in, h_in, kind, body_css, body_html)


def add(pid, w, h, kind, html, css=""):
    """Add a piece; a later add with the same id replaces it in place."""
    d = dict(id=pid, w=w, h=h, kind=kind, html=html, css=css)
    for i, p in enumerate(pieces):
        if p["id"] == pid:
            pieces[i] = d
            return
    pieces.append(d)


# ---------------------------------------------------------------- header
add("01-logo", 9.4, 2.6, "cut", f"""
<div class="p cream" style="width:100%;height:100%;border-radius:120px;display:flex;align-items:center;justify-content:center;gap:30px;padding:0 60px;border:4px solid #E3D3B0">
  {mark(FOREST, GOLD, 190)}
  <div style="font-weight:700;font-size:150px;letter-spacing:-.03em;color:{FOREST};line-height:1;margin-top:-6px">Transend</div>
</div>""")

add("02-headline-cash-home", 10.3, 2.8, "solid", f"""
<div class="p night" style="width:100%;height:100%;display:flex;align-items:center;padding:0 60px">
  <h1 style="font-size:168px;letter-spacing:-.035em;white-space:nowrap">Cash home,</h1>
</div>""")

add("03-headline-hand-to-hand", 12.2, 2.8, "solid", f"""
<div class="p leaf" style="width:100%;height:100%;display:flex;align-items:center;padding:0 60px">
  <h1 style="font-size:168px;letter-spacing:-.035em;white-space:nowrap">hand to hand.</h1>
</div>""")

# ---------------------------------------------------------------- tabs (gold pills)
TABS = [("04-tab-problem", "The problem", 5.0), ("05-tab-who", "Who it's for", 5.0),
        ("06-tab-how", "How it works", 5.3), ("07-tab-gain", "What they gain", 5.9),
        ("08-tab-partners", "Key partners", 5.3), ("09-tab-pays", "How it pays", 5.0)]
for pid, label, w in TABS:
    add(pid, w, 1.15, "cut", f"""
<div class="p gold" style="width:100%;height:100%;border-radius:60px;display:flex;align-items:center;justify-content:center">
  <div class="kick" style="font-size:46px;letter-spacing:.1em;color:{ONGOLD}">{label}</div>
</div>""")

# ---------------------------------------------------------------- left: problem
add("10-problem", 10.5, 12.4, "solid", f"""
<div class="p night" style="width:100%;height:100%;padding:84px 76px 60px">
  <h2 style="font-size:76px">Getting cash home costs rural Haiti <span style="color:{GOLD}">the most.</span></h2>
  <div style="margin-top:56px">
    <div class="big" style="font-size:240px;color:{GOLD}">9.06%</div>
    <div style="font-size:44px;color:{MUTED};margin-top:22px;line-height:1.25">to collect cash sent from Canada</div>
  </div>
  <div style="height:3px;background:#24402F;margin:54px 0 52px"></div>
  <div class="row" style="gap:60px">
    <div style="flex:1"><div class="big" style="font-size:150px;color:{LEAF}">2 in 3</div>
      <div style="font-size:42px;color:{FG};margin-top:22px;line-height:1.2">have no bank account</div></div>
    <div style="flex:1"><div class="big" style="font-size:150px;color:{LEAF}">1 in 3</div>
      <div style="font-size:42px;color:{FG};margin-top:22px;line-height:1.2">have no valid ID</div></div>
  </div>
  <div class="row" style="gap:36px;align-items:center;margin-top:64px">
    <div class="big" style="font-size:150px;color:{FG}">16%</div>
    <div style="font-size:42px;color:{FG};line-height:1.2">of Haiti's GDP is money sent home</div>
  </div>
</div>""")

# ---------------------------------------------------------------- left: who
W236 = 830
add("11-who", 10.5, 12.6, "solid", f"""
<div class="p cream" style="width:100%;height:100%;padding:90px 76px 70px;color:{NIGHT}">
  <h2 style="font-size:66px;color:{FOREST}">One community first, then the corridor.</h2>
  <div class="row" style="gap:34px;align-items:center;margin-top:62px">
    {person(FOREST, FOREST, 170)}
    <div><div style="font-size:40px;font-weight:700;color:{FOREST}">Senders · Montréal</div>
      <div class="big" style="font-size:130px;margin-top:8px">179,000</div>
      <div style="font-size:38px;margin-top:12px;line-height:1.2">Haitian-Canadians, 4 in 5 in Montréal</div></div>
  </div>
  <div class="row" style="gap:34px;align-items:center;margin-top:52px">
    {person(FOREST, GOLD, 170)}
    <div><div style="font-size:40px;font-weight:700;color:{FOREST}">Families · rural Haiti</div>
      <div style="font-size:54px;font-weight:700;margin-top:10px;line-height:1.1">No bank. No smartphone.</div>
      <div style="font-size:38px;margin-top:10px">Nord-Ouest, Nord and Sud</div></div>
  </div>
  <div style="margin-top:60px">
    <div style="height:96px;width:{W236}px;background:{NIGHT};border-radius:16px;display:flex;align-items:center;padding:0 26px;color:{FG};font-size:40px;font-weight:700">US$236M a year, Canada → Haiti</div>
    <div style="height:96px;width:{round(W236*159/236)}px;background:{LEAF};border-radius:16px;margin-top:12px;display:flex;align-items:center;padding:0 26px;font-size:40px;font-weight:700">US$159M to no account</div>
  </div>
  <div style="margin-top:44px;display:inline-block;background:{GOLD};color:{ONGOLD};border-radius:60px;padding:16px 34px;font-size:38px;font-weight:700">Direct to customer: the sender pays</div>
</div>""")

# ---------------------------------------------------------------- centre: the two things (requested)
def disc(n, rot, size=300):
    return f"""<div style="flex:none;width:{size}px;height:{size}px;border-radius:50%;background:{GOLD};
      transform:rotate({rot}deg);display:flex;align-items:center;justify-content:center;
      box-shadow:0 3px 0 rgba(0,0,0,.25),0 18px 30px rgba(0,0,0,.55),inset 0 0 0 3px rgba(255,255,255,.18)">
      <span class="big" style="font-size:{int(size*0.66)}px;color:{NIGHT};margin-top:{int(size*0.04)}px">{n}</span></div>"""

add("12-two-things", 16.5, 10.4, "solid", f"""
<div class="p night" style="width:100%;height:100%;padding:72px 84px">
  <h2 style="font-size:76px;white-space:nowrap">Two things we do <span style="color:{LEAF}">better than anyone.</span></h2>
  <div class="row" style="gap:64px;align-items:center;margin-top:70px">
    {disc(1, -6, 290)}
    <div><h3 style="font-size:78px">We reach people the remittance market couldn't.</h3>
      <div style="font-size:44px;color:{MUTED};margin-top:20px;line-height:1.25">No bank, no smartphone, no ID: a scratch card like the phone credit the corner shop already sells.</div></div>
  </div>
  <div class="row" style="gap:64px;align-items:center;margin-top:66px">
    {disc(2, 5, 290)}
    <div><h3 style="font-size:78px">Cheaper and faster than any other way to get them cash.</h3>
      <div style="font-size:44px;color:{MUTED};margin-top:20px;line-height:1.25"><b style="color:{GOLD}">2.95%</b> all in, against 8.55% at a cash agent. Paid out about 5 seconds after the code.</div></div>
  </div>
</div>""")

for n, rot in ((1, -6), (2, 5)):
    add(f"13-disc-{n}", 3.3, 3.3, "cut", f"""
<div style="width:100%;height:100%;border-radius:50%;background:{GOLD};display:flex;align-items:center;justify-content:center">
  <span class="big" style="font-size:215px;color:{NIGHT};margin-top:12px">{n}</span></div>""")

# ---------------------------------------------------------------- centre: how it works
ICON_PHONE = f"""<svg width="230" height="230" viewBox="0 0 100 100"><rect x="28" y="6" width="44" height="88" rx="9" fill="none" stroke="{LEAF}" stroke-width="5"/>
<rect x="36" y="30" width="28" height="14" rx="3" fill="{GOLD}"/><rect x="36" y="52" width="28" height="6" rx="3" fill="{MUTED}"/><rect x="36" y="64" width="20" height="6" rx="3" fill="{MUTED}"/><rect x="36" y="78" width="28" height="9" rx="4.5" fill="{LEAF}"/></svg>"""
ICON_VAULT = f"""<svg width="230" height="230" viewBox="0 0 100 100"><rect x="14" y="40" width="72" height="52" rx="10" fill="{TINT}"/>
<path d="M30 40 V28 a20 20 0 0 1 40 0 V40" fill="none" stroke="{TINT}" stroke-width="8"/>
<circle cx="50" cy="62" r="9" fill="{FOREST}"/><rect x="46" y="64" width="8" height="16" rx="3" fill="{FOREST}"/></svg>"""
ICON_SHOP = f"""<svg width="230" height="230" viewBox="0 0 100 100"><path d="M10 40 L20 14 H80 L90 40 Z" fill="{GOLD}"/>
<path d="M10 40 Q17 50 25 40 Q32 50 40 40 Q47 50 55 40 Q62 50 70 40 Q77 50 82 40 Q86 50 90 40" fill="{GOLD}"/>
<rect x="16" y="46" width="68" height="46" rx="4" fill="{FOREST}"/><rect x="40" y="60" width="20" height="32" rx="3" fill="{CREAM}"/>
<rect x="22" y="56" width="12" height="12" rx="2" fill="{LEAF}"/><rect x="66" y="56" width="12" height="12" rx="2" fill="{LEAF}"/></svg>"""

STEPS = [
    ("14-step-send", "night", "Montréal", ICON_PHONE, "Jean sends C$200", "Firm quote. One flat C$1.49 fee.", GOLD, MUTED),
    ("15-step-stellar", "forest", "On Stellar", ICON_VAULT, "It waits under her card", "USDC held in a Soroban escrow.", GOLD, TINT),
    ("16-step-shop", "cream", "In Haiti", ICON_SHOP, "Odette scratches a code", "The boutik pays her cash and is paid back the same day.", FOREST, "#3d4f45"),
]
for pid, cls, kick, icon, title, line, kc, lc in STEPS:
    add(pid, 7.1, 8.3, "solid", f"""
<div class="p {cls}" style="width:100%;height:100%;padding:70px 64px">
  <div class="kick" style="color:{kc};font-size:38px">{kick}</div>
  <div style="margin:34px 0 26px -14px">{icon}</div>
  <h3 style="font-size:78px">{title}</h3>
  <div style="font-size:40px;color:{lc};margin-top:20px;line-height:1.25">{line}</div>
</div>""")

add("17-arrow", 1.7, 1.1, "cut", f"""
<svg width="100%" height="100%" viewBox="0 0 230 150"><path d="M8 52 H130 V10 L222 75 L130 140 V98 H8 Z" fill="{GOLD}" stroke="{ONGOLD}" stroke-width="0" stroke-linejoin="round"/></svg>""")

# ---------------------------------------------------------------- hero props
CODES = [("01", "9QRW 3TK7 M2HV", "used"), ("02", "J8D4 Z6XP 1NAE", "used"), ("03", "4F7K 2M9Q X8D1", "live"),
         ("04", "", "foil"), ("05", "", "foil"), ("06", "", "foil")]
rows = ""
for n, code, st in CODES:
    if st == "used":
        cell = f'<span style="color:#9aa89f;text-decoration:line-through;text-decoration-thickness:4px">{code}</span>'
    elif st == "live":
        cell = f'<span style="background:#cdebd8;color:{NIGHT};padding:2px 18px;border-radius:10px">{code}</span>'
    else:
        cell = '<span style="display:inline-block;width:590px;height:48px;border-radius:10px;background:repeating-linear-gradient(115deg,#b9c0bb 0 8px,#c9cfcb 8px 16px)"></span>'
    rows += f'<div class="row" style="gap:26px;align-items:center;height:70px"><span style="color:{FOREST};opacity:.75">{n}</span>{cell}</div>'
add("18-scratch-card", 8.4, 6.2, "cut", f"""
<div style="width:100%;height:100%;border-radius:44px;background:{CREAM};padding:46px 56px;font-family:'SF Mono',ui-monospace,Menlo,monospace;font-weight:700;font-size:50px;border:3px solid #e8dcc2">
  <div class="row" style="align-items:center;gap:22px;margin-bottom:22px">{mark('#000', '#000', 84)}
    <span style="font-family:Satoshi;letter-spacing:.1em;color:{FOREST};font-size:43px;white-space:nowrap">TRANSEND · TS4F2K9Q</span></div>
  {rows}
</div>""")

add("19-shop-phone", 3.7, 7.4, "cut", f"""
<div style="width:100%;height:100%;border-radius:64px;background:#1d2a23;padding:16px">
 <div style="width:100%;height:100%;border-radius:50px;background:{NIGHT};color:{FG};padding:60px 30px 34px;display:flex;flex-direction:column;align-items:center">
  <div style="width:120px;height:120px;border-radius:50%;background:{LEAF};display:flex;align-items:center;justify-content:center">
    <svg width="66" height="66" viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="{NIGHT}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
  <div style="font-size:52px;font-weight:700;margin-top:26px">Approved</div>
  <div style="background:{CANOPY};border-radius:26px;width:100%;margin-top:34px;padding:30px 10px;text-align:center">
    <div style="font-size:34px;color:{MUTED}">Pay</div>
    <div class="big" style="font-size:78px;margin-top:10px">US$40</div></div>
  <div style="flex:1"></div>
  <div style="background:{LEAF};color:{NIGHT};border-radius:24px;width:100%;text-align:center;padding:24px 0;font-size:33px;font-weight:700;white-space:nowrap">Next customer</div>
 </div>
</div>""")

# ---------------------------------------------------------------- centre bottom: why Stellar
TILES = [("Soroban", "escrow: each code pays once"), ("0 XLM", "fees sponsored for everyone"),
         ("~5 s", "to settle a payout in USDC"), ("US$100", "cap per withdrawal, plus a PIN")]
tiles = "".join(f"""<div style="flex:1;background:{CANOPY};border-radius:28px;padding:34px 26px">
  <div class="big" style="font-size:70px;color:{LEAF};white-space:nowrap">{a}</div>
  <div style="font-size:37px;color:{FG};margin-top:16px;line-height:1.2">{b}</div></div>""" for a, b in TILES)
add("20-why-stellar", 14.6, 6.3, "solid", f"""
<div class="p night" style="width:100%;height:100%;padding:62px 64px">
  <div class="kick" style="color:{GOLD};font-size:38px">Why Stellar</div>
  <h2 style="font-size:62px;margin-top:14px;white-space:nowrap">Six cents to move it, so the shop can earn.</h2>
  <div class="row" style="gap:20px;margin-top:40px">{tiles}</div>
</div>""")

def qr_block(label, key, px):
    return f"""<div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center">
  <div style="font-size:44px;font-weight:700;color:{FOREST};letter-spacing:-.02em;white-space:nowrap">{label}</div>
  <div style="width:{px}px;height:{px}px;margin-top:26px">{QR[key].replace('<svg ', f'<svg width="{px}" height="{px}" ')}</div></div>"""

add("21-qr", 8.4, 6.0, "cut", f"""
<div class="row" style="width:100%;height:100%;border-radius:48px;background:{CREAM};padding:50px 40px;gap:30px;border:4px solid #E3D3B0">
  {qr_block("Try it live", "try", 330)}
  <div style="width:3px;background:#e8dcc2"></div>
  {qr_block("See it on-chain", "proof", 330)}
</div>""")

# ---------------------------------------------------------------- right: gain
def gain_row(big, color, who, line, head):
    return f"""<div class="row" style="gap:30px;align-items:center;margin-top:40px">
  {person(FOREST, head, 140)}
  <div style="flex:1"><div style="font-size:38px;font-weight:700;color:{FOREST}">{who}</div>
   <div class="big" style="font-size:96px;color:{color};margin-top:8px;white-space:nowrap">{big}</div>
   <div style="font-size:36px;line-height:1.15;margin-top:8px">{line}</div></div></div>"""

add("23-gain", 10.5, 10.2, "solid", f"""
<div class="p cream" style="width:100%;height:100%;padding:84px 70px 60px">
  <h2 style="font-size:66px;color:{FOREST}">Everyone in the chain comes out ahead.</h2>
  {gain_row("C$135", NIGHT, "The family", "saved a year, no trip to town", GOLD)}
  {gain_row("C$2", NIGHT, "The shopkeeper", "per top-up, paid back same day", FOREST)}
  {gain_row("5 s", NIGHT, "The sender", "until “Odette has the money”", FOREST)}
</div>""")

# ---------------------------------------------------------------- right: partners
PARTNERS = [(GOLD, "Licensed Haitian payout partner", "Fonkoze or a transfer house holds the licence"),
            (LEAF, "MonCash agent shops", "the boutiks that pay out cash"),
            (TINT, "A Canadian anchor", "CAD to USDC; verifies every sender"),
            (FG, "Haitian groups in Montréal", "how senders first hear of us")]
plist = "".join(f"""<div class="row" style="gap:28px;margin-top:40px;align-items:flex-start">
  <div style="flex:none;width:40px;height:40px;border-radius:50%;background:{c};margin-top:8px"></div>
  <div><div style="font-size:46px;font-weight:700;line-height:1.1">{a}</div>
  <div style="font-size:36px;color:{MUTED};margin-top:8px;line-height:1.2">{b}</div></div></div>""" for c, a, b in PARTNERS)
add("24-partners", 10.5, 8.9, "solid", f"""
<div class="p night" style="width:100%;height:100%;padding:84px 70px 60px">
  <h2 style="font-size:70px">Who we build with.</h2>
  {plist}
</div>""")

# ---------------------------------------------------------------- right: how it pays
add("25-pays", 10.5, 8.9, "solid", f"""
<div class="p leaf" style="width:100%;height:100%;padding:84px 70px 60px">
  <h2 style="font-size:64px">Every top-up pays for itself.</h2>
  <div class="big" style="font-size:170px;margin-top:44px">C$1.27</div>
  <div style="font-size:40px;line-height:1.2;margin-top:18px">kept per C$200 top-up after the shop's C$2</div>
  <div style="height:4px;background:{NIGHT};opacity:.2;margin:40px 0 36px"></div>
  <div class="row" style="gap:46px">
    <div style="flex:1"><div class="big" style="font-size:92px;white-space:nowrap">3,145</div>
      <div style="font-size:38px;margin-top:14px;line-height:1.2">top-ups a month to break even: 2.3% of the corridor</div></div>
    <div style="flex:1"><div class="big" style="font-size:92px;white-space:nowrap">Month 22</div>
      <div style="font-size:38px;margin-top:14px;line-height:1.2">in the black at 12% monthly growth</div></div>
  </div>
</div>""")

add("26-pilot", 4.2, 4.2, "cut", f"""
<div style="width:100%;height:100%;border-radius:50%;background:{GOLD};color:{ONGOLD};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
  <div class="kick" style="font-size:38px;color:{ONGOLD}">Next</div>
  <div class="big" style="font-size:94px;color:{NIGHT};margin-top:10px">10 shops</div>
  <div style="font-size:38px;font-weight:700;margin-top:16px;line-height:1.2">Nord-Ouest pilot<br>3 months</div>
</div>""")


# ================================================================ charts (Devpost style, poster scale)
# These replace the text cards with the same ids. Inline SVG, so lines stay sharp at 300 dpi.
INCUMBENT = "#6E8478"
GRID = "#24402F"


def frame(kick, head, body, cls="night", pad="72px 72px 64px", kc=None):
    kc = kc or GOLD
    return f"""<div class="p {cls}" style="width:100%;height:100%;padding:{pad}">
  <div class="kick" style="color:{kc}">{kick}</div>
  <h2 style="font-size:64px;margin-top:16px">{head}</h2>
  {body}
</div>"""


# ---------------------------------------------------------------- 10: cost bars
def cost_chart():
    W, rowh = 864, 146
    rows = [("Western Union", "cash at an agent", 9.06, INCUMBENT), ("CAM", "cash at an agent", 8.55, INCUMBENT),
            ("Average", "all products", 5.78, INCUMBENT), ("Ria", "cash pickup", 4.45, INCUMBENT),
            ("Transend", "corner shop", 2.95, LEAF)]
    L, plot_w = 300, 410
    sx = lambda v: L + v / 10 * plot_w
    top = 64
    H = top + rowh * len(rows) + 56
    s = [f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Satoshi">']
    for g in range(0, 11, 2):
        x = sx(g)
        s.append(f'<line x1="{x}" y1="{top}" x2="{x}" y2="{H-56}" stroke="{GRID}" stroke-width="2"/>')
        s.append(f'<text x="{x}" y="{H-10}" fill="{MUTED}" font-size="32" text-anchor="middle">{g}%</text>')
    for i, (name, sub, v, col) in enumerate(rows):
        y = top + i * rowh + 20
        nc = LEAF if col == LEAF else FG
        s.append(f'<text x="{L-24}" y="{y+40}" fill="{nc}" font-size="40" font-weight="700" text-anchor="end">{name}</text>')
        s.append(f'<text x="{L-24}" y="{y+84}" fill="{MUTED}" font-size="32" text-anchor="end">{sub}</text>')
        s.append(f'<rect x="{L}" y="{y+8}" width="{sx(v)-L}" height="74" rx="10" fill="{col}"/>')
        s.append(f'<text x="{sx(v)+16}" y="{y+64}" fill="{FG}" font-size="44" font-weight="700">{v:.2f}%</text>')
    ux = sx(3)
    s.append(f'<line x1="{ux}" y1="{top-8}" x2="{ux}" y2="{H-56}" stroke="{GOLD}" stroke-width="4" stroke-dasharray="12 10"/>')
    s.append(f'<text x="{ux+14}" y="{top-18}" fill="{GOLD}" font-size="34" font-weight="700">UN target 3%</text>')
    s.append("</svg>")
    return "".join(s)


add("10-problem", 10.5, 12.4, "solid", frame(
    "What a family pays on C$200",
    f'A cash agent takes C$17.10. <span style="color:{LEAF}">We take C$5.89.</span>',
    f'<div style="margin-top:44px">{cost_chart()}</div>'))


# ---------------------------------------------------------------- 11: market squares
def squares():
    S = 380
    s159, s53 = S * (159 / 236) ** .5, S * (5.3 / 236) ** .5
    return f"""<svg width="{S}" height="{S}" viewBox="0 0 {S} {S}" font-family="Satoshi">
  <rect width="{S}" height="{S}" rx="22" fill="{FOREST}" opacity=".22"/>
  <rect y="{S-s159}" width="{s159}" height="{s159}" rx="20" fill="{FOREST}" opacity=".55"/>
  <rect y="{S-s53}" width="{s53}" height="{s53}" rx="10" fill="{GOLD}"/>
</svg>"""


def legend(sw, big, line, op=1):
    return f"""<div class="row" style="gap:22px;align-items:flex-start;margin-bottom:24px">
  <div style="flex:none;width:40px;height:40px;border-radius:9px;background:{sw};opacity:{op};margin-top:12px"></div>
  <div><div class="big" style="font-size:66px;color:{NIGHT}">{big}</div>
  <div style="font-size:34px;line-height:1.2;margin-top:8px">{line}</div></div></div>"""


add("11-who", 10.5, 12.6, "solid", frame(
    "Who we serve first · market size",
    "Canada sends Haiti US$236M a year.",
    f"""<div class="row" style="gap:40px;margin-top:40px;align-items:flex-end">
  {squares()}
  <div style="flex:1">{legend(FOREST, "US$236M", "a year, Canada to Haiti", .3)}{legend(FOREST, "US$159M", "to families with no account", .6)}{legend(GOLD, "US$5.3M", "us at break-even")}</div>
</div>
<div style="height:3px;background:#E3D3B0;margin:36px 0 32px"></div>
<div class="row" style="gap:40px">
  <div style="flex:1"><div style="font-size:36px;font-weight:700;color:{FOREST}">Senders · Montréal</div>
    <div class="big" style="font-size:96px;margin-top:10px">179,000</div>
    <div style="font-size:34px;margin-top:10px;line-height:1.2">Haitian-Canadians, 4 in 5 in Montréal</div></div>
  <div style="flex:1"><div style="font-size:36px;font-weight:700;color:{FOREST}">Families · rural Haiti</div>
    <div class="big" style="font-size:96px;margin-top:10px">2 in 3</div>
    <div style="font-size:34px;margin-top:10px;line-height:1.2">have no bank account; 1 in 3 no valid ID</div></div>
</div>
<div style="margin-top:32px;display:inline-block;background:{GOLD};color:{ONGOLD};border-radius:60px;padding:14px 32px;font-size:36px;font-weight:700">Direct to customer: the sender pays</div>""",
    cls="cream", kc=FOREST).replace('<h2 style="font-size:64px;', f'<h2 style="font-size:64px;color:{FOREST};'))


# ---------------------------------------------------------------- 23: waterfall
def waterfall():
    W, H = 864, 410
    top, base = 56, 330  # y of $6 and $0
    sy = lambda v: base - v / 6 * (base - top)
    steps = [("Fee", 1.49, "in"), ("FX", 4.40, "in"), ("Shop", -2.00, "shop"), ("Partner", -1.00, "cost"),
             ("Ramps", -1.10, "cost"), ("Other", -0.52, "cost"), ("Kept", 1.27, "kept")]
    colw = W / len(steps); bw = 92
    s = [f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Satoshi">']
    for g in range(0, 7, 2):
        s.append(f'<line x1="0" y1="{sy(g)}" x2="{W}" y2="{sy(g)}" stroke="{GRID}" stroke-width="2"/>')
    run = 0
    for i, (lab, v, kind) in enumerate(steps):
        cx = colw * i + colw / 2
        if kind == "kept":
            a, b = 0, v
        else:
            a, b = run, run + v
            run = b
        y1, y2 = sy(max(a, b)), sy(min(a, b))
        col = {"in": TINT, "shop": GOLD, "cost": INCUMBENT, "kept": LEAF}[kind]
        s.append(f'<rect x="{cx-bw/2}" y="{y1}" width="{bw}" height="{max(y2-y1,6)}" rx="8" fill="{col}"/>')
        val = (f"{v:.2f}" if v > 0 else f"−{-v:.2f}")
        s.append(f'<text x="{cx}" y="{y1-14}" fill="{FG}" font-size="34" font-weight="700" text-anchor="middle">{val}</text>')
        lc = {"shop": GOLD, "kept": LEAF}.get(kind, MUTED)
        s.append(f'<text x="{cx}" y="{base+56}" fill="{lc}" font-size="33" font-weight="{700 if kind in ("shop","kept") else 500}" text-anchor="middle">{lab}</text>')
    s.append(f'<line x1="0" y1="{base}" x2="{W}" y2="{base}" stroke="{MUTED}" stroke-width="2"/>')
    s.append("</svg>")
    return "".join(s)


add("23-gain", 10.5, 10.2, "solid", frame(
    "Where each top-up's fees go",
    f'<span style="color:{GOLD}">The shop earns C$2.00.</span> <span style="color:{LEAF}">We keep C$1.27.</span>',
    f"""<div style="margin-top:34px">{waterfall()}</div>
<div class="row" style="margin-top:26px;background:{CANOPY};border-radius:24px;padding:26px 30px;gap:26px;align-items:center">
  <div class="big" style="font-size:80px;color:{LEAF};white-space:nowrap">C$135</div>
  <div style="font-size:36px;line-height:1.2">a year saved by a family that sends C$200 a month, against a cash agent</div>
</div>"""))


# ---------------------------------------------------------------- 24: partners diagram
def pnode(title, sub, accent):
    return f"""<div style="background:#fff;border:4px solid {accent};border-radius:26px;padding:20px 24px">
  <div style="font-size:37px;font-weight:700;line-height:1.08;color:{NIGHT}">{title}</div>
  <div style="font-size:32px;line-height:1.2;margin-top:10px;color:#3d4f45">{sub}</div></div>"""


add("24-partners", 10.5, 8.9, "solid", frame(
    "Partners we launch with",
    "Who we build with.",
    f"""<div style="position:relative;margin-top:30px;height:560px">
  <svg width="864" height="560" style="position:absolute;left:0;top:0">
    <path d="M362 170 L432 300 M362 430 L432 300 M502 170 L432 300 M502 430 L432 300" stroke="{FOREST}" stroke-width="5" stroke-dasharray="4 12" stroke-linecap="round" fill="none"/>
  </svg>
  <div class="kick" style="position:absolute;left:0;top:0;color:{FOREST};font-size:32px">Canada</div>
  <div class="kick" style="position:absolute;right:0;top:0;color:{FOREST};font-size:32px">Haiti</div>
  <div style="position:absolute;left:0;top:56px;width:362px">{pnode("Canadian anchor", "CAD to USDC; checks every sender", LEAF)}</div>
  <div style="position:absolute;left:0;top:318px;width:362px">{pnode("Community groups", "where Montréal senders hear of us", LEAF)}</div>
  <div style="position:absolute;right:0;top:56px;width:362px">{pnode("Licensed payout partner", "Fonkoze or a transfer house", GOLD)}</div>
  <div style="position:absolute;right:0;top:318px;width:362px">{pnode("MonCash agent shops", "pay out cash, paid back same day", GOLD)}</div>
  <div style="position:absolute;left:372px;top:240px;width:120px;height:120px;border-radius:50%;background:{NIGHT};display:flex;align-items:center;justify-content:center">{mark(LEAF, GOLD, 84)}</div>
</div>""", cls="cream", kc=FOREST).replace('<h2 style="font-size:64px;', f'<h2 style="font-size:64px;color:{FOREST};'))


# ---------------------------------------------------------------- 25: 36-month curve
def curve():
    n, c, pts = 300.0, 0.0, []
    for m in range(1, 37):
        c += n * 1.27 - 4000; pts.append((m, c)); n *= 1.12
    W, H = 864, 468
    L, R, T, B = 130, 850, 46, 400
    sx = lambda m: L + (m - 1) / 35 * (R - L)
    sy = lambda v: T + (60000 - v) / 140000 * (B - T)  # +60k .. -80k
    s = [f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Satoshi">']
    for v in (40000, 0, -40000, -80000):
        s.append(f'<line x1="{L}" y1="{sy(v)}" x2="{R}" y2="{sy(v)}" stroke="{MUTED if v==0 else GRID}" stroke-width="2"/>')
        lab = "C$0" if v == 0 else (f"C${v//1000}k" if v > 0 else f"−C${-v//1000}k")
        s.append(f'<text x="{L-16}" y="{sy(v)+11}" fill="{MUTED}" font-size="32" text-anchor="end">{lab}</text>')
    line = " ".join(f"{sx(m):.1f},{sy(v):.1f}" for m, v in pts)
    neg = f"M{sx(1)},{sy(0)} " + " ".join(f"L{sx(m):.1f},{sy(min(v,0)):.1f}" for m, v in pts) + f" L{sx(36)},{sy(0)} Z"
    pos = f"M{sx(33.13)},{sy(0)} " + " ".join(f"L{sx(m):.1f},{sy(v):.1f}" for m, v in pts if m >= 34) + f" L{sx(36)},{sy(0)} Z"
    s.append(f'<path d="{neg}" fill="#3a2a1a"/><path d="{pos}" fill="#14432c"/>')
    x22 = sx(22)
    s.append(f'<line x1="{x22}" y1="{T}" x2="{x22}" y2="{B}" stroke="{GOLD}" stroke-width="4" stroke-dasharray="12 10"/>')
    s.append(f'<polyline points="{line}" fill="none" stroke="{LEAF}" stroke-width="7" stroke-linejoin="round"/>')
    for m, v in pts:
        if m in (21, 34, 36):
            s.append(f'<circle cx="{sx(m)}" cy="{sy(v)}" r="13" fill="{LEAF}" stroke="{NIGHT}" stroke-width="5"/>')
    s.append(f'<text x="{x22-16}" y="{sy(40000)+12}" fill="{GOLD}" font-size="34" font-weight="700" text-anchor="end">Month 22</text>')
    s.append(f'<text x="{sx(21)-26}" y="{sy(-53000)+50}" fill="{FG}" font-size="34" font-weight="700" text-anchor="end">Low: −C$53k</text>')
    s.append(f'<text x="{sx(36)}" y="{sy(40580)-26}" fill="{FG}" font-size="34" font-weight="700" text-anchor="end">+C$41k</text>')
    for m in (1, 12, 24, 36):
        s.append(f'<text x="{sx(m)}" y="{H-12}" fill="{MUTED}" font-size="32" text-anchor="{"end" if m==36 else "middle"}">Month {m}</text>')
    s.append("</svg>")
    return "".join(s)


add("25-pays", 10.5, 9.2, "solid", frame(
    "36 months, lean scenario",
    f'Profitable from <span style="color:{LEAF}">month 22.</span> Paid back by <span style="color:{LEAF}">month 34.</span>',
    f"""<div style="margin-top:34px">{curve()}</div>
<div style="margin-top:22px;font-size:36px;line-height:1.25;color:{FG}"><b style="color:{LEAF}">3,145</b> top-ups a month to break even: <b>2.3%</b> of the corridor</div>"""))


# ---------------------------------------------------------------- 20: architecture
def abox(title, sub, hl=False):
    border = f"4px solid {LEAF}" if hl else f"3px solid {GRID}"
    return f"""<div style="background:{CANOPY};border:{border};border-radius:22px;padding:20px 24px;margin-top:16px">
  <div style="font-size:38px;font-weight:700;line-height:1.05">{title}</div>
  <div style="font-size:32px;color:{MUTED};margin-top:8px;line-height:1.15">{sub}</div></div>"""


def acol(label, inner, w):
    return f"""<div style="width:{w}px;flex:none"><div class="kick" style="color:{GOLD};font-size:32px">{label}</div>{inner}</div>"""


ARROW = f"""<svg width="92" height="60" viewBox="0 0 92 60" style="margin-top:150px"><path d="M4 30 H72 M56 12 L80 30 L56 48" fill="none" stroke="{LEAF}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>"""

add("20-why-stellar", 14.6, 6.5, "solid", frame(
    "Architecture · on-chain vs off-chain",
    f'The contract holds the money. <span style="color:{LEAF}">Our API never does.</span>',
    f"""<div class="row" style="margin-top:34px;gap:18px;align-items:flex-start">
  {acol("People", abox("Sender app", "quote, send, Savings") + abox("Shop app", "code + her PIN"), 330)}
  {ARROW}
  {acol("Our API", abox("Verification", "PIN, area risk, cash ceiling", True) + abox("Fee sponsor", "nobody holds XLM"), 380)}
  {ARROW}
  {acol("On Stellar", abox("Soroban escrow", "each code pays once", True) + abox("USDC to the shop", "settles in about 5 s"), 360)}
</div>""", pad="62px 64px 56px").replace('<h2 style="font-size:64px;', '<h2 style="font-size:56px;white-space:nowrap;'))


# ---------------------------------------------------------------- render
only = set(sys.argv[2:])
manifest = []
for p in pieces:
    manifest.append({k: p[k] for k in ("id", "w", "h", "kind")})
    if only and p["id"] not in only:
        continue
    w, h = round(p["w"] * PX), round(p["h"] * PX)
    doc = f"""<!doctype html><html><head><meta charset="utf-8"><style>{BASE}
html,body{{width:{w}px;height:{h}px;overflow:hidden}} .root{{width:{w}px;height:{h}px}} {p['css']}</style></head>
<body><div class="root">{p['html']}</div></body></html>"""
    hp = os.path.join(HTML, p["id"] + ".html")
    open(hp, "w").write(doc)
    png = os.path.join(OUT, p["id"] + ".png")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    f"--force-device-scale-factor={DPI / PX}", f"--window-size={w},{h}",
                    "--default-background-color=00000000", "--virtual-time-budget=6000",
                    f"--screenshot={png}", "file://" + hp], capture_output=True)
    print("rendered", p["id"], p["w"], "x", p["h"], "in")
json.dump(manifest, open(os.path.join(HERE, "manifest.json"), "w"), indent=1)
