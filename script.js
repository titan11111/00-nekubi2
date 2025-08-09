// ゲーム状態管理
const gameState = {
    screen: 'title', // 'title', 'playing', 'gameover', 'clear'
    paused: false,
    score: 0,
    life: 3,
    currentFloor: 1,
    scrollY: 0,
    gameSpeed: 2,
    chakra: 3, // 忍術ポイント
    shurikenCount: 10,
    kunaiCount: 0,
    stealthMode: false,
    detectionLevel: 0,
    stealthBonus: 0,
    perfectStealth: true // 一度も発見されていないか
};

// キャンバス設定
let canvas;
let ctx;
let canvasWidth = 400;
let canvasHeight = 600;
let bgm;

// プレイヤー（忍者）
const player = {
    x: 200,
    y: 300,
    width: 48,
    height: 48,
    velocityX: 0,
    velocityY: 0,
    onGround: false,
    direction: 1, // 1: 右, -1: 左
    isJumping: false,
    isAttacking: false,
    isCrouching: false,
    isHiding: false,
    isInvisible: false,
    invulnerable: false,
    invulnerableTime: 0,
    clones: [], // 分身
    smokeTime: 0, // 煙玉効果時間
    invisibleTime: 0, // 透明術効果時間
    shadowBlend: false // 影に溶け込んでいるか
};

// 敵配列
let enemies = [];
let projectiles = []; // プレイヤーの手裏剣
let enemyProjectiles = []; // 敵の矢
let items = []; // アイテム
let shadows = []; // 影エリア
let hiddenDoors = []; // 隠し扉
let traps = []; // 罠
let spawnedFloors = new Set();

// 忍術定義
const ninjutsu = {
    BUNSHIN: { name: '分身の術', cost: 1, cooldown: 300 },
    SMOKE: { name: '煙玉', cost: 1, cooldown: 180 },
    INVISIBLE: { name: '透明術', cost: 2, cooldown: 600 }
};

let currentNinjutsu = 'BUNSHIN';
let ninjutsuCooldown = 0;
let lastNinjutsuSwitch = 0;
let currentWeapon = 'shuriken';
let lastWeaponSwitch = 0;

// フロア定義（各階の敵とアイテム）
const floors = [
    { y: 500, enemies: ['samurai'], items: ['scroll'], shadows: 2 },
    { y: 400, enemies: ['archer'], items: ['poison_shuriken', 'kunai_pack'], shadows: 2 },
    { y: 300, enemies: ['spearman'], items: ['smoke_bomb', 'kunai_pack'], shadows: 3 },
    { y: 200, enemies: ['shieldman'], items: ['chakra_pill'], shadows: 3 },
    { y: 100, enemies: ['lord'], items: [], shadows: 1 } // ボスフロア
];

const FLOOR_HEIGHT = 10;

// 入力管理
const keys = {};

// 音効果用AudioContext
let audioContext;

// ゲーム初期化
function initGame() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // AudioContext初期化
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('AudioContext not supported');
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    setupEventListeners();
    generateEnvironment();
    gameLoop();
}

// キャンバスサイズ調整
function resizeCanvas() {
    const container = document.getElementById('game-screen');
    const rect = container.getBoundingClientRect();
    
    canvasWidth = Math.min(rect.width, 400);
    canvasHeight = Math.min(rect.height - 160, 600); // UI分を除く
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // プレイヤー位置調整
    player.x = canvasWidth / 2 - player.width / 2;
    player.y = canvasHeight / 2 - player.height / 2;
}

// 環境生成（影、隠し扉、罠）
function generateEnvironment() {
    shadows = [];
    hiddenDoors = [];
    traps = [];
    
    floors.forEach((floor, index) => {
        // 影エリア生成
        for (let i = 0; i < floor.shadows; i++) {
            shadows.push({
                x: 50 + (i * 120) + Math.random() * 50,
                y: floor.y - 50,
                width: 60 + Math.random() * 40,
                height: 40,
                floor: index + 1
            });
        }
        
        // 隠し扉生成（上位階のみ）
        if (index >= 1) {
            hiddenDoors.push({
                x: 200 + Math.random() * 100,
                y: floor.y - 60,
                width: 40,
                height: 60,
                discovered: false,
                floor: index + 1
            });
        }
        
        // 罠生成（上位階のみ）
        if (index >= 2) {
            traps.push({
                x: 100 + Math.random() * 200,
                y: floor.y - 20,
                width: 30,
                height: 20,
                triggered: false,
                floor: index + 1
            });
        }
    });
}

// イベントリスナー設定
function setupEventListeners() {
    // 画面切り替えボタン
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('restart-button').addEventListener('click', restartGame);
    document.getElementById('play-again-button').addEventListener('click', restartGame);
    
    // キーボード操作
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // スマホコントローラー
    setupMobileControls();
    
    // 外部コントローラー対応
    window.addEventListener('message', handleExternalController);
}

// スマホコントローラー設定
function setupMobileControls() {
    const buttonMappings = {
        'btn-left': { press: () => keys.ArrowLeft = true, release: () => keys.ArrowLeft = false },
        'btn-right': { press: () => keys.ArrowRight = true, release: () => keys.ArrowRight = false },
        'btn-jump': { press: () => jumpPlayer(), release: null },
        'btn-attack': { press: () => attackPlayer(), release: null },
        'btn-ninjutsu': { press: () => useNinjutsu(), release: null },
        'btn-crouch': { press: () => toggleCrouch(), release: null },
        'btn-hide': { press: () => toggleHide(), release: null }
    };

    Object.entries(buttonMappings).forEach(([id, actions]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        
        // タッチイベント
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            actions.press();
        });
        
        if (actions.release) {
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                actions.release();
            });
            
            btn.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                actions.release();
            });
        }
        
        // マウスイベント（デスクトップ）
        btn.addEventListener('mousedown', actions.press);
        if (actions.release) {
            btn.addEventListener('mouseup', actions.release);
            btn.addEventListener('mouseleave', actions.release);
        }
    });
}

// 外部コントローラー対応
function handleExternalController(event) {
    const data = event.data;
    if (!data || data.type !== 'control') return;
    
    if (data.pressed) {
        if (data.code === 'ArrowLeft') keys.ArrowLeft = true;
        else if (data.code === 'ArrowRight') keys.ArrowRight = true;
        else if (data.code === 'ArrowUp') jumpPlayer();
        else if (data.code === 'KeyF') attackPlayer();
    } else {
        if (data.code === 'ArrowLeft') keys.ArrowLeft = false;
        else if (data.code === 'ArrowRight') keys.ArrowRight = false;
    }
}

