/**
 * Танчики - Ретро Аркада
 * Полная улучшенная версия game.js
 */

// ==================== КОНФИГУРАЦИЯ И КОНСТАНТЫ ====================

const GameConfig = {
    CANVAS: {
        WIDTH: 800,
        HEIGHT: 600,
        ASPECT_RATIO: 4/3
    },
    PERFORMANCE: {
        UPDATE_INTERVAL: 1000 / 60,
        MAX_EXPLOSIONS: 20,
        MAX_PARTICLES: 40,
        MAX_BONUS_NOTIFICATIONS: 5,
        MAX_BULLETS: 50
    },
    GAME: {
        TANK_SPEED: 3,
        BULLET_SPEED: 7,
        CANNON_RECOIL: 5,
        CANNON_RECOVERY: 0.5,
        BONUS_SPAWN_INTERVAL: 10000,
        PLAYER_INVULNERABILITY_TIME: 120
    }
};

const DIFFICULTY_LEVELS = {
    easy: {
        name: "ЛЁГКАЯ",
        enemySpeed: 1.0,
        enemyShootChance: 0.01,
        initialEnemies: 3,
        enemyIncrement: 1,
        bonusChance: 0.4,
        playerSpeed: 3.5,
        playerLives: 4,
        color: "#0f0"
    },
    normal: {
        name: "НОРМАЛЬНАЯ",
        enemySpeed: 1.5,
        enemyShootChance: 0.02,
        initialEnemies: 5,
        enemyIncrement: 2,
        bonusChance: 0.3,
        playerSpeed: 3.0,
        playerLives: 3,
        color: "#ff0"
    },
    hard: {
        name: "СЛОЖНАЯ",
        enemySpeed: 2.0,
        enemyShootChance: 0.03,
        initialEnemies: 7,
        enemyIncrement: 3,
        bonusChance: 0.2,
        playerSpeed: 2.5,
        playerLives: 2,
        color: "#ff8000"
    },
    expert: {
        name: "ЭКСПЕРТ",
        enemySpeed: 2.5,
        enemyShootChance: 0.04,
        initialEnemies: 10,
        enemyIncrement: 4,
        bonusChance: 0.1,
        playerSpeed: 2.0,
        playerLives: 1,
        color: "#f00"
    }
};

const COLORS = {
    BLACK: '#000',
    WHITE: '#fff',
    GREEN: '#0f0',
    RED: '#f00',
    BLUE: '#00f',
    GRAY: '#888',
    BROWN: '#8B4513',
    DARK_GREEN: '#006400',
    YELLOW: '#ff0',
    ORANGE: '#ffa500',
    PURPLE: '#800080',
    DARK_RED: '#600',
    DARK_BROWN: '#643200'
};

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ИНИЦИАЛИЗАЦИЯ ====================

const GameState = {
    player: null,
    bullets: [],
    enemies: [],
    walls: [],
    explosions: [],
    bonuses: [],
    bonusNotifications: [],
    gameOver: false,
    gamePaused: false,
    score: 0,
    playerLives: 3,
    gameLevel: 1,
    enemiesToKill: 5,
    lastBonusTime: 0,
    lastMoveSound: 0,
    lastUpdateTime: 0,
    frameCount: 0,
    lastFpsUpdate: 0,
    currentFPS: 0,
    isMobile: false,
    activeDirections: new Set(),
    isShooting: false,
    autoShootInterval: null,
    currentDifficulty: 'normal',
    graphicsSettings: {
        explosions: true,
        particleDensity: 'medium',
        screenShake: true,
        frameRateTarget: 60
    }
};

// ==================== СИСТЕМА УТИЛИТ ====================

class Utils {
    static isVisible(object) {
        return object.x < canvas.width && 
               object.x + object.width > 0 &&
               object.y < canvas.height &&
               object.y + object.height > 0;
    }
    
    static createVector(x, y) {
        return { x, y };
    }
    
    static distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
    
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    static random(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    static debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
}

// ==================== СИСТЕМА КОЛЛИЗИЙ ====================

class CollisionSystem {
    constructor(cellSize = 100) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }
    
    getCellKey(x, y) {
        return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
    }
    
    insert(object) {
        const key = this.getCellKey(object.x, object.y);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key).push(object);
    }
    
    getNearby(x, y, radius = this.cellSize) {
        const centerX = Math.floor(x / this.cellSize);
        const centerY = Math.floor(y / this.cellSize);
        const keys = [];
        
        const range = Math.ceil(radius / this.cellSize);
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                keys.push(`${centerX + dx},${centerY + dy}`);
            }
        }
        
        const nearby = [];
        keys.forEach(key => {
            if (this.grid.has(key)) {
                nearby.push(...this.grid.get(key));
            }
        });
        return nearby;
    }
    
    clear() {
        this.grid.clear();
    }
}

// ==================== СИСТЕМА ГРАФИКИ ====================

class GraphicsManager {
    constructor() {
        this.settings = {
            explosions: true,
            particleDensity: 'medium',
            screenShake: true,
            frameRateTarget: 60,
            lowSpecMode: false
        };
        
        // Откладываем загрузку настроек до полной инициализации
        setTimeout(() => {
            this.loadSettings();
        }, 100);
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('tankGraphicsSettings');
            if (saved) {
                Object.assign(this.settings, JSON.parse(saved));
            }
        } catch (e) {
            console.warn('Ошибка загрузки настроек графики:', e);
            this.resetToDefaults();
        }
        this.applySettings();
    }
    
    saveSettings() {
        try {
            localStorage.setItem('tankGraphicsSettings', JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Ошибка сохранения настроек графики:', e);
        }
    }
    
    applySettings() {
        // Проверяем, что GameState уже инициализирован
        if (typeof GameState !== 'undefined') {
            GameState.graphicsSettings = { ...this.settings };
            
            const targetFPS = this.settings.frameRateTarget === 0 ? 144 : this.settings.frameRateTarget;
            GameConfig.PERFORMANCE.UPDATE_INTERVAL = 1000 / targetFPS;
            
            if (!this.settings.explosions) {
                GameState.explosions = [];
            }
        }
    }
    
    getParticleLimit() {
        const limits = {
            'low': 8,
            'medium': 20,
            'high': 40
        };
        return limits[this.settings.particleDensity] || 20;
    }
    
    getScreenShakeIntensity() {
        return this.settings.screenShake ? 1 : 0;
    }
    
    resetToDefaults() {
        this.settings = {
            explosions: true,
            particleDensity: 'medium',
            screenShake: true,
            frameRateTarget: 60,
            lowSpecMode: false
        };
    }
}

// ==================== БАЗОВЫЕ КЛАССЫ ИГРОВЫХ ОБЪЕКТОВ ====================

class GameObject {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.active = true;
    }
    
    update() {
        // Переопределяется в дочерних классах
    }
    
    draw() {
        // Переопределяется в дочерних классах
    }
    
    collidesWith(other) {
        return this.x < other.x + other.width &&
               this.x + this.width > other.x &&
               this.y < other.y + other.height &&
               this.y + this.height > other.y;
    }
    
    destroy() {
        this.active = false;
    }
}

