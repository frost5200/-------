// Основные переменные игры
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const levelElement = document.getElementById('level');
const enemiesElement = document.getElementById('enemies');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');
const pauseScreen = document.getElementById('pauseScreen');
const shootSound = document.getElementById('shootSound');
const explosionSound = document.getElementById('explosionSound');
const bonusSound = document.getElementById('bonusSound');

// Установка размеров canvas
function setCanvasSize() {
    const container = document.querySelector('.game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

// Константы игры
const TANK_SPEED = 3;
const BULLET_SPEED = 7;
const ENEMY_SPEED = 1.5;
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
let level = 1;
let enemiesToKill = 5;
let lastBonusTime = 0;
let bonusNotifications = [];

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
        this.speed = isPlayer ? TANK_SPEED : ENEMY_SPEED;
        this.moveCooldown = 0;
        this.lastPlayerPos = { x: 0, y: 0 };
        this.cannonOffset = 0;
        this.health = 1;
        this.invulnerable = 0;
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
            if (keys['w']) {
                this.y -= this.speed;
                this.direction = 0;
            }
            if (keys['s']) {
                this.y += this.speed;
                this.direction = 2;
            }
            if (keys['a']) {
                this.x -= this.speed;
                this.direction = 3;
            }
            if (keys['d']) {
                this.x += this.speed;
                this.direction = 1;
            }
            
            if (keys['arrowup']) this.aimDirection = 0;
            if (keys['arrowright']) this.aimDirection = 1;
            if (keys['arrowdown']) this.aimDirection = 2;
            if (keys['arrowleft']) this.aimDirection = 3;
        } else {
            this.moveCooldown--;
            
            if (this.moveCooldown <= 0) {
                const dx = this.lastPlayerPos.x - this.x;
                const dy = this.lastPlayerPos.y - this.y;
                
                // Улучшенный ИИ: избегание стен и поиск пути к игроку
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
        }
        
        let collided = false;
        for (const wall of walls) {
            if (this.collidesWith(wall)) {
                collided = true;
                break;
            }
        }
        
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
        
        // Мигание при неуязвимости
        if (this.invulnerable > 0 && Math.floor(this.invulnerable / 5) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        // Корпус танка
        ctx.rotate(this.direction * Math.PI/2);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2 + 4, -this.height/2 + 4, this.width - 8, this.height - 8);
        ctx.strokeStyle = BLACK;
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width/2 + 4, -this.height/2 + 4, this.width - 8, this.height - 8);
        
        // Детали танка
        ctx.fillStyle = this.isPlayer ? DARK_GREEN : '#600';
        ctx.fillRect(-this.width/2 + 8, -this.height/2 + 8, this.width - 16, this.height - 16);
        
        ctx.restore();
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.aimDirection * Math.PI/2);
        
        // Дуло танка
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
            
            if (shootSound) {
                shootSound.currentTime = 0;
                shootSound.play().catch(e => console.log("Audio play failed:", e));
            }
            
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
        
        if (this.isPlayer) {
            this.invulnerable = 120; // 2 секунды неуязвимости
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
        
        // Создание частиц для эффекта взрыва
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
        
        if (explosionSound) {
            explosionSound.currentTime = 0;
            explosionSound.play().catch(e => console.log("Audio play failed:", e));
        }
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
        
        // Обновление частиц
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
        
        // Основной взрыв
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
        
        // Частицы
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
        this.type = Math.floor(Math.random() * 3); // 0: жизнь, 1: скорость, 2: мощность
        this.life = 300; // Время жизни в кадрах
    }
    
    update() {
        this.life--;
        return this.life > 0;
    }
    
    draw() {
        // Мигание при приближении к концу жизни
        if (this.life < 60 && Math.floor(this.life / 10) % 2 === 0) {
            return;
        }
        
        ctx.fillStyle = this.getColor();
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.strokeStyle = WHITE;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Символ бонуса
        ctx.fillStyle = WHITE;
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.getSymbol(), this.x + this.width/2, this.y + this.height/2);
    }
    
    getColor() {
        switch(this.type) {
            case 0: return RED;    // Жизнь
            case 1: return BLUE;   // Скорость
            case 2: return PURPLE; // Мощность
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
        if (bonusSound) {
            bonusSound.currentTime = 0;
            bonusSound.play().catch(e => console.log("Audio play failed:", e));
        }
        
        switch(this.type) {
            case 0: // Жизнь
                if (tank.isPlayer) {
                    playerLives++;
                    showBonusNotification("+1 ЖИЗНЬ");
                }
                break;
            case 1: // Скорость
                tank.speed += 1;
                setTimeout(() => {
                    if (tank.speed > (tank.isPlayer ? TANK_SPEED : ENEMY_SPEED)) {
                        tank.speed -= 1;
                    }
                }, 10000); // Эффект на 10 секунд
                showBonusNotification("СКОРОСТЬ ПОВЫШЕНА");
                break;
            case 2: // Мощность
                // Увеличиваем мощность пуль
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

// Уведомление о бонусе
function showBonusNotification(text) {
    const notification = {
        text: text,
        x: canvas.width / 2,
        y: canvas.height / 2,
        life: 120 // 2 секунды
    };
    
    bonusNotifications.push(notification);
}

// Создание уровня
function createLevel() {
    const walls = [];
    
    // Неразрушаемые стены по краям
    walls.push(new Wall(0, 0, canvas.width, 20, false));
    walls.push(new Wall(0, 0, 20, canvas.height, false));
    walls.push(new Wall(0, canvas.height - 20, canvas.width, 20, false));
    walls.push(new Wall(canvas.width - 20, 0, 20, canvas.height, false));
    
    // Неразрушаемые стены внутри уровня
    const wallPositions = [
        [200, 150], [400, 100], [600, 200],
        [100, 400], [300, 350], [500, 450],
        [150, 250], [350, 300], [550, 150]
    ];
    
    for (const [x, y] of wallPositions) {
        walls.push(new Wall(x, y, 40, 40, false));
    }
    
    // Разрушаемые стены
    for (let i = 0; i < 25; i++) {
        const x = Math.floor(Math.random() * (canvas.width - 80)) + 50;
        const y = Math.floor(Math.random() * (canvas.height - 80)) + 50;
        
        if (Math.abs(x - 100) > 150 || Math.abs(y - 300) > 150) {
            walls.push(new Wall(x, y, 30, 30, true));
        }
    }
    
    return walls;
}

// Создание врагов
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
        }
        
        enemies.push(enemy);
    }
}

