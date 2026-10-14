import pytest

import app as snake_app


@pytest.fixture
def client():
    snake_app.app.config["TESTING"] = True
    snake_app._scores.clear()
    with snake_app.app.test_client() as client:
        yield client


def test_index_serves_game(client):
    res = client.get("/")
    assert res.status_code == 200
    assert b"Flask Snake" in res.data
    assert b"game.js" in res.data


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.get_json()["status"] == "ok"


def test_version(client):
    res = client.get("/api/version")
    assert res.get_json()["version"] == snake_app.APP_VERSION


def test_scores_start_empty(client):
    assert client.get("/api/scores").get_json() == []


def test_post_score_returns_sorted_leaderboard(client):
    client.post("/api/scores", json={"name": "Ishita", "score": 5})
    res = client.post("/api/scores", json={"name": "Jaydeep", "score": 12})
    assert res.status_code == 201
    assert [s["name"] for s in res.get_json()] == ["Jaydeep", "Ishita"]


def test_blank_name_becomes_anonymous(client):
    res = client.post("/api/scores", json={"name": "  ", "score": 3})
    assert res.get_json()[0]["name"] == "Anonymous"


def test_leaderboard_keeps_top_ten(client):
    for i in range(15):
        client.post("/api/scores", json={"name": f"p{i}", "score": i})
    scores = client.get("/api/scores").get_json()
    assert len(scores) == snake_app.MAX_SCORES
    assert scores[0]["score"] == 14


@pytest.mark.parametrize("bad", [None, -1, "10", 3.5, True])
def test_invalid_score_rejected(client, bad):
    res = client.post("/api/scores", json={"name": "Laksh", "score": bad})
    assert res.status_code == 400
