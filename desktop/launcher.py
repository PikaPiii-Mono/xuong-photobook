# -*- coding: utf-8 -*-
"""Bo khoi chay Xuong-Photobook.exe.

App CHAY DOC LAP: moi thu nam trong file .exe, khong can may chu nao. Moi may la
mot "client" rieng — du lieu tu luu nam trong trinh duyet cua chinh may do,
album mang di dau cung duoc bang file .pbook.

  1. Neu app dang chay san -> chi mo them cua so, khong chay ban thu hai.
  2. Lay ban trang moi nhat dang co tren may (nhung trong .exe hoac da tai ve).
  3. CO MANG: uu tien hoi GitHub (repo public, khong can dang nhap) xem co ban
     moi khong. Mang nhanh -> mo app bang ban moi luon. Mang cham -> mo bang ban
     san co, tai ngam, xong thi trang hien nut "Cap nhat ngay".
     KHONG CO MANG: loi ket noi tra ve ngay, bo qua, mo app binh thuong.
  4. Phuc vu trang tai 127.0.0.1:<cong> va mo bang Edge che do app.

Cong phai ON DINH giua cac lan mo: bo nho dem (IndexedDB) cua trinh duyet gan
voi dia chi + cong, doi cong la album tu luu "bien mat". Cong da chon duoc ghi
vao %LOCALAPPDATA%/Xuong-Photobook/port.txt; cong bi chuong trinh khac giu thi
tu thu cong ke tiep va nho lai cong moi.

Tu tat khi khong con cua so nao gui tin hieu song trong 3 phut.
"""
import ctypes
import gzip
import io
import json
import os
import re
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

APP = "Xuong-Photobook"
DEFAULT_PORT = 4331
# Noi cap nhat: repo GitHub public. Doi hoac tat bang file Xuong-Photobook.cfg canh .exe:
#   {"nguon_cap_nhat": "https://..."}   hoac   {"tat_cap_nhat": true}
GITHUB_REPO = "PikaPiii-Mono/xuong-photobook"
UPDATE_SOURCE = "https://raw.githubusercontent.com/%s/main" % GITHUB_REPO
UPDATE_WAIT = 4.0         # cho toi da chung nay giay truoc khi mo app bang ban san co
IDLE_LIMIT = 180          # giay khong co tin hieu song thi tat
FIRST_WAIT = 300          # cho cua so dau tien toi da
VERSION_RE = re.compile(r"^\d{4}\.\d\d\.\d\d-\d{4}$")


def base_dir():
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def bundled(name):
    root = getattr(sys, "_MEIPASS", "")
    p = os.path.join(root, name)
    if not root or not os.path.isfile(p):          # chay thang file .py khi phat trien
        here = os.path.dirname(os.path.abspath(__file__))
        for cand in (os.path.join(os.path.dirname(here), name), os.path.join(here, name)):
            if os.path.isfile(cand):
                return cand
    return p


def cache_dir():
    d = os.path.join(os.environ.get("LOCALAPPDATA") or base_dir(), APP)
    os.makedirs(d, exist_ok=True)
    return d


def msg(text):
    try:
        ctypes.windll.user32.MessageBoxW(0, text, "Xuong Photobook", 0x40)
    except Exception:
        print(text)


def read_cfg():
    """File .cfg canh .exe la TUY CHON. Khong co thi dung GitHub lam nguon cap nhat."""
    path = os.path.join(base_dir(), APP + ".cfg")
    cfg = {}
    if os.path.isfile(path):
        try:
            with io.open(path, encoding="utf-8") as fh:
                cfg = json.load(fh)
        except Exception:
            cfg = {}
    src = "" if cfg.get("tat_cap_nhat") else str(cfg.get("nguon_cap_nhat") or UPDATE_SOURCE).strip().rstrip("/")
    try:
        port = int(cfg.get("cong_may") or 0)
    except Exception:
        port = 0
    return src, port


def saved_port():
    try:
        with io.open(os.path.join(cache_dir(), "port.txt"), encoding="utf-8") as fh:
            return int(fh.read().strip())
    except Exception:
        return DEFAULT_PORT


def remember_port(port):
    try:
        with io.open(os.path.join(cache_dir(), "port.txt"), "w", encoding="utf-8") as fh:
            fh.write(str(port))
    except Exception:
        pass