// キーボード操作
function handleKeyDown(e) {
    keys[e.code] = true;
    
    if (e.code === 'Space') {
        e.preventDefault();
        jumpPlayer();
    }
    if (e.code === 'KeyX') attackPlayer();
    if (e.code === 'KeyZ') useNinjutsu();
    if (e.code === 'KeyC') toggleCrouch();
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') toggleHide();
    if (e.code === 'KeyQ' && Date.now() - lastNinjutsuSwitch > 500) {
        switchNinjutsu();
        lastNinjutsuSwitch = Date.now();
    }
    if (e.code === 'KeyW' && Date.now() - lastWeaponSwitch > 500) {
        switchWeapon();
        lastWeaponSwitch = Date.now();
    }
}

function handleKeyUp(e) {
    keys[e.code] = false;
}

// ゲーム開始
function startGame() {
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    resizeCanvas();

    // ゲーム状態リセット
    gameState.screen = 'playing';
    gameState.score = 0;
    gameState.life = 3;
    gameState.currentFloor = 1;
    gameState.scrollY = 0;
    gameState.chakra = 3;
    gameState.shurikenCount = 10;
    gameState.kunaiCount = 0;
    gameState.stealthBonus = 0;
    gameState.perfectStealth = true;
    gameState.detectionLevel = 0;

    currentWeapon = 'shuriken';

    // BGM再生
    if (bgm) {
        bgm.currentTime = 0;
        bgm.play().catch(e => console.log('BGM再生失敗:', e));
    }

    // プレイヤーと敵リセット
    resetPlayer();
    enemies = [];
    projectiles = [];
    enemyProjectiles = [];
    items = [];
    spawnedFloors = new Set();
    
    // 初期フロア生成
    spawnEntitiesForFloor(1);
    spawnedFloors.add(1);
    updateUI();
}

// ゲーム再開
function restartGame() {
    // 画面切り替え
    document.getElementById('gameover-screen').style.display = 'none';
    document.getElementById('clear-screen').style.display = 'none';
    document.getElementById('title-screen').style.display = 'block';
    document.getElementById('game-screen').style.display = 'none';

    gameState.screen = 'title';
    
    // データリセット
    enemies = [];
    projectiles = [];
    enemyProjectiles = [];
    items = [];
    spawnedFloors = new Set();

    // BGM停止
    if (bgm) {
        bgm.pause();
        bgm.currentTime = 0;
    }
}

// プレイヤーリセット
function resetPlayer() {
    player.x = canvasWidth / 2 - player.width / 2;
    player.y = canvasHeight / 2 - player.height / 2;
    player.velocityX = 0;
    player.velocityY = 0;
    player.onGround = false;
    player.invulnerable = false;
    player.invulnerableTime = 0;
    player.clones = [];
    player.smokeTime = 0;
    player.invisibleTime = 0;
    player.isInvisible = false;
    player.isHiding = false;
    player.isCrouching = false;
    player.shadowBlend = false;
    player.height = 48; // しゃがみ状態解除
}

// フロアのエンティティ生成
function spawnEntitiesForFloor(floorIndex) {
    spawnEnemiesForFloor(floorIndex);
    spawnItemsForFloor(floorIndex);
}

function spawnEnemiesForFloor(floorIndex) {
    const floor = floors[floorIndex - 1];
    if (!floor) return;
    
    floor.enemies.forEach((enemyType, index) => {
        const enemyHeight = enemyType === 'lord' ? 60 : 45;
        let health = 1;
        let speed = 0.5;
        let alertness = 1; // 警戒度
        
        // 敵タイプ別パラメータ
        switch(enemyType) {
            case 'samurai':
                speed = 1;
                alertness = 1.2;
                break;
            case 'spearman':
                speed = 1.2;
                alertness = 1.1;
                break;
            case 'shieldman':
                speed = 0.3;
                health = 2;
                alertness = 0.8;
                break;
            case 'archer':
                speed = 0.5;
                alertness = 1.5; // 弓兵は警戒心が高い
                break;
            case 'lord':
                speed = 0;
                health = 5;
                alertness = 0.5; // 殿は寝ているので警戒心が低い
                break;
        }

        const enemy = {
            type: enemyType,
            x: 50 + (index * 100) + Math.random() * 20,
            y: floor.y - enemyHeight,
            width: enemyType === 'lord' ? 80 : 45,
            height: enemyHeight,
            health: health,
            maxHealth: health,
            direction: Math.random() > 0.5 ? 1 : -1,
            speed: speed,
            baseSpeed: speed,
            alertLevel: 0, // 現在の警戒レベル
            alertness: alertness, // 警戒しやすさ
            shootTimer: Math.random() * 60,
            patrolLeft: 50 + (index * 100) - 50,
            patrolRight: 50 + (index * 100) + 50,
            lastSeen: { x: 0, y: 0 }, // プレイヤーを最後に見た位置
            awake: false, // 殿専用
            stunTime: 0 // 気絶時間
        };
        enemies.push(enemy);
    });
}

function spawnItemsForFloor(floorIndex) {
    const floor = floors[floorIndex - 1];
    if (!floor || !floor.items) return;
    
    floor.items.forEach((itemType, index) => {
        items.push({
            type: itemType,
            x: 80 + (index * 120) + Math.random() * 40,
            y: floor.y - 35,
            width: 25,
            height: 25,
            collected: false,
            shimmer: Math.random() * Math.PI * 2 // アニメーション用
        });
    });
}

// プレイヤー行動
function jumpPlayer() {
    if (gameState.screen !== 'playing') return;
    if (player.onGround && !player.isCrouching) {
        player.velocityY = -15;
        player.onGround = false;
        player.isJumping = true;
        playSound('jump');
        
        // ジャンプ音で敵に気づかれる可能性
        if (!player.isHiding && !player.isInvisible) {
            alertNearbyEnemies(player.x, player.y, 80, 0.3);
        }
    }
}

function attackPlayer() {
    if (gameState.screen !== 'playing' || player.isAttacking) return;

    if (currentWeapon === 'shuriken' && gameState.shurikenCount <= 0) return;
    if (currentWeapon === 'kunai' && gameState.kunaiCount <= 0) return;

    player.isAttacking = true;

    if (currentWeapon === 'shuriken') {
        gameState.shurikenCount--;
        projectiles.push({
            type: 'shuriken',
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            width: 20,
            height: 20,
            velocityX: player.direction * 8,
            velocityY: 0,
            spin: 0 // 回転角度
        });
    } else {
        gameState.kunaiCount--;
        projectiles.push({
            type: 'kunai',
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            width: 25,
            height: 5,
            velocityX: player.direction * 10,
            velocityY: 0,
            spin: 0
        });
    }

    playSound('attack');
    setTimeout(() => player.isAttacking = false, 300);
}

