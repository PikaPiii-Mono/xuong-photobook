# -*- coding: utf-8 -*-
"""Dung Xuong Photobook tu src/.

    py build.py          Xuong-Photobook.html  (ban day du: phong chu nhung san, chay khong can mang)
                         build/artifact.html   (cung noi dung, khong co vo <html> — de dang len claude.ai)
    py build.py --exe    lam them dist/Xuong-Photobook.exe — app chay doc lap, khong can mang

    py build.py --publish         dung + day len GitHub -> moi may co mang tu nhan ban moi
    py build.py --exe --publish   nhu tren + tao ban phat hanh (Release) kem file .exe moi

Cap nhat di qua repo public PikaPiii-Mono/xuong-photobook: app doc version.txt va
Xuong-Photobook.html o nhanh main. Chi giao dien/tinh nang (file .html) tu cap nhat;
doi bo khoi chay (desktop/launcher.py) thi phai phat hanh .exe moi.
"""
import base64
import datetime
import io
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
FONTS = os.path.join(SRC, "fonts")
OUT_HTML = os.path.join(ROOT, "Xuong-Photobook.html")
BUILD = os.path.join(ROOT, "build")
APP = "Xuong-Photobook"

FONT_CSS_URL = ("https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700"
                "&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Dancing+Script:wght@400;600"
                "&family=Great+Vibes&family=IBM+Plex+Mono:wght@400;500&family=Montserrat:wght@300;400;600"
                "&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap")
KEEP_SUBSETS = {"latin", "latin-ext", "vietnamese"}
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"


def fetch_fonts():
    """Tai phong chu Google ve src/fonts mot lan; lan sau dung lai, khong can mang."""
    css_path = os.path.join(FONTS, "fonts.css")
    if os.path.isfile(css_path):
        return css_path
    os.makedirs(FONTS, exist_ok=True)
    print("  Tai phong chu ve src/fonts (chi lan dau)…")
    req = urllib.request.Request(FONT_CSS_URL, headers={"User-Agent": UA})
    css = urllib.request.urlopen(req, timeout=40).read().decode("utf-8")
    out = []
    for subset, block in re.findall(r"/\* ([\w-]+) \*/\s*(@font-face\s*\{[^}]*\})", css):
        if subset not in KEEP_SUBSETS:
            continue
        url = re.search(r"url\((https://[^)]+\.woff2)\)", block).group(1)
        fam = re.search(r"font-family:\s*'([^']+)'", block).group(1).replace(" ", "")
        sty = re.search(r"font-style:\s*(\w+)", block).group(1)
        wgt = re.search(r"font-weight:\s*([\d ]+);", block).group(1).replace(" ", "-")
        name = "%s-%s-%s-%s.woff2" % (fam, sty, wgt, subset)
        path = os.path.join(FONTS, name)
        if not os.path.isfile(path):
            data = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=40).read()
            with open(path, "wb") as fh:
                fh.write(data)
        out.append(block.replace(url, name))
    with io.open(css_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(out) + "\n")
    print("  %d mat phong chu" % len(out))
    return css_path


def fonts_style():
    css_path = fetch_fonts()
    with io.open(css_path, encoding="utf-8") as fh:
        css = fh.read()

    def embed(m):
        with open(os.path.join(FONTS, m.group(1)), "rb") as fh:
            return "url(data:font/woff2;base64,%s)" % base64.b64encode(fh.read()).decode("ascii")
    css = re.sub(r"url\(([\w.-]+\.woff2)\)", embed, css)
    return "<style>\n%s</style>" % css


