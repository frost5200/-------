// game.js
// Основные переменные игры
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let mobileControlsActive = false;

// Элементы интерфейса
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const levelElement = document.getElementById('level');
const enemiesElement = document.getElementById('enemies');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');
const pauseScreen = document.getElementById('pauseScreen');
const soundToggle = document.getElementById('soundToggle');
const levelCompleteScreen = document.getElementById('levelCompleteScreen');
const nextLevelButton = document.getElementById('nextLevelButton');
const completedLevelElement = document.getElementById('completedLevel');
const levelScoreElement = document.getElementById('levelScore');
const difficultyBadge = document.getElementById('difficultyBadge');
const continueButton = document.getElementById('continueButton');

// Экраны
const mainMenu = document.getElementById('mainMenu');
const gameScreen = document.getElementById('gameScreen');
const controlsScreen = document.getElementById('controlsScreen');
const aboutScreen = document.getElementById('aboutScreen');
const difficultyScreen = document.getElementById('difficultyScreen');
const orientationScreen = document.getElementById('orientationScreen');

// Кнопки меню
const startButton = document.getElementById('startButton');
const controlsButton = document.getElementById('controlsButton');
const aboutButton = document.getElementById('aboutButton');
const difficultyButton = document.getElementById('difficultyButton');
const backFromControls = document.getElementById('backFromControls');
const backFromAbout = document.getElementById('backFromAbout');
const backFromDifficulty = document.getElementById('backFromDifficulty');
const menuButton = document.getElementById('menuButton');
const menuFromPauseButton = document.getElementById('menuFromPauseButton');

// Кнопки сложности
const easyButton = document.getElementById('easyButton');
const normalButton = document.getElementById('normalButton');
const hardButton = document.getElementById('hardButton');
const expertButton = document.getElementById('expertButton');
const enemySpeedStat = document.getElementById('enemySpeedStat');
const enemyShootStat = document.getElementById('enemyShootStat');
const enemyCountStat = document.getElementById('enemyCountStat');
const bonusChanceStat = document.getElementById('bonusChanceStat');

// Конфигурация уровней сложности
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

// Константы игры
const TANK_SPEED = 3;
const BULLET_SPEED = 7;
const CANNON_RECOIL = 5;
const CANNON_RECOVERY = 0.5;

// Цвета
const BLACK = '#000';
const WHITE = '#fff';
const GREEN = '#0f0';
const RED = '#f00';
const BLUE = '#00f';
const GRAY = '#888';
const BROWN = '#8B4513';
const DARK_GREEN = '#006400';
const YELLOW = '#ff0';
const ORANGE = '#ffa500';
const PURPLE = '#800080';

// Игровые объекты
let player = null;
let bullets = [];
let enemies = [];
let walls = [];
let explosions = [];
let bonuses = [];
let gameOver = false;
let gamePaused = false;
let score = 0;
let playerLives = 3;
let gameLevel = 1;
let enemiesToKill = 5;
let lastBonusTime = 0;
let bonusNotifications = [];
let lastMoveSound = 0;
let currentDifficulty = 'normal';

// Мобильное управление
let mobileControls = {
    up: false,
    down: false,
    left: false,
    right: false
};

