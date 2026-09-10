#!/usr/bin/env python3
"""开发服务器：禁用缓存，避免改代码后浏览器用旧文件"""
import http.server
import sys
import json
import os
import threading
from urllib.parse import urlparse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8931
BOARD_FILE = os.path.join(os.path.dirname(__file__), "leaderboard.json")
BOARD_LOCK = threading.Lock()

def read_board():
    try:
        with open(BOARD_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except (OSError, ValueError):
        return []

def write_board(rows):
    tmp = BOARD_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
    os.replace(tmp, BOARD_FILE)


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def _json(self, status, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if urlparse(self.path).path == "/api/leaderboard":
            with BOARD_LOCK:
                rows = sorted(read_board(), key=lambda x: (-int(x.get("score", 0)), x.get("username", "")))[:5]
            return self._json(200, rows)
        return super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/score":
            return self._json(404, {"error": "not found"})
        try:
            length = min(int(self.headers.get("Content-Length", "0")), 4096)
            body = json.loads(self.rfile.read(length) or b"{}")
            username = str(body.get("username", "")).strip()[:20]
            delta = max(0, min(100, int(body.get("delta", 1))))
            if not username or not delta:
                return self._json(400, {"error": "invalid score"})
        except (ValueError, TypeError, json.JSONDecodeError):
            return self._json(400, {"error": "invalid json"})
        with BOARD_LOCK:
            rows = read_board()
            row = next((x for x in rows if x.get("username") == username), None)
            if row is None:
                row = {"username": username, "score": 0}
                rows.append(row)
            row["score"] = int(row.get("score", 0)) + delta
            write_board(rows)
        return self._json(200, row)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    http.server.ThreadingHTTPServer(("0.0.0.0", PORT), NoCacheHandler).serve_forever()
