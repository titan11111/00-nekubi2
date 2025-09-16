// script.js - 本格RPGゲームのメインスクリプト

class AdvancedRPGGame {
    constructor() {
        // ゲーム設定
        this.settings = {
            volume: 50,
            textSpeed: 'normal',
            autoSave: true
        };

        // プレイヤーデータ
        this.player = {
            name: 'ゆうしゃ',
            job: 'ゆうしゃ',
            level: 1,
            hp: 100,
            maxHp: 100,
            mp: 30,
            maxMp: 30,
            exp: 0,
            nextExp: 100,
            gold: 100,
            attack: 15,
            defense: 10,
            speed: 12,
            luck: 8,
            portrait: '🧙‍♂️'
        };

        // アイテムデータ
        this.items = {
            potion: { name: 'やくそう', price: 20, sellPrice: 10, effect: 'heal', power: 30, desc: 'HPを30かいふくする' },
            hiPotion: { name: 'いやしのくすり', price: 50, sellPrice: 25, effect: 'heal', power: 80, desc: 'HPを80かいふくする' },
            mpPotion: { name: 'まほうのみず', price: 40, sellPrice: 20, effect: 'mp', power: 20, desc: 'MPを20かいふくする' },
            sword: { name: 'はがねのけん', price: 150, sellPrice: 75, effect: 'weapon', power: 25, desc: 'こうげきりょく+25' },
            shield: { name: 'てつのたて', price: 120, sellPrice: 60, effect: 'armor', power: 15, desc: 'しゅびりょく+15' },
            ring: { name: 'ちからのゆびわ', price: 300, sellPrice: 150, effect: 'accessory', power: 10, desc: 'こうげきりょく+10' }
        };

        // インベントリ
        this.inventory = {
            potion: 3,
            hiPotion: 0,
            mpPotion: 1
        };

        // 装備
        this.equipment = {
            weapon: null,
            armor: null,
            accessory: null
        };

        // 魔法データ
        this.spells = {
            heal: { name: 'ホイミ', cost: 3, effect: 'heal', power: 25, desc: 'HPをかいふくする', level: 1 },
            healMore: { name: 'ベホイミ', cost: 8, effect: 'heal', power: 60, desc: 'HPを大きくかいふくする', level: 5 },
            fire: { name: 'メラ', cost: 4, effect: 'damage', power: 30, desc: 'てきにほのおのダメージ', level: 2 },
            fireMore: { name: 'メラミ', cost: 10, effect: 'damage', power: 70, desc: 'てきに大きなほのおダメージ', level: 7 },
            lightning: { name: 'ライデイン', cost: 15, effect: 'damage', power: 90, desc: 'てきにでんきのダメージ', level: 10 }
        };

        // 覚えている魔法
        this.knownSpells = ['heal'];

        // 敵データ
        this.enemies = {
            slime: { 
                name: 'スライム', emoji: '💚', hp: 35, maxHp: 35, attack: 12, defense: 8, 
                speed: 10, gold: 15, exp: 12, spells: [], desc: 'やわらかいからだの魔物' 
            },
            goblin: { 
                name: 'ゴブリン', emoji: '👹', hp: 50, maxHp: 50, attack: 18, defense: 12, 
                speed: 15, gold: 25, exp: 20, spells: [], desc: 'ずるがしこい小さな悪魔' 
            },
            wolf: { 
                name: 'おおかみ', emoji: '🐺', hp: 65, maxHp: 65, attack: 22, defense: 15, 
                speed: 20, gold: 30, exp: 25, spells: [], desc: 'のやまにすむきょうぼうなけもの' 
            },
            orc: { 
                name: 'オーク', emoji: '👺', hp: 85, maxHp: 85, attack: 28, defense: 20, 
                speed: 12, gold: 40, exp: 35, spells: [], desc: 'きょだいなからだときばをもつ' 
            },
            skeleton: { 
                name: 'ガイコツ', emoji: '💀', hp: 70, maxHp: 70, attack: 25, defense: 18, 
                speed: 16, gold: 35, exp: 30, spells: ['curse'], desc: 'しんだものがよみがえったすがた' 
            },
            dragon: { 
                name: 'ドラゴン', emoji: '🐉', hp: 200, maxHp: 200, attack: 45, defense: 35, 
                speed: 25, gold: 500, exp: 200, spells: ['fire'], desc: 'でんせつのこわいりゅう' 
            }
        };

        // 地域別エンカウントテーブル
        this.encounters = {
            forest: ['slime', 'goblin'],
            mountain: ['wolf', 'orc', 'skeleton'],
            desert: ['skeleton', 'orc'],
            cave: ['goblin', 'skeleton', 'orc'],
            castle: ['dragon']
        };

        // ショップデータ
        this.shops = {
            town: ['potion', 'hiPotion', 'mpPotion', 'sword', 'shield']
        };

        // ゲーム状態
        this.gameState = {
            currentLocation: 'town',
            inBattle: false,
            currentEnemy: null,
            battleTurn: 'player',
            defeatedEnemies: 0,
            playTime: 0,
            gameStartTime: Date.now(),
            flags: {
                visitedCastle: false,
                defeatedDragon: false
            }
        };

        // UI要素
        this.elements = {};
        this.currentScreen = 'title-screen';
        this.messageQueue = [];
        this.isTyping = false;

        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadGame();
        this.updateDisplay();
        this.playBGM('title');
        
        // 自動セーブタイマー
        setInterval(() => {
            if (this.settings.autoSave && this.currentScreen !== 'title-screen') {
                this.saveGame();
            }
        }, 30000); // 30秒ごと

        // プレイ時間更新
        setInterval(() => {
            this.gameState.playTime = Math.floor((Date.now() - this.gameState.gameStartTime) / 1000);
        }, 1000);
    }

