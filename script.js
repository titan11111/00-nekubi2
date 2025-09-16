// ゲーム変数
let canvas, ctx;
let gameState = 'waiting'; // 'waiting', 'playing', 'gameover'
let score = 0;
let balls = 3;
let animationId;

// ボール
let ball = {
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    radius: 8,
    color: '#f39c12'
};

// フリッパー
let flippers = {
    left: {
        x: 120,
        y: 520,
        angle: -0.3,
        targetAngle: -0.3,
        width: 60,
        height: 8,
        color: '#e74c3c'
    },
    right: {
        x: 280,
        y: 520,
        angle: 0.3,
        targetAngle: 0.3,
        width: 60,
        height: 8,
        color: '#27ae60'
    }
};

// ターゲット（得点アイテム）
let targets = [];

// パーティクル効果
let particles = [];

// ゲーム初期化
function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // キャンバスサイズ設定
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // ターゲット作成
    createTargets();
    
    // イベントリスナー設定
    setupEventListeners();
    
    // ゲームループ開始
    gameLoop();
}

function resizeCanvas() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth - 40; // padding考慮
    canvas.width = containerWidth;
    canvas.height = canvas.offsetHeight;
    
    // ゲーム要素の位置を画面サイズに合わせて調整
    adjustGameElements();
}

function adjustGameElements() {
    const scale = canvas.width / 400; // 基準幅400pxでスケール計算
    
    // フリッパーの位置調整
    flippers.left.x = 120 * scale;
    flippers.left.y = canvas.height - 80;
    flippers.right.x = (canvas.width - 120 * scale);
    flippers.right.y = canvas.height - 80;
    
    // ボールの初期位置
    resetBall();
}

function createTargets() {
    targets = [];
    const colors = ['#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c'];
    
    // 上部のターゲット
    for (let i = 0; i < 5; i++) {
        targets.push({
            x: 50 + i * 60,
            y: 100,
            radius: 15,
            color: colors[i],
            points: 100,
            active: true
        });
    }
    
    // 中央のターゲット
    for (let i = 0; i < 3; i++) {
        targets.push({
            x: 100 + i * 80,
            y: 200,
            radius: 20,
            color: colors[i % colors.length],
            points: 200,
            active: true
        });
    }
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 150;
    ball.dx = (Math.random() - 0.5) * 4;
    ball.dy = -8;
}

function setupEventListeners() {
    // スタートボタン
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('resetBtn').addEventListener('click', resetGame);
    
    // キーボード操作
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // タッチ操作
    document.getElementById('leftFlipper').addEventListener('touchstart', (e) => {
        e.preventDefault();
        activateLeftFlipper();
    });
    
    document.getElementById('leftFlipper').addEventListener('touchend', (e) => {
        e.preventDefault();
        deactivateLeftFlipper();
    });
    
    document.getElementById('rightFlipper').addEventListener('touchstart', (e) => {
        e.preventDefault();
        activateRightFlipper();
    });
    
    document.getElementById('rightFlipper').addEventListener('touchend', (e) => {
        e.preventDefault();
        deactivateRightFlipper();
    });
    
    // マウス操作（PC用）
    document.getElementById('leftFlipper').addEventListener('mousedown', activateLeftFlipper);
    document.getElementById('leftFlipper').addEventListener('mouseup', deactivateLeftFlipper);
    document.getElementById('rightFlipper').addEventListener('mousedown', activateRightFlipper);
    document.getElementById('rightFlipper').addEventListener('mouseup', deactivateRightFlipper);
}

function handleKeyDown(event) {
    if (gameState !== 'playing') return;
    
    switch(event.code) {
        case 'KeyA':
        case 'ArrowLeft':
            activateLeftFlipper();
            break;
        case 'KeyD':
        case 'ArrowRight':
            activateRightFlipper();
            break;
    }
}

function handleKeyUp(event) {
    if (gameState !== 'playing') return;
    
    switch(event.code) {
        case 'KeyA':
        case 'ArrowLeft':
            deactivateLeftFlipper();
            break;
        case 'KeyD':
        case 'ArrowRight':
            deactivateRightFlipper();
            break;
    }
}

function activateLeftFlipper() {
    if (gameState === 'playing') {
        flippers.left.targetAngle = -0.8;
    }
}

function deactivateLeftFlipper() {
    if (gameState === 'playing') {
        flippers.left.targetAngle = -0.3;
    }
}

function activateRightFlipper() {
    if (gameState === 'playing') {
        flippers.right.targetAngle = 0.8;
    }
}

function deactivateRightFlipper() {
    if (gameState === 'playing') {
        flippers.right.targetAngle = 0.3;
    }
}

function startGame() {
    gameState = 'playing';
    resetBall();
    document.getElementById('startBtn').style.display = 'none';
}

function resetGame() {
    gameState = 'waiting';
    score = 0;
    balls = 3;
    createTargets();
    particles = [];
    updateUI();
    document.getElementById('startBtn').style.display = 'inline-block';
}

function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('balls').textContent = balls;
}

function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

