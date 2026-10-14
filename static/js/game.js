// ---- Game settings: tweak these to demo a live update ----
const CONFIG = {
  gridSize: 20,        // cells per row/column
  startSpeedMs: 140,   // ms per tick at the start (lower = faster)
  minSpeedMs: 60,      // fastest the game can get
  speedUpEvery: 5,     // speed up after this many foods
  snakeColor: "#22c55e",
  headColor: "#86efac",
  foodColor: "#ef4444",
};

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const cell = canvas.width / CONFIG.gridSize;

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlay-text");
const scoresEl = document.getElementById("scores");
const playerInput = document.getElementById("player");

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const KEYS = {
  ArrowUp: "up", w: "up", W: "up",
  ArrowDown: "down", s: "down", S: "down",
  ArrowLeft: "left", a: "left", A: "left",
  ArrowRight: "right", d: "right", D: "right",
};

let snake, dir, nextDir, food, score, speed, timer, state; // state: ready | running | paused | over
let best = Number(localStorage.getItem("snake-best") || 0);
bestEl.textContent = best;
playerInput.value = localStorage.getItem("snake-name") || "";

function reset() {
  const mid = Math.floor(CONFIG.gridSize / 2);
  snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
  dir = nextDir = DIRS.right;
  score = 0;
  speed = CONFIG.startSpeedMs;
  scoreEl.textContent = 0;
  placeFood();
  draw();
}

function placeFood() {
  do {
    food = {
      x: Math.floor(Math.random() * CONFIG.gridSize),
      y: Math.floor(Math.random() * CONFIG.gridSize),
    };
  } while (snake.some((s) => s.x === food.x && s.y === food.y));
}

function tick() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  const hitWall = head.x < 0 || head.y < 0 || head.x >= CONFIG.gridSize || head.y >= CONFIG.gridSize;
  // The tail moves out of the way this tick, so it isn't a collision.
  const hitSelf = snake.slice(0, -1).some((s) => s.x === head.x && s.y === head.y);
  if (hitWall || hitSelf) return gameOver();

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = score;
    if (score % CONFIG.speedUpEvery === 0) {
      speed = Math.max(CONFIG.minSpeedMs, speed - 10);
      restartTimer();
    }
    placeFood();
  } else {
    snake.pop();
  }
  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = CONFIG.foodColor;
  ctx.beginPath();
  ctx.arc((food.x + 0.5) * cell, (food.y + 0.5) * cell, cell * 0.4, 0, Math.PI * 2);
  ctx.fill();

  snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? CONFIG.headColor : CONFIG.snakeColor;
    ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
  });
}

function restartTimer() {
  clearInterval(timer);
  timer = setInterval(tick, speed);
}

function start() {
  if (state === "over" || state === "ready") reset();
  state = "running";
  overlay.classList.add("hidden");
  restartTimer();
}

function pause() {
  state = "paused";
  clearInterval(timer);
  showOverlay("Paused<br>Press <kbd>Space</kbd> or tap to resume");
}

function gameOver() {
  state = "over";
  clearInterval(timer);
  if (score > best) {
    best = score;
    localStorage.setItem("snake-best", best);
    bestEl.textContent = best;
  }
  showOverlay(`Game over! Score: <strong>${score}</strong><br>Press <kbd>Space</kbd> or tap to play again`);
  if (score > 0) submitScore(score);
}

function showOverlay(html) {
  overlayText.innerHTML = html;
  overlay.classList.remove("hidden");
}

function togglePlay() {
  if (state === "running") pause();
  else start();
}

function turn(name) {
  const d = DIRS[name];
  // Ignore reversing straight into yourself.
  if (d.x === -dir.x && d.y === -dir.y) return;
  nextDir = d;
}

document.addEventListener("keydown", (e) => {
  if (e.target === playerInput) return;
  if (e.key === " ") {
    e.preventDefault();
    togglePlay();
  } else if (KEYS[e.key] && state === "running") {
    e.preventDefault();
    turn(KEYS[e.key]);
  }
});

overlay.addEventListener("click", togglePlay);
document.querySelectorAll(".touch-controls button").forEach((btn) =>
  btn.addEventListener("click", () => (state === "running" ? turn(btn.dataset.dir) : start()))
);
playerInput.addEventListener("change", () => localStorage.setItem("snake-name", playerInput.value.trim()));

// ---- Leaderboard (Flask API) ----
async function loadScores() {
  try {
    const res = await fetch("/api/scores");
    renderScores(await res.json());
  } catch (err) {
    console.error("Could not load scores", err);
  }
}

async function submitScore(value) {
  try {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: playerInput.value.trim(), score: value }),
    });
    if (res.ok) renderScores(await res.json());
  } catch (err) {
    console.error("Could not submit score", err);
  }
}

function renderScores(list) {
  scoresEl.replaceChildren();
  if (!list.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No scores yet";
    scoresEl.append(li);
    return;
  }
  list.forEach((s) => {
    const li = document.createElement("li");
    const name = document.createElement("span");
    const pts = document.createElement("strong");
    name.textContent = s.name;
    pts.textContent = s.score;
    li.append(name, pts);
    scoresEl.append(li);
  });
}

state = "ready";
reset();
loadScores();