function useNinjutsu() {
    if (gameState.screen !== 'playing' || ninjutsuCooldown > 0) return;
    
    const jutsu = ninjutsu[currentNinjutsu];
    if (gameState.chakra < jutsu.cost) {
        playSound('error');
        return;
    }

    gameState.chakra -= jutsu.cost;
    ninjutsuCooldown = jutsu.cooldown;

    switch(currentNinjutsu) {
        case 'BUNSHIN':
            createClone();
            break;
        case 'SMOKE':
            useSmokeBomb();
            break;
        case 'INVISIBLE':
            becomeInvisible();
            break;
    }
    
    playSound('ninjutsu');
}

function createClone() {
    // 既存の分身を削除
    player.clones = [];
    
    // 新しい分身を2体作成
    player.clones.push({
        x: player.x - 60,
        y: player.y,
        life: 180,
        direction: -1,
        alpha: 0.7
    });
    player.clones.push({
        x: player.x + 60,
        y: player.y,
        life: 180,
        direction: 1,
        alpha: 0.7
    });
    
    // 分身が敵の注意をそらす
    enemies.forEach(enemy => {
        if (Math.random() < 0.6) {
            enemy.alertLevel = Math.max(0, enemy.alertLevel - 1);
        }
    });
}

function useSmokeBomb() {
    player.smokeTime = 120;
    
    // 煙で周囲の敵の警戒を下げる
    enemies.forEach(enemy => {
        const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (dist < 150) {
            enemy.alertLevel = Math.max(0, enemy.alertLevel - 2);
            enemy.stunTime = 60; // 短時間動きを止める
        }
    });
}

function becomeInvisible() {
    player.isInvisible = true;
    player.invisibleTime = 180;
    
    // 透明中は警戒レベルを下げる
    enemies.forEach(enemy => {
        enemy.alertLevel = Math.max(0, enemy.alertLevel - 1);
    });
}

function toggleCrouch() {
    if (player.isCrouching) {
        // 立ち上がる
        player.isCrouching = false;
        player.height = 48;
        player.y -= 24;
    } else {
        // しゃがむ
        player.isCrouching = true;
        player.height = 24;
        player.y += 24;
    }
}

function toggleHide() {
    if (isInShadow()) {
        player.isHiding = !player.isHiding;
        gameState.stealthMode = player.isHiding;
        player.shadowBlend = player.isHiding;
        
        if (player.isHiding) {
            playSound('hide');
        }
    } else {
        // 影にいない場合は隠れられない
        playSound('error');
    }
}

function switchNinjutsu() {
    const jutsuKeys = Object.keys(ninjutsu);
    const currentIndex = jutsuKeys.indexOf(currentNinjutsu);
    currentNinjutsu = jutsuKeys[(currentIndex + 1) % jutsuKeys.length];
    playSound('switch');
}

function switchWeapon() {
    const weapons = ['shuriken'];
    if (gameState.kunaiCount > 0) weapons.push('kunai');
    const currentIndex = weapons.indexOf(currentWeapon);
    currentWeapon = weapons[(currentIndex + 1) % weapons.length];
    playSound('switch');
    updateUI();
}

function isInShadow() {
    return shadows.some(shadow => 
        player.x < shadow.x + shadow.width &&
        player.x + player.width > shadow.x &&
        player.y < shadow.y + shadow.height &&
        player.y + player.height > shadow.y
    );
}

// 音効果再生
function playSound(type) {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch(type) {
        case 'jump':
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'attack':
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'ninjutsu':
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
        case 'hide':
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
        case 'switch':
            oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'error':
            oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
    }
}

// 近くの敵に警戒させる
function alertNearbyEnemies(x, y, radius, alertAmount) {
    enemies.forEach(enemy => {
        const dist = Math.hypot(enemy.x - x, enemy.y - y);
        if (dist < radius) {
            enemy.alertLevel = Math.min(5, enemy.alertLevel + alertAmount * enemy.alertness);
            enemy.lastSeen.x = x;
            enemy.lastSeen.y = y;
        }
    });
}

// ゲームループ
function gameLoop() {
    if (gameState.screen === 'playing' && !gameState.paused) {
        update();
        render();
    }
    requestAnimationFrame(gameLoop);
}

// ゲーム更新
function update() {
    updatePlayer();
    updateEnemies();
    updateProjectiles();
    updateItems();
    updateCollisions();
    updateGameProgress();
    updateNinjutsu();
    updateEnvironment();
}

// プレイヤー更新
function updatePlayer() {
    // 各種タイマー管理
    if (player.invulnerable) {
        player.invulnerableTime--;
        if (player.invulnerableTime <= 0) {
            player.invulnerable = false;
        }
    }

    // 忍術効果管理
    if (player.smokeTime > 0) player.smokeTime--;
    
    if (player.invisibleTime > 0) {
        player.invisibleTime--;
    } else {
        player.isInvisible = false;
    }

    // 分身管理
    player.clones = player.clones.filter(clone => {
        clone.life--;
        clone.alpha = Math.max(0.2, clone.life / 180 * 0.7);
        
        // 分身の簡単な移動
        clone.x += clone.direction * 0.5;
        
        return clone.life > 0;
    });
    
    // 移動速度計算
    let speed = 5;
    if (player.isCrouching) speed = 2;
    if (player.isHiding) speed = 1;
    if (player.isInvisible) speed = 3;

    // 左右移動
    if (keys.ArrowLeft || keys.KeyA) {
        player.velocityX = -speed;
        player.direction = -1;
    } else if (keys.ArrowRight || keys.KeyD) {
        player.velocityX = speed;
        player.direction = 1;
    } else {
        player.velocityX *= 0.8; // 摩擦
    }
    
    // 重力適用
    if (!player.onGround) {
        player.velocityY += 0.8;
    }
    
    // 位置更新
    player.x += player.velocityX;
    player.y += player.velocityY;

    // 画面端制限
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvasWidth) player.x = canvasWidth - player.width;

    // フロアとの衝突判定
    checkFloorCollisions();

    // 移動音による敵への警戒
    if ((Math.abs(player.velocityX) > 3 || Math.abs(player.velocityY) > 3) && 
        !player.isHiding && !player.isInvisible && !player.isCrouching) {
        if (Math.random() < 0.02) {
            alertNearbyEnemies(player.x, player.y, 100, 0.1);
        }
    }

    updateScroll();
    updateCurrentFloor();
}