function update() {
    if (gameState !== 'playing') return;
    
    // ボール移動
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    // 重力
    ball.dy += 0.2;
    
    // 壁との衝突
    if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
        ball.dx = -ball.dx * 0.8;
        ball.x = Math.max(ball.radius, Math.min(canvas.width - ball.radius, ball.x));
    }
    
    if (ball.y - ball.radius < 0) {
        ball.dy = -ball.dy * 0.8;
        ball.y = ball.radius;
    }
    
    // ボールが下に落ちた場合
    if (ball.y > canvas.height + 50) {
        balls--;
        if (balls > 0) {
            resetBall();
        } else {
            gameState = 'gameover';
            setTimeout(() => {
                alert('ゲームオーバー！スコア: ' + score);
                resetGame();
            }, 500);
        }
        updateUI();
    }
    
    // フリッパーの角度更新
    flippers.left.angle += (flippers.left.targetAngle - flippers.left.angle) * 0.3;
    flippers.right.angle += (flippers.right.targetAngle - flippers.right.angle) * 0.3;
    
    // フリッパーとの衝突判定
    checkFlipperCollision(flippers.left);
    checkFlipperCollision(flippers.right);
    
    // ターゲットとの衝突判定
    targets.forEach((target, index) => {
        if (target.active && checkTargetCollision(target)) {
            target.active = false;
            score += target.points;
            updateUI();
            
            // パーティクル効果
            createParticles(target.x, target.y, target.color);
            
            // すべてのターゲットを破壊したら新しいターゲットを作成
            if (targets.every(t => !t.active)) {
                setTimeout(() => {
                    createTargets();
                    score += 500; // ボーナス
                    updateUI();
                }, 1000);
            }
        }
    });
    
    // パーティクル更新
    updateParticles();
}

function checkFlipperCollision(flipper) {
    const cos = Math.cos(flipper.angle);
    const sin = Math.sin(flipper.angle);
    
    // フリッパーの端点
    const x1 = flipper.x;
    const y1 = flipper.y;
    const x2 = flipper.x + flipper.width * cos;
    const y2 = flipper.y + flipper.width * sin;
    
    // ボールとフリッパーの距離計算
    const dx = ball.x - flipper.x;
    const dy = ball.y - flipper.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < flipper.width && distance < ball.radius + flipper.height) {
        // 衝突処理
        const normalX = -sin;
        const normalY = cos;
        const dotProduct = ball.dx * normalX + ball.dy * normalY;
        
        ball.dx -= 2 * dotProduct * normalX;
        ball.dy -= 2 * dotProduct * normalY;
        
        // フリッパーの力を加える
        const flipperSpeed = Math.abs(flipper.targetAngle - flipper.angle) * 20;
        ball.dx += normalX * flipperSpeed;
        ball.dy += normalY * flipperSpeed;
        
        // 速度制限
        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        if (speed > 15) {
            ball.dx = (ball.dx / speed) * 15;
            ball.dy = (ball.dy / speed) * 15;
        }
    }
}

function checkTargetCollision(target) {
    const dx = ball.x - target.x;
    const dy = ball.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < ball.radius + target.radius) {
        // 反発
        const angle = Math.atan2(dy, dx);
        ball.dx = Math.cos(angle) * 8;
        ball.dy = Math.sin(angle) * 8;
        return true;
    }
    return false;
}

function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 10,
            dy: (Math.random() - 0.5) * 10,
            color: color,
            life: 1.0
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.dy += 0.3; // 重力
        particle.life -= 0.02;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function draw() {
    // 画面クリア
    ctx.fillStyle = 'rgba(26, 26, 46, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 背景グラデーション
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(52, 73, 94, 0.1)');
    gradient.addColorStop(1, 'rgba(22, 33, 62, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // ターゲット描画
    targets.forEach(target => {
        if (target.active) {
            ctx.fillStyle = target.color;
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // 点数表示
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(target.points, target.x, target.y + 4);
        }
    });
    
    // フリッパー描画
    drawFlipper(flippers.left);
    drawFlipper(flippers.right);
    
    // ボール描画
    if (gameState === 'playing') {
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // ボールの光る効果
        const ballGradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius);
        ballGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        ballGradient.addColorStop(1, ball.color);
        ctx.fillStyle = ballGradient;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // パーティクル描画
    particles.forEach(particle => {
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1.0;
    
    // ゲーム状態表示
    if (gameState === 'waiting') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ゲーム開始ボタンを押してね！', canvas.width / 2, canvas.height / 2);
    }
}

function drawFlipper(flipper) {
    ctx.save();
    ctx.translate(flipper.x, flipper.y);
    ctx.rotate(flipper.angle);
    
    // フリッパー本体
    ctx.fillStyle = flipper.color;
    ctx.fillRect(0, -flipper.height / 2, flipper.width, flipper.height);
    
    // フリッパーのハイライト
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(0, -flipper.height / 2, flipper.width, flipper.height / 2);
    
    ctx.restore();
}

// ゲーム開始
window.addEventListener('load', initGame);