// Управление экранами
function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
}
function isMobileDevice() {
    return window.innerWidth <= 768 || 
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Проверка ориентации
function checkOrientation() {
    const isPortrait = window.innerHeight > window.innerWidth;
    
    if (isPortrait && window.innerWidth <= 768) {
        orientationScreen.classList.remove('hidden');
        return false;
    } else {
        orientationScreen.classList.add('hidden');
        return true;
    }
}

// Обработчики кнопок меню
startButton.addEventListener('click', () => {
    if (!checkOrientation()) return;
    showScreen(gameScreen);
    startGame();
});

controlsButton.addEventListener('click', () => {
    showScreen(controlsScreen);
});

aboutButton.addEventListener('click', () => {
    showScreen(aboutScreen);
});

difficultyButton.addEventListener('click', () => {
    showScreen(difficultyScreen);
    updateDifficultyStats();
});

backFromControls.addEventListener('click', () => {
    showScreen(mainMenu);
});

backFromAbout.addEventListener('click', () => {
    showScreen(mainMenu);
});

backFromDifficulty.addEventListener('click', () => {
    showScreen(mainMenu);
});

menuButton.addEventListener('click', () => {
    showScreen(mainMenu);
});

menuFromPauseButton.addEventListener('click', () => {
    showScreen(mainMenu);
    gamePaused = false;
});

continueButton.addEventListener('click', () => {
    gamePaused = false;
    pauseScreen.classList.add('hidden');
});

// Переключение звука
soundToggle.addEventListener('click', () => {
    const soundEnabled = soundSystem.toggleMute();
    soundToggle.textContent = `🔊 ЗВУК: ${soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}`;
});

// Функция обновления статистики сложности
function updateDifficultyStats() {
    const difficulty = DIFFICULTY_LEVELS[currentDifficulty];
    enemySpeedStat.textContent = `${difficulty.enemySpeed}x`;
    enemyShootStat.textContent = `${Math.round(difficulty.enemyShootChance * 100)}%`;
    enemyCountStat.textContent = difficulty.initialEnemies;
    bonusChanceStat.textContent = `${Math.round(difficulty.bonusChance * 100)}%`;
}

// Обработчики выбора сложности
function setDifficulty(difficulty) {
    currentDifficulty = difficulty;
    
    // Обновляем активную кнопку
    document.querySelectorAll('.difficulty-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-difficulty="${difficulty}"]`).classList.add('active');
    
    // Обновляем статистику
    updateDifficultyStats();
    
    // Обновляем бейдж в игре
    difficultyBadge.textContent = DIFFICULTY_LEVELS[difficulty].name;
    difficultyBadge.style.background = `linear-gradient(145deg, ${DIFFICULTY_LEVELS[difficulty].color}33, ${DIFFICULTY_LEVELS[difficulty].color}66)`;
}

easyButton.addEventListener('click', () => setDifficulty('easy'));
normalButton.addEventListener('click', () => setDifficulty('normal'));
hardButton.addEventListener('click', () => setDifficulty('hard'));
expertButton.addEventListener('click', () => setDifficulty('expert'));

// Инициализация мобильного управления
function initMobileControls() {
    // Показываем мобильное управление только на мобильных устройствах
    const mobileControlsElement = document.querySelector('.mobile-controls');
    mobileControlsActive = isMobileDevice();
    
    if (mobileControlsActive) {
        mobileControlsElement.style.display = 'flex';
    } else {
        mobileControlsElement.style.display = 'none';
        return; // Не инициализируем обработчики на ПК
    }

    // Кнопки движения
    const movementButtons = document.querySelectorAll('.movement-btn');
    movementButtons.forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const direction = btn.getAttribute('data-direction');
            mobileControls[direction] = true;
        });
        
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            const direction = btn.getAttribute('data-direction');
            mobileControls[direction] = false;
        });

        // Для десктопной отладки
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const direction = btn.getAttribute('data-direction');
            mobileControls[direction] = true;
        });
        
        btn.addEventListener('mouseup', (e) => {
            e.preventDefault();
            const direction = btn.getAttribute('data-direction');
            mobileControls[direction] = false;
        });

        btn.addEventListener('mouseleave', (e) => {
            e.preventDefault();
            const direction = btn.getAttribute('data-direction');
            mobileControls[direction] = false;
        });
    });

    // Кнопка стрельбы
    const shootButton = document.getElementById('shootButton');
    shootButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!gameOver && !gamePaused) {
            const bullet = player.shoot();
            if (bullet) {
                bullets.push(bullet);
            }
        }
    });

    shootButton.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (!gameOver && !gamePaused) {
            const bullet = player.shoot();
            if (bullet) {
                bullets.push(bullet);
            }
        }
    });

    // Кнопка паузы
    const pauseButton = document.getElementById('pauseButton');
    pauseButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!gameOver && !levelCompleteScreen.classList.contains('hidden')) return;
        
        gamePaused = !gamePaused;
        pauseScreen.classList.toggle('hidden', !gamePaused);
    });

    pauseButton.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (!gameOver && !levelCompleteScreen.classList.contains('hidden')) return;
        
        gamePaused = !gamePaused;
        pauseScreen.classList.toggle('hidden', !gamePaused);
    });

    // Кнопка меню
    const menuButtonMobile = document.getElementById('menuButtonMobile');
    menuButtonMobile.addEventListener('touchstart', (e) => {
        e.preventDefault();
        showScreen(mainMenu);
        gamePaused = false;
    });

    menuButtonMobile.addEventListener('mousedown', (e) => {
        e.preventDefault();
        showScreen(mainMenu);
        gamePaused = false;
    });
}