class Tank extends GameObject {
    constructor(x, y, color, isPlayer = false) {
        super(x, y, 32, 32);
        this.color = color;
        this.isPlayer = isPlayer;
        this.direction = 0;
        this.aimDirection = 0;
        this.cooldown = 0;
        
        const difficulty = DIFFICULTY_LEVELS[GameState.currentDifficulty];
        this.speed = isPlayer ? difficulty.playerSpeed : difficulty.enemySpeed;
        
        this.moveCooldown = 0;
        this.lastPlayerPos = Utils.createVector(0, 0);
        this.cannonOffset = 0;
        this.health = 1;
        this.invulnerable = 0;
        this.lastPosition = Utils.createVector(x, y);
    }
    
    update(walls, playerPos = null) {
        if (!this.active) return;
        
        if (playerPos) {
            this.lastPlayerPos = playerPos;
        }
        
        if (this.invulnerable > 0) {
            this.invulnerable--;
        }
        
        this.lastPosition.x = this.x;
        this.lastPosition.y = this.y;
        
        if (this.isPlayer) {
            this.updatePlayer();
        } else {
            this.updateEnemy();
        }
        
        this.handleWallCollisions(walls);
        
        if (this.cooldown > 0) this.cooldown--;
        if (this.cannonOffset > 0) this.cannonOffset -= GameConfig.GAME.CANNON_RECOVERY;
    }
    
    updatePlayer() {
        if (GameState.isMobile && GameState.activeDirections.size > 0) {
            this.handleMobileInput();
        } else {
            this.handleKeyboardInput();
        }
    }
    
    handleMobileInput() {
        GameState.activeDirections.forEach(direction => {
            switch(direction) {
                case 'up':
                    this.y -= this.speed;
                    this.direction = 0;
                    break;
                case 'down':
                    this.y += this.speed;
                    this.direction = 2;
                    break;
                case 'left':
                    this.x -= this.speed;
                    this.direction = 3;
                    break;
                case 'right':
                    this.x += this.speed;
                    this.direction = 1;
                    break;
            }
        });
        
        this.aimDirection = this.direction;
        this.playMoveSound();
    }
    
    handleKeyboardInput() {
        const moved = this.processMovement();
        this.processAiming();
        if (moved) this.playMoveSound();
    }
    
    processMovement() {
        let moved = false;
        
        if (keys['w']) {
            this.y -= this.speed;
            this.direction = 0;
            moved = true;
        }
        if (keys['s']) {
            this.y += this.speed;
            this.direction = 2;
            moved = true;
        }
        if (keys['a']) {
            this.x -= this.speed;
            this.direction = 3;
            moved = true;
        }
        if (keys['d']) {
            this.x += this.speed;
            this.direction = 1;
            moved = true;
        }
        
        return moved;
    }
    
    processAiming() {
        if (keys['arrowup']) this.aimDirection = 0;
        if (keys['arrowright']) this.aimDirection = 1;
        if (keys['arrowdown']) this.aimDirection = 2;
        if (keys['arrowleft']) this.aimDirection = 3;
    }
    
    playMoveSound() {
        const now = Date.now();
        if ((this.x !== this.lastPosition.x || this.y !== this.lastPosition.y) && 
            now - GameState.lastMoveSound > 200) {
            soundSystem.play('move');
            GameState.lastMoveSound = now;
        }
    }
    
    updateEnemy() {
        this.moveCooldown--;
        
        if (this.moveCooldown <= 0) {
            this.updateEnemyDirection();
            this.moveCooldown = Utils.randomInt(30, 90);
        }
        
        this.moveInCurrentDirection();
        this.updateEnemyAiming();
        this.tryShoot();
    }
    
    updateEnemyDirection() {
        const dx = this.lastPlayerPos.x - this.x;
        const dy = this.lastPlayerPos.y - this.y;
        
        if (Math.random() < 0.8) {
            if (Math.abs(dx) > Math.abs(dy)) {
                this.direction = dx > 0 ? 1 : 3;
            } else {
                this.direction = dy > 0 ? 2 : 0;
            }
        } else {
            this.direction = Math.floor(Math.random() * 4);
        }
    }
    
    moveInCurrentDirection() {
        switch(this.direction) {
            case 0: this.y -= this.speed; break;
            case 1: this.x += this.speed; break;
            case 2: this.y += this.speed; break;
            case 3: this.x -= this.speed; break;
        }
    }
    
    updateEnemyAiming() {
        const dx = this.lastPlayerPos.x - this.x;
        const dy = this.lastPlayerPos.y - this.y;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            this.aimDirection = dx > 0 ? 1 : 3;
        } else {
            this.aimDirection = dy > 0 ? 2 : 0;
        }
    }
    
    tryShoot() {
        const difficulty = DIFFICULTY_LEVELS[GameState.currentDifficulty];
        if (Math.random() < difficulty.enemyShootChance) {
            const bullet = this.shoot();
            if (bullet) {
                GameState.bullets.push(bullet);
            }
        }
    }
    
    handleWallCollisions(walls) {
        const boundaryMargin = 20;
        const boundaries = [
            this.x < boundaryMargin,
            this.x > canvas.width - this.width - boundaryMargin,
            this.y < boundaryMargin,
            this.y > canvas.height - this.height - boundaryMargin
        ];
        
        if (boundaries.some(b => b) || walls.some(wall => this.collidesWith(wall))) {
            this.x = this.lastPosition.x;
            this.y = this.lastPosition.y;
            
            if (!this.isPlayer) {
                this.direction = Math.floor(Math.random() * 4);
                this.moveCooldown = 20;
            }
        }
    }
    
    draw() {
        if (!Utils.isVisible(this)) return;
        
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        
        if (this.invulnerable > 0 && Math.floor(this.invulnerable / 5) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        this.drawTankBody();
        this.drawCannon();
        
        ctx.restore();
        ctx.globalAlpha = 1;
    }
    
    drawTankBody() {
        ctx.rotate(this.direction * Math.PI/2);
        
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2 + 4, -this.height/2 + 4, this.width - 8, this.height - 8);
        
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width/2 + 4, -this.height/2 + 4, this.width - 8, this.height - 8);
        
        ctx.fillStyle = this.isPlayer ? COLORS.DARK_GREEN : COLORS.DARK_RED;
        ctx.fillRect(-this.width/2 + 8, -this.height/2 + 8, this.width - 16, this.height - 16);
        
        ctx.rotate(-this.direction * Math.PI/2);
    }
    
    drawCannon() {
        ctx.rotate(this.aimDirection * Math.PI/2);
        
        const cannonLength = 16 - this.cannonOffset;
        ctx.fillStyle = this.isPlayer ? COLORS.DARK_GREEN : '#900';
        ctx.fillRect(-2, -this.height/2 - cannonLength + 8, 4, cannonLength);
        
        ctx.rotate(-this.aimDirection * Math.PI/2);
    }
    
   shoot() {
    if (this.cooldown === 0) {
        this.cooldown = 30;
        this.cannonOffset = GameConfig.GAME.CANNON_RECOIL;
        
        // ИСПРАВЛЕНИЕ: Убедимся, что звуковая система работает
        if (soundSystem && typeof soundSystem.play === 'function') {
            try {
                soundSystem.play('shoot');
            } catch (e) {
                console.log('Sound error:', e);
            }
        }
        
        const bullet = this.createBullet();
        console.log('Shooting bullet:', bullet); // Для отладки
        return bullet;
    }
    console.log('Cooldown active:', this.cooldown); // Для отладки
    return null;
}
    
    createBullet() {
    const shootDir = this.aimDirection;
    let bulletX, bulletY;
    
    // ИСПРАВЛЕНИЕ: Правильное позиционирование пули
    switch(shootDir) {
        case 0: // up
            bulletX = this.x + this.width/2 - 3;
            bulletY = this.y - 6;
            break;
        case 1: // right
            bulletX = this.x + this.width;
            bulletY = this.y + this.height/2 - 3;
            break;
        case 2: // down
            bulletX = this.x + this.width/2 - 3;
            bulletY = this.y + this.height;
            break;
        case 3: // left
            bulletX = this.x - 6;
            bulletY = this.y + this.height/2 - 3;
            break;
    }
    
    console.log(`Creating bullet at ${bulletX}, ${bulletY} direction ${shootDir}`);
    return new Bullet(bulletX, bulletY, shootDir, this.isPlayer);
}
    
    takeDamage() {
        if (this.invulnerable > 0) return false;
        
        this.health--;
        if (this.health <= 0) {
            return true;
        }
        
        soundSystem.play('hit');
        
        if (this.isPlayer) {
            this.invulnerable = GameConfig.GAME.PLAYER_INVULNERABILITY_TIME;
        }
        return false;
    }
}

