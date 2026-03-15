// Manage and switch level configurations.

class MapManager {
  constructor() {
    this.currentLevel = 1;
    this.mapConfigs = {};
    this.currentConfig = null;
  }

  // Register a level config.
  registerMap(level, config) {
    this.mapConfigs[level] = config;
    console.log(`Registered config for level ${level}`);
  }

  // Switch to a specific level.
  switchToLevel(level) {
    if (!this.mapConfigs[level]) {
      throw new Error(`Level ${level} config was not found`);
    }
    
    this.currentLevel = level;
    this.currentConfig = this.mapConfigs[level];
    
    console.log(`Switched to level ${level}`);
    return this.currentConfig;
  }

  // Get the active config.
  getCurrentConfig() {
    return this.currentConfig;
  }

  // Get the active level.
  getCurrentLevel() {
    return this.currentLevel;
  }

  // Get all available levels.
  getAvailableLevels() {
    return Object.keys(this.mapConfigs).map(Number).sort((a, b) => a - b);
  }

  // Check whether a level is available.
  isLevelAvailable(level) {
    return !!this.mapConfigs[level];
  }

  // Get metadata for a level.
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

  // Get metadata for all levels.
  getAllLevelsInfo() {
    const levels = this.getAvailableLevels();
    return levels.map(level => this.getLevelInfo(level));
  }
}

// Create the shared map manager instance.
const mapManager = new MapManager();

// Register already loaded level configs.
function autoRegisterMaps() {
  // Register Map1.
  if (typeof Map1Config !== 'undefined') {
    mapManager.registerMap(1, Map1Config);
  }
  
  // Register Map2.
  if (typeof Map2Config !== 'undefined') {
    mapManager.registerMap(2, Map2Config);
  }
  
  // Additional maps can be registered here later.
  // if (typeof Map3Config !== 'undefined') {
  //   mapManager.registerMap(3, Map3Config);
  // }
  
  console.log('Level config auto-registration complete');
  console.log('Available levels:', mapManager.getAvailableLevels());
  
  // Show level metadata in the console.
  const levelsInfo = mapManager.getAllLevelsInfo();
  console.log('Level details:', levelsInfo);
}

// Export the manager.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MapManager, mapManager, autoRegisterMaps };
} else {
  window.MapManager = MapManager;
  window.mapManager = mapManager;
  window.autoRegisterMaps = autoRegisterMaps;
}
