#!/usr/bin/env python3
"""开发服务器：禁用缓存，避免改代码后浏览器用旧文件"""
import http.server
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8931


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    http.server.ThreadingHTTPServer(("0.0.0.0", PORT), NoCacheHandler).serve_forever()
