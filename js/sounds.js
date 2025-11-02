// ЗАМЕНИТЕ весь файл sounds.js на этот исправленный код:

/**
 * Оптимизированная система звуков для игры Танчики
 * Улучшенная версия с расширенной функциональностью
 */

class SoundSystem {
    constructor() {
        this.audioContext = null;
        this.sounds = new Map();
        this.muted = false;
        this.initialized = false;
        this.cache = new Map();
        this.mobileUnlocked = false;
        this.globalVolume = 0.7;
        this.soundBuffers = new Map();
        
        this.soundConfig = {
            shoot: { freq: 150, duration: 0.15, type: 'sine', volume: 0.2 },
            explosion: { freq: 100, duration: 0.3, type: 'sawtooth', volume: 0.3, endFreq: 20 },
            bonus: { 
                sequence: [
                    { freq: 523.25, duration: 0.08 },
                    { freq: 659.25, duration: 0.08 },
                    { freq: 783.99, duration: 0.2 }
                ], 
                volume: 0.2 
            },
            hit: { freq: 200, duration: 0.08, type: 'square', volume: 0.3, endFreq: 50 },
            move: { freq: 80, duration: 0.04, type: 'triangle', volume: 0.08 }
        };

        this.init();
    }

    /**
     * Инициализация аудиосистемы
     */
    init() {
        this.setupMobileAudio();
        this.setupEventListeners();
    }

    /**
     * Настройка аудио для мобильных устройств
     */
    setupMobileAudio() {
        const unlockAudio = () => {
            if (this.mobileUnlocked || !this.canUseWebAudio()) return;
            
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.createOptimizedSounds();
                this.initialized = true;
                this.mobileUnlocked = true;

                // Воспроизводим тихий звук для разблокировки аудио
                this.playUnlockSound();
                
                console.log('🎵 Аудио система активирована');
            } catch (error) {
                console.warn('❌ Ошибка инициализации аудио:', error);
                this.fallbackToNoSound();
            }
        };