function checkFloorCollisions() {
    player.onGround = false;
    
    floors.forEach(floor => {
        if (player.y + player.height >= floor.y &&
            player.y + player.height <= floor.y + FLOOR_HEIGHT + 5 &&
            player.velocityY >= 0) {
            player.y = floor.y - player.height;
            player.velocityY = 0;
            player.onGround = true;
            player.isJumping = false;
        }
    });

    // 最下層より下に落ちないように制限
    if (player.y + player.height > floors[0].y + FLOOR_HEIGHT) {
        player.y = floors[0].y - player.height;
        player.velocityY = 0;
        player.onGround = true;
        player.isJumping = false;
    }
}

function updateScroll() {
    const targetScrollY = Math.max(0, player.y - canvasHeight / 2);
    const maxScrollY = floors[0].y - floors[floors.length - 1].y + 100;
    gameState.scrollY = Math.min(targetScrollY, maxScrollY);
}

function updateCurrentFloor() {
    let floorNum = 1;
    for (let i = floors.length - 1; i >= 0; i--) {
        if (player.y <= floors[i].y) {
            floorNum = i + 1;
            break;
        }
    }
    
    const previousFloor = gameState.currentFloor;
    gameState.currentFloor = floorNum;
    
    if (gameState.currentFloor !== previousFloor && !spawnedFloors.has(gameState.currentFloor)) {
        spawnEntitiesForFloor(gameState.currentFloor);
        spawnedFloors.add(gameState.currentFloor);
    }
}

// 敵更新
function updateEnemies() {
    enemies.forEach(enemy => {
        // 気絶時間があれば動かない
        if (enemy.stunTime > 0) {
            enemy.stunTime--;
            return;
        }
        
        updateEnemyBehavior(enemy);
        updateEnemyAlert(enemy);
    });
}

function updateEnemyBehavior(enemy) {
    switch(enemy.type) {
        case 'samurai':
        case 'spearman':
        case 'shieldman':
            updateMeleeEnemy(enemy);
            break;
        case 'archer':
            updateArcherEnemy(enemy);
            break;
        case 'lord':
            updateLordEnemy(enemy);
            break;
    }
}

function updateMeleeEnemy(enemy) {
    // 警戒レベルに応じて速度変更
    enemy.speed = enemy.baseSpeed * (1 + enemy.alertLevel * 0.2);
    
    // 基本的なパトロール
    enemy.x += enemy.speed * enemy.direction;
    
    if (enemy.x <= enemy.patrolLeft || enemy.x >= enemy.patrolRight) {
        enemy.direction *= -1;
    }
    
    // プレイヤー検出
    if (!player.isInvisible && !player.isHiding) {
        const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (dist < 80 && enemy.alertLevel < 3) {
            enemy.alertLevel = Math.min(5, enemy.alertLevel + 0.1 * enemy.alertness);
            enemy.lastSeen.x = player.x;
            enemy.lastSeen.y = player.y;
        }
    }
}

function updateArcherEnemy(enemy) {
    // 射撃タイマー
    enemy.shootTimer++;
    
    // プレイヤーを狙って矢を撃つ
    if (enemy.shootTimer >= (120 - enemy.alertLevel * 10) && !player.isInvisible) {
        const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (dist < 200) {
            enemyProjectiles.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                width: 30,
                height: 4,
                velocityX: player.x < enemy.x ? -4 : 4,
                velocityY: (player.y - enemy.y) * 0.02,
                spin: 0
            });
            enemy.shootTimer = 0;
        }
    }
}

function updateLordEnemy(enemy) {
    // プレイヤーが近づくと起きる
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    
    if (dist < 100 && !player.isInvisible && !player.isHiding) {
        if (!enemy.awake) {
            enemy.awake = true;
            gameState.perfectStealth = false;
            alertNearbyEnemies(enemy.x, enemy.y, 200, 2);
        }
    }
    
    // 起きている間は少し動く
    if (enemy.awake) {
        enemy.x += Math.sin(Date.now() * 0.001) * 0.5;
    }
}

function updateEnemyAlert(enemy) {
    // 警戒レベルを徐々に下げる
    if (enemy.alertLevel > 0) {
        enemy.alertLevel = Math.max(0, enemy.alertLevel - 0.01);
    }
    
    // 高警戒状態の敵は他の敵も警戒させる
    if (enemy.alertLevel > 4) {
        enemies.forEach(otherEnemy => {
            if (otherEnemy !== enemy) {
                const dist = Math.hypot(enemy.x - otherEnemy.x, enemy.y - otherEnemy.y);
                if (dist < 120) {
                    otherEnemy.alertLevel = Math.min(5, otherEnemy.alertLevel + 0.05);
                }
            }
        });
    }
}

// 発射物更新
function updateProjectiles() {
    // プレイヤーの手裏剣
    projectiles = projectiles.filter(projectile => {
        projectile.x += projectile.velocityX;
        projectile.y += projectile.velocityY;
        projectile.spin += 0.3;
        
        return projectile.x > -30 && projectile.x < canvasWidth + 30 &&
               projectile.y > -30 && projectile.y < canvasHeight + 500;
    });
    
    // 敵の矢
    enemyProjectiles = enemyProjectiles.filter(projectile => {
        projectile.x += projectile.velocityX;
        projectile.y += projectile.velocityY;
        projectile.spin += 0.1;
        
        return projectile.x > -50 && projectile.x < canvasWidth + 50 &&
               projectile.y > -50 && projectile.y < canvasHeight + 500;
    });
}

// アイテム更新
function updateItems() {
    items.forEach(item => {
        if (item.collected) return;
        
        // アニメーション更新
        item.shimmer += 0.1;
        
        // プレイヤーとの衝突判定
        if (isColliding(player, item)) {
            item.collected = true;
            collectItem(item);
        }
    });
}

function collectItem(item) {
    playSound('ninjutsu');
    
    switch(item.type) {
        case 'scroll':
            gameState.chakra = Math.min(5, gameState.chakra + 1);
            gameState.score += 200;
            break;
        case 'poison_shuriken':
            gameState.shurikenCount += 5;
            gameState.score += 100;
            break;
        case 'smoke_bomb':
            useSmokeBomb();
            gameState.score += 150;
            break;
        case 'kunai_pack':
            gameState.kunaiCount += 3;
            gameState.score += 100;
            break;
        case 'chakra_pill':
            gameState.chakra = Math.min(5, gameState.chakra + 2);
            gameState.life = Math.min(3, gameState.life + 1); // 体力も回復
            gameState.score += 300;
            break;
    }

    updateUI();
}

