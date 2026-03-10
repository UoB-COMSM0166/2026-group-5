// Map configuration manager
// Manages registration and switching for level configs

class MapManager {
  constructor() {
    this.currentLevel = 1;
    this.mapConfigs = {};
    this.currentConfig = null;
  }

  // Register a map config
  registerMap(level, config) {
    this.mapConfigs[level] = config;
    console.log(`Registered config for level ${level}`);
  }

  // Switch to the requested level
  switchToLevel(level) {
    if (!this.mapConfigs[level]) {
      throw new Error(`Config for level ${level} was not found`);
    }
    
    this.currentLevel = level;
    this.currentConfig = this.mapConfigs[level];
    
    console.log(`Switched to level ${level}`);
    return this.currentConfig;
  }

  // Get the current config
  getCurrentConfig() {
    return this.currentConfig;
  }

  // Get the current level
  getCurrentLevel() {
    return this.currentLevel;
  }

  // Get all available levels
  getAvailableLevels() {
    return Object.keys(this.mapConfigs).map(Number).sort((a, b) => a - b);
  }

  // Check whether a level is available
  isLevelAvailable(level) {
    return !!this.mapConfigs[level];
  }

  // Get level metadata
  getLevelInfo(level) {
    const config = this.mapConfigs[level];
    if (!config) return null;
    
    return {
      level: level,
      hasCollisionMatrix: !!config.collisionMatrix,
      hasDefaultSpawn: !!config.defaultSpawn,
      npcCount: config.npcs ? config.npcs.length : 0,
      doorCount: config.entities?.doors ? config.entities.doors.length : 0,
      chestCount: config.entities?.chests ? config.entities.chests.length : 0,
      mapSize: config.collisionMatrix ? 
        `${config.collisionMatrix[0]?.length || 0}x${config.collisionMatrix.length}` : 
        'unknown'
    };
  }

  // Get metadata for all levels
  getAllLevelsInfo() {
    const levels = this.getAvailableLevels();
    return levels.map(level => this.getLevelInfo(level));
  }
}

// Create the global map manager instance
const mapManager = new MapManager();

// Auto-register loaded map configs
function autoRegisterMaps() {
  // Register Map1
  if (typeof Map1Config !== 'undefined') {
    mapManager.registerMap(1, Map1Config);
  }
  
  // Register Map2
  if (typeof Map2Config !== 'undefined') {
    mapManager.registerMap(2, Map2Config);
  }
  
  if (typeof Map3Config !== 'undefined') {
    mapManager.registerMap(3, Map3Config);
  }
  
  console.log('Map config auto-registration complete');
  console.log('Available levels:', mapManager.getAvailableLevels());
  
  // Log level metadata
  const levelsInfo = mapManager.getAllLevelsInfo();
  console.log('Level details:', levelsInfo);
}

// Export the manager
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MapManager, mapManager, autoRegisterMaps };
} else {
  window.MapManager = MapManager;
  window.mapManager = mapManager;
  window.autoRegisterMaps = autoRegisterMaps;
}