class Bullet extends GameObject {
    constructor(x, y, direction, isPlayer) {
        super(x, y, 6, 6);
        this.direction = direction;
        this.isPlayer = isPlayer;
        this.speed = GameConfig.GAME.BULLET_SPEED;
        this.power = 1;
    }
    
    update() {
        switch(this.direction) {
            case 0: this.y -= this.speed; break;
            case 1: this.x += this.speed; break;
            case 2: this.y += this.speed; break;
            case 3: this.x -= this.speed; break;
        }
        
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.destroy();
            return false;
        }
        
        return this.active;
    }
    
    draw() {
        if (!Utils.isVisible(this)) return;
        
        ctx.fillStyle = this.isPlayer ? COLORS.WHITE : COLORS.RED;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = this.isPlayer ? COLORS.YELLOW : COLORS.ORANGE;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width/4, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Wall extends GameObject {
    constructor(x, y, width, height, destructible = false) {
        super(x, y, width, height);
        this.destructible = destructible;
        this.health = destructible ? 1 : Infinity;
    }
    
    draw() {
        if (!Utils.isVisible(this)) return;
        
        if (this.destructible) {
            ctx.fillStyle = COLORS.BROWN;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            ctx.strokeStyle = COLORS.DARK_BROWN;
            ctx.lineWidth = 1;
            for (let i = 0; i < this.width; i += 4) {
                ctx.beginPath();
                ctx.moveTo(this.x + i, this.y);
                ctx.lineTo(this.x + i, this.y + this.height);
                ctx.stroke();
            }
            for (let j = 0; j < this.height; j += 4) {
                ctx.beginPath();
                ctx.moveTo(this.x, this.y + j);
                ctx.lineTo(this.x + this.width, this.y + j);
                ctx.stroke();
            }
        } else {
            ctx.fillStyle = COLORS.GRAY;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 1;
            for (let i = 0; i < this.width; i += 6) {
                ctx.beginPath();
                ctx.moveTo(this.x + i, this.y);
                ctx.lineTo(this.x + i, this.y + this.height);
                ctx.stroke();
            }
            for (let j = 0; j < this.height; j += 6) {
                ctx.beginPath();
                ctx.moveTo(this.x, this.y + j);
                ctx.lineTo(this.x + this.width, this.y + j);
                ctx.stroke();
            }
        }
    }
}

class Bonus extends GameObject {
    constructor(x, y) {
        super(x, y, 20, 20);
        this.type = Math.floor(Math.random() * 3);
        this.life = 300;
    }
    
    update() {
        this.life--;
        return this.life > 0;
    }
    
    draw() {
        if (!Utils.isVisible(this)) return;
        
        if (this.life < 60 && Math.floor(this.life / 10) % 2 === 0) {
            return;
        }
        
        ctx.fillStyle = this.getColor();
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.strokeStyle = COLORS.WHITE;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = COLORS.WHITE;
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.getSymbol(), this.x + this.width/2, this.y + this.height/2);
    }
    
    getColor() {
        switch(this.type) {
            case 0: return COLORS.RED;
            case 1: return COLORS.BLUE;
            case 2: return COLORS.PURPLE;
            default: return COLORS.YELLOW;
        }
    }
    
    getSymbol() {
        switch(this.type) {
            case 0: return '♥';
            case 1: return '⚡';
            case 2: return '★';
            default: return '?';
        }
    }
    
    applyBonus(tank) {
        soundSystem.play('bonus');
        
        switch(this.type) {
            case 0:
                if (tank.isPlayer) {
                    GameState.playerLives++;
                    showBonusNotification("+1 ЖИЗНЬ");
                }
                break;
            case 1:
                tank.speed += 1;
                setTimeout(() => {
                    if (tank.speed > (tank.isPlayer ? DIFFICULTY_LEVELS[GameState.currentDifficulty].playerSpeed : DIFFICULTY_LEVELS[GameState.currentDifficulty].enemySpeed)) {
                        tank.speed -= 1;
                    }
                }, 10000);
                showBonusNotification("СКОРОСТЬ ПОВЫШЕНА");
                break;
            case 2:
                showBonusNotification("МОЩНОСТЬ ПОВЫШЕНА");
                break;
        }
    }
}

class EnhancedExplosion {
    constructor(x, y, size = 1, type = 'normal') {
        this.x = x;
        this.y = y;
        this.size = size;
        this.type = type;
        this.life = 1.0;
        this.stage = 0;
        this.particles = [];
        this.lightFlash = 1.0;
        this.screenShake = 0;
        
        this.initExplosion();
        
        if (GameState.graphicsSettings.explosions) {
            soundSystem.play('explosion');
        }
    }
    