def make_icon():
    """Ve icon app (o vuong mau mau nhan, dau cat goc + trang sach). Can Pillow."""
    ico = os.path.join(ROOT, "desktop", "app.ico")
    png = os.path.join(ROOT, "desktop", "icon-192.png")
    if os.path.isfile(ico) and os.path.isfile(png):
        return ico, png
    from PIL import Image, ImageDraw
    S = 512
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([16, 16, S - 16, S - 16], radius=110, fill=(184, 33, 95, 255))
    w = 22
    for (x, y, dx, dy) in [(118, 118, -1, -1), (394, 118, 1, -1), (118, 394, -1, 1), (394, 394, 1, 1)]:
        d.line([(x, y + dy * 20), (x, y + dy * 78)], fill="white", width=w)
        d.line([(x + dx * 20, y), (x + dx * 78, y)], fill="white", width=w)
    d.rectangle([150, 162, 362, 350], fill=(255, 255, 255, 255))
    d.rectangle([150, 162, 362, 350], outline=(255, 255, 255, 255), width=4)
    d.polygon([(158, 330), (222, 250), (262, 296), (300, 258), (354, 330)], fill=(184, 33, 95, 255))
    d.ellipse([292, 186, 330, 224], fill=(184, 33, 95, 255))
    for y in range(166, 348, 18):
        d.line([(256, y), (256, y + 9)], fill=(120, 87, 242, 255), width=5)
    im.resize((192, 192), Image.LANCZOS).save(png)
    im.save(ico, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    return ico, png


def build():
    version = datetime.datetime.now().strftime("%Y.%m.%d-%H%M")
    with io.open(os.path.join(SRC, "page.html"), encoding="utf-8") as fh:
        page = fh.read()
    page = page.replace("__PB_VERSION__", version)
    # Ban "core" giu nguyen cho trong phong chu: app .exe chi tai ban nay khi cap nhat
    # (~250 KB thay vi 1,8 MB) roi tu ghep phong chu san co trong may vao.
    core_page = page
    page = page.replace("<!--PB:FONTS-->", "<!--PB:FONTS:BEGIN-->%s<!--PB:FONTS:END-->" % fonts_style())
    js_dir = os.path.join(SRC, "js")
    parts = []
    for name in sorted(os.listdir(js_dir)):
        if name.endswith(".js"):
            with io.open(os.path.join(js_dir, name), encoding="utf-8") as fh:
                parts.append("/* ---- %s ---- */\n%s" % (name, fh.read()))
    js = "\n".join(parts)
    if shutil.which("node"):
        os.makedirs(BUILD, exist_ok=True)
        tmp = os.path.join(BUILD, "check.js")
        with io.open(tmp, "w", encoding="utf-8") as fh:
            fh.write(js)
        r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
        if r.returncode != 0:
            sys.exit("  LOI CU PHAP JS:\n" + r.stderr)
    body = "%s\n<script>\n%s\n</script>\n" % (page, js)
    _, png = make_icon()
    with open(png, "rb") as fh:
        icon = "data:image/png;base64," + base64.b64encode(fh.read()).decode("ascii")
    head = ('<!doctype html><html lang="vi"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1">'
            '<link rel="icon" href="%s"></head><body>\n' % icon)
    with io.open(OUT_HTML, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(head + body + "</body></html>\n")
    core_body = "%s\n<script>\n%s\n</script>\n" % (core_page, js)
    with io.open(os.path.join(ROOT, "app-core.html"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(head + core_body + "</body></html>\n")
    # Dat Xuong-Photobook.html + version.txt len bat ky trang web tinh nao (vd GitHub Pages)
    # roi dien dia chi do vao "nguon_cap_nhat" la cac may tu nhan ban moi.
    with io.open(os.path.join(ROOT, "version.txt"), "w", encoding="ascii", newline="\n") as fh:
        fh.write(version + "\n")
    os.makedirs(BUILD, exist_ok=True)
    with io.open(os.path.join(BUILD, "artifact.html"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(body)
    print("  OK  Xuong-Photobook.html  %.2f MB  phien ban %s" % (os.path.getsize(OUT_HTML) / 1048576.0, version))
    return version


def make_exe(version):
    out = os.path.join(ROOT, "dist")
    work = os.path.join(ROOT, "build-exe")
    # Tu don thay vi --clean: thu muc nam trong OneDrive, co luc bi giu file.
    for _ in range(3):
        if not os.path.isdir(work):
            break
        try:
            shutil.rmtree(work)
        except OSError:
            time.sleep(1.5)
    old = os.path.join(out, APP + ".exe")
    if os.path.isfile(old):
        subprocess.run(["taskkill", "/F", "/IM", APP + ".exe"], capture_output=True)
        for _ in range(3):
            try:
                os.remove(old)
                break
            except OSError:
                time.sleep(1.5)
    ico, png = make_icon()
    cmd = [sys.executable, "-m", "PyInstaller", "--noconfirm", "--onefile", "--windowed",
           "--name", APP, "--distpath", out, "--workpath", work, "--specpath", work,
           "--icon", ico,
           "--add-data", OUT_HTML + os.pathsep + ".",
           "--add-data", png + os.pathsep + ".",
           os.path.join(ROOT, "desktop", "launcher.py")]
    print("  Chay PyInstaller…")
    r = subprocess.run(cmd, cwd=ROOT)
    if r.returncode != 0:
        sys.exit("  PyInstaller loi — xem thong bao ben tren.")
    old_cfg = os.path.join(out, APP + ".cfg")
    if os.path.isfile(old_cfg):
        os.remove(old_cfg)          # app chay doc lap: khong con file cau hinh mac dinh
    exe = os.path.join(out, APP + ".exe")
    print("\n  OK  %s  (%.1f MB, phien ban %s)" % (exe, os.path.getsize(exe) / 1048576.0, version))
    print("      Chi mot file .exe la du, chep sang may nao cung chay.\n")


REPO = "PikaPiii-Mono/xuong-photobook"


def publish(version, with_exe):
    """Commit + push nhanh main; co --exe thi tao Release kem file .exe."""
    def git(*a):
        return subprocess.run(["git"] + list(a), cwd=ROOT, capture_output=True, text=True)
    git("add", "-A")
    c = git("commit", "-m", "Phien ban %s" % version)
    if c.returncode != 0 and "nothing to commit" not in (c.stdout + c.stderr):
        sys.exit("  git commit loi:\n" + c.stdout + c.stderr)
    p = git("push", "origin", "main")
    if p.returncode != 0:
        sys.exit("  git push loi:\n" + p.stderr)
    print("  Da day len GitHub — cac may co mang se nhan ban %s o lan mo app tiep theo." % version)
    if with_exe:
        exe = os.path.join(ROOT, "dist", APP + ".exe")
        notes = ("Tai **Xuong-Photobook.exe** ben duoi, nhap dup la chay — khong can cai dat.\n\n"
                 "App tu kiem tra ban moi tren GitHub moi lan mo (khi co mang).")
        r = subprocess.run(["gh", "release", "create", "v" + version, exe, "--repo", REPO,
                            "--title", "Xuong Photobook %s" % version, "--notes", notes], cwd=ROOT)
        if r.returncode != 0:
            sys.exit("  Tao Release loi — xem thong bao ben tren.")
        print("  Da tao Release v%s kem file .exe" % version)


if __name__ == "__main__":
    v = build()
    if "--exe" in sys.argv:
        make_exe(v)
    if "--publish" in sys.argv:
        publish(v, "--exe" in sys.argv)
