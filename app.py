"""Flask Snake - a browser game served by Flask, shipped in Docker, deployed on Render."""
import os
import threading
from datetime import datetime, timezone

from flask import Flask, jsonify, render_template, request

APP_VERSION = os.environ.get("APP_VERSION", "1.0.0")
MAX_SCORES = 10
MAX_NAME_LEN = 20

app = Flask(__name__)

# In-memory leaderboard: resets on every redeploy, which is fine for a demo.
_scores = []
_lock = threading.Lock()


@app.route("/")
def index():
    return render_template("index.html", version=APP_VERSION)


@app.route("/health")
def health():
    return jsonify(status="ok", version=APP_VERSION)


@app.route("/api/version")
def version():
    return jsonify(version=APP_VERSION)


@app.route("/api/scores", methods=["GET"])
def get_scores():
    with _lock:
        return jsonify(_scores)


@app.route("/api/scores", methods=["POST"])
def add_score():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()[:MAX_NAME_LEN] or "Anonymous"
    score = data.get("score")
    if not isinstance(score, int) or isinstance(score, bool) or score < 0:
        return jsonify(error="score must be a non-negative integer"), 400

    entry = {
        "name": name,
        "score": score,
        "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    with _lock:
        _scores.append(entry)
        _scores.sort(key=lambda s: s["score"], reverse=True)
        del _scores[MAX_SCORES:]
        top = list(_scores)
    return jsonify(top), 201


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)), debug=True)
