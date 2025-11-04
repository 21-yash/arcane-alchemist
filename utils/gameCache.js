const fs = require('fs');
const path = require('path');

class GameCache {
    constructor() {
        this.cache = new Map();
        this.watchers = new Map();
        this.gameDataPath = path.join(__dirname, '../gamedata');
        this.initialized = false;
    }

    /**
     * Initialize the cache by loading all gamedata files
     */
    async initialize() {
        if (this.initialized) return;

        console.log('[Cache] Initializing game data cache...');
        
        try {
            const files = fs.readdirSync(this.gameDataPath);
            const jsFiles = files.filter(file => file.endsWith('.js'));

            for (const file of jsFiles) {
                const key = file.replace('.js', '');
                await this.loadData(key);
                this.setupFileWatcher(key);
            }

            this.initialized = true;
            console.log(`[Cache] Successfully cached ${jsFiles.length} game data files`);
        } catch (error) {
            console.error('[Cache] Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * Load data for a specific key
     */
    async loadData(key, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const filePath = path.join(this.gameDataPath, `${key}.js`);
                
                // Clear require cache to get fresh data
                delete require.cache[require.resolve(filePath)];
                
                const data = require(filePath);
                this.cache.set(key, {
                    data,
                    loadedAt: Date.now(),
                    hits: 0
                });
    
                console.log(`[Cache] Loaded ${key} data`);
                return;
            } catch (error) {
                if (i === retries - 1) throw error;
                console.log(`[Cache] Retry ${i + 1} for ${key}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    /**
     * Setup file watcher for hot reloading in development
     */
    setupFileWatcher(key) {
        const filePath = path.join(this.gameDataPath, `${key}.js`);

        if (this.watchers.has(key)) {
            fs.unwatchFile(this.watchers.get(key));
        }

        // Store the filepath for unwatching
        this.watchers.set(key, filePath);

        fs.watchFile(filePath, { interval: 1000 }, async () => {
            console.log(`[Cache] Detected change in ${key}.js, reloading...`);
            try {
                await this.loadData(key);
                console.log(`[Cache] Successfully reloaded ${key}`);
            } catch (error) {
                console.error(`[Cache] Failed to reload ${key}:`, error);
            }
        });
    }

    /**
     * Get data by key
     */
    get(key) {
        if (!this.initialized) {
            throw new Error('Cache not initialized. Call initialize() first.');
        }

        const cached = this.cache.get(key);
        if (!cached) {
            throw new Error(`Game data '${key}' not found in cache`);
        }

        // Increment hit counter for analytics
        cached.hits++;
        return cached.data;
    }

    /**
     * Check if key exists in cache
     */
    has(key) {
        return this.cache.has(key);
    }

    /**
     * Get all available keys
     */
    keys() {
        return Array.from(this.cache.keys());
    }

    /**
     * Force reload a specific data file
     */
    async reload(key) {
        console.log(`[Cache] Force reloading ${key}...`);
        await this.loadData(key);
    }

    /**
     * Force reload all data files
     */
    async reloadAll() {
        console.log('[Cache] Force reloading all game data...');
        const keys = Array.from(this.cache.keys());
        
        for (const key of keys) {
            await this.loadData(key);
        }
        
        console.log('[Cache] All game data reloaded');
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const stats = {
            totalFiles: this.cache.size,
            initialized: this.initialized,
            files: {}
        };

        for (const [key, value] of this.cache.entries()) {
            stats.files[key] = {
                loadedAt: new Date(value.loadedAt).toISOString(),
                hits: value.hits,
                dataSize: JSON.stringify(value.data).length
            };
        }

        return stats;
    }

    /**
     * Clear cache and watchers
     */
    clear() {
        console.log('[Cache] Clearing cache...');
        
        // Close all file watchers
        for (const watcher of this.watchers.values()) {
            if (typeof watcher.close === 'function') {
                watcher.close();
            } else {
                fs.unwatchFile(watcher);
            }
        }
        
        this.watchers.clear();
        this.cache.clear();
        this.initialized = false;
        
        console.log('[Cache] Cache cleared');
    }

    /**
     * Graceful shutdown
     */
    destroy() {
        this.clear();
    }
}

// Create singleton instance
const gameCache = new GameCache();

// Graceful shutdown handling
process.on('SIGINT', () => {
    gameCache.destroy();
});

process.on('SIGTERM', () => {
    gameCache.destroy();
});

module.exports = gameCache;