    cacheElements() {
        // 全ての重要な要素をキャッシュ
        this.elements = {
            // 画面
            titleScreen: document.getElementById('title-screen'),
            mainScreen: document.getElementById('main-screen'),
            battleScreen: document.getElementById('battle-screen'),
            menuScreen: document.getElementById('menu-screen'),
            statusScreen: document.getElementById('status-screen'),
            itemsScreen: document.getElementById('items-screen'),
            shopScreen: document.getElementById('shop-screen'),
            settingsScreen: document.getElementById('settings-screen'),
            levelupScreen: document.getElementById('levelup-screen'),
            gameoverScreen: document.getElementById('gameover-screen'),
            victoryScreen: document.getElementById('victory-screen'),
            loadingScreen: document.getElementById('loading-screen'),

            // ステータス表示
            hp: document.getElementById('hp'),
            maxHp: document.getElementById('max-hp'),
            mp: document.getElementById('mp'),
            maxMp: document.getElementById('max-mp'),
            level: document.getElementById('level'),
            gold: document.getElementById('gold'),
            exp: document.getElementById('exp'),
            hpBarFill: document.getElementById('hp-bar-fill'),
            mpBarFill: document.getElementById('mp-bar-fill'),

            // プレイヤー情報
            charName: document.getElementById('char-name'),
            charJob: document.getElementById('char-job'),
            player: document.getElementById('player'),

            // メッセージ
            messageText: document.getElementById('message-text'),

            // 戦闘
            enemyGroup: document.getElementById('enemy-group'),
            enemyNameDisplay: document.getElementById('enemy-name-display'),
            enemyHpFill: document.getElementById('enemy-hp-fill'),
            battleMessage: document.getElementById('battle-message'),
            battleHp: document.getElementById('battle-hp'),
            battleMaxHp: document.getElementById('battle-max-hp'),
            battlePlayerHp: document.getElementById('battle-player-hp'),

            // ロケーション
            locations: document.querySelectorAll('.location')
        };
    }

    bindEvents() {
        // タイトル画面
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
        document.getElementById('continue-btn').addEventListener('click', () => this.continueGame());
        document.getElementById('settings-btn').addEventListener('click', () => this.showScreen('settings-screen'));

        // 設定画面
        document.getElementById('settings-back-btn').addEventListener('click', () => this.showScreen('title-screen'));
        document.getElementById('volume-slider').addEventListener('input', (e) => this.updateVolume(e.target.value));
        document.getElementById('text-speed').addEventListener('change', (e) => this.updateTextSpeed(e.target.value));
        document.getElementById('auto-save').addEventListener('change', (e) => this.updateAutoSave(e.target.checked));

        // メイン画面
        document.getElementById('menu-btn').addEventListener('click', () => this.showScreen('menu-screen'));
        document.getElementById('save-btn').addEventListener('click', () => this.saveGame());
        document.getElementById('action-btn').addEventListener('click', () => this.performAction());

        // 移動コントロール
        document.querySelectorAll('.move-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const direction = e.target.dataset.direction;
                if (direction) this.movePlayer(direction);
            });
        });

        // ロケーション
        this.elements.locations.forEach(location => {
            location.addEventListener('click', () => {
                const locationName = location.dataset.location;
                this.goToLocation(locationName);
            });
        });

        // メニュー画面
        document.getElementById('menu-close-btn').addEventListener('click', () => this.showScreen('main-screen'));
        document.getElementById('status-menu-btn').addEventListener('click', () => this.showScreen('status-screen'));
        document.getElementById('items-menu-btn').addEventListener('click', () => this.showScreen('items-screen'));
        document.getElementById('magic-menu-btn').addEventListener('click', () => this.showMagicMenu());
        document.getElementById('equip-menu-btn').addEventListener('click', () => this.showEquipMenu());

        // ステータス画面
        document.getElementById('status-close-btn').addEventListener('click', () => this.showScreen('menu-screen'));

        // アイテム画面
        document.getElementById('items-close-btn').addEventListener('click', () => this.showScreen('menu-screen'));

        // 戦闘コマンド
        document.getElementById('battle-attack').addEventListener('click', () => this.battleAttack());
        document.getElementById('battle-magic').addEventListener('click', () => this.showBattleMagic());
        document.getElementById('battle-item').addEventListener('click', () => this.showBattleItems());
        document.getElementById('battle-run').addEventListener('click', () => this.battleRun());

        // 戦闘サブメニュー
        document.querySelectorAll('.submenu-back').forEach(btn => {
            btn.addEventListener('click', () => this.hideBattleSubmenus());
        });

        // ショップ
        document.getElementById('shop-close-btn').addEventListener('click', () => this.showScreen('main-screen'));
        document.querySelectorAll('.shop-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchShopTab(e.target.dataset.tab));
        });

        // レベルアップ
        document.getElementById('levelup-ok-btn').addEventListener('click', () => this.closeLevelUp());

        // ゲームオーバー
        document.getElementById('gameover-continue-btn').addEventListener('click', () => this.continueFromGameOver());
        document.getElementById('gameover-restart-btn').addEventListener('click', () => this.newGame());

        // ビクトリー
        document.getElementById('victory-restart-btn').addEventListener('click', () => this.newGame());

        // キーボード操作
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // タッチイベント（スマホ対応）
        document.addEventListener('touchstart', this.handleTouch.bind(this), { passive: false });
    }

    // ゲーム開始
    newGame() {
        this.resetPlayerData();
        this.showScreen('main-screen');
        this.playBGM('field');
        this.showMessage('ようこそ、ゆうしゃ！せかいをすくうぼうけんがはじまります！');
        this.saveGame();
    }

    continueGame() {
        if (this.loadGame()) {
            this.showScreen('main-screen');
            this.playBGM('field');
            this.showMessage('ぼうけんをさいかいします！');
        } else {
            this.showMessage('セーブデータがありません。');
        }
    }

    resetPlayerData() {
        this.player = {
            name: 'ゆうしゃ',
            job: 'ゆうしゃ',
            level: 1,
            hp: 100,
            maxHp: 100,
            mp: 30,
            maxMp: 30,
            exp: 0,
            nextExp: 100,
            gold: 100,
            attack: 15,
            defense: 10,
            speed: 12,
            luck: 8,
            portrait: '🧙‍♂️'
        };

        this.inventory = {
            potion: 3,
            hiPotion: 0,
            mpPotion: 1
        };

        this.equipment = {
            weapon: null,
            armor: null,
            accessory: null
        };

        this.knownSpells = ['heal'];
        
        this.gameState = {
            currentLocation: 'town',
            inBattle: false,
            currentEnemy: null,
            battleTurn: 'player',
            defeatedEnemies: 0,
            playTime: 0,
            gameStartTime: Date.now(),
            flags: {
                visitedCastle: false,
                defeatedDragon: false
            }
        };
    }

    // 画面管理
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        document.getElementById(screenId).classList.remove('hidden');
        this.currentScreen = screenId;
        
        // 画面別の初期化処理
        switch (screenId) {
            case 'main-screen':
                this.updateDisplay();
                this.updateLocationDisplay();
                break;
            case 'status-screen':
                this.updateStatusDisplay();
                break;
            case 'items-screen':
                this.updateItemsDisplay();
                break;
            case 'shop-screen':
                this.updateShopDisplay();
                break;
            case 'battle-screen':
                this.updateBattleDisplay();
                break;
        }
    }

    showMessage(message, callback) {
        this.messageQueue.push({ text: message, callback });
        if (!this.isTyping) {
            this.processMessageQueue();
        }
    }

    processMessageQueue() {
        if (this.messageQueue.length === 0) {
            this.isTyping = false;
            return;
        }

        const message = this.messageQueue.shift();
        this.isTyping = true;
        
        this.typeMessage(message.text, () => {
            if (message.callback) {
                setTimeout(message.callback, 1000);
            }
            setTimeout(() => this.processMessageQueue(), 1500);
        });
    }

    typeMessage(text, callback) {
        const element = this.currentScreen.includes('battle') ? 
            this.elements.battleMessage : this.elements.messageText;
        
        element.textContent = '';
        let index = 0;
        
        const speed = this.getTextSpeed();
        const interval = setInterval(() => {
            if (index < text.length) {
                element.textContent += text[index];
                index++;
            } else {
                clearInterval(interval);
                if (callback) callback();
            }
        }, speed);
    }

    getTextSpeed() {
        switch (this.settings.textSpeed) {
            case 'slow': return 100;
            case 'fast': return 30;
            default: return 60;
        }
    }

    // 表示更新
    updateDisplay() {
        // ステータス表示更新
        this.elements.hp.textContent = this.player.hp;
        this.elements.maxHp.textContent = this.player.maxHp;
        this.elements.mp.textContent = this.player.mp;
        this.elements.maxMp.textContent = this.player.maxMp;
        this.elements.level.textContent = this.player.level;
        this.elements.gold.textContent = this.player.gold;
        this.elements.exp.textContent = this.player.exp;
        this.elements.charName.textContent = this.player.name;
        
        // HPバー更新
        const hpPercent = (this.player.hp / this.player.maxHp) * 100;
        this.elements.hpBarFill.style.width = `${hpPercent}%`;
        
        // MPバー更新
        const mpPercent = (this.player.mp / this.player.maxMp) * 100;
        this.elements.mpBarFill.style.width = `${mpPercent}%`;

        // プレイヤーキャラクター更新
        this.elements.player.textContent = this.player.portrait;
        
        // レベル表示更新
        const levelSpan = this.elements.charJob.querySelector('span');
        if (levelSpan) levelSpan.textContent = this.player.level;
    }

    updateLocationDisplay() {
        this.elements.locations.forEach(location => {
            location.classList.remove('active');
        });
        
        const currentLoc = document.getElementById(`${this.gameState.currentLocation}-loc`);
        if (currentLoc) {
            currentLoc.classList.add('active');
        }
    }

    updateStatusDisplay() {
        document.getElementById('status-name').textContent = this.player.name;
        document.getElementById('status-job').textContent = this.player.job;
        document.getElementById('status-level').textContent = this.player.level;
        document.getElementById('status-next-exp').textContent = this.player.nextExp - this.player.exp;
        document.getElementById('status-attack').textContent = this.getTotalAttack();
        document.getElementById('status-defense').textContent = this.getTotalDefense();
        document.getElementById('status-speed').textContent = this.player.speed;
        document.getElementById('status-luck').textContent = this.player.luck;
    }

    updateItemsDisplay() {
        const itemsList = document.getElementById('items-list');
        itemsList.innerHTML = '';
        
        Object.entries(this.inventory).forEach(([itemId, count]) => {
            if (count > 0) {
                const item = this.items[itemId];
                const itemElement = document.createElement('div');
                itemElement.className = 'item-entry';
                itemElement.innerHTML = `
                    <div class="item-name">${item.name}</div>
                    <div class="item-count">× ${count}</div>
                    <div class="item-description">${item.desc}</div>
                `;
                itemElement.addEventListener('click', () => this.useItem(itemId));
                itemsList.appendChild(itemElement);
            }
        });
    }

    updateShopDisplay() {
        document.getElementById('shop-gold').textContent = this.player.gold;
        this.updateShopItems();
    }

    updateShopItems() {
        const shopItems = document.getElementById('shop-items');
        shopItems.innerHTML = '';
        
        const availableItems = this.shops[this.gameState.currentLocation] || [];
        
        availableItems.forEach(itemId => {
            const item = this.items[itemId];
            const shopItem = document.createElement('div');
            shopItem.className = 'shop-item';
            shopItem.innerHTML = `
                <div class="shop-item-info">
                    <div class="shop-item-name">${item.name}</div>
                    <div class="shop-item-desc">${item.desc}</div>
                </div>
                <div class="shop-item-price">${item.price}G</div>
                <button class="buy-btn" data-item="${itemId}" data-price="${item.price}">かう</button>
            `;
            
            const buyBtn = shopItem.querySelector('.buy-btn');
            buyBtn.addEventListener('click', () => this.buyItem(itemId, item.price));
            
            shopItems.appendChild(shopItem);
        });
    }

    updateBattleDisplay() {
        if (this.gameState.currentEnemy) {
            this.elements.enemyNameDisplay.textContent = this.gameState.currentEnemy.name;
            this.updateEnemyHP();
        }
        
        this.elements.battleHp.textContent = this.player.hp;
        this.elements.battleMaxHp.textContent = this.player.maxHp;
        
        const hpPercent = (this.player.hp / this.player.maxHp) * 100;
        this.elements.battlePlayerHp.style.width = `${hpPercent}%`;
    }

    updateEnemyHP() {
        if (this.gameState.currentEnemy) {
            const hpPercent = (this.gameState.currentEnemy.hp / this.gameState.currentEnemy.maxHp) * 100;
            this.elements.enemyHpFill.style.width = `${hpPercent}%`;
        }
    }

    // 移動とアクション
    movePlayer(direction) {
        // プレイヤーキャラクターの移動アニメーション
        const playerElement = this.elements.player;
        playerElement.style.transform = 'scale(1.2)';
        setTimeout(() => {
            playerElement.style.transform = 'scale(1)';
        }, 200);
        
        this.playSound('move');
        
        // ランダムエンカウントチェック
        if (Math.random() < 0.15 && this.gameState.currentLocation !== 'town') {
            this.randomEncounter();
        }
    }

    goToLocation(locationName) {
        if (locationName === this.gameState.currentLocation) return;
        
        // 特別な場所の条件チェック
        if (locationName === 'castle' && this.player.level < 5) {
            this.showMessage('まおうのしろは とても きけんです！もっと つよくなってから きましょう！');
            return;
        }
        
        this.gameState.currentLocation = locationName;
        this.updateLocationDisplay();
        
        // BGM切り替え
        if (locationName === 'town') {
            this.playBGM('town');
        } else {
            this.playBGM('field');
        }
        
        // 場所別メッセージ
        const locationMessages = {
            town: 'まちに つきました。やすらかな ばしょです。',
            forest: 'もりに はいりました。モンスターが でそうです...',
            mountain: 'やまに のぼりました。きょうぼうな モンスターが いそうです...',
            desert: 'さばくに きました。あつくて のどが かわきます...',
            cave: 'どうくつに はいりました。くらくて こわいです...',
            castle: 'まおうのしろに つきました。きょうふが みを つつみます...'
        };
        
        this.showMessage(locationMessages[locationName] || 'あたらしい ばしょに つきました。');
        
        // 場所に応じた特別処理
        if (locationName === 'town') {
            setTimeout(() => {
                this.showScreen('shop-screen');
            }, 2000);
        } else if (locationName === 'castle' && !this.gameState.flags.visitedCastle) {
            this.gameState.flags.visitedCastle = true;
            this.showMessage('ついに まおうのしろに たどり つきました！');
        }
    }

    performAction() {
        const location = this.gameState.currentLocation;
        
        switch (location) {
            case 'town':
                this.showScreen('shop-screen');
                break;
            case 'forest':
            case 'mountain':
            case 'desert':
            case 'cave':
            case 'castle':
                this.randomEncounter();
                break;
            default:
                this.showMessage('ここでは なにも できません。');
        }
    }

    // 戦闘システム
    randomEncounter() {
        const possibleEnemies = this.encounters[this.gameState.currentLocation];
        if (!possibleEnemies || possibleEnemies.length === 0) return;
        
        const enemyType = possibleEnemies[Math.floor(Math.random() * possibleEnemies.length)];
        this.startBattle(enemyType);
    }

    startBattle(enemyType) {
        const enemyTemplate = this.enemies[enemyType];
        this.gameState.currentEnemy = { ...enemyTemplate }; // 敵データをコピー
        this.gameState.inBattle = true;
        this.gameState.battleTurn = 'player';
        
        this.showScreen('battle-screen');
        this.playBGM('battle');
        this.createEnemySprite();
        this.showMessage(`${this.gameState.currentEnemy.name}が あらわれた！`);
    }

    createEnemySprite() {
        const enemyGroup = this.elements.enemyGroup;
        enemyGroup.innerHTML = '';
        
        const enemySprite = document.createElement('div');
        enemySprite.className = 'enemy';
        enemySprite.textContent = this.gameState.currentEnemy.emoji;
        enemySprite.addEventListener('click', () => this.selectEnemy());
        
        enemyGroup.appendChild(enemySprite);
        this.updateBattleDisplay();
    }

    selectEnemy() {
        const enemy = document.querySelector('.enemy');
        enemy.classList.add('selected');
        setTimeout(() => enemy.classList.remove('selected'), 500);
    }

    battleAttack() {
        if (this.gameState.battleTurn !== 'player') return;
        
        this.hideBattleSubmenus();
        
        const damage = this.calculateDamage(this.getTotalAttack(), this.gameState.currentEnemy.defense);
        this.gameState.currentEnemy.hp -= damage;
        
        // ダメージエフェクト
        const enemy = document.querySelector('.enemy');
        enemy.classList.add('damaged');
        setTimeout(() => enemy.classList.remove('damaged'), 300);
        
        this.playSound('attack');
        
        if (this.gameState.currentEnemy.hp <= 0) {
            this.gameState.currentEnemy.hp = 0;
            this.updateEnemyHP();
            this.showMessage(`${this.gameState.currentEnemy.name}に ${damage}の ダメージ！`, () => {
                this.battleWin();
            });
        } else {
            this.updateEnemyHP();
            this.showMessage(`${this.gameState.currentEnemy.name}に ${damage}の ダメージ！`, () => {
                this.enemyTurn();
            });
        }
    }

    calculateDamage(attack, defense) {
        const baseDamage = Math.max(1, attack - defense);
        const variance = Math.random() * 0.4 + 0.8; // 0.8 - 1.2倍
        return Math.floor(baseDamage * variance);
    }

    enemyTurn() {
        this.gameState.battleTurn = 'enemy';
        
        setTimeout(() => {
            // 敵の行動選択
            const enemy = this.gameState.currentEnemy;
            let action = 'attack';
            
            // 魔法を使える敵は30%の確率で魔法を使用
            if (enemy.spells.length > 0 && Math.random() < 0.3) {
                action = 'spell';
            }
            
            if (action === 'attack') {
                const damage = this.calculateDamage(enemy.attack, this.getTotalDefense());
                this.player.hp = Math.max(0, this.player.hp - damage);
                
                this.playSound('damage');
                this.vibrate([100]);
                
                if (this.player.hp <= 0) {
                    this.showMessage(`${enemy.name}の こうげき！ ${damage}の ダメージを うけた！`, () => {
                        this.battleLose();
                    });
                } else {
                    this.updateDisplay();
                    this.updateBattleDisplay();
                    this.showMessage(`${enemy.name}の こうげき！ ${damage}の ダメージを うけた！`, () => {
                        this.gameState.battleTurn = 'player';
                    });
                }
            } else {
                // 敵の魔法攻撃
                const spellDamage = Math.floor(Math.random() * 30) + 20;
                this.player.hp = Math.max(0, this.player.hp - spellDamage);
                
                this.playSound('magic');
                this.updateDisplay();
                this.updateBattleDisplay();
                
                this.showMessage(`${enemy.name}は じゅもんを となえた！ ${spellDamage}の ダメージ！`, () => {
                    if (this.player.hp <= 0) {
                        this.battleLose();
                    } else {
                        this.gameState.battleTurn = 'player';
                    }
                });
            }
        }, 1000);
    }

    battleWin() {
        const enemy = this.gameState.currentEnemy;
        const expGained = enemy.exp;
        const goldGained = enemy.gold;
        
        this.player.exp += expGained;
        this.player.gold += goldGained;
        this.gameState.defeatedEnemies++;
        
        this.playSound('victory');
        this.vibrate([200, 100, 200]);
        
        this.showMessage(`${enemy.name}を たおした！`, () => {
            this.showMessage(`${expGained} の けいけんちと ${goldGained}G を てにいれた！`, () => {
                // レベルアップチェック
                if (this.player.exp >= this.player.nextExp) {
                    this.levelUp();
                } else {
                    this.endBattle();
                }
            });
        });
    }

    battleLose() {
        this.showMessage('あなたは しんでしまった...', () => {
            this.gameState.inBattle = false;
            this.showScreen('gameover-screen');
            this.playBGM('gameover');
        });
    }

    battleRun() {
        if (this.gameState.currentLocation === 'castle') {
            this.showMessage('にげることが できない！');
            return;
        }
        
        const runChance = 0.7 + (this.player.speed / 100);
        
        if (Math.random() < runChance) {
            this.showMessage('うまく にげることが できた！', () => {
                this.endBattle();
            });
        } else {
            this.showMessage('にげることが できなかった！', () => {
                this.enemyTurn();
            });
        }
    }

    endBattle() {
        this.gameState.inBattle = false;
        this.gameState.currentEnemy = null;
        this.gameState.battleTurn = 'player';
        
        // ドラゴンを倒した場合
        if (this.gameState.defeatedEnemies > 0 && this.gameState.currentLocation === 'castle' && !this.gameState.flags.defeatedDragon) {
            this.gameState.flags.defeatedDragon = true;
            this.showScreen('victory-screen');
            this.updateVictoryStats();
            this.playBGM('victory');
            return;
        }
        
        this.showScreen('main-screen');
        this.playBGM(this.gameState.currentLocation === 'town' ? 'town' : 'field');
        this.updateDisplay();
    }

    // 魔法システム
    showBattleMagic() {
        const magicMenu = document.getElementById('magic-battle-menu');
        const magicList = document.getElementById('magic-list');
        
        magicList.innerHTML = '';
        
        this.knownSpells.forEach(spellId => {
            const spell = this.spells[spellId];
            const magicItem = document.createElement('div');
            magicItem.className = 'magic-item';
            
            const canCast = this.player.mp >= spell.cost;
            if (!canCast) {
                magicItem.style.opacity = '0.5';
                magicItem.style.pointerEvents = 'none';
            }
            
            magicItem.innerHTML = `
                <div class="magic-name">${spell.name}</div>
                <div class="magic-cost">MP ${spell.cost}</div>
            `;
            
            if (canCast) {
                magicItem.addEventListener('click', () => this.castSpell(spellId));
            }
            
            magicList.appendChild(magicItem);
        });
        
        magicMenu.classList.remove('hidden');
    }

    castSpell(spellId) {
        const spell = this.spells[spellId];
        
        if (this.player.mp < spell.cost) {
            this.showMessage('MPが たりません！');
            return;
        }
        
        this.player.mp -= spell.cost;
        this.hideBattleSubmenus();
        
        this.playSound('magic');
        
        if (spell.effect === 'heal') {
            const healAmount = spell.power + Math.floor(Math.random() * 10);
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
            
            this.updateDisplay();
            this.updateBattleDisplay();
            
            this.showMessage(`${spell.name}！ HPが ${healAmount} かいふくした！`, () => {
                this.enemyTurn();
            });
        } else if (spell.effect === 'damage') {
            const damage = spell.power + Math.floor(Math.random() * 15);
            this.gameState.currentEnemy.hp = Math.max(0, this.gameState.currentEnemy.hp - damage);
            
            const enemy = document.querySelector('.enemy');
            enemy.classList.add('damaged');
            setTimeout(() => enemy.classList.remove('damaged'), 300);
            
            if (this.gameState.currentEnemy.hp <= 0) {
                this.updateEnemyHP();
                this.showMessage(`${spell.name}！ ${this.gameState.currentEnemy.name}に ${damage}の ダメージ！`, () => {
                    this.battleWin();
                });
            } else {
                this.updateEnemyHP();
                this.showMessage(`${spell.name}！ ${this.gameState.currentEnemy.name}に ${damage}の ダメージ！`, () => {
                    this.enemyTurn();
                });
            }
        }
    }

    showBattleItems() {
        const itemMenu = document.getElementById('item-battle-menu');
        const itemsList = document.getElementById('battle-items-list');
        
        itemsList.innerHTML = '';
        
        Object.entries(this.inventory).forEach(([itemId, count]) => {
            if (count > 0 && this.items[itemId].effect === 'heal') {
                const item = this.items[itemId];
                const itemElement = document.createElement('div');
                itemElement.className = 'battle-item';
                itemElement.innerHTML = `
                    <div class="item-name">${item.name}</div>
                    <div class="item-count">× ${count}</div>
                `;
                
                itemElement.addEventListener('click', () => this.useBattleItem(itemId));
                itemsList.appendChild(itemElement);
            }
        });
        
        itemMenu.classList.remove('hidden');
    }

    useBattleItem(itemId) {
        const item = this.items[itemId];
        
        if (this.inventory[itemId] <= 0) return;
        
        this.inventory[itemId]--;
        this.hideBattleSubmenus();
        
        if (item.effect === 'heal') {
            const healAmount = item.power;
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
            
            this.playSound('heal');
            this.updateDisplay();
            this.updateBattleDisplay();
            
            this.showMessage(`${item.name}を つかった！ HPが ${healAmount} かいふくした！`, () => {
                this.enemyTurn();
            });
        } else if (item.effect === 'mp') {
            const mpAmount = item.power;
            this.player.mp = Math.min(this.player.maxMp, this.player.mp + mpAmount);
            
            this.playSound('heal');
            this.updateDisplay();
            this.updateBattleDisplay();
            
            this.showMessage(`${item.name}を つかった！ MPが ${mpAmount} かいふくした！`, () => {
                this.enemyTurn();
            });
        }
    }

    hideBattleSubmenus() {
        document.querySelectorAll('.battle-submenu').forEach(menu => {
            menu.classList.add('hidden');
        });
    }

    // レベルアップシステム
    levelUp() {
        const oldLevel = this.player.level;
        this.player.level++;
        
        // ステータス上昇
        const hpIncrease = Math.floor(Math.random() * 15) + 10;
        const mpIncrease = Math.floor(Math.random() * 8) + 5;
        const attackIncrease = Math.floor(Math.random() * 5) + 2;
        const defenseIncrease = Math.floor(Math.random() * 4) + 2;
        
        this.player.maxHp += hpIncrease;
        this.player.hp = this.player.maxHp; // 全回復
        this.player.maxMp += mpIncrease;
        this.player.mp = this.player.maxMp; // 全回復
        this.player.attack += attackIncrease;
        this.player.defense += defenseIncrease;
        
        // 次のレベルまでのEXP更新
        this.player.nextExp = this.player.level * 100;
        
        // 新しい魔法を覚える
        const newSpell = this.checkForNewSpell(this.player.level);
        
        // レベルアップ画面表示
        document.getElementById('old-level').textContent = oldLevel;
        document.getElementById('new-level').textContent = this.player.level;
        document.getElementById('hp-increase').textContent = hpIncrease;
        document.getElementById('mp-increase').textContent = mpIncrease;
        document.getElementById('attack-increase').textContent = attackIncrease;
        document.getElementById('defense-increase').textContent = defenseIncrease;
        
        if (newSpell) {
            document.getElementById('learned-spell').classList.remove('hidden');
            document.getElementById('new-spell-name').textContent = this.spells[newSpell].name;
        } else {
            document.getElementById('learned-spell').classList.add('hidden');
        }
        
        this.playSound('levelup');
        this.showScreen('levelup-screen');
    }

    checkForNewSpell(level) {
        const spellsByLevel = {
            2: 'fire',
            5: 'healMore',
            7: 'fireMore',
            10: 'lightning'
        };
        
        const newSpell = spellsByLevel[level];
        if (newSpell && !this.knownSpells.includes(newSpell)) {
            this.knownSpells.push(newSpell);
            return newSpell;
        }
        
        return null;
    }

    closeLevelUp() {
        this.updateDisplay();
        
        if (this.gameState.inBattle) {
            this.endBattle();
        } else {
            this.showScreen('main-screen');
        }
    }

    // アイテム・ショップシステム
    useItem(itemId) {
        const item = this.items[itemId];
        
        if (this.inventory[itemId] <= 0) return;
        
        if (item.effect === 'heal') {
            if (this.player.hp >= this.player.maxHp) {
                this.showMessage('HPは まんたんです！');
                return;
            }
            
            this.inventory[itemId]--;
            const healAmount = item.power;
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
            
            this.playSound('heal');
            this.updateDisplay();
            this.showMessage(`${item.name}を つかった！ HPが ${healAmount} かいふくした！`);
        } else if (item.effect === 'mp') {
            if (this.player.mp >= this.player.maxMp) {
                this.showMessage('MPは まんたんです！');
                return;
            }
            
            this.inventory[itemId]--;
            const mpAmount = item.power;
            this.player.mp = Math.min(this.player.maxMp, this.player.mp + mpAmount);
            
            this.playSound('heal');
            this.updateDisplay();
            this.showMessage(`${item.name}を つかった！ MPが ${mpAmount} かいふくした！`);
        }
        
        this.updateItemsDisplay();
    }

    buyItem(itemId, price) {
        if (this.player.gold < price) {
            this.showMessage('おかねが たりません！');
            return;
        }
        
        this.player.gold -= price;
        
        if (this.inventory[itemId]) {
            this.inventory[itemId]++;
        } else {
            this.inventory[itemId] = 1;
        }
        
        const item = this.items[itemId];
        this.playSound('buy');
        this.showMessage(`${item.name}を かいました！`);
        this.updateDisplay();
        this.updateShopDisplay();
    }

    switchShopTab(tab) {
        document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.shop-content').forEach(c => c.classList.add('hidden'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`shop-${tab}`).classList.remove('hidden');
        
        if (tab === 'sell') {
            this.updateSellItems();
        }
    }

    updateSellItems() {
        const sellItems = document.getElementById('sell-items');
        sellItems.innerHTML = '';
        
        Object.entries(this.inventory).forEach(([itemId, count]) => {
            if (count > 0) {
                const item = this.items[itemId];
                const sellItem = document.createElement('div');
                sellItem.className = 'shop-item';
                sellItem.innerHTML = `
                    <div class="shop-item-info">
                        <div class="shop-item-name">${item.name} × ${count}</div>
                        <div class="shop-item-desc">${item.desc}</div>
                    </div>
                    <div class="shop-item-price">${item.sellPrice}G</div>
                    <button class="sell-btn" data-item="${itemId}">うる</button>
                `;
                
                const sellBtn = sellItem.querySelector('.sell-btn');
                sellBtn.addEventListener('click', () => this.sellItem(itemId));
                
                sellItems.appendChild(sellItem);
            }
        });
    }

    sellItem(itemId) {
        if (this.inventory[itemId] <= 0) return;
        
        const item = this.items[itemId];
        this.inventory[itemId]--;
        this.player.gold += item.sellPrice;
        
        this.playSound('buy');
        this.showMessage(`${item.name}を ${item.sellPrice}Gで うりました！`);
        this.updateDisplay();
        this.updateSellItems();
        this.updateShopDisplay();
    }

    // ユーティリティ関数
    getTotalAttack() {
        let total = this.player.attack;
        if (this.equipment.weapon) {
            total += this.items[this.equipment.weapon].power;
        }
        if (this.equipment.accessory) {
            total += this.items[this.equipment.accessory].power;
        }
        return total;
    }

    getTotalDefense() {
        let total = this.player.defense;
        if (this.equipment.armor) {
            total += this.items[this.equipment.armor].power;
        }
        return total;
    }

    // 設定関連
    updateVolume(value) {
        this.settings.volume = parseInt(value);
        document.getElementById('volume-value').textContent = value;
        this.updateBGMVolume();
    }

    updateTextSpeed(value) {
        this.settings.textSpeed = value;
    }

    updateAutoSave(value) {
        this.settings.autoSave = value;
    }

    // 音響システム
    playSound(type) {
        if (this.settings.volume === 0) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            let frequency, duration, waveType = 'square';
            
            switch (type) {
                case 'attack':
                    frequency = 200;
                    duration = 0.1;
                    break;
                case 'damage':
                    frequency = 150;
                    duration = 0.2;
                    waveType = 'sawtooth';
                    break;
                case 'heal':
                    frequency = 400;
                    duration = 0.3;
                    waveType = 'sine';
                    break;
                case 'magic':
                    frequency = 600;
                    duration = 0.4;
                    waveType = 'triangle';
                    break;
                case 'victory':
                    frequency = 800;
                    duration = 0.5;
                    waveType = 'sine';
                    break;
                case 'levelup':
                    frequency = 1000;
                    duration = 0.8;
                    waveType = 'sine';
                    break;
                case 'buy':
                    frequency = 500;
                    duration = 0.2;
                    break;
                case 'move':
                    frequency = 300;
                    duration = 0.1;
                    break;
                default:
                    return;
            }
            
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            oscillator.type = waveType;
            
            const volume = (this.settings.volume / 100) * 0.1;
            gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + duration);
        } catch (error) {
            console.log('音声再生エラー:', error);
        }
    }

    playBGM(type) {
        // 実際の実装では音楽ファイルを再生
        console.log(`BGM: ${type} を再生`);
    }

    updateBGMVolume() {
        // BGMボリューム調整
        const volume = this.settings.volume / 100;
        document.querySelectorAll('audio').forEach(audio => {
            audio.volume = volume;
        });
    }

    // バイブレーション（スマホ対応）
    vibrate(pattern) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }

    // セーブ・ロードシステム
    saveGame() {
        const saveData = {
            player: this.player,
            inventory: this.inventory,
            equipment: this.equipment,
            knownSpells: this.knownSpells,
            gameState: this.gameState,
            settings: this.settings,
            version: '1.0'
        };
        
        try {
            localStorage.setItem('advancedRPGSave', JSON.stringify(saveData));
            this.showMessage('ゲームを セーブしました！');
        } catch (error) {
            this.showMessage('セーブに しっぱいしました...');
        }
    }

    loadGame() {
        try {
            const saveData = localStorage.getItem('advancedRPGSave');
            if (!saveData) return false;
            
            const data = JSON.parse(saveData);
            
            this.player = { ...this.player, ...data.player };
            this.inventory = { ...this.inventory, ...data.inventory };
            this.equipment = { ...this.equipment, ...data.equipment };
            this.knownSpells = data.knownSpells || ['heal'];
            this.gameState = { ...this.gameState, ...data.gameState };
            this.settings = { ...this.settings, ...data.settings };
            
            // ゲーム開始時間を調整
            this.gameState.gameStartTime = Date.now() - (this.gameState.playTime * 1000);
            
            return true;
        } catch (error) {
            console.log('ロードエラー:', error);
            return false;
        }
    }

    continueFromGameOver() {
        // ゲームオーバーから復活
        this.player.hp = Math.floor(this.player.maxHp / 2);
        this.player.gold = Math.floor(this.player.gold / 2);
        this.gameState.currentLocation = 'town';
        
        this.showScreen('main-screen');
        this.playBGM('town');
        this.updateDisplay();
        this.showMessage('きがついた... ここは まちの しんでんだ...');
    }

    updateVictoryStats() {
        document.getElementById('final-level').textContent = this.player.level;
        
        const hours = Math.floor(this.gameState.playTime / 3600);
        const minutes = Math.floor((this.gameState.playTime % 3600) / 60);
        document.getElementById('play-time').textContent = `${hours}:${minutes.toString().padStart(2, '0')}`;
        
        document.getElementById('defeated-enemies').textContent = this.gameState.defeatedEnemies;
    }

    // キーボード操作
    handleKeyboard(event) {
        if (this.isTyping) return;
        
        const key = event.key.toLowerCase();
        
        switch (this.currentScreen) {
            case 'main-screen':
                this.handleMainScreenKeys(key);
                break;
            case 'battle-screen':
                this.handleBattleKeys(key);
                break;
            case 'menu-screen':
                this.handleMenuKeys(key);
                break;
        }
    }

    handleMainScreenKeys(key) {
        switch (key) {
            case 'enter':
            case ' ':
                this.performAction();
                break;
            case 'escape':
                this.showScreen('menu-screen');
                break;
            case 'arrowup':
            case 'w':
                this.movePlayer('up');
                break;
            case 'arrowdown':
            case 's':
                this.movePlayer('down');
                break;
            case 'arrowleft':
            case 'a':
                this.movePlayer('left');
                break;
            case 'arrowright':
            case 'd':
                this.movePlayer('right');
                break;
        }
    }

    handleBattleKeys(key) {
        if (this.gameState.battleTurn !== 'player') return;
        
        switch (key) {
            case '1':
                this.battleAttack();
                break;
            case '2':
                this.showBattleMagic();
                break;
            case '3':
                this.showBattleItems();
                break;
            case '4':
                this.battleRun();
                break;
            case 'escape':
                this.hideBattleSubmenus();
                break;
        }
    }

    handleMenuKeys(key) {
        switch (key) {
            case 'escape':
                this.showScreen('main-screen');
                break;
            case '1':
                this.showScreen('status-screen');
                break;
            case '2':
                this.showScreen('items-screen');
                break;
        }
    }

    // タッチ操作
    handleTouch(event) {
        // ダブルタップズーム防止
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    }

    // メニュー機能
    showMagicMenu() {
        // 魔法メニューの表示（非戦闘時）
        this.showMessage('つかいたい じゅもんを えらんでください。');
        // 実装は省略（戦闘時と同様の処理）
    }

    showEquipMenu() {
        // 装備メニューの表示
        this.showMessage('そうびを へんこうできます。');
        // 実装は省略
    }

    // デバッグ機能
    debug() {
        this.player.level = 20;
        this.player.hp = this.player.maxHp = 999;
        this.player.mp = this.player.maxMp = 999;
        this.player.gold = 9999;
        this.player.attack = 100;
        this.player.defense = 100;
        
        Object.keys(this.items).forEach(itemId => {
            this.inventory[itemId] = 99;
        });
        
        this.knownSpells = Object.keys(this.spells);
        
        this.updateDisplay();
        this.showMessage('デバッグモード: 最強ステータスになりました！');
    }
}

// ゲーム初期化
let game;

document.addEventListener('DOMContentLoaded', () => {
    // ローディング画面表示
    document.getElementById('loading-screen').classList.remove('hidden');
    
    // プログレスバーアニメーション
    const progressBar = document.getElementById('loading-progress');
    let progress = 0;
    
    const loadingInterval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);
            
            // ゲーム開始
            setTimeout(() => {
                document.getElementById('loading-screen').classList.add('hidden');
                game = new AdvancedRPGGame();
            }, 500);
        }
        progressBar.style.width = `${progress}%`;
    }, 200);
});

// ページ終了時の自動セーブ
window.addEventListener('beforeunload', () => {
    if (game && game.settings.autoSave) {
        game.saveGame();
    }
});

// 画面の向き変更対応
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 100);
});

// PWA対応（Service Worker）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// コンソールからのデバッグコマンド
window.debugRPG = () => {
    if (game) {
        game.debug();
    }
};

// エクスポート（モジュール対応）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedRPGGame;
}