// 衝突判定更新
function updateCollisions() {
    // プレイヤーと敵の衝突
    if (!player.invulnerable && !player.isInvisible) {
        enemies.forEach(enemy => {
            if (isColliding(player, enemy)) {
                takeDamage();
                gameState.perfectStealth = false;
            }
        });
    }
    
    // プレイヤーと敵の矢の衝突
    if (!player.invulnerable && !player.isInvisible) {
        enemyProjectiles.forEach((arrow, index) => {
            if (isColliding(player, arrow)) {
                enemyProjectiles.splice(index, 1);
                takeDamage();
                gameState.perfectStealth = false;
            }
        });
    }
    
    // 手裏剣と敵の衝突
    projectiles.forEach((shuriken, shurikenIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (isColliding(shuriken, enemy)) {
                projectiles.splice(shurikenIndex, 1);
                const damage = shuriken.type === 'kunai' ? 2 : 1;
                enemy.health -= damage;
                gameState.score += 100;
                
                // 敵を倒した時のスコア
                if (enemy.health <= 0) {
                    enemies.splice(enemyIndex, 1);
                    const killBonus = enemy.type === 'lord' ? 1000 : 200;
                    gameState.score += killBonus;
                    
                    if (enemy.type !== 'lord') {
                        gameState.stealthBonus += 50;
                    }
                } else {
                    // ダメージを受けた敵は警戒レベル最大に
                    enemy.alertLevel = 5;
                    alertNearbyEnemies(enemy.x, enemy.y, 150, 1);
                }
            }
        });
    });

    // 分身効果（敵の注意をそらす）
    player.clones.forEach(clone => {
        enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - clone.x, enemy.y - clone.y);
            if (dist < 80 && Math.random() < 0.02) {
                enemy.alertLevel = Math.max(0, enemy.alertLevel - 0.3);
                // 分身の方を向く
                enemy.direction = clone.x < enemy.x ? -1 : 1;
            }
        });
    });
    
    // 罠の衝突判定
    traps.forEach(trap => {
        if (!trap.triggered && isColliding(player, trap)) {
            trap.triggered = true;
            if (!player.isCrouching && !player.isInvisible) {
                alertNearbyEnemies(trap.x, trap.y, 200, 3);
                playSound('error');
                gameState.perfectStealth = false;
            }
        }
    });
}

// 環境更新
function updateEnvironment() {
    // 隠し扉の発見
    hiddenDoors.forEach(door => {
        if (!door.discovered && isInShadow() && isColliding(player, door)) {
            door.discovered = true;
            gameState.score += 500;
            playSound('ninjutsu');
        }
    });
}

// 衝突判定関数
function isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// ダメージ処理
function takeDamage() {
    gameState.life--;
    player.invulnerable = true;
    player.invulnerableTime = 120; // 2秒間無敵
    gameState.detectionLevel++;
    
    playSound('error');
    
    if (gameState.life <= 0) {
        gameOver();
    }
    updateUI();
}

// ゲーム進行更新
function updateGameProgress() {
    // 殿を倒したらクリア
    const lordAlive = enemies.some(enemy => enemy.type === 'lord');
    if (!lordAlive && gameState.currentFloor === 5) {
        gameClear();
    }
}

// 忍術関連更新
function updateNinjutsu() {
    if (ninjutsuCooldown > 0) {
        ninjutsuCooldown--;
    }
    
    // チャクラ自然回復（低確率）
    if (Math.random() < 0.001 && gameState.chakra < 5) {
        gameState.chakra++;
    }
    
    // 手裏剣自然回復（低確率）
    if (Math.random() < 0.0005 && gameState.shurikenCount < 20) {
        gameState.shurikenCount++;
    }
}

// UI更新
function updateUI() {
    document.getElementById('life-count').textContent = gameState.life;
    document.getElementById('current-floor').textContent = gameState.currentFloor;
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('chakra-count').textContent = gameState.chakra;
    document.getElementById('shuriken-count').textContent = gameState.shurikenCount;
    const kunaiEl = document.getElementById('kunai-count');
    if (kunaiEl) kunaiEl.textContent = gameState.kunaiCount;
    const weaponEl = document.getElementById('current-weapon');
    if (weaponEl) weaponEl.textContent = currentWeapon === 'shuriken' ? '手裏剣' : 'クナイ';
}

// ゲームオーバー
function gameOver() {
    gameState.screen = 'gameover';
    document.getElementById('final-score').textContent = `スコア: ${gameState.score}`;
    document.getElementById('gameover-screen').style.display = 'block';
    
    if (bgm) {
        bgm.pause();
    }
}

// ゲームクリア
function gameClear() {
    gameState.screen = 'clear';
    
    // ボーナス計算
    let finalBonus = gameState.stealthBonus;
    if (gameState.perfectStealth) {
        finalBonus += 2000; // 完全ステルスボーナス
    }
    if (gameState.detectionLevel === 0) {
        finalBonus += 1000; // 未発見ボーナス
    }
    
    const totalScore = gameState.score + finalBonus;
    gameState.stealthBonus = finalBonus;
    
    document.getElementById('clear-score').textContent = `最終スコア: ${totalScore}`;
    document.getElementById('bonus-points').textContent = finalBonus;
    document.getElementById('clear-screen').style.display = 'block';
    
    if (bgm) {
        bgm.pause();
    }
}

// レンダリングメイン
function render() {
    // 画面クリア
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // 各要素描画
    drawBackground();
    drawShadows();
    drawHiddenDoors();
    drawTraps();
    drawItems();
    drawEnemies();
    drawPlayer();
    drawClones();
    drawProjectiles();
    drawEffects();
    drawGameUI();
}

// 背景描画
function drawBackground() {
    // 城の雰囲気作り
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;

    // フロア描画
    ctx.fillStyle = '#555';
    floors.forEach(floor => {
        const y = floor.y - gameState.scrollY;
        if (y > -20 && y < canvasHeight + 20) {
            ctx.fillRect(0, y, canvasWidth, FLOOR_HEIGHT);
        }
    });

    // 縦線（柱）
    for (let x = 50; x < canvasWidth; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
    }
    
    // 月
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(canvasWidth - 50, 50, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // 星（動的）
    const starCount = 8;
    for (let i = 0; i < starCount; i++) {
        const x = (i * canvasWidth / starCount + Date.now() * 0.001 * (i + 1)) % canvasWidth;
        const y = 20 + Math.sin(Date.now() * 0.002 * (i + 1)) * 30;
        drawStar(x, y, 1 + Math.sin(Date.now() * 0.003 * (i + 1)));
    }
}

function drawStar(x, y, size) {
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

// 影描画
function drawShadows() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    shadows.forEach(shadow => {
        const y = shadow.y - gameState.scrollY;
        if (y > -50 && y < canvasHeight + 50) {
            ctx.fillRect(shadow.x, y, shadow.width, shadow.height);
        }
    });
}

// 隠し扉描画
function drawHiddenDoors() {
    hiddenDoors.forEach(door => {
        const y = door.y - gameState.scrollY;
        if (y > -70 && y < canvasHeight + 70) {
            if (door.discovered || (isInShadow() && Math.hypot(door.x - player.x, door.y - player.y) < 100)) {
                ctx.fillStyle = door.discovered ? 'rgba(139, 69, 19, 0.9)' : 'rgba(139, 69, 19, 0.5)';
                ctx.fillRect(door.x, y, door.width, door.height);
                
                if (door.discovered) {
                    ctx.fillStyle = '#654321';
                    ctx.fillRect(door.x + 5, y + 5, door.width - 10, door.height - 10);
                }
            }
        }
    });
}

// 罠描画
function drawTraps() {
    traps.forEach(trap => {
        const y = trap.y - gameState.scrollY;
        if (y > -30 && y < canvasHeight + 30) {
            // 忍者の目（しゃがみ状態）でのみ見える
            if (player.isCrouching || trap.triggered) {
                ctx.fillStyle = trap.triggered ? '#ff4444' : '#ffaa00';
                ctx.fillRect(trap.x + 5, y + 5, trap.width - 10, trap.height - 10);
                
                // 罠の詳細
                ctx.fillStyle = '#666';
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(trap.x + i * 8, y, 2, trap.height);
                }
            }
        }
    });
}