        // Разблокируем аудио при пользовательском взаимодействии
        const unlockEvents = ['touchstart', 'click', 'keydown'];
        unlockEvents.forEach(event => {
            document.addEventListener(event, unlockAudio, { 
                once: true, 
                passive: true 
            });
        });
    }

    /**
     * Проверка поддержки Web Audio API
     */
    canUseWebAudio() {
        return !!(window.AudioContext || window.webkitAudioContext);
    }

    /**
     * Создание оптимизированных звуков
     */
    createOptimizedSounds() {
        if (!this.audioContext) return;

        Object.keys(this.soundConfig).forEach(soundName => {
            const config = this.soundConfig[soundName];
            
            if (config.sequence) {
                this.sounds.set(soundName, this.createSequenceSound(config.sequence, config.volume));
            } else {
                this.sounds.set(soundName, this.createOptimizedSound(
                    config.freq,
                    config.duration,
                    config.type,
                    config.volume,
                    config.endFreq
                ));
            }
        });
    }

    /**
     * Создание оптимизированного звука
     */
    createOptimizedSound(frequency, duration, type = 'sine', volume = 0.3, endFrequency = null) {
        return () => {
            if (!this.canPlaySound()) return;

            const cacheKey = this.generateCacheKey(frequency, duration, type, volume, endFrequency);
            
            if (this.cache.has(cacheKey)) {
                this.playCachedSound(cacheKey);
            } else {
                this.createAndCacheSound(cacheKey, frequency, duration, type, volume, endFrequency);
            }
        };
    }

    /**
     * Создание последовательности звуков (для мелодий)
     */
    createSequenceSound(sequence, volume = 0.3) {
        return () => {
            if (!this.canPlaySound()) return;

            let currentTime = this.audioContext.currentTime;
            
            sequence.forEach((note, index) => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(note.freq, currentTime);
                
                const noteVolume = volume * this.globalVolume * (this.muted ? 0 : 1);
                gainNode.gain.setValueAtTime(noteVolume, currentTime);
                
                // Плавное затухание в конце ноты
                if (index === sequence.length - 1) {
                    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + note.duration);
                } else {
                    gainNode.gain.setValueAtTime(noteVolume, currentTime + note.duration - 0.02);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + note.duration);
                }
                
                oscillator.start(currentTime);
                oscillator.stop(currentTime + note.duration);
                
                currentTime += note.duration;
            });
        };
    }

    /**
     * Проверка возможности воспроизведения звука
     */
    canPlaySound() {
        return this.audioContext && 
               this.initialized && 
               !this.muted && 
               this.audioContext.state !== 'suspended';
    }

    /**
     * Генерация ключа для кэша
     */
    generateCacheKey(frequency, duration, type, volume, endFrequency) {
        return `${frequency}-${duration}-${type}-${volume}-${endFrequency}`;
    }

    /**
     * Воспроизведение кэшированного звука
     */
    playCachedSound(cacheKey) {
        try {
            const cachedSound = this.cache.get(cacheKey);
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = cachedSound.type;
            oscillator.frequency.setValueAtTime(cachedSound.frequency, this.audioContext.currentTime);
            
            if (cachedSound.endFrequency) {
                oscillator.frequency.exponentialRampToValueAtTime(
                    cachedSound.endFrequency, 
                    this.audioContext.currentTime + cachedSound.duration
                );
            }
            
            const volume = cachedSound.volume * this.globalVolume;
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.001, 
                this.audioContext.currentTime + cachedSound.duration
            );
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + cachedSound.duration);
            
        } catch (error) {
            console.warn('Ошибка воспроизведения кэшированного звука:', error);
            this.cache.delete(cacheKey);
        }
    }

    /**
     * Создание и кэширование звука
     */
    createAndCacheSound(cacheKey, frequency, duration, type, volume, endFrequency) {
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            
            if (endFrequency) {
                oscillator.frequency.exponentialRampToValueAtTime(
                    endFrequency, 
                    this.audioContext.currentTime + duration
                );
            }
            
            const actualVolume = volume * this.globalVolume;
            gainNode.gain.setValueAtTime(actualVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.001, 
                this.audioContext.currentTime + duration
            );
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
            
            // Кэшируем параметры звука
            this.cache.set(cacheKey, {
                type: type,
                frequency: frequency,
                duration: duration,
                volume: volume,
                endFrequency: endFrequency
            });
            
        } catch (error) {
            console.warn('Ошибка создания звука:', error);
        }
    }

    /**
     * Воспроизведение звука разблокировки
     */
    playUnlockSound() {
        if (!this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.001, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
            
        } catch (error) {
            console.warn('Ошибка воспроизведения звука разблокировки:', error);
        }
    }

    /**
     * Резервный режим без звука
     */
    fallbackToNoSound() {
        console.warn('Аудио система недоступна, звуки отключены');
        this.initialized = false;
        
        // Создаем заглушки для всех звуков
        Object.keys(this.soundConfig).forEach(soundName => {
            this.sounds.set(soundName, () => {});
        });
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Восстановление аудиоконтекста после приостановки
        document.addEventListener('click', () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().catch(console.warn);
            }
        });

        // Обработка событий видимости страницы
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.audioContext) {
                this.audioContext.suspend().catch(console.warn);
            }
        });
    }

    /**
     * Воспроизведение звука
     */
    play(soundName) {
        if (!this.sounds.has(soundName)) {
            console.warn(`Звук "${soundName}" не найден`);
            return;
        }

        try {
            this.sounds.get(soundName)();
        } catch (error) {
            console.warn(`Ошибка воспроизведения звука "${soundName}":`, error);
        }
    }

    /**
     * Переключение звука
     */
    toggleMute() {
        this.muted = !this.muted;
        
        if (this.muted) {
            console.log('🔇 Звук отключен');
        } else {
            console.log('🔊 Звук включен');
            
            // Попытка переинициализации если аудио было недоступно
            if (!this.initialized && this.canUseWebAudio()) {
                this.setupMobileAudio();
            }
        }
        
        return !this.muted;
    }

    /**
     * Установка громкости
     */
    setVolume(volume) {
        this.globalVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Получение текущей громкости
     */
    getVolume() {
        return this.globalVolume;
    }

    /**
     * Проверка статуса звука
     */
    isMuted() {
        return this.muted;
    }

    /**
     * Проверка инициализации
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Очистка кэша
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Остановка всех звуков
     */
    stopAll() {
        if (this.audioContext) {
            this.audioContext.suspend().catch(console.warn);
        }
    }

    /**
     * Возобновление воспроизведения
     */
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(console.warn);
        }
    }

    /**
     * Предзагрузка звуков
     */
    preload() {
        if (!this.initialized) return;
        
        Object.keys(this.soundConfig).forEach(soundName => {
            const config = this.soundConfig[soundName];
            
            if (config.sequence) {
                // Для последовательностей предзагрузка не требуется
                return;
            }
            
            const cacheKey = this.generateCacheKey(
                config.freq,
                config.duration,
                config.type,
                config.volume,
                config.endFreq
            );
            
            if (!this.cache.has(cacheKey)) {
                this.createAndCacheSound(
                    cacheKey,
                    config.freq,
                    config.duration,
                    config.type,
                    config.volume,
                    config.endFreq
                );
            }
        });
    }
}

// Создаем глобальный экземпляр системы звуков
const soundSystem = new SoundSystem();

// Утилиты для работы со звуком
const SoundUtils = {
    /**
     * Воспроизведение звука с задержкой
     */
    playDelayed(soundName, delayMs) {
        setTimeout(() => soundSystem.play(soundName), delayMs);
    },

    /**
     * Воспроизведение случайного звука из набора
     */
    playRandom(soundNames) {
        const randomSound = soundNames[Math.floor(Math.random() * soundNames.length)];
        soundSystem.play(randomSound);
    },

    /**
     * Создание звукового эффекта
     */
    createEffect(frequency, duration, type = 'sine', volume = 0.3) {
        return () => {
            if (!soundSystem.isInitialized() || soundSystem.isMuted()) return;
            
            try {
                const audioContext = soundSystem.audioContext;
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.type = type;
                oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
                
                const actualVolume = volume * soundSystem.getVolume();
                gainNode.gain.setValueAtTime(actualVolume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration);
                
            } catch (error) {
                console.warn('Ошибка создания звукового эффекта:', error);
            }
        };
    }
};

// Автоматическая предзагрузка при полной загрузке страницы
window.addEventListener('load', () => {
    setTimeout(() => {
        soundSystem.preload();
    }, 1000);
});