// Обновление мобильного управления
function updateMobileControls() {
    // Сбрасываем все ключи движения при каждом обновлении
    keys['w'] = false;
    keys['s'] = false;
    keys['a'] = false;
    keys['d'] = false;
    
    // Устанавливаем только активные направления
    if (mobileControls.up) keys['w'] = true;
    if (mobileControls.down) keys['s'] = true;
    if (mobileControls.left) keys['a'] = true;
    if (mobileControls.right) keys['d'] = true;
}

// Класс Танк
class Tank {
    constructor(x, y, color, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.color = color;
        this.isPlayer = isPlayer;
        this.direction = 0;
        this.aimDirection = 0;
        this.cooldown = 0;
        
        // Используем настройки сложности
        const difficulty = DIFFICULTY_LEVELS[currentDifficulty];
        this.speed = isPlayer ? difficulty.playerSpeed : difficulty.enemySpeed;
        
        this.moveCooldown = 0;
        this.lastPlayerPos = { x: 0, y: 0 };
        this.cannonOffset = 0;
        this.health = 1;
        this.invulnerable = 0;
        this.lastX = x;
        this.lastY = y;
    }
    
    update(walls, playerPos = null) {
        if (playerPos) {
            this.lastPlayerPos = playerPos;
        }
        
        if (this.invulnerable > 0) {
            this.invulnerable--;
        }
        
        const oldX = this.x;
        const oldY = this.y;
        
        if (this.isPlayer) {
            if (keys['w'] || mobileControls.up) {
                this.y -= this.speed;
                this.direction = 0;
            }
            if (keys['s'] || mobileControls.down) {
                this.y += this.speed;
                this.direction = 2;
            }
            if (keys['a'] || mobileControls.left) {
                this.x -= this.speed;
                this.direction = 3;
            }
            if (keys['d'] || mobileControls.right) {
                this.x += this.speed;
                this.direction = 1;
            }
            
            // Звук движения
            if ((this.x !== this.lastX || this.y !== this.lastY) && Date.now() - lastMoveSound > 200) {
                soundSystem.play('move');
                lastMoveSound = Date.now();
            }
            
            this.lastX = this.x;
            this.lastY = this.y;
            
            // Для мобильных устройств направление стрельбы совпадает с направлением движения
            if (window.innerWidth <= 768) {
                this.aimDirection = this.direction;
            } else {
                // Для десктопа оставляем управление стрелками
                if (keys['arrowup']) this.aimDirection = 0;
                if (keys['arrowright']) this.aimDirection = 1;
                if (keys['arrowdown']) this.aimDirection = 2;
                if (keys['arrowleft']) this.aimDirection = 3;
            }
        } else {
            this.moveCooldown--;
            
            if (this.moveCooldown <= 0) {
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
                
                this.moveCooldown = Math.floor(Math.random() * 60) + 30;
            }
            
            if (this.direction === 0) {
                this.y -= this.speed;
            } else if (this.direction === 1) {
                this.x += this.speed;
            } else if (this.direction === 2) {
                this.y += this.speed;
            } else if (this.direction === 3) {
                this.x -= this.speed;
            }
            
            const dx = this.lastPlayerPos.x - this.x;
            const dy = this.lastPlayerPos.y - this.y;
            if (Math.abs(dx) > Math.abs(dy)) {
                this.aimDirection = dx > 0 ? 1 : 3;
            } else {
                this.aimDirection = dy > 0 ? 2 : 0;
            }
            
            // Используем настройки сложности для шанса выстрела
            const difficulty = DIFFICULTY_LEVELS[currentDifficulty];
            if (Math.random() < difficulty.enemyShootChance) {
                const bullet = this.shoot();
                if (bullet) {
                    bullets.push(bullet);
                }
            }
        }
        
        let collided = false;
        
        // Проверка столкновений со стенами
        for (const wall of walls) {
            if (this.collidesWith(wall)) {
                collided = true;
                break;
            }
        }
        
        // Проверка столкновений с другими танками
        if (this.isPlayer) {
            for (const enemy of enemies) {
                if (this.collidesWith(enemy)) {
                    collided = true;
                    break;
                }
            }
        } else {
            if (this.collidesWith(player)) {
                collided = true;
            }
            
            for (const otherEnemy of enemies) {
                if (otherEnemy !== this && this.collidesWith(otherEnemy)) {
                    collided = true;
                    break;
                }
            }
        }
        
        // Проверка границ экрана
        if (collided || this.x < 20 || this.x > canvas.width - this.width - 20 ||
            this.y < 20 || this.y > canvas.height - this.height - 20) {
            this.x = oldX;
            this.y = oldY;
            if (!this.isPlayer) {
                this.direction = Math.floor(Math.random() * 4);
                this.moveCooldown = 20;
            }
        }
        
        if (this.cooldown > 0) {
            this.cooldown--;
        }
        
        if (this.cannonOffset > 0) {
            this.cannonOffset -= CANNON_RECOVERY;
        }
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        
        if (this.invulnerable > 0 && Math.floor(this.invulnerable / 5) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        ctx.rotate(this.direction * Math.PI/2);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2 + 4, -this.height/2 + 4, this.width - 8, this.height - 8);
        ctx.strokeStyle = BLACK;
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width/2 + 4, -this.height/2 + 4, this.width - 8, this.height - 8);
        
        ctx.fillStyle = this.isPlayer ? DARK_GREEN : '#600';
        ctx.fillRect(-this.width/2 + 8, -this.height/2 + 8, this.width - 16, this.height - 16);
        
        ctx.restore();
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.aimDirection * Math.PI/2);
        
        const cannonLength = 16 - this.cannonOffset;
        ctx.fillStyle = this.isPlayer ? DARK_GREEN : '#900';
        ctx.fillRect(-2, -this.height/2 - cannonLength + 8, 4, cannonLength);
        
        ctx.restore();
        ctx.globalAlpha = 1;
    }
    
    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }
    
    shoot() {
        if (this.cooldown === 0) {
            this.cooldown = 30;
            this.cannonOffset = CANNON_RECOIL;
            
            soundSystem.play('shoot');
            
            const shootDir = this.aimDirection;
            let bulletX, bulletY;
            
            if (shootDir === 0) {
                bulletX = this.x + this.width/2;
                bulletY = this.y;
            } else if (shootDir === 1) {
                bulletX = this.x + this.width;
                bulletY = this.y + this.height/2;
            } else if (shootDir === 2) {
                bulletX = this.x + this.width/2;
                bulletY = this.y + this.height;
            } else if (shootDir === 3) {
                bulletX = this.x;
                bulletY = this.y + this.height/2;
            }
            
            return new Bullet(bulletX, bulletY, shootDir, this.isPlayer);
        }
        return null;
    }
    
    takeDamage() {
        if (this.invulnerable > 0) return false;
        
        this.health--;
        if (this.health <= 0) {
            return true;
        }
        
        soundSystem.play('hit');
        
        if (this.isPlayer) {
            this.invulnerable = 120;
        }
        return false;
    }
}

// Класс Пуля
class Bullet {
    constructor(x, y, direction, isPlayer) {
        this.x = x;
        this.y = y;
        this.width = 6;
        this.height = 6;
        this.direction = direction;
        this.isPlayer = isPlayer;
        this.speed = BULLET_SPEED;
        this.power = 1;
    }
    
    update() {
        if (this.direction === 0) {
            this.y -= this.speed;
        } else if (this.direction === 1) {
            this.x += this.speed;
        } else if (this.direction === 2) {
            this.y += this.speed;
        } else if (this.direction === 3) {
            this.x -= this.speed;
        }
        
        return !(this.x < 0 || this.x > canvas.width || 
                 this.y < 0 || this.y > canvas.height);
    }
    
    draw() {
        ctx.fillStyle = this.isPlayer ? WHITE : RED;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = this.isPlayer ? YELLOW : ORANGE;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width/4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }
}

