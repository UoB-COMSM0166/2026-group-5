// Test config loading.
console.log('Starting config load test...');

// Simulate loading the Map1 config.
if (typeof Map1Config !== 'undefined') {
    console.log('✓ Map1Config loaded');
    
    // Test the loadMapConfig behavior.
    const baseTile = 16;
    
    function waypoint(tx, ty) {
        return { x: tx * baseTile + baseTile / 2, y: ty * baseTile + baseTile / 2 };
    }
    
    // Simulate the core logic of loadMapConfig.
    const player = { ...Map1Config.player };
    const mapSettings = { ...Map1Config.settings };
    const npcs = Map1Config.npcs.map(npcConfig => ({
        ...npcConfig,
        x: npcConfig.x * baseTile,
        y: npcConfig.y * baseTile,
        waypoints: npcConfig.waypoints.map(wp => {
            return waypoint(wp.x, wp.y);
        })
    }));
    
    console.log('✓ Player config:', player);
    console.log('✓ Map settings:', mapSettings);
    console.log('✓ NPC count:', npcs.length);
    console.log('✓ First NPC waypoint count:', npcs[0].waypoints.length);
    console.log('✓ First waypoint:', npcs[0].waypoints[0]);
    
    console.log('Config load test completed');
} else {
    console.error('✗ Map1Config not found');
}