// Отрисовка сетки для ретро-эффекта
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

// Обновление интерфейса
function updateUI() {
    scoreElement.textContent = score;
    livesElement.textContent = playerLives;
    levelElement.textContent = level;
    enemiesElement.textContent = enemies.length;
}

// Обработка клавиш
const keys = {};

window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'p') {
        gamePaused = !gamePaused;
        pauseScreen.classList.toggle('hidden', !gamePaused);
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

// Перезапуск игры
function restartGame() {
    player = new Tank(100, canvas.height / 2, GREEN, true);
    bullets = [];
    explosions = [];
    bonuses = [];
    bonusNotifications = [];
    gameOver = false;
    gamePaused = false;
    score = 0;
    playerLives = 3;
    level = 1;
    enemiesToKill = 5;
    
    walls = createLevel();
    spawnEnemies(enemiesToKill);
    
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
}

// Создание бонуса
function spawnBonus() {
    const now = Date.now();
    if (now - lastBonusTime > 10000) { // Каждые 10 секунд
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

// Основной игровой цикл
function gameLoop() {
    if (!gameOver && !gamePaused) {
        // Очистка экрана
        ctx.fillStyle = BLACK;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Отрисовка сетки
        drawGrid();
        
        // Обновление игрока
        player.update(walls);
        
        // Обновление врагов
        for (const enemy of enemies) {
            enemy.update(walls, { x: player.x, y: player.y });
            
            // Враги стреляют случайным образом
            if (Math.random() < 0.02) {
                const bullet = enemy.shoot();
                if (bullet) {
                    bullets.push(bullet);
                }
            }
        }
        
        // Обновление пуль
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (!bullets[i].update()) {
                bullets.splice(i, 1);
                continue;
            }
            
            // Проверка столкновений пуль со стенами
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
            
            // Проверка столкновений пуль игрока с врагами
            if (bullets[i] && bullets[i].isPlayer) {
                for (let j = enemies.length - 1; j >= 0; j--) {
                    if (bullets[i].collidesWith(enemies[j])) {
                        if (enemies[j].takeDamage()) {
                            enemies.splice(j, 1);
                            explosions.push(new Explosion(bullets[i].x, bullets[i].y, 1.2));
                            score += 100;
                            
                            // Шанс выпадения бонуса
                            if (Math.random() < 0.3) {
                                spawnBonus();
                            }
                        }
                        bullets.splice(i, 1);
                        break;
                    }
                }
            }
            
            // Проверка столкновений пуль врагов с игроком
            if (bullets[i] && !bullets[i].isPlayer && bullets[i].collidesWith(player)) {
                if (player.takeDamage()) {
                    playerLives--;
                    explosions.push(new Explosion(player.x + player.width/2, player.y + player.height/2, 1.5));
                    
                    if (playerLives <= 0) {
                        gameOver = true;
                        finalScoreElement.textContent = score;
                        gameOverScreen.classList.remove('hidden');
                    } else {
                        // Респаун игрока
                        player.x = 100;
                        player.y = canvas.height / 2;
                        player.invulnerable = 120;
                    }
                }
                bullets.splice(i, 1);
            }
        }
        
        // Обновление взрывов
        for (let i = explosions.length - 1; i >= 0; i--) {
            if (!explosions[i].update()) {
                explosions.splice(i, 1);
            }
        }
        
        // Обновление бонусов
        for (let i = bonuses.length - 1; i >= 0; i--) {
            if (!bonuses[i].update()) {
                bonuses.splice(i, 1);
                continue;
            }
            
            // Проверка подбора бонуса игроком
            if (bonuses[i].collidesWith(player)) {
                bonuses[i].applyBonus(player);
                bonuses.splice(i, 1);
            }
        }
        
        // Обновление уведомлений
        for (let i = bonusNotifications.length - 1; i >= 0; i--) {
            bonusNotifications[i].life--;
            if (bonusNotifications[i].life <= 0) {
                bonusNotifications.splice(i, 1);
            }
        }
        
        // Проверка победы на уровне
        if (enemies.length === 0) {
            level++;
            enemiesToKill += 2;
            walls = createLevel();
            spawnEnemies(enemiesToKill);
            player.x = 100;
            player.y = canvas.height / 2;
            score += 500;
            playerLives++;
            showBonusNotification("УРОВЕНЬ " + level);
        }
        
        // Отрисовка объектов
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
        
        // Отрисовка уведомлений
        for (const notification of bonusNotifications) {
            ctx.fillStyle = `rgba(255, 255, 0, ${notification.life / 120})`;
            ctx.font = '24px Courier New';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(notification.text, notification.x, notification.y);
        }
        
        // Обновление интерфейса
        updateUI();
    }
    
    requestAnimationFrame(gameLoop);
}

// Инициализация игры
function init() {
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    
    player = new Tank(100, canvas.height / 2, GREEN, true);
    walls = createLevel();
    spawnEnemies(enemiesToKill);
    
    restartButton.addEventListener('click', restartGame);
    
    // Запуск игрового цикла
    gameLoop();
}

// Запуск игры при загрузке страницы
window.addEventListener('load', init);