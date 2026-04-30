"""
ZEN K AI - Local Development Server with NVIDIA API Proxy
Run:  python server.py
Then open:  http://localhost:7823
"""
import http.server
import json
import urllib.request
import urllib.error
import os

# ── Configuration ─────────────────────────────────────────────
NVIDIA_API_KEY = "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"
NVIDIA_URL     = "https://integrate.api.nvidia.com/v1/chat/completions"
PORT           = 7823
SERVE_DIR      = os.path.dirname(os.path.abspath(__file__))


class ZenKHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SERVE_DIR, **kwargs)

    # ── CORS headers on every response ──────────────────────────
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/nvidia":
            self._proxy_nvidia()
        else:
            self.send_error(404, "Not found")

    # ── Proxy POST to NVIDIA NIM ─────────────────────────────────
    def _proxy_nvidia(self):
        length = int(self.headers.get("Content-Length", 0))
        body   = self.rfile.read(length)

        try:
            req = urllib.request.Request(
                NVIDIA_URL,
                data=body,
                headers={
                    "Content-Type":  "application/json",
                    "Authorization": f"Bearer {NVIDIA_API_KEY}",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_body = resp.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._cors()
            self.end_headers()
            self.wfile.write(resp_body)

        except urllib.error.HTTPError as e:
            err_body = e.read()
            print(f"[NVIDIA {e.code}] {err_body[:300]}")
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self._cors()
            self.end_headers()
            self.wfile.write(err_body)

        except Exception as e:
            print(f"[PROXY ERROR] {e}")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self._cors()
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def log_message(self, fmt, *args):
        # Suppress noisy static-file logs, keep API calls visible
        if self.path.startswith("/api"):
            print(f"[API] {fmt % args}")


if __name__ == "__main__":
    with http.server.HTTPServer(("", PORT), ZenKHandler) as httpd:
        print(f"[OK] ZEN K AI running at http://localhost:{PORT}")
        print(f"[OK] NVIDIA proxy  at http://localhost:{PORT}/api/nvidia")
        print("     Press Ctrl+C to stop.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