def version_of(html):
    m = re.search(r'<meta name="pb-version" content="([^"]+)"', html or "")
    return m.group(1) if m else ""


def read_text(path):
    try:
        with io.open(path, encoding="utf-8") as fh:
            return fh.read()
    except Exception:
        return ""


def local_page():
    """Ban moi nhat dang co tren may: nhung trong .exe hoac da tai ve truoc do."""
    best = read_text(bundled(APP + ".html"))
    cached = read_text(os.path.join(cache_dir(), "app.html"))
    if version_of(cached) > version_of(best):
        best = cached
    return best


def fetch(url, timeout):
    req = urllib.request.Request(url, headers={"User-Agent": APP, "Cache-Control": "no-cache", "Accept-Encoding": "gzip"})
    r = urllib.request.urlopen(req, timeout=timeout)
    data = r.read()
    if (r.headers.get("Content-Encoding") or "").lower() == "gzip":
        data = gzip.decompress(data)
    return data


FONTS_RE = re.compile(r"<!--PB:FONTS:BEGIN-->.*?<!--PB:FONTS:END-->", re.S)


def local_fonts():
    """Khoi phong chu nhung san trong .exe hoac ban cache; None neu ban tren may qua cu."""
    for src in (read_text(os.path.join(cache_dir(), "app.html")), read_text(bundled(APP + ".html"))):
        m = FONTS_RE.search(src)
        if m:
            return m.group(0)
    return None


def resolve_source(src):
    """raw.githubusercontent.com/.../main di qua CDN, day ban moi len co the 5 phut sau
    moi thay (them ?t= cung khong pha duoc). Nen hoi API lay commit moi nhat cua main
    roi doc file theo dung commit do — luon tuoi. API tu choi (may an danh chi duoc
    60 lan/gio) thi quay ve raw/main. Khong co mang thi loi URLError bay len -> offline."""
    if src != UPDATE_SOURCE:
        return src
    req = urllib.request.Request("https://api.github.com/repos/%s/commits/main" % GITHUB_REPO,
                                 headers={"User-Agent": APP, "Accept": "application/vnd.github.sha"})
    try:
        sha = urllib.request.urlopen(req, timeout=3).read().decode("ascii", "ignore").strip()
        if re.match(r"^[0-9a-f]{40}$", sha):
            return "https://raw.githubusercontent.com/%s/%s" % (GITHUB_REPO, sha)
    except urllib.error.HTTPError:
        pass
    return src