// Класс Стена
class Wall {
    constructor(x, y, width, height, destructible = false) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.destructible = destructible;
        this.health = destructible ? 1 : Infinity;
    }
    
    draw() {
        if (this.destructible) {
            ctx.fillStyle = BROWN;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            ctx.strokeStyle = '#643200';
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
            ctx.fillStyle = GRAY;
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

// Класс Взрыв
class Explosion {
    constructor(x, y, size = 1) {
        this.x = x;
        this.y = y;
        this.radius = 10 * size;
        this.maxRadius = 40 * size;
        this.growing = true;
        this.life = 1.0;
        this.particles = [];
        
        for (let i = 0; i < 15 * size; i++) {
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                size: Math.random() * 3 + 1
            });
        }
        
        soundSystem.play('explosion');
    }
    
    update() {
        if (this.growing) {
            this.radius += 2;
            if (this.radius >= this.maxRadius) {
                this.growing = false;
            }
        } else {
            this.life -= 0.05;
        }
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;
            p.vx *= 0.95;
            p.vy *= 0.95;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        return this.life > 0 || this.particles.length > 0;
    }
    
    draw() {
        const alpha = this.life;
        
        if (this.growing || this.life > 0) {
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.radius
            );
            gradient.addColorStop(0, `rgba(255, 255, 0, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(255, 165, 0, ${alpha})`);
            gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        for (const p of this.particles) {
            ctx.fillStyle = `rgba(255, ${165 * p.life}, 0, ${p.life})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Класс Бонус
class Bonus {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.type = Math.floor(Math.random() * 3);
        this.life = 300;
    }
    
    update() {
        this.life--;
        return this.life > 0;
    }
    
    draw() {
        if (this.life < 60 && Math.floor(this.life / 10) % 2 === 0) {
            return;
        }
        
        ctx.fillStyle = this.getColor();
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.strokeStyle = WHITE;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = WHITE;
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.getSymbol(), this.x + this.width/2, this.y + this.height/2);
    }
    
    getColor() {
        switch(this.type) {
            case 0: return RED;
            case 1: return BLUE;
            case 2: return PURPLE;
            default: return YELLOW;
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
                    playerLives++;
                    showBonusNotification("+1 ЖИЗНЬ");
                }
                break;
            case 1:
                tank.speed += 1;
                setTimeout(() => {
                    if (tank.speed > (tank.isPlayer ? DIFFICULTY_LEVELS[currentDifficulty].playerSpeed : DIFFICULTY_LEVELS[currentDifficulty].enemySpeed)) {
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
    
    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }
}

function showBonusNotification(text) {
    const notification = {
        text: text,
        x: canvas.width / 2,
        y: canvas.height / 2,
        life: 120
    };
    
    bonusNotifications.push(notification);
}

function createLevel() {
    const walls = [];
    
    walls.push(new Wall(0, 0, canvas.width, 20, false));
    walls.push(new Wall(0, 0, 20, canvas.height, false));
    walls.push(new Wall(0, canvas.height - 20, canvas.width, 20, false));
    walls.push(new Wall(canvas.width - 20, 0, 20, canvas.height, false));
    
    const wallPositions = [
        [200, 150], [400, 100], [600, 200],
        [100, 400], [300, 350], [500, 450],
        [150, 250], [350, 300], [550, 150]
    ];
    
    for (const [x, y] of wallPositions) {
        walls.push(new Wall(x, y, 40, 40, false));
    }
    
    for (let i = 0; i < 25; i++) {
        const x = Math.floor(Math.random() * (canvas.width - 80)) + 50;
        const y = Math.floor(Math.random() * (canvas.height - 80)) + 50;
        
        if (Math.abs(x - 100) > 150 || Math.abs(y - 300) > 150) {
            walls.push(new Wall(x, y, 30, 30, true));
        }
    }
    
    return walls;
}

function spawnEnemies(count) {
    enemies = [];
    for (let i = 0; i < count; i++) {
        let validPosition = false;
        let x, y, enemy;
        
        while (!validPosition) {
            x = Math.floor(Math.random() * (canvas.width / 2 - 70)) + canvas.width / 2 + 50;
            y = Math.floor(Math.random() * (canvas.height - 140)) + 70;
            enemy = new Tank(x, y, RED);
            
            validPosition = true;
            for (const wall of walls) {
                if (enemy.collidesWith(wall)) {
                    validPosition = false;
                    break;
                }
            }
            
            // Проверка столкновений с другими врагами
            for (const otherEnemy of enemies) {
                if (enemy.collidesWith(otherEnemy)) {
                    validPosition = false;
                    break;
                }
            }
        }
        
        enemies.push(enemy);
    }
}

function drawGrid() {
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

function updateUI() {
    scoreElement.textContent = score;
    livesElement.textContent = playerLives;
    levelElement.textContent = gameLevel;
    enemiesElement.textContent = enemies.length;
}

const keys = {};

window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'p') {
        if (!gameOver && !levelCompleteScreen.classList.contains('hidden')) {
            gamePaused = !gamePaused;
            pauseScreen.classList.toggle('hidden', !gamePaused);
        }
        return;
    }
    
    if (e.key.toLowerCase() === 'm') {
        const soundEnabled = soundSystem.toggleMute();
        soundToggle.textContent = `🔊 ЗВУК: ${soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}`;
        return;
    }
    
    keys[e.key.toLowerCase()] = true;
    
    if (!gameOver && !gamePaused) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || 
            e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
            const bullet = player.shoot();
            if (bullet) {
                bullets.push(bullet);
            }
        }
    }
    
    if (e.key === 'r' && gameOver) {
        restartGame();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

function startGame() {
    if (!checkOrientation()) return;
    
    const difficulty = DIFFICULTY_LEVELS[currentDifficulty];
    
    player = new Tank(100, canvas.height / 2, GREEN, true);
    player.speed = difficulty.playerSpeed;
    
    bullets = [];
    explosions = [];
    bonuses = [];
    bonusNotifications = [];
    gameOver = false;
    gamePaused = false;
    score = 0;
    playerLives = difficulty.playerLives;
    gameLevel = 1;
    enemiesToKill = difficulty.initialEnemies;
    
    walls = createLevel();
    spawnEnemies(enemiesToKill);
    
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    levelCompleteScreen.classList.add('hidden');
    
    // Обновляем интерфейс
    updateUI();
    difficultyBadge.textContent = difficulty.name;
    difficultyBadge.style.background = `linear-gradient(145deg, ${difficulty.color}33, ${difficulty.color}66)`;
}

function restartGame() {
    startGame();
}

function spawnBonus() {
    const now = Date.now();
    if (now - lastBonusTime > 10000) {
        const difficulty = DIFFICULTY_LEVELS[currentDifficulty];
        
        // Используем настройки сложности для шанса появления бонуса
        if (Math.random() < difficulty.bonusChance) {
            let validPosition = false;
            let x, y, bonus;
            
            while (!validPosition) {
                x = Math.floor(Math.random() * (canvas.width - 40)) + 20;
                y = Math.floor(Math.random() * (canvas.height - 40)) + 20;
                bonus = new Bonus(x, y);
                
                validPosition = true;
                for (const wall of walls) {
                    if (bonus.collidesWith(wall)) {
                        validPosition = false;
                        break;
                    }
                }
            }
            
            bonuses.push(bonus);
            lastBonusTime = now;
        }
    }
}

function completeLevel() {
    if (gameOver) return;
    
    const difficulty = DIFFICULTY_LEVELS[currentDifficulty];
    
    levelCompleteScreen.classList.remove('hidden');
    completedLevelElement.textContent = gameLevel;
    levelScoreElement.textContent = 500;
    
    // Добавляем очки за уровень
    score += 500;
    
    // Ставим игру на паузу при завершении уровня
    gamePaused = true;
    
    // Обновляем интерфейс
    updateUI();
}

// Обработчик кнопки следующего уровня
nextLevelButton.addEventListener('click', () => {
    const difficulty = DIFFICULTY_LEVELS[currentDifficulty];
    
    gameLevel++;
    enemiesToKill = difficulty.initialEnemies + (gameLevel - 1) * difficulty.enemyIncrement;
    playerLives++;
    
    walls = createLevel();
    spawnEnemies(enemiesToKill);
    
    // Респаун игрока в безопасном месте
    player.x = 100;
    player.y = canvas.height / 2;
    player.invulnerable = 120;
    
    levelCompleteScreen.classList.add('hidden');
    
    // Снимаем паузу
    gamePaused = false;
    
    // Обновляем интерфейс
    updateUI();
});

function gameLoop() {
    if (gameScreen.classList.contains('hidden')) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    if (!gameOver && !gamePaused) {
        // Обновляем мобильное управление только если оно активно
        if (mobileControlsActive) {
            updateMobileControls();
        }
        
        ctx.fillStyle = BLACK;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Остальной код без изменений...
        drawGrid();
        
        player.update(walls);
        
        for (const enemy of enemies) {
            enemy.update(walls, { x: player.x, y: player.y });
        }
        
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (!bullets[i].update()) {
                bullets.splice(i, 1);
                continue;
            }
            
            for (let j = walls.length - 1; j >= 0; j--) {
                if (bullets[i].collidesWith(walls[j])) {
                    if (walls[j].destructible) {
                        walls.splice(j, 1);
                        explosions.push(new Explosion(bullets[i].x, bullets[i].y, 0.7));
                    }
                    bullets.splice(i, 1);
                    break;
                }
            }
            
            if (bullets[i] && bullets[i].isPlayer) {
                for (let j = enemies.length - 1; j >= 0; j--) {
                    if (bullets[i].collidesWith(enemies[j])) {
                        if (enemies[j].takeDamage()) {
                            enemies.splice(j, 1);
                            explosions.push(new Explosion(bullets[i].x, bullets[i].y, 1.2));
                            score += 100;
                            
                            spawnBonus();
                        }
                        bullets.splice(i, 1);
                        break;
                    }
                }
            }
            
            if (bullets[i] && !bullets[i].isPlayer && bullets[i].collidesWith(player)) {
                if (player.takeDamage()) {
                    playerLives--;
                    explosions.push(new Explosion(player.x + player.width/2, player.y + player.height/2, 1.5));
                    
                    if (playerLives <= 0) {
                        gameOver = true;
                        finalScoreElement.textContent = score;
                        gameOverScreen.classList.remove('hidden');
                    } else {
                        player.x = 100;
                        player.y = canvas.height / 2;
                        player.invulnerable = 120;
                    }
                }
                bullets.splice(i, 1);
            }
        }
        
        for (let i = explosions.length - 1; i >= 0; i--) {
            if (!explosions[i].update()) {
                explosions.splice(i, 1);
            }
        }
        
        for (let i = bonuses.length - 1; i >= 0; i--) {
            if (!bonuses[i].update()) {
                bonuses.splice(i, 1);
                continue;
            }
            
            if (bonuses[i].collidesWith(player)) {
                bonuses[i].applyBonus(player);
                bonuses.splice(i, 1);
            }
        }
        
        for (let i = bonusNotifications.length - 1; i >= 0; i--) {
            bonusNotifications[i].life--;
            if (bonusNotifications[i].life <= 0) {
                bonusNotifications.splice(i, 1);
            }
        }
        
        // Проверка победы на уровне (ИСПРАВЛЕНО: условие было инвертировано)
        if (enemies.length === 0 && levelCompleteScreen.classList.contains('hidden')) {
            completeLevel();
        }
        
        for (const wall of walls) {
            wall.draw();
        }
        
        for (const bullet of bullets) {
            bullet.draw();
        }
        
        for (const enemy of enemies) {
            enemy.draw();
        }
        
        for (const explosion of explosions) {
            explosion.draw();
        }
        
        for (const bonus of bonuses) {
            bonus.draw();
        }
        
        player.draw();
        
        for (const notification of bonusNotifications) {
            ctx.fillStyle = `rgba(255, 255, 0, ${notification.life / 120})`;
            ctx.font = '24px Courier New';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(notification.text, notification.x, notification.y);
        }
        
        updateUI();
    }
    
    requestAnimationFrame(gameLoop);
}
window.addEventListener('resize', () => {
    const mobileControlsElement = document.querySelector('.mobile-controls');
    mobileControlsActive = isMobileDevice();
    
    if (mobileControlsActive) {
        mobileControlsElement.style.display = 'flex';
    } else {
        mobileControlsElement.style.display = 'none';
        // Сбрасываем мобильное управление при переходе на ПК
        mobileControls.up = false;
        mobileControls.down = false;
        mobileControls.left = false;
        mobileControls.right = false;
        updateMobileControls();
    }
});

// Инициализация игры
// Инициализация игры
function init() {
    restartButton.addEventListener('click', restartGame);
    
    // Устанавливаем сложность по умолчанию
    setDifficulty('normal');
    
    // Инициализируем мобильное управление (оно само определит, нужно ли его показывать)
    initMobileControls();
    
    // Проверяем ориентацию при загрузке и изменении размера
    window.addEventListener('load', checkOrientation);
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    // Дополнительная проверка при загрузке для мобильного управления
    window.addEventListener('load', () => {
        const mobileControlsElement = document.querySelector('.mobile-controls');
        mobileControlsActive = isMobileDevice();
        
        if (mobileControlsActive) {
            mobileControlsElement.style.display = 'flex';
        } else {
            mobileControlsElement.style.display = 'none';
        }
    });
    
    gameLoop();
}

window.addEventListener('load', init);