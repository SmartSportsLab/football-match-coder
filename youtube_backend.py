#!/usr/bin/env python3
"""Local backend for YouTube -> MP4 import in Football Match Coder."""

from __future__ import annotations

import json
import os
import re
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote


HOST = "127.0.0.1"
PORT = 8765
BASE_DIR = Path(__file__).resolve().parent
DOWNLOADS_DIR = BASE_DIR / "downloads"
DOWNLOADS_DIR.mkdir(exist_ok=True)


def sanitize_filename(name: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "_", (name or "").strip())
    return cleaned or "match-video"


def run_command(command: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(command, capture_output=True, text=True, cwd=BASE_DIR)


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, file_path: Path) -> None:
        if not file_path.exists() or not file_path.is_file():
            self.send_error(404, "File not found")
            return
        data = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "video/mp4")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send_json(200, {"ok": True})

    def do_GET(self) -> None:  # noqa: N802
        if self.path.startswith("/videos/"):
            file_name = unquote(self.path.replace("/videos/", "", 1))
            safe_name = os.path.basename(file_name)
            self._send_file(DOWNLOADS_DIR / safe_name)
            return
        self._send_json(404, {"ok": False, "error": "Unknown endpoint"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/download":
            self._send_json(404, {"ok": False, "error": "Unknown endpoint"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            url = (payload.get("url") or "").strip()
            filename = sanitize_filename(payload.get("filename") or "match-video")
            if not url:
                self._send_json(400, {"ok": False, "error": "URL is required"})
                return

            # Ensure yt-dlp exists, install if missing.
            check = run_command(["python3", "-m", "pip", "show", "yt-dlp"])
            if check.returncode != 0:
                install = run_command(["python3", "-m", "pip", "install", "--user", "yt-dlp"])
                if install.returncode != 0:
                    self._send_json(500, {"ok": False, "error": install.stderr or "Failed to install yt-dlp"})
                    return

            output_template = str(DOWNLOADS_DIR / f"{filename}.%(ext)s")
            cmd = [
                "python3",
                "-m",
                "yt_dlp",
                "-f",
                "bv*+ba/b",
                "--merge-output-format",
                "mp4",
                "-o",
                output_template,
                url,
            ]
            result = run_command(cmd)
            if result.returncode != 0:
                self._send_json(500, {"ok": False, "error": result.stderr or result.stdout or "Download failed"})
                return

            final_file = DOWNLOADS_DIR / f"{filename}.mp4"
            if not final_file.exists():
                candidates = sorted(DOWNLOADS_DIR.glob(f"{filename}*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)
                if not candidates:
                    self._send_json(500, {"ok": False, "error": "MP4 not found after download"})
                    return
                final_file = candidates[0]

            self._send_json(
                200,
                {
                    "ok": True,
                    "filename": final_file.name,
                    "videoUrl": f"http://{HOST}:{PORT}/videos/{final_file.name}",
                },
            )
        except Exception as exc:  # pylint: disable=broad-except
            self._send_json(500, {"ok": False, "error": str(exc)})


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"YouTube backend running on http://{HOST}:{PORT}")
    print(f"Downloads folder: {DOWNLOADS_DIR}")
    server.serve_forever()
