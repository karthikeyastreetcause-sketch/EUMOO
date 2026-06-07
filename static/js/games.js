document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("starGameCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const scoreEl = document.getElementById("starGameScore");
    const livesEl = document.getElementById("starGameLives");
    const bestScoreEl = document.getElementById("starGameBestScore");
    const overlay = document.getElementById("starGameOverlay");
    const overlayKicker = document.getElementById("starGameOverlayKicker");
    const overlayTitle = document.getElementById("starGameOverlayTitle");
    const overlayScore = document.getElementById("starGameOverlayScore");
    const restartBtn = document.getElementById("starGameRestart");
    const restartLabel = restartBtn.querySelector(".star-game-button-label");

    const game = {
        width: 400,
        height: 600,
        score: 0,
        bestScore: 0,
        lives: 3,
        running: false,
        frame: 0,
        speed: 2.2,
        spawnRate: 58,
        animationId: null,
        objects: [],
    };

    const player = {
        x: game.width / 2 - 32,
        y: game.height - 78,
        width: 64,
        height: 22,
        speed: 7.2,
        dx: 0,
    };

    const keys = {
        ArrowLeft: false,
        ArrowRight: false,
        a: false,
        d: false,
    };

    const touch = {
        left: false,
        right: false,
    };

    function resizeCanvas() {
        const ratio = window.devicePixelRatio || 1;
        canvas.width = game.width * ratio;
        canvas.height = game.height * ratio;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        if (!game.running) drawScene();
    }

    function syncHud() {
        scoreEl.textContent = game.score;
        livesEl.textContent = game.lives;
        if (bestScoreEl) bestScoreEl.textContent = game.bestScore;
    }

    function drawScene() {
        drawBackground();
        drawObjects();
        drawPlayer();
    }

    function drawBackground() {
        const sky = ctx.createLinearGradient(0, 0, 0, game.height);
        sky.addColorStop(0, "#151a42");
        sky.addColorStop(0.54, "#263063");
        sky.addColorStop(1, "#19233d");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, game.width, game.height);

        ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
        for (let i = 0; i < 34; i++) {
            const x = (i * 73 + game.frame * 0.08) % game.width;
            const y = (i * 47 + game.frame * 0.18) % game.height;
            const size = i % 4 === 0 ? 1.8 : 1.1;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawPlayer() {
        const basket = ctx.createLinearGradient(player.x, player.y - 16, player.x, player.y + player.height);
        basket.addColorStop(0, "#fff2a8");
        basket.addColorStop(1, "#f0b936");

        ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
        ctx.beginPath();
        ctx.ellipse(player.x + player.width / 2, player.y + 29, player.width * 0.52, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = basket;
        ctx.beginPath();
        ctx.roundRect(player.x, player.y - 10, player.width, player.height + 12, 9);
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y - 8, player.width * 0.38, Math.PI, 0);
        ctx.stroke();
    }

    function drawStar(x, y, size) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(game.frame * 0.025);
        ctx.fillStyle = "#ffe875";
        ctx.shadowColor = "rgba(255, 232, 117, 0.8)";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const radius = i % 2 === 0 ? size : size * 0.45;
            const angle = (i * Math.PI) / 5 - Math.PI / 2;
            const px = radius * Math.cos(angle);
            const py = radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawBomb(x, y, size) {
        ctx.fillStyle = "#ff5d6c";
        ctx.shadowColor = "rgba(255, 93, 108, 0.58)";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = "#ffd7dd";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y + 2);
        ctx.quadraticCurveTo(x + size / 2 + 8, y - 8, x + size / 2 + 16, y - 2);
        ctx.stroke();
    }

    function createObject() {
        const type = Math.random() < 0.72 ? "star" : "bomb";
        game.objects.push({
            x: Math.random() * (game.width - 34),
            y: -38,
            width: 34,
            height: 34,
            type,
        });
    }

    function updatePlayer() {
        player.dx = 0;
        if (keys.ArrowLeft || keys.a || touch.left) player.dx = -player.speed;
        if (keys.ArrowRight || keys.d || touch.right) player.dx = player.speed;

        player.x += player.dx;
        player.x = Math.max(0, Math.min(game.width - player.width, player.x));
    }

    function objectsOverlap(obj) {
        return obj.y + obj.height >= player.y &&
            obj.x + obj.width >= player.x &&
            obj.x <= player.x + player.width &&
            obj.y <= player.y + player.height;
    }

    function endGame() {
        game.running = false;
        game.bestScore = Math.max(game.bestScore, game.score);
        overlayKicker.textContent = "Game over";
        overlayTitle.textContent = "Final Score";
        overlayScore.textContent = String(game.score);
        restartLabel.textContent = "Play Again";
        syncHud();
        overlay.hidden = false;
        cancelAnimationFrame(game.animationId);
    }

    function updateObjects() {
        for (let i = game.objects.length - 1; i >= 0; i--) {
            const obj = game.objects[i];
            obj.y += game.speed;

            if (objectsOverlap(obj)) {
                if (obj.type === "star") {
                    game.score += 10;
                    if (game.score % 100 === 0) {
                        game.speed = Math.min(6, game.speed + 0.18);
                        game.spawnRate = Math.max(30, game.spawnRate - 3);
                    }
                } else {
                    game.lives -= 1;
                }
                game.objects.splice(i, 1);
                syncHud();
                if (game.lives <= 0) endGame();
                continue;
            }

            if (obj.y > game.height) {
                if (obj.type === "star") {
                    game.lives -= 1;
                    syncHud();
                    if (game.lives <= 0) endGame();
                }
                game.objects.splice(i, 1);
            }
        }
    }

    function drawObjects() {
        game.objects.forEach(function (obj) {
            if (obj.type === "star") drawStar(obj.x + obj.width / 2, obj.y + obj.height / 2, obj.width / 2);
            else drawBomb(obj.x, obj.y, obj.width);
        });
    }

    function loop() {
        if (!game.running) return;

        game.frame += 1;
        drawBackground();

        if (game.frame % game.spawnRate === 0) createObject();

        updatePlayer();
        updateObjects();
        drawObjects();
        drawPlayer();

        game.animationId = requestAnimationFrame(loop);
    }

    function startGame() {
        game.score = 0;
        game.lives = 3;
        game.running = true;
        game.frame = 0;
        game.speed = 2.2;
        game.spawnRate = 58;
        game.objects = [];
        player.x = game.width / 2 - player.width / 2;
        restartLabel.textContent = "Play Again";
        overlay.hidden = true;
        syncHud();
        cancelAnimationFrame(game.animationId);
        loop();
    }

    document.addEventListener("keydown", function (event) {
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        if (Object.prototype.hasOwnProperty.call(keys, key)) {
            keys[key] = true;
            event.preventDefault();
        }
    });

    document.addEventListener("keyup", function (event) {
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        if (Object.prototype.hasOwnProperty.call(keys, key)) {
            keys[key] = false;
            event.preventDefault();
        }
    });

    document.querySelectorAll(".touch-control").forEach(function (button) {
        const direction = button.dataset.direction;
        const setPressed = function (isPressed) {
            touch[direction] = isPressed;
        };

        button.addEventListener("pointerdown", function (event) {
            button.setPointerCapture(event.pointerId);
            setPressed(true);
        });
        button.addEventListener("pointerup", function () {
            setPressed(false);
        });
        button.addEventListener("pointercancel", function () {
            setPressed(false);
        });
        button.addEventListener("pointerleave", function () {
            setPressed(false);
        });
    });

    restartBtn.addEventListener("click", startGame);
    window.addEventListener("resize", resizeCanvas);

    resizeCanvas();
    syncHud();
    drawScene();
});