// アイテム描画
function drawItems() {
    items.forEach(item => {
        if (item.collected) return;
        
        const y = item.y - gameState.scrollY;
        if (y > -40 && y < canvasHeight + 40) {
            ctx.save();
            
            // 光る効果
            const shimmerAlpha = 0.8 + Math.sin(item.shimmer) * 0.2;
            ctx.globalAlpha = shimmerAlpha;
            
            ctx.translate(item.x + item.width/2, y + item.height/2);
            ctx.rotate(Math.sin(item.shimmer * 0.5) * 0.2);
            
            switch(item.type) {
                case 'scroll':
                    ctx.fillStyle = '#feca57';
                    ctx.fillRect(-12, -12, 24, 24);
                    ctx.fillStyle = '#222';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('巻', 0, 4);
                    break;
                case 'poison_shuriken':
                    ctx.fillStyle = '#2ecc71';
                    drawShurikenShape();
                    ctx.fillStyle = '#000';
                    ctx.beginPath();
                    ctx.arc(0, 0, 3, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'smoke_bomb':
                    ctx.fillStyle = '#95a5a6';
                    ctx.beginPath();
                    ctx.arc(0, 0, 12, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#34495e';
                    ctx.beginPath();
                    ctx.arc(0, -5, 3, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'kunai_pack':
                    ctx.fillStyle = '#bdc3c7';
                    ctx.fillRect(-12, -8, 24, 16);
                    ctx.fillStyle = '#2c3e50';
                    ctx.fillRect(-2, -6, 4, 12);
                    break;
                case 'chakra_pill':
                    ctx.fillStyle = '#e74c3c';
                    ctx.beginPath();
                    ctx.arc(0, 0, 10, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('気', 0, 3);
                    break;
            }
            ctx.restore();
        }
    });
}

function drawShurikenShape() {
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(3, -3);
    ctx.lineTo(10, 0);
    ctx.lineTo(3, 3);
    ctx.lineTo(0, 10);
    ctx.lineTo(-3, 3);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-3, -3);
    ctx.closePath();
    ctx.fill();
}

// 敵描画
function drawEnemies() {
    enemies.forEach(enemy => {
        const y = enemy.y - gameState.scrollY;
        if (y > -80 && y < canvasHeight + 80) {
            drawEnemy(enemy, y);
        }
    });
}

function drawEnemy(enemy, screenY) {
    ctx.save();
    ctx.translate(enemy.x, screenY);

    // 警戒レベルに応じた表示効果
    const alertColor = enemy.alertLevel > 3 ? '#ff4444' : 
                       enemy.alertLevel > 1 ? '#ffaa44' : '#ffffff';
    
    // 気絶状態の表示
    if (enemy.stunTime > 0) {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#666666';
    }

    if (enemy.type === 'samurai') {
        drawSamurai(alertColor);
    } else if (enemy.type === 'archer') {
        drawArcher(alertColor);
    } else if (enemy.type === 'spearman') {
        drawSpearman(alertColor);
    } else if (enemy.type === 'shieldman') {
        drawShieldman(alertColor);
    } else if (enemy.type === 'lord') {
        drawLord(enemy);
    }

    // 警戒レベル表示
    if (enemy.alertLevel > 0) {
        ctx.fillStyle = `rgba(255, ${255 - enemy.alertLevel * 40}, 0, ${enemy.alertLevel / 5})`;
        ctx.fillRect(-5, -15, enemy.width + 10, 3);
    }

    ctx.restore();
}

function drawSamurai(alertColor) {
    // 体
    ctx.fillStyle = '#cc3333';
    ctx.fillRect(15, 20, 15, 18);
    
    // 頭
    ctx.fillStyle = '#ffdbab';
    ctx.beginPath();
    ctx.arc(22.5, 15, 7, 0, Math.PI * 2);
    ctx.fill();
    
    // ちょんまげ
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.ellipse(22.5, 10, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(21, 5, 3, 8);
    
    // 刀
    ctx.strokeStyle = alertColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(35, 15);
    ctx.lineTo(35, 30);
    ctx.stroke();
    
    // 刀の柄
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(33, 12, 4, 5);
}

function drawArcher(alertColor) {
    // 体
    ctx.fillStyle = '#3366cc';
    ctx.fillRect(14, 18, 14, 17);
    
    // 頭
    ctx.fillStyle = '#ffdbab';
    ctx.beginPath();
    ctx.arc(21, 13, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // 弓
    ctx.strokeStyle = alertColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(8, 15, 7, -Math.PI/3, Math.PI/3, false);
    ctx.stroke();
    
    // 弦
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(5, 10);
    ctx.lineTo(5, 20);
    ctx.stroke();
}

function drawSpearman(alertColor) {
    // 体
    ctx.fillStyle = '#228b22';
    ctx.fillRect(14, 20, 17, 18);

    // 頭
    ctx.fillStyle = '#ffdbab';
    ctx.beginPath();
    ctx.arc(22.5, 15, 7, 0, Math.PI * 2);
    ctx.fill();

    // 槍の柄
    ctx.strokeStyle = alertColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(35, 15);
    ctx.lineTo(45, 5);
    ctx.stroke();

    // 槍の穂先
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(45, 5);
    ctx.lineTo(48, 2);
    ctx.moveTo(45, 5);
    ctx.lineTo(48, 8);
    ctx.stroke();
}

function drawShieldman(alertColor) {
    // 体
    ctx.fillStyle = '#555555';
    ctx.fillRect(14, 20, 17, 18);

    // 頭
    ctx.fillStyle = '#ffdbab';
    ctx.beginPath();
    ctx.arc(22.5, 15, 7, 0, Math.PI * 2);
    ctx.fill();

    // 盾
    ctx.fillStyle = alertColor;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(35, 28, 8, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(35, 20);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawLord(enemy) {
    // 殿の体（大きめ）
    ctx.fillStyle = '#6b46c1';
    ctx.beginPath();
    ctx.ellipse(40, 45, 35, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.ellipse(40, 35, 25, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 頭
    ctx.fillStyle = '#ffdbab';
    ctx.beginPath();
    ctx.arc(25, 25, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // 髪
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(20, 18, 8, 0, Math.PI);
    ctx.fill();
    
    // 状態表示
    if (!enemy.awake) {
        ctx.fillStyle = '#666666';
        ctx.font = '14px Arial';
        ctx.fillText('ZZZ', 50, 15);
        
        // 寝息エフェクト
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(55 + i * 8, 10 + Math.sin(Date.now() * 0.01 + i) * 3, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    } else {
        ctx.fillStyle = '#ff0000';
        ctx.font = '12px Arial';
        ctx.fillText('起きた！', 10, 10);
        
        // 怒りエフェクト
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const angle = (Date.now() * 0.01 + i * Math.PI / 2) % (Math.PI * 2);
            ctx.beginPath();
            ctx.arc(25, 25, 15 + Math.sin(angle) * 3, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    // 体力表示
    if (enemy.health < enemy.maxHealth) {
        ctx.fillStyle = '#ff0000';
        ctx.font = '10px Arial';
        ctx.fillText(`HP: ${enemy.health}/${enemy.maxHealth}`, 5, 50);
    }
}

// プレイヤー描画
function drawPlayer() {
    const screenY = player.y - gameState.scrollY;
    if (screenY < -60 || screenY > canvasHeight + 60) return;
    
    ctx.save();
    
    // 各種状態エフェクト
    if (player.invulnerable && Math.floor(player.invulnerableTime / 5) % 2) {
        ctx.globalAlpha = 0.5;
    }
    if (player.isInvisible) {
        ctx.globalAlpha = 0.3;
    }
    if (player.isHiding && player.shadowBlend) {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(player.x - 5, screenY - 5, player.width + 10, player.height + 10);
    }
    
    // 向きに応じて反転
    const scale = player.isCrouching ? 1.0 : 1.2;
    if (player.direction === -1) {
        ctx.translate(player.x + player.width, screenY);
        ctx.scale(-scale, scale);
    } else {
        ctx.translate(player.x, screenY);
        ctx.scale(scale, scale);
    }
    
    // 忍者の体
    ctx.fillStyle = '#1a1a1a';
    if (player.isCrouching) {
        ctx.fillRect(12, 25, 16, 10);
    } else {
        ctx.fillRect(12, 15, 16, 20);
    }
    
    // 忍者の頭
    ctx.beginPath();
    ctx.arc(20, 12, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // 目（光る）
    ctx.fillStyle = player.isInvisible ? '#00ffff' : '#ffffff';
    ctx.fillRect(16, 10, 3, 2);
    ctx.fillRect(21, 10, 3, 2);
    
    ctx.restore();
}

// 分身描画
function drawClones() {
    player.clones.forEach(clone => {
        const screenY = clone.y - gameState.scrollY;
        if (screenY < -60 || screenY > canvasHeight + 60) return;
        
        ctx.save();
        ctx.globalAlpha = clone.alpha;
        ctx.translate(clone.x, screenY);
        
        if (clone.direction === -1) {
            ctx.scale(-1, 1);
        }
        
        // 分身の色（少し青っぽく）
        ctx.fillStyle = '#3a3a5a';
        ctx.fillRect(12, 15, 16, 20);
        ctx.beginPath();
        ctx.arc(20, 12, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // 分身の目（青く光る）
        ctx.fillStyle = '#4ecdc4';
        ctx.fillRect(16, 10, 3, 2);
        ctx.fillRect(21, 10, 3, 2);
        
        ctx.restore();
    });
}

// 発射物描画
function drawProjectiles() {
    // プレイヤーの発射物
    projectiles.forEach(projectile => {
        const screenY = projectile.y - gameState.scrollY;
        if (screenY < -30 || screenY > canvasHeight + 30) return;

        ctx.save();
        ctx.translate(projectile.x + projectile.width/2, screenY + projectile.height/2);

        if (projectile.type === 'shuriken') {
            ctx.rotate(projectile.spin);
            ctx.shadowColor = '#c0c0c0';
            ctx.shadowBlur = 5;
            ctx.fillStyle = '#c0c0c0';
            drawShurikenShape();
            ctx.fillStyle = '#666666';
            ctx.beginPath();
            ctx.arc(0, 0, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (projectile.type === 'kunai') {
            ctx.rotate(Math.atan2(projectile.velocityY, projectile.velocityX));
            ctx.fillStyle = '#aaaaaa';
            ctx.fillRect(-10, -2, 20, 4);
            ctx.fillStyle = '#555555';
            ctx.beginPath();
            ctx.moveTo(10, -4);
            ctx.lineTo(15, 0);
            ctx.lineTo(10, 4);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    });

    // 敵の矢
    enemyProjectiles.forEach(arrow => {
        const screenY = arrow.y - gameState.scrollY;
        if (screenY < -30 || screenY > canvasHeight + 30) return;
        
        ctx.save();
        ctx.translate(arrow.x, screenY);
        ctx.rotate(Math.atan2(arrow.velocityY, arrow.velocityX));
        
        // 矢の軸
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(0, -1, 25, 2);

        // 矢じり
        ctx.fillStyle = '#666666';
        ctx.beginPath();
        ctx.moveTo(25, -3);
        ctx.lineTo(30, 0);
        ctx.lineTo(25, 3);
        ctx.closePath();
        ctx.fill();
        
        // 矢羽
        ctx.fillStyle = '#654321';
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(-5, -4);
        ctx.lineTo(-5, 4);
        ctx.lineTo(0, 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    });
}

// エフェクト描画
function drawEffects() {
    const screenY = player.y - gameState.scrollY;
    
    // 攻撃エフェクト
    if (player.isAttacking) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(player.x - 10, screenY - 10, player.width + 20, player.height + 20);
    }

    // ジャンプエフェクト
    if (player.isJumping) {
        ctx.strokeStyle = 'rgba(255, 107, 107, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.width/2, screenY + player.height + 5, 15, 0, Math.PI * 2);
        ctx.stroke();
    }

    // 隠れ状態エフェクト
    if (player.isHiding && isInShadow()) {
        ctx.strokeStyle = 'rgba(78, 205, 196, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(player.x - 5, screenY - 5, player.width + 10, player.height + 10);
        ctx.setLineDash([]);
    }

    // 煙エフェクト
    if (player.smokeTime > 0) {
        drawSmokeEffect();
    }
    
    // 透明エフェクト
    if (player.isInvisible) {
        drawInvisibleEffect();
    }
}

function drawSmokeEffect() {
    ctx.save();
    ctx.globalAlpha = 0.6;
    
    const smokeRadius = (120 - player.smokeTime) * 2;
    const particleCount = 12;
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (Date.now() * 0.005 + i * (Math.PI * 2 / particleCount)) % (Math.PI * 2);
        const x = player.x + player.width/2 + Math.cos(angle) * smokeRadius;
        const y = player.y + player.height/2 + Math.sin(angle) * (smokeRadius * 0.6) - gameState.scrollY;
        
        const size = 8 + Math.sin(Date.now() * 0.01 + i) * 3;
        
        ctx.fillStyle = '#95a5a6';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawInvisibleEffect() {
    const screenY = player.y - gameState.scrollY;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    // 透明オーラ
    for (let i = 0; i < 3; i++) {
        const radius = 20 + i * 10 + Math.sin(Date.now() * 0.01 + i) * 5;
        ctx.beginPath();
        ctx.arc(player.x + player.width/2, screenY + player.height/2, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.restore();
}

// ゲーム内UI描画
function drawGameUI() {
    // 忍術クールダウン表示
    if (ninjutsuCooldown > 0) {
        const barWidth = 200;
        const barHeight = 20;
        const x = 10;
        const y = canvasHeight - 80;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        const progress = (ninjutsu[currentNinjutsu].cooldown - ninjutsuCooldown) / ninjutsu[currentNinjutsu].cooldown;
        ctx.fillStyle = '#4ecdc4';
        ctx.fillRect(x, y, barWidth * progress, barHeight);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText(`${ninjutsu[currentNinjutsu].name} クールダウン中...`, x + 5, y + 14);
    }

    // 現在の忍術表示
    const jutsuBarY = canvasHeight - 50;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, jutsuBarY, 180, 25);
    
    ctx.fillStyle = '#4ecdc4';
    ctx.font = '12px Arial';
    ctx.fillText(`忍術: ${ninjutsu[currentNinjutsu].name}`, 15, jutsuBarY + 16);
    
    // コスト表示
    ctx.fillStyle = gameState.chakra >= ninjutsu[currentNinjutsu].cost ? '#2ecc71' : '#e74c3c';
    ctx.fillText(`(${ninjutsu[currentNinjutsu].cost})`, 140, jutsuBarY + 16);

    // 状態表示
    const statusY = canvasHeight - 25;
    let statusText = '';
    if (player.isInvisible) statusText = '透明中';
    else if (player.isHiding) statusText = '隠れ中';
    else if (player.isCrouching) statusText = 'しゃがみ中';
    else if (isInShadow()) statusText = '影の中';
    
    if (statusText) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(10, statusY, 100, 20);
        
        ctx.fillStyle = '#feca57';
        ctx.font = '11px Arial';
        ctx.fillText(statusText, 15, statusY + 14);
    }
    
    // 警戒度メーター
    const alertEnemies = enemies.filter(e => e.alertLevel > 1).length;
    if (alertEnemies > 0) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillRect(canvasWidth - 120, 10, 100, 15);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px Arial';
        ctx.fillText(`警戒中: ${alertEnemies}体`, canvasWidth - 115, 21);
    }
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    bgm = document.getElementById('bgm');

    // モバイル判定
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // コントローラーは常に表示（小学生向け）
    document.getElementById('mobile-controller').style.display = 'block';
    
    // タッチイベントのデフォルト動作を防ぐ
    document.addEventListener('touchstart', function(e) {
        if (e.target.classList.contains('control-btn') || e.target.classList.contains('ninjutsu-btn')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    document.addEventListener('touchmove', function(e) {
        if (e.target.closest('#mobile-controller')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // ゲーム初期化
    initGame();
});

// デバッグ用関数
function debugInfo() {
    console.log('=== デバッグ情報 ===');
    console.log('Player:', player);
    console.log('Enemies:', enemies.length);
    console.log('GameState:', gameState);
    console.log('Shadows:', shadows.length);
    console.log('IsInShadow:', isInShadow());
}

// チート機能（開発・テスト用）
function enableGodMode() {
    if (confirm('ゴッドモードを有効にしますか？（デバッグ用）')) {
        gameState.life = 99;
        gameState.chakra = 99;
        gameState.shurikenCount = 99;
        player.invulnerable = true;
        player.isInvisible = true;
        updateUI();
        console.log('ゴッドモード有効');
    }
}

// パフォーマンス最適化用
function optimizePerformance() {
    // 画面外の敵を一時的に非アクティブ化
    enemies.forEach(enemy => {
        const dist = Math.abs(enemy.y - (player.y - gameState.scrollY));
        enemy.active = dist < canvasHeight + 100;
    });
    
    // 古い発射物を削除
    if (projectiles.length > 50) {
        projectiles = projectiles.slice(-30);
    }
    if (enemyProjectiles.length > 30) {
        enemyProjectiles = enemyProjectiles.slice(-20);
    }
}

// ゲーム一時停止/再開
function togglePause() {
    gameState.paused = !gameState.paused;
    console.log('ゲーム', gameState.paused ? '一時停止' : '再開');
}

// コンソールからの操作用（デバッグ）
window.gameDebug = {
    debugInfo,
    enableGodMode,
    togglePause,
    player,
    gameState,
    enemies
};