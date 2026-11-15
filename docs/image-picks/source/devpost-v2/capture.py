"""Capture the app screens in screens/ from a local dev server (npm run dev in web/).

Phone screens at 360 x 760, 3x; /ops at 1440 x 900, 2x. Uses the demo log-ins from the README.
The payout on the shop's PIN screen is stubbed in the browser, so a capture never spends a line
of the demo card. /admin/cash is behind ADMIN_PASSWORD: it was saved as HTML from a signed-in
browser and rendered the same way (route /admin/cash to the saved file).

usage: python capture.py <out dir> [base url]
needs: playwright (python -m playwright install chromium)
"""
import json, os, sys
from playwright.sync_api import sync_playwright

OUT = sys.argv[1]
BASE = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:3000"
os.makedirs(OUT, exist_ok=True)
HIDE_DEV = "nextjs-portal{display:none!important}"


def phone_ctx(b):
    ctx = b.new_context(viewport={"width": 360, "height": 760}, device_scale_factor=3,
                        reduced_motion="reduce", color_scheme="dark", service_workers="block")
    pg = ctx.new_page()
    pg.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');"
                       f"s.textContent='{HIDE_DEV}';document.head.appendChild(s)}})")
    return ctx, pg


def shot(pg, name):
    pg.wait_for_timeout(900)
    pg.screenshot(path=os.path.join(OUT, name + ".png"))
    print("saved", name)


with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])

    # sender: quote, card, pickup confirmation
    ctx, pg = phone_ctx(b)
    pg.goto(BASE + "/app/login")
    pg.fill("input[name=email]", "jean@transend.demo")
    pg.fill("input[name=password]", "transend-demo")
    pg.locator("form button[type=submit]").first.click()
    pg.wait_for_url("**/app", timeout=30000)
    pg.goto(BASE + "/app/cards/TS4F2K9Q"); pg.wait_for_load_state("networkidle")
    shot(pg, "sender-card")
    pg.goto(BASE + "/app/send"); pg.wait_for_load_state("networkidle")
    pg.locator("input[inputmode=decimal], input[name=amount]").first.fill("200")
    pg.locator("form button[type=submit]").first.click()  # fetches a quote; sending needs a second tap
    pg.wait_for_timeout(2500)
    shot(pg, "sender-quote")
    pg.goto(BASE + "/app/done?kind=pickup&card=TS4F2K9Q&usd=40"); pg.wait_for_load_state("networkidle")
    shot(pg, "sender-pickup")
    ctx.close()

    # shop: home, PIN hand-over, approved
    ctx, pg = phone_ctx(b)
    ctx.route(lambda u: "/api/redeem" in u, lambda route: route.fulfill(
        status=200, content_type="application/json",
        body=json.dumps({"ok": True, "payUsd": 40, "cardId": "TS4F2K9Q", "line": 3,
                         "at": "2026-11-15T19:14:00.000Z", "txHash": "0" * 64})))
    pg.goto(BASE + "/shop/login")
    pg.fill("input[name=code]", "S-101")
    pg.fill("input[name=password]", "transend-shop")
    pg.locator("form button[type=submit]").first.click()
    pg.wait_for_url("**/shop", timeout=30000); pg.wait_for_load_state("networkidle")
    shot(pg, "shop-home")
    pg.goto(BASE + "/shop/pay"); pg.wait_for_load_state("networkidle")
    pg.fill("input[name=card]", "TS4F2K9Q")
    pg.fill("input[name=line]", "3")
    pg.fill("input[name=code]", "4F7K2M9QX8D1")  # an example code, not one from the demo card
    pg.fill("input[name=amount]", "40")
    pg.locator("form button[type=submit]").first.click()
    pg.wait_for_url("**/shop/pay/pin", timeout=15000)
    for d in "12":
        pg.get_by_role("button", name=d, exact=True).click()
    shot(pg, "shop-pin")
    for d in "34":
        pg.get_by_role("button", name=d, exact=True).click()
    if pg.get_by_role("button", name="Done").count():
        pg.get_by_role("button", name="Done").first.click()
    pg.wait_for_url("**/shop/approved", timeout=15000)
    shot(pg, "shop-approved")
    ctx.close()

    # operations map: whole network, then one shop
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2, color_scheme="dark")
    pg = ctx.new_page()
    pg.goto(BASE + "/ops", wait_until="networkidle", timeout=60000)
    pg.add_style_tag(content=HIDE_DEV)
    pg.wait_for_timeout(8000)  # map tiles and terrain
    shot(pg, "ops-top")
    pg.get_by_text("Boutik Marie-Ange").first.click()
    pg.wait_for_timeout(7000)
    shot(pg, "ops-shop")
    b.close()