def check_update(src, current, upd):
    """Chay o luong rieng. upd["state"]: checking -> offline | latest | ready | error."""
    try:
        base = resolve_source(src)
        v = fetch("%s/version.txt?t=%d" % (base, int(time.time())), 3).decode("utf-8").strip()
    except Exception:
        upd["state"] = "offline"             # khong co mang / khong toi duoc GitHub: bo qua
        return
    src = base
    if not VERSION_RE.match(v) or v <= current:
        upd["state"] = "latest"
        return
    try:
        html, fonts = None, local_fonts()
        if fonts:                                # may da co phong chu: chi tai phan ma (~250 KB)
            try:
                core = fetch("%s/app-core.html?t=%d" % (src, int(time.time())), 90).decode("utf-8")
                if "<!--PB:FONTS-->" in core:
                    html = core.replace("<!--PB:FONTS-->", fonts, 1)
            except urllib.error.HTTPError:
                html = None
        if html is None:                         # khong co phong chu san / nguon chua co ban core
            html = fetch("%s/%s.html?t=%d" % (src, APP, int(time.time())), 120).decode("utf-8")
        if version_of(html) != v or len(html) < 50000:
            raise ValueError("ban tai ve khong hop le")
        with io.open(os.path.join(cache_dir(), "app.html"), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(html)
        upd["html"], upd["version"], upd["state"] = html, v, "ready"
    except Exception:
        upd["state"] = "error"


def find_browser():
    for base in (os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"),
                 os.environ.get("ProgramFiles", r"C:\Program Files"), os.environ.get("LOCALAPPDATA", "")):
        for rel in (r"Microsoft\Edge\Application\msedge.exe", r"Google\Chrome\Application\chrome.exe"):
            p = os.path.join(base, rel)
            if base and os.path.isfile(p):
                return p
    return None


def open_window(url):
    b = find_browser()
    if b:
        try:
            subprocess.Popen([b, "--app=" + url, "--window-size=1440,900"], close_fds=True)
            return
        except Exception:
            pass
    webbrowser.open(url)


def already_running(port):
    try:
        return urllib.request.urlopen("http://127.0.0.1:%d/__pb_ping" % port, timeout=0.6).read() == b"xuong-photobook"
    except Exception:
        return False


def main():
    src, fixed = read_cfg()
    port = fixed or saved_port()
    if already_running(port):
        open_window("http://127.0.0.1:%d/" % port)
        return
    html = local_page()
    upd = {"state": "checking" if src else "off", "version": version_of(html), "html": None}
    if src:
        t = threading.Thread(target=check_update, args=(src, version_of(html), upd), daemon=True)
        t.start()
        t.join(UPDATE_WAIT)                  # mang nhanh: dung luon ban moi ngay lan mo nay
    updated = upd["state"] == "ready"
    if updated:
        html = upd["html"]
    if not html:
        msg("Khong tim thay trang Xuong Photobook ben trong file .exe. Hay tai lai ban moi.")
        return
    try:
        with open(bundled("icon-192.png"), "rb") as fh:
            icon = fh.read()
    except Exception:
        icon = b""
    state = {"last": None, "start": time.time(), "page": b"", "version": version_of(html)}

    class H(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"
        timeout = 15

        def log_message(self, *a):
            pass

        def _send(self, code, body=b"", ctype="text/plain; charset=utf-8"):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)

        def do_GET(self):
            p = self.path.split("?")[0]
            if p in ("/", "/index.html"):
                state["last"] = time.time()
                return self._send(200, state["page"], "text/html; charset=utf-8")
            if p == "/__pb_ping":
                return self._send(200, b"xuong-photobook")
            if p == "/__pb_update":
                # Trang hoi: ban moi tai ngam xong chua? Xong thi lan tai lai trang se dung ban moi.
                if upd["state"] == "ready" and upd["html"] and upd["version"] != state["version"]:
                    state["page"] = make_page(upd["html"])
                    state["version"] = upd["version"]
                body = json.dumps({"state": upd["state"], "version": upd["version"], "serving": state["version"]})
                return self._send(200, body.encode("utf-8"), "application/json")
            if p in ("/icon-192.png", "/favicon.ico") and icon:
                return self._send(200, icon, "image/png")
            return self._send(404)

        do_HEAD = do_GET

        def do_POST(self):
            if self.path.split("?")[0] == "/__pb_alive":
                state["last"] = time.time()
                n = int(self.headers.get("Content-Length") or 0)
                if n:
                    self.rfile.read(n)
                return self._send(204)
            return self._send(404)

    class Srv(ThreadingHTTPServer):
        daemon_threads = True
        allow_reuse_address = False     # tren Windows, True cho phep hai tien trinh cung giu mot cong

    httpd = None
    for p in ([port] if fixed else range(port, port + 20)):
        try:
            httpd = Srv(("127.0.0.1", p), H)
            port = p
            break
        except OSError:
            continue
    if httpd is None:
        msg("Khong mo duoc cong %d tren may nay vi dang bi chuong trinh khac giu.\n"
            "Xoa dong \"cong_may\" trong file Xuong-Photobook.cfg (neu co) roi mo lai." % port)
        return
    if not fixed:
        remember_port(port)
    url = "http://127.0.0.1:%d/" % port

    def make_page(h):
        inject = "<script>window.PB_DESKTOP=%s;</script>" % json.dumps(
            {"port": port, "version": version_of(h), "source": src, "updated": updated, "update": upd["state"]})
        return h.replace("<body>", "<body>" + inject, 1).encode("utf-8")
    state["page"] = make_page(html)

    def watchdog():
        while True:
            time.sleep(10)
            now = time.time()
            last = state["last"]
            if (last is None and now - state["start"] > FIRST_WAIT) or (last is not None and now - last > IDLE_LIMIT):
                httpd.shutdown()
                return
    threading.Thread(target=watchdog, daemon=True).start()
    threading.Timer(0.3, lambda: open_window(url)).start()
    httpd.serve_forever()


if __name__ == "__main__":
    main()