    initExplosion() {
        if (!GameState.graphicsSettings.explosions) return;
        
        const particleLimit = graphicsManager.getParticleLimit();
        
        this.radius = 10 * this.size;
        this.maxRadius = 40 * this.size;
        this.growing = true;
        
        const baseParticles = Math.min(15 * this.size, particleLimit);
        
        for (let i = 0; i < baseParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            const life = 0.8 + Math.random() * 0.4;
            
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: life,
                maxLife: life,
                size: 1 + Math.random() * 3,
                color: this.getParticleColor(),
                type: 'debris'
            });
        }
        
        if (this.size > 1) {
            this.lightFlash = 1.0;
            this.screenShake = 5 * this.size * graphicsManager.getScreenShakeIntensity();
            
            const extraParticles = Math.min(10 * this.size, particleLimit / 2);
            for (let i = 0; i < extraParticles; i++) {
                this.particles.push({
                    x: this.x,
                    y: this.y,
                    vx: (Math.random() - 0.5) * 8,
                    vy: (Math.random() - 0.5) * 8,
                    life: 1.2 + Math.random() * 0.8,
                    maxLife: 1.2 + Math.random() * 0.8,
                    size: 2 + Math.random() * 4,
                    color: this.getSecondaryColor(),
                    type: 'fire'
                });
            }
        }
    }
    
    getParticleColor() {
        const colors = ['#FFA500', '#FF4500', '#FFFF00', '#FF6347'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    getSecondaryColor() {
        const colors = ['#FF0000', '#FF8C00', '#DC143C', '#B22222'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    update() {
        if (!GameState.graphicsSettings.explosions) return false;
        
        if (this.growing) {
            this.radius += 3;
            if (this.radius >= this.maxRadius) {
                this.growing = false;
                this.stage = 1;
            }
        } else if (this.stage === 1) {
            this.life -= 0.02;
            if (this.life <= 0.7) {
                this.stage = 2;
            }
        } else if (this.stage === 2) {
            this.life -= 0.03;
        }
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            
            p.life -= 0.02;
            p.vx *= 0.97;
            p.vy *= 0.97;
            
            p.size *= 0.98;
            
            if (p.life <= 0 || p.size < 0.1) {
                this.particles.splice(i, 1);
            }
        }
        
        this.lightFlash *= 0.9;
        this.screenShake *= 0.8;
        
        return this.life > 0 || this.particles.length > 0 || this.screenShake > 0.1;
    }
    
    draw() {
        if (!GameState.graphicsSettings.explosions) return;
        
        const alpha = this.life;
        
        if (this.growing || this.life > 0) {
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.radius
            );
            
            if (this.type === 'normal') {
                gradient.addColorStop(0, `rgba(255, 255, 0, ${alpha * 0.8})`);
                gradient.addColorStop(0.3, `rgba(255, 165, 0, ${alpha * 0.6})`);
                gradient.addColorStop(0.6, `rgba(255, 69, 0, ${alpha * 0.4})`);
                gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
            } else {
                gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
                gradient.addColorStop(0.2, `rgba(255, 255, 0, ${alpha * 0.7})`);
                gradient.addColorStop(0.5, `rgba(255, 69, 0, ${alpha * 0.5})`);
                gradient.addColorStop(1, `rgba(139, 0, 0, 0)`);
            }
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        for (const p of this.particles) {
            const particleAlpha = p.life / p.maxLife;
            
            if (p.type === 'fire') {
                const gradient = ctx.createRadialGradient(
                    p.x, p.y, 0,
                    p.x, p.y, p.size
                );
                gradient.addColorStop(0, `rgba(255, 255, 0, ${particleAlpha})`);
                gradient.addColorStop(0.7, `rgba(255, 69, 0, ${particleAlpha * 0.7})`);
                gradient.addColorStop(1, `rgba(139, 0, 0, 0)`);
                
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = p.color + Math.floor(particleAlpha * 255).toString(16).padStart(2, '0');
            }
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (this.lightFlash > 0.01 && this.size > 1) {
            ctx.fillStyle = `rgba(255, 255, 200, ${this.lightFlash * 0.3})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    getScreenShake() {
        if (!GameState.graphicsSettings.screenShake) return { x: 0, y: 0 };
        
        return {
            x: (Math.random() - 0.5) * this.screenShake,
            y: (Math.random() - 0.5) * this.screenShake
        };
    }
}

// ==================== СИСТЕМА УПРАВЛЕНИЯ УРОВНЯМИ ====================

class LevelManager {
    static createLevel() {
        const walls = [];
        
        walls.push(...this.createBoundaries());
        walls.push(...this.createStaticWalls());
        walls.push(...this.createDestructibleWalls());
        
        return walls;
    }
    
    static createBoundaries() {
        return [
            new Wall(0, 0, canvas.width, 20, false),
            new Wall(0, 0, 20, canvas.height, false),
            new Wall(0, canvas.height - 20, canvas.width, 20, false),
            new Wall(canvas.width - 20, 0, 20, canvas.height, false)
        ];
    }
    
    static createStaticWalls() {
        const positions = [
            [200, 150], [400, 100], [600, 200],
            [100, 400], [300, 350], [500, 450],
            [150, 250], [350, 300], [550, 150]
        ];
        
        return positions.map(([x, y]) => new Wall(x, y, 40, 40, false));
    }
    
    static createDestructibleWalls() {
        const walls = [];
        const playerSafeZone = 150;
        
        for (let i = 0; i < 25; i++) {
            let validPosition = false;
            let x, y;
            
            while (!validPosition) {
                x = Utils.randomInt(50, canvas.width - 80);
                y = Utils.randomInt(50, canvas.height - 80);
                
                if (Math.abs(x - 100) > playerSafeZone || Math.abs(y - canvas.height/2) > playerSafeZone) {
                    validPosition = true;
                }
            }
            
            walls.push(new Wall(x, y, 30, 30, true));
        }
        
        return walls;
    }
    
    static spawnEnemies(count) {
        const enemies = [];
        
        for (let i = 0; i < count; i++) {
            const enemy = this.createEnemyAtValidPosition();
            if (enemy) enemies.push(enemy);
        }
        
        return enemies;
    }
    
    static createEnemyAtValidPosition() {
        const maxAttempts = 50;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const x = Utils.randomInt(canvas.width / 2 + 50, canvas.width - 70);
            const y = Utils.randomInt(70, canvas.height - 140);
            const enemy = new Tank(x, y, COLORS.RED);
            
            if (this.isValidEnemyPosition(enemy)) {
                return enemy;
            }
        }
        
        console.warn('Не удалось найти валидную позицию для врага');
        return null;
    }
    
    static isValidEnemyPosition(enemy) {
        return !GameState.walls.some(wall => enemy.collidesWith(wall));
    }
}

// ==================== ОСНОВНОЙ КЛАСС ИГРЫ ====================

class GameManager {
    static init() {
        this.setupDOMReferences();
        this.setupEventListeners();
        this.setupMobileControls();
        this.setDifficulty('normal');
        
        window.addEventListener('resize', Utils.throttle(this.handleResize.bind(this), 250));
        window.addEventListener('orientationchange', this.handleResize.bind(this));
        
        this.initGraphicsScreen();
        this.gameLoop();
    }
    
    static setupDOMReferences() {
        this.dom = {
            score: document.getElementById('score'),
            lives: document.getElementById('lives'),
            level: document.getElementById('level'),
            enemies: document.getElementById('enemies'),
            gameOverScreen: document.getElementById('gameOverScreen'),
            finalScore: document.getElementById('finalScore'),
            pauseScreen: document.getElementById('pauseScreen'),
            soundToggle: document.getElementById('soundToggle'),
            levelCompleteScreen: document.getElementById('levelCompleteScreen'),
            completedLevel: document.getElementById('completedLevel'),
            levelScore: document.getElementById('levelScore'),
            difficultyBadge: document.getElementById('difficultyBadge'),
            mobileControls: document.getElementById('mobileControls'),
            mobileShoot: document.getElementById('mobileShoot'),
            mobilePause: document.getElementById('mobilePause'),
            mobileMenu: document.getElementById('mobileMenu'),
            orientationScreen: document.getElementById('orientationScreen'),
            screens: {
                main: document.getElementById('mainMenu'),
                game: document.getElementById('gameScreen'),
                controls: document.getElementById('controlsScreen'),
                about: document.getElementById('aboutScreen'),
                difficulty: document.getElementById('difficultyScreen'),
                graphics: document.getElementById('graphicsScreen')
            }
        };
    }
    
    static setupEventListeners() {
        // Навигация по меню
        document.getElementById('startButton').addEventListener('click', () => {
            this.showScreen('game');
            this.startGame();
        });
        
        document.getElementById('controlsButton').addEventListener('click', () => this.showScreen('controls'));
        document.getElementById('aboutButton').addEventListener('click', () => this.showScreen('about'));
        document.getElementById('difficultyButton').addEventListener('click', () => {
            this.showScreen('difficulty');
            this.updateDifficultyStats();
        });
        document.getElementById('graphicsButton').addEventListener('click', () => {
            this.showScreen('graphics');
            this.updateGraphicsUI();
        });
        
        // Кнопки назад
        document.getElementById('backFromControls').addEventListener('click', () => this.showScreen('main'));
        document.getElementById('backFromAbout').addEventListener('click', () => this.showScreen('main'));
        document.getElementById('backFromDifficulty').addEventListener('click', () => this.showScreen('main'));
        document.getElementById('backFromGraphics').addEventListener('click', () => this.showScreen('main'));
        
        // Игровые кнопки
        document.getElementById('menuButton').addEventListener('click', () => this.showScreen('main'));
        document.getElementById('menuFromPauseButton').addEventListener('click', () => {
            this.showScreen('main');
            GameState.gamePaused = false;
        });
        document.getElementById('continueButton').addEventListener('click', () => {
            GameState.gamePaused = false;
            this.dom.pauseScreen.classList.add('hidden');
        });
        document.getElementById('restartButton').addEventListener('click', () => this.startGame());
        document.getElementById('nextLevelButton').addEventListener('click', () => this.nextLevel());
        
        // Звук
        this.dom.soundToggle.addEventListener('click', () => this.toggleSound());
        
        // Сложность
        document.querySelectorAll('.difficulty-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const difficulty = e.currentTarget.dataset.difficulty;
                this.setDifficulty(difficulty);
            });
        });

        // Графика
        document.querySelectorAll('.toggle-button').forEach(btn => {
            btn.addEventListener('click', function() {
                const setting = this.dataset.setting;
                const value = this.dataset.value;
                
                let processedValue = value;
                if (value === 'true') processedValue = true;
                if (value === 'false') processedValue = false;
                if (!isNaN(value) && value !== '') processedValue = Number(value);
                
                graphicsManager.settings[setting] = processedValue;
                GameManager.updateGraphicsUI();
            });
        });

        document.querySelectorAll('.preset-button').forEach(btn => {
            btn.addEventListener('click', function() {
                const preset = this.dataset.preset;
                
                document.querySelectorAll('.preset-button').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                GameManager.applyGraphicsPreset(preset);
                GameManager.updateGraphicsUI();
            });
        });

        document.getElementById('applyGraphics').addEventListener('click', () => {
            graphicsManager.saveSettings();
            graphicsManager.applySettings();
            this.showScreen('main');
        });

        document.getElementById('resetGraphics').addEventListener('click', () => {
            graphicsManager.resetToDefaults();
            this.updateGraphicsUI();
        });
    }
    
    static setupMobileControls() {
        GameState.isMobile = this.detectMobile();
        
        if (GameState.isMobile) {
            this.setupTouchControls();
            this.dom.mobileControls.classList.remove('hidden');
            this.setupOrientationHandler();
        } else {
            this.dom.mobileControls.classList.add('hidden');
        }
    }
    
    static detectMobile() {
    // Принудительный режим (для тестирования)
    const FORCE_MOBILE_MODE = true; // Можно вынести в конфиг
    
    if (FORCE_MOBILE_MODE) {
        console.log('📱 Принудительный мобильный режим активирован');
        return true;
    }
    
    // Комплексная проверка мобильного устройства
    const checks = {
        // 1. Проверка User Agent
        userAgent: function() {
            const agents = [
                /Android/i,
                /webOS/i,
                /iPhone/i,
                /iPad/i,
                /iPod/i,
                /BlackBerry/i,
                /Windows Phone/i,
                /Mobile/i,
                /Tablet/i,
                /Samsung/i,
                /Huawei/i,
                /Xiaomi/i,
                /OPPO/i,
                /Vivo/i,
                /Realme/i,
                /OnePlus/i,
                /Nokia/i,
                /Sony/i,
                /LG/i,
                /Motorola/i,
                /ZTE/i,
                /Alcatel/i,
                /Googlebot/i
            ];
            return agents.some(agent => navigator.userAgent.match(agent));
        },
        
        // 2. Проверка сенсорного экрана
        touchSupport: function() {
            return 'ontouchstart' in window || 
                   navigator.maxTouchPoints > 0 || 
                   navigator.msMaxTouchPoints > 0;
        },
        
        // 3. Проверка размера экрана и соотношения
        screenSize: function() {
            const width = window.screen.width;
            const height = window.screen.height;
            const ratio = window.devicePixelRatio || 1;
            
            // Типичные размеры мобильных устройств
            const mobileWidth = width < 768 || height < 768;
            const mobileRatio = ratio > 1; // Высокий DPI на мобильных
            
            return mobileWidth || mobileRatio;
        },
        
        // 4. Проверка ориентации
        orientation: function() {
            return 'orientation' in window || 
                   window.screen.orientation || 
                   window.screen.mozOrientation || 
                   window.screen.msOrientation;
        },
        
        // 5. Проверка платформы
        platform: function() {
            const platforms = [
                'Android', 'iPhone', 'iPad', 'iPod', 'BlackBerry', 
                'Windows Phone', 'webOS', 'Mobile', 'Tablet'
            ];
            return platforms.some(platform => 
                navigator.platform.includes(platform) || 
                navigator.userAgent.includes(platform)
            );
        },
        
        // 6. Проверка медиа-запросов
        mediaQuery: function() {
            return window.matchMedia('(max-width: 768px)').matches ||
                   window.matchMedia('(pointer: coarse)').matches ||
                   window.matchMedia('(hover: none)').matches;
        }
    };
    
    // Подсчет результатов проверок
    let mobileScore = 0;
    const totalChecks = Object.keys(checks).length;
    
    for (const check in checks) {
        if (checks[check]()) {
            mobileScore++;
        }
    }
    
    // Определение результата
    const isMobile = mobileScore >= 2; // Если 2+ проверки прошли - считаем мобильным
    
    // Детальная отладочная информация
    console.log('📱 Детектор мобильных устройств:', {
        userAgent: navigator.userAgent,
        userAgentCheck: checks.userAgent(),
        touchSupport: checks.touchSupport(),
        screenSize: checks.screenSize(),
        screen: { width: window.screen.width, height: window.screen.height },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        pixelRatio: window.devicePixelRatio,
        orientation: checks.orientation(),
        platform: checks.platform(),
        platformInfo: navigator.platform,
        mediaQuery: checks.mediaQuery(),
        mobileScore: mobileScore + '/' + totalChecks,
        finalResult: isMobile
    });
    
    return isMobile;
}
    
    static setupTouchControls() {
        // Кнопки движения
        document.querySelectorAll('.movement-btn').forEach(button => {
            const direction = button.dataset.direction;
            
            const startHandler = (e) => {
                e.preventDefault();
                GameState.activeDirections.add(direction);
            };
            
            const endHandler = (e) => {
                e.preventDefault();
                GameState.activeDirections.delete(direction);
            };
            
            button.addEventListener('touchstart', startHandler, { passive: false });
            button.addEventListener('touchend', endHandler, { passive: false });
            button.addEventListener('touchcancel', endHandler, { passive: false });
            
            button.addEventListener('mousedown', startHandler);
            button.addEventListener('mouseup', endHandler);
            button.addEventListener('mouseleave', endHandler);
        });
        
        // Кнопка стрельбы
        const shootStart = (e) => {
            e.preventDefault();
            GameState.isShooting = true;
            
            GameState.autoShootInterval = setInterval(() => {
                if (GameState.isShooting && GameState.player && !GameState.gamePaused && !GameState.gameOver) {
                    const bullet = GameState.player.shoot();
                    if (bullet) GameState.bullets.push(bullet);
                }
            }, 300);
        };
        
        const shootEnd = (e) => {
            e.preventDefault();
            GameState.isShooting = false;
            if (GameState.autoShootInterval) {
                clearInterval(GameState.autoShootInterval);
                GameState.autoShootInterval = null;
            }
        };
        
        this.dom.mobileShoot.addEventListener('touchstart', shootStart, { passive: false });
        this.dom.mobileShoot.addEventListener('touchend', shootEnd, { passive: false });
        this.dom.mobileShoot.addEventListener('touchcancel', shootEnd, { passive: false });
        
        // Кнопки паузы и меню
        this.dom.mobilePause.addEventListener('click', () => this.togglePause());
        this.dom.mobileMenu.addEventListener('click', () => this.showScreen('main'));
        
        document.addEventListener('touchmove', (e) => {
            if (e.target.classList.contains('movement-btn') || e.target === this.dom.mobileShoot) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    static setupOrientationHandler() {
        const updateOrientation = () => {
            const isLandscape = window.innerWidth > window.innerHeight;
            if (isLandscape) {
                this.dom.orientationScreen.classList.add('hidden');
            } else if (this.dom.screens.game.classList.contains('hidden')) {
                this.dom.orientationScreen.classList.add('hidden');
            } else {
                this.dom.orientationScreen.classList.remove('hidden');
            }
        };
        
        updateOrientation();
        window.addEventListener('resize', updateOrientation);
        window.addEventListener('orientationchange', updateOrientation);
    }
    
    static showScreen(screenName) {
        Object.values(this.dom.screens).forEach(screen => screen.classList.add('hidden'));
        this.dom.screens[screenName].classList.remove('hidden');
        
        if (screenName === 'game' && GameState.isMobile) {
            this.resizeCanvasForMobile();
        }
        
        this.updateOrientationScreen();
        return true;
    }
    
    static updateOrientationScreen() {
        if (!GameState.isMobile) return;
        
        const isLandscape = window.innerWidth > window.innerHeight;
        if (isLandscape) {
            this.dom.orientationScreen.classList.add('hidden');
        } else if (this.dom.screens.game.classList.contains('hidden')) {
            this.dom.orientationScreen.classList.add('hidden');
        } else {
            this.dom.orientationScreen.classList.remove('hidden');
        }
    }
    
    static resizeCanvasForMobile() {
        const gameContainer = document.querySelector('.game-container');
        const containerRect = gameContainer.getBoundingClientRect();
        
        const maxWidth = containerRect.width;
        const maxHeight = containerRect.height;
        
        let newWidth = maxWidth;
        let newHeight = maxWidth * GameConfig.CANVAS.ASPECT_RATIO;
        
        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = maxHeight / GameConfig.CANVAS.ASPECT_RATIO;
        }
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        if (GameState.player) {
            GameState.walls = LevelManager.createLevel();
        }
    }
    
    static handleResize() {
        if (this.dom.screens.game.classList.contains('hidden')) return;
        
        setTimeout(() => {
            if (GameState.isMobile) {
                this.resizeCanvasForMobile();
                this.updateOrientationScreen();
            }
        }, 100);
    }
    
    static startGame() {
        const difficulty = DIFFICULTY_LEVELS[GameState.currentDifficulty];
        
        Object.assign(GameState, {
            player: new Tank(100, canvas.height / 2, COLORS.GREEN, true),
            bullets: [],
            explosions: [],
            bonuses: [],
            bonusNotifications: [],
            gameOver: false,
            gamePaused: false,
            score: 0,
            playerLives: difficulty.playerLives,
            gameLevel: 1,
            enemiesToKill: difficulty.initialEnemies,
            lastBonusTime: 0,
            lastMoveSound: 0
        });
        
        GameState.player.speed = difficulty.playerSpeed;
        GameState.walls = LevelManager.createLevel();
        GameState.enemies = LevelManager.spawnEnemies(GameState.enemiesToKill);
        
        GameState.activeDirections.clear();
        GameState.isShooting = false;
        
        this.dom.gameOverScreen.classList.add('hidden');
        this.dom.pauseScreen.classList.add('hidden');
        this.dom.levelCompleteScreen.classList.add('hidden');
        
        this.updateUI();
        this.updateDifficultyBadge();
    }
    
    static nextLevel() {
        const difficulty = DIFFICULTY_LEVELS[GameState.currentDifficulty];
        
        GameState.gameLevel++;
        GameState.enemiesToKill = difficulty.initialEnemies + (GameState.gameLevel - 1) * difficulty.enemyIncrement;
        GameState.playerLives++;
        
        GameState.walls = LevelManager.createLevel();
        GameState.enemies = LevelManager.spawnEnemies(GameState.enemiesToKill);
        
        GameState.player.x = 100;
        GameState.player.y = canvas.height / 2;
        GameState.player.invulnerable = 120;
        
        this.dom.levelCompleteScreen.classList.add('hidden');
        this.updateUI();
    }
    
    static togglePause() {
        if (GameState.gameOver || !this.dom.levelCompleteScreen.classList.contains('hidden')) return;
        
        GameState.gamePaused = !GameState.gamePaused;
        this.dom.pauseScreen.classList.toggle('hidden', !GameState.gamePaused);
    }
    
    static toggleSound() {
        const soundEnabled = soundSystem.toggleMute();
        this.dom.soundToggle.textContent = `🔊 ЗВУК: ${soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}`;
    }
    
    static setDifficulty(difficulty) {
        GameState.currentDifficulty = difficulty;
        
        document.querySelectorAll('.difficulty-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-difficulty="${difficulty}"]`).classList.add('active');
        
        this.updateDifficultyStats();
        this.updateDifficultyBadge();
    }
    
    static updateDifficultyStats() {
        const difficulty = DIFFICULTY_LEVELS[GameState.currentDifficulty];
        document.getElementById('enemySpeedStat').textContent = `${difficulty.enemySpeed}x`;
        document.getElementById('enemyShootStat').textContent = `${Math.round(difficulty.enemyShootChance * 100)}%`;
        document.getElementById('enemyCountStat').textContent = difficulty.initialEnemies;
        document.getElementById('bonusChanceStat').textContent = `${Math.round(difficulty.bonusChance * 100)}%`;
    }
    
    static updateDifficultyBadge() {
        const difficulty = DIFFICULTY_LEVELS[GameState.currentDifficulty];
        this.dom.difficultyBadge.textContent = difficulty.name;
        this.dom.difficultyBadge.style.background = 
            `linear-gradient(145deg, ${difficulty.color}33, ${difficulty.color}66)`;
    }
    
    static updateUI() {
        this.dom.score.textContent = GameState.score;
        this.dom.lives.textContent = GameState.playerLives;
        this.dom.level.textContent = GameState.gameLevel;
        this.dom.enemies.textContent = GameState.enemies.length;
    }
    
    static gameLoop(timestamp = 0) {
        if (this.dom.screens.game.classList.contains('hidden')) {
            requestAnimationFrame(this.gameLoop.bind(this));
            return;
        }
        
        const deltaTime = timestamp - GameState.lastUpdateTime;
        if (deltaTime < GameConfig.PERFORMANCE.UPDATE_INTERVAL) {
            requestAnimationFrame(this.gameLoop.bind(this));
            return;
        }
        
        GameState.lastUpdateTime = timestamp;
        this.updateFPS(timestamp);
        
        if (!GameState.gameOver && !GameState.gamePaused) {
            this.updateGame();
            this.renderGame();
        }
        
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    static updateFPS(timestamp) {
        GameState.frameCount++;
        if (timestamp - GameState.lastFpsUpdate >= 1000) {
            GameState.currentFPS = GameState.frameCount;
            GameState.frameCount = 0;
            GameState.lastFpsUpdate = timestamp;
        }
    }
    
    static updateGame() {
        const shake = this.applyScreenShake();
        ctx.save();
        ctx.translate(shake.x, shake.y);
        
        collisionSystem.clear();
        [
            GameState.player,
            ...GameState.enemies,
            ...GameState.walls,
            ...GameState.bonuses
        ].forEach(obj => collisionSystem.insert(obj));
        
        GameState.player.update(GameState.walls);
        GameState.enemies.forEach(enemy => enemy.update(GameState.walls, {
            x: GameState.player.x,
            y: GameState.player.y
        }));
        
        this.updateBullets();
        this.updateExplosions();
        this.updateBonuses();
        this.updateBonusNotifications();
        
        this.cleanupArrays();
        this.checkLevelCompletion();
        this.trySpawnBonus();
        
        ctx.restore();
    }
    
    static updateBullets() {
        for (let i = GameState.bullets.length - 1; i >= 0; i--) {
            const bullet = GameState.bullets[i];
            
            if (!bullet.update()) {
                GameState.bullets.splice(i, 1);
                continue;
            }
            
            this.handleBulletCollisions(bullet, i);
        }
    }
    
    static handleBulletCollisions(bullet, index) {
        const nearbyObjects = collisionSystem.getNearby(bullet.x, bullet.y);
        let collisionHandled = false;
        
        for (const obj of nearbyObjects) {
            if (bullet.collidesWith(obj)) {
                if (this.handleWallCollision(bullet, obj)) {
                    collisionHandled = true;
                    break;
                }
                
                if (this.handleTankCollision(bullet, obj)) {
                    collisionHandled = true;
                    break;
                }
            }
        }
        
        if (!collisionHandled && bullet.active) {
            this.checkBulletBoundaries(bullet, index);
        }
    }
    
    static handleWallCollision(bullet, obj) {
        if (obj instanceof Wall) {
            if (obj.destructible) {
                const wallIndex = GameState.walls.indexOf(obj);
                if (wallIndex > -1) {
                    GameState.walls.splice(wallIndex, 1);
                    GameState.explosions.push(new EnhancedExplosion(bullet.x, bullet.y, 0.7));
                }
            }
            GameState.bullets.splice(GameState.bullets.indexOf(bullet), 1);
            return true;
        }
        return false;
    }
    
    static handleTankCollision(bullet, obj) {
        if (obj instanceof Tank) {
            if (bullet.isPlayer && !obj.isPlayer) {
                return this.handleEnemyHit(bullet, obj);
            } else if (!bullet.isPlayer && obj === GameState.player) {
                return this.handlePlayerHit(bullet, obj);
            }
        }
        return false;
    }
    
    static handleEnemyHit(bullet, enemy) {
        if (enemy.takeDamage()) {
            const enemyIndex = GameState.enemies.indexOf(enemy);
            if (enemyIndex > -1) {
                GameState.enemies.splice(enemyIndex, 1);
                GameState.explosions.push(new EnhancedExplosion(bullet.x, bullet.y, 1.2));
                GameState.score += 100;
                this.trySpawnBonus();
            }
        }
        GameState.bullets.splice(GameState.bullets.indexOf(bullet), 1);
        return true;
    }
    
    static handlePlayerHit(bullet, player) {
        if (player.takeDamage()) {
            GameState.playerLives--;
            GameState.explosions.push(new EnhancedExplosion(
                player.x + player.width/2,
                player.y + player.height/2,
                1.5
            ));
            
            if (GameState.playerLives <= 0) {
                GameState.gameOver = true;
                this.dom.finalScore.textContent = GameState.score;
                this.dom.gameOverScreen.classList.remove('hidden');
            } else {
                player.x = 100;
                player.y = canvas.height / 2;
                player.invulnerable = 120;
            }
        }
        GameState.bullets.splice(GameState.bullets.indexOf(bullet), 1);
        return true;
    }
    
    static checkBulletBoundaries(bullet, index) {
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            GameState.bullets.splice(index, 1);
        }
    }
    
    static updateExplosions() {
        for (let i = GameState.explosions.length - 1; i >= 0; i--) {
            if (!GameState.explosions[i].update()) {
                GameState.explosions.splice(i, 1);
            }
        }
    }
    
    static updateBonuses() {
        for (let i = GameState.bonuses.length - 1; i >= 0; i--) {
            if (!GameState.bonuses[i].update()) {
                GameState.bonuses.splice(i, 1);
                continue;
            }
            
            if (GameState.bonuses[i].collidesWith(GameState.player)) {
                GameState.bonuses[i].applyBonus(GameState.player);
                GameState.bonuses.splice(i, 1);
            }
        }
    }
    
    static updateBonusNotifications() {
        for (let i = GameState.bonusNotifications.length - 1; i >= 0; i--) {
            GameState.bonusNotifications[i].life--;
            if (GameState.bonusNotifications[i].life <= 0) {
                GameState.bonusNotifications.splice(i, 1);
            }
        }
    }
    
    static cleanupArrays() {
        if (GameState.explosions.length > GameConfig.PERFORMANCE.MAX_EXPLOSIONS) {
            GameState.explosions = GameState.explosions.slice(-GameConfig.PERFORMANCE.MAX_EXPLOSIONS);
        }
        
        if (GameState.bonusNotifications.length > GameConfig.PERFORMANCE.MAX_BONUS_NOTIFICATIONS) {
            GameState.bonusNotifications = GameState.bonusNotifications.slice(-GameConfig.PERFORMANCE.MAX_BONUS_NOTIFICATIONS);
        }
        
        if (GameState.bullets.length > GameConfig.PERFORMANCE.MAX_BULLETS) {
            GameState.bullets = GameState.bullets.slice(-GameConfig.PERFORMANCE.MAX_BULLETS);
        }
    }
    
    static applyScreenShake() {
        if (!GameState.graphicsSettings.screenShake) return { x: 0, y: 0 };
        
        let totalShakeX = 0;
        let totalShakeY = 0;
        
        for (const explosion of GameState.explosions) {
            const shake = explosion.getScreenShake();
            totalShakeX += shake.x;
            totalShakeY += shake.y;
        }
        
        return {
            x: Utils.clamp(totalShakeX, -10, 10),
            y: Utils.clamp(totalShakeY, -10, 10)
        };
    }
    
    static trySpawnBonus() {
        const now = Date.now();
        if (now - GameState.lastBonusTime > GameConfig.GAME.BONUS_SPAWN_INTERVAL) {
            const difficulty = DIFFICULTY_LEVELS[GameState.currentDifficulty];
            
            if (Math.random() < difficulty.bonusChance) {
                const bonus = this.createBonusAtValidPosition();
                if (bonus) {
                    GameState.bonuses.push(bonus);
                    GameState.lastBonusTime = now;
                }
            }
        }
    }
    
    static createBonusAtValidPosition() {
        const maxAttempts = 30;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const x = Utils.randomInt(20, canvas.width - 40);
            const y = Utils.randomInt(20, canvas.height - 40);
            const bonus = new Bonus(x, y);
            
            if (!GameState.walls.some(wall => bonus.collidesWith(wall))) {
                return bonus;
            }
        }
        
        return null;
    }
    
    static checkLevelCompletion() {
        if (GameState.enemies.length === 0 && 
            !GameState.gameOver && 
            !GameState.gamePaused && 
            this.dom.levelCompleteScreen.classList.contains('hidden')) {
            this.completeLevel();
        }
    }
    
    static completeLevel() {
        const difficulty = DIFFICULTY_LEVELS[GameState.currentDifficulty];
        
        this.dom.levelCompleteScreen.classList.remove('hidden');
        this.dom.completedLevel.textContent = GameState.gameLevel;
        this.dom.levelScore.textContent = 500;
        
        GameState.score += 500;
        this.updateUI();
    }
    
    static renderGame() {
        ctx.fillStyle = COLORS.BLACK;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        this.drawGrid();
        this.renderVisibleObjects();
        this.renderUI();
    }
    
    static drawGrid() {
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1;
        
        for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
    
    static renderVisibleObjects() {
        const visibleObjects = {
            walls: GameState.walls.filter(wall => Utils.isVisible(wall)),
            bullets: GameState.bullets.filter(bullet => Utils.isVisible(bullet)),
            enemies: GameState.enemies.filter(enemy => Utils.isVisible(enemy)),
            explosions: GameState.explosions.filter(explosion => Utils.isVisible(explosion)),
            bonuses: GameState.bonuses.filter(bonus => Utils.isVisible(bonus))
        };
        
        visibleObjects.walls.forEach(wall => wall.draw());
        visibleObjects.bullets.forEach(bullet => bullet.draw());
        visibleObjects.enemies.forEach(enemy => enemy.draw());
        visibleObjects.explosions.forEach(explosion => explosion.draw());
        visibleObjects.bonuses.forEach(bonus => bonus.draw());
        
        if (Utils.isVisible(GameState.player)) {
            GameState.player.draw();
        }
    }
    
    static renderUI() {
        GameState.bonusNotifications.forEach(notification => {
            const alpha = notification.life / 120;
            ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
            ctx.font = '20px Courier New';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(notification.text, notification.x, notification.y);
        });
        
        this.updateUI();
    }
    
    static initGraphicsScreen() {
        const scrollContainer = document.querySelector('.settings-scroll-container');
        const scrollIndicator = document.querySelector('.scroll-indicator');
        
        if (scrollContainer && scrollIndicator) {
            scrollContainer.addEventListener('scroll', () => {
                const opacity = scrollContainer.scrollTop > 10 ? 0 : 0.7;
                const transform = scrollContainer.scrollTop > 10 ? 'translateY(-10px)' : 'translateY(0)';
                
                scrollIndicator.style.opacity = opacity;
                scrollIndicator.style.transform = transform;
            });
            
            setTimeout(() => {
                if (scrollContainer.scrollHeight <= scrollContainer.clientHeight) {
                    scrollIndicator.style.display = 'none';
                }
            }, 1000);
        }
    }

    static updateGraphicsUI() {
        document.querySelectorAll('[data-setting="explosions"]').forEach(btn => {
            btn.classList.toggle('active', 
                btn.dataset.value === graphicsManager.settings.explosions.toString());
        });
        
        document.querySelectorAll('[data-setting="particleDensity"]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === graphicsManager.settings.particleDensity);
        });
        
        document.querySelectorAll('[data-setting="screenShake"]').forEach(btn => {
            btn.classList.toggle('active', 
                btn.dataset.value === graphicsManager.settings.screenShake.toString());
        });
        
        document.querySelectorAll('[data-setting="frameRateTarget"]').forEach(btn => {
            btn.classList.toggle('active', 
                btn.dataset.value === graphicsManager.settings.frameRateTarget.toString());
        });
        
        this.updatePerformanceIndicator();
    }

    static updatePerformanceIndicator() {
        const performanceFill = document.getElementById('performanceFill');
        const performanceText = document.getElementById('performanceText');
        
        let performanceLevel = 'medium';
        let performanceTextValue = 'ОПТИМАЛЬНАЯ';
        
        if (graphicsManager.settings.particleDensity === 'low' && 
            !graphicsManager.settings.screenShake && 
            graphicsManager.settings.frameRateTarget === 30) {
            performanceLevel = 'low';
            performanceTextValue = 'МАКСИМАЛЬНАЯ';
        } else if (graphicsManager.settings.particleDensity === 'high' && 
                   graphicsManager.settings.screenShake && 
                   graphicsManager.settings.frameRateTarget === 0) {
            performanceLevel = 'high';
            performanceTextValue = 'ВЫСОКАЯ НАГРУЗКА';
        }
        
        performanceFill.className = `performance-fill ${performanceLevel}`;
        performanceText.textContent = performanceTextValue;
    }

    static applyGraphicsPreset(preset) {
        switch(preset) {
            case 'low':
                graphicsManager.settings.explosions = true;
                graphicsManager.settings.particleDensity = 'low';
                graphicsManager.settings.screenShake = false;
                graphicsManager.settings.frameRateTarget = 30;
                break;
            case 'medium':
                graphicsManager.settings.explosions = true;
                graphicsManager.settings.particleDensity = 'medium';
                graphicsManager.settings.screenShake = true;
                graphicsManager.settings.frameRateTarget = 60;
                break;
            case 'high':
                graphicsManager.settings.explosions = true;
                graphicsManager.settings.particleDensity = 'high';
                graphicsManager.settings.screenShake = true;
                graphicsManager.settings.frameRateTarget = 0;
                break;
        }
    }
}

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ИНИЦИАЛИЗАЦИЯ ====================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const collisionSystem = new CollisionSystem();
const graphicsManager = new GraphicsManager();
const keys = {};

function showBonusNotification(text) {
    const notification = {
        text: text,
        x: canvas.width / 2,
        y: canvas.height / 2,
        life: 120
    };
    
    GameState.bonusNotifications.push(notification);
}

// Обработка клавиатуры
window.addEventListener('keydown', (e) => {
    if (GameState.isMobile) return;
    
    const key = e.key.toLowerCase();
    
    switch(key) {
        case 'p':
            if (!GameState.gameOver && document.getElementById('levelCompleteScreen').classList.contains('hidden')) {
                GameManager.togglePause();
            }
            return;
        case 'm':
            GameManager.toggleSound();
            return;
        case 'r':
            if (GameState.gameOver) {
                GameManager.startGame();
            }
            return;
    }
    
    keys[key] = true;
    
    // ИСПРАВЛЕНИЕ: Правильная обработка стрельбы стрелками
    if (!GameState.gameOver && !GameState.gamePaused && GameState.player) {
        if (['arrowup', 'arrowright', 'arrowdown', 'arrowleft'].includes(e.key.toLowerCase())) {
            const bullet = GameState.player.shoot();
            if (bullet) {
                GameState.bullets.push(bullet);
                console.log('Bullet created!'); // Для отладки
            }
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (GameState.isMobile) return;
    const key = e.key.toLowerCase();
    keys[key] = false;
});

// Инициализация игры
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        GameManager.init();
    }, 100);
});

// Предотвращение контекстного меню
canvas.addEventListener('contextmenu', (e) => e.preventDefault());