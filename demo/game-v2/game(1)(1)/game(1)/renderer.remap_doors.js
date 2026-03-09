// Tiled map renderer with safer tile drawing and large-GID handling.
class TiledMapRenderer {
    constructor(canvasId, mapName = "basic test2") {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.mapData = null;
        this.scale = 2;
        this.showGrid = false;
        this.isReady = false;
        this.tilesetMap = new Map();
        this.mapName = mapName;
        // Shared base grid size.
        this.BASE_TILE_SIZE = 16;

        // Tileset configuration keyed by firstgid.
        this.tilesetConfig = {
    // Base tiles (1-10)
    1: { 
        name: 'floor', 
        image: './tilesets/floor128128.png',
        tileWidth: 128,
        tileHeight: 128,
        mapTileWidth: 128,
        mapTileHeight: 128,
        columns: 8,
        totalTiles: 64
    },
    2: {
        name: 'leftwall', 
        image: './tilesets/verticalwall_left3232.png',
        tileWidth: 32,
        tileHeight: 32,
        mapTileWidth: 32,
        mapTileHeight: 32,
        columns: 1,
        totalTiles: 1
    },
    3: {
        name: 'downwall', 
        image: './tilesets/verticalwall_horizontal3232.png',
        tileWidth: 32,
        tileHeight: 32,
        mapTileWidth: 32,
        mapTileHeight: 32,
        columns: 1,
        totalTiles: 1
    },
    4: { 
        name: 'rightwall', 
        image: './tilesets/verticalwall_right3232.png',
        tileWidth: 32,
        tileHeight: 32,
        mapTileWidth: 32,
        mapTileHeight: 32,
        columns: 1,
        totalTiles: 1
    },
    5: {
        name: 'facewall', 
        image: './tilesets/brick3232.jpg',
        tileWidth: 32,
        tileHeight: 32,
        mapTileWidth: 32,
        mapTileHeight: 32,
        columns: 1,
        totalTiles: 1
    },
    6: { 
        name: 'brownfloor', 
        image: './tilesets/floorbrown6464.png',
        tileWidth: 64,
        tileHeight: 64,
        mapTileWidth: 64,
        mapTileHeight: 64,
        columns: 1,
        totalTiles: 1
    },
    7: { 
        name: 'purplefloor', 
        image: './tilesets/floordarkpurple6464.png',
        tileWidth: 64,
        tileHeight: 64,
        mapTileWidth: 64,
        mapTileHeight: 64,
        columns: 1,
        totalTiles: 1
    },
    8: { 
        name: 'table', 
        image: './tilesets/table6464.png',
        tileWidth: 64,
        tileHeight: 64,
        mapTileWidth: 64,
        mapTileHeight: 64,
        columns: 1,
        totalTiles: 1
    },
    9: {
        name: 'window', 
        image: './tilesets/window3232.png',
        tileWidth: 32,
        tileHeight: 32,
        mapTileWidth: 32,
        mapTileHeight: 32,
        columns: 1,
        totalTiles: 1
    },    
    10: {
        name: 'neonlight', 
        image: './tilesets/neonlight3232.png',
        tileWidth: 16,
        tileHeight: 16,
        mapTileWidth: 16,
        mapTileHeight: 16,

        columns: 2,     // 32px / 16px
        totalTiles: 4   // 2x2
        },
    
    // 11, 12, and 13 are skipped in the source map data.
    
    14: { 
        name: 'cabinet', 
        image: './tilesets/cabinet3232.png',
        tileWidth: 32,
        tileHeight: 32,
        mapTileWidth: 32,
        mapTileHeight: 32,
        columns: 1,
        totalTiles: 1
    },    
    
    15: { 
        name: 'box', 
        image: './tilesets/chest_closed3232.png',
        tileWidth: 32,
        tileHeight: 32,
        mapTileWidth: 32,
        mapTileHeight: 32,
        columns: 1,
        totalTiles: 1
    },
    
    // 16: neonbars_yellow64
    16: {
        name: 'neonbars_yellow', 
        image: './tilesets/neonbars_yellow64.png',
        tileWidth: 16,
        tileHeight: 16,
        mapTileWidth: 16,
        mapTileHeight: 16,
        columns: 4, // adjusted by jinni, was 1,
        totalTiles: 8, // adjusted by jinni, was 1,
    },
    
    
    // 24: neonbars_multicolor64
    24: {
        name: 'neonbars_multicolor', 
        image: './tilesets/neonbars_multicolor64.png',
        tileWidth: 16,
        tileHeight: 16,
        mapTileWidth: 16,
        mapTileHeight: 16,
        columns: 4, // adjusted by jinni, was 1,
        totalTiles: 8, // adjusted by jinni, was 1,
    },
    

    
    // 32: neonbars_pink64
    32: {
        name: 'neonbars_pink', 
        image: './tilesets/neonbars_pink64.png',
        tileWidth: 16,
        tileHeight: 16,
        mapTileWidth: 16,
        mapTileHeight: 16,
        columns: 4, // adjusted by jinni, was 1,
        totalTiles: 8, // adjusted by jinni, was 1,
    },
    
    // 33-39 are skipped.
    
    // 40: neonbars_bluepink64
    40: {
        name: 'neonbars_bluepink', 
        image: './tilesets/neonbars_bluepink64.png',
        tileWidth: 16,
        tileHeight: 16,
        mapTileWidth: 16,
        mapTileHeight: 16,
        columns: 4, // adjusted by jinni, was 1,
        totalTiles: 8, // adjusted by jinni, was 1,
    },
    
    // 41-47 are skipped.
    
    // 48: circuit64
    48: {
        name: 'circuit', 
        image: './tilesets/circuit64.png',
        tileWidth: 16,
        tileHeight: 16,
        mapTileWidth: 16,
        mapTileHeight: 16,
        columns: 4, // adjusted by jinni, was 1,
        totalTiles: 8, // adjusted by jinni, was 1,
    },
    
    // 49-55 are skipped.
    
    // 56: pinksymbol
    56: {
        name: 'pinksymbol', 
        image: './tilesets/pinksymbol3232.png',
        tileWidth: 32,
        tileHeight: 32,
        mapTileWidth: 32,
        mapTileHeight: 32,
        columns: 1,
        totalTiles: 1
    },
    
    // 57: bluesymbol
    57: {
        name: 'bluesymbol', 
        image: './tilesets/bluesymbol3232.png',
        tileWidth: 32,
        tileHeight: 32,
        mapTileWidth: 32,
        mapTileHeight: 32,
        columns: 1,
        totalTiles: 1
    },
    
    // 58: key tile
    58: {
        name: 'key', 
        image: './tilesets/key1616.png',
        tileWidth: 16,
        tileHeight: 16,
        mapTileWidth: 16,
        mapTileHeight: 16,
        columns: 1,
        totalTiles: 1
    },

    // 59: door (door.tsx)
    59: {
        name: 'door',
        image: './tilesets/door_twoside3232.png',
        // These values are fallback guesses. The actual crop size is calibrated after image load.
        tileWidth: 16,
        tileHeight: 16,
        mapTileWidth: 16,
        mapTileHeight: 16,
        columns: 2,
        totalTiles: 4
    },

    // 83: door_lateral (door_lateral.tsx)
    83: {
        name: 'door_lateral',
        image: './tilesets/linedoor1632.png',
        tileWidth: 16,
        tileHeight: 16,
        mapTileWidth: 16,
        mapTileHeight: 16,
        columns: 1,
        totalTiles: 2
    }

};

        // Temporary GID remapping for oversized tile references in the source map.
        this.gidRemap = {
            60: 59,
            61: 59,
            62: 59,
            84: 83
        };


    }

    // Tiled flip flags (high bits)
    static FLIP_H = 0x80000000;
    static FLIP_V = 0x40000000;
    static FLIP_D = 0x20000000;
    static FLIP_MASK = TiledMapRenderer.FLIP_H | TiledMapRenderer.FLIP_V | TiledMapRenderer.FLIP_D;

    normalizeGid(gid) {
    // Convert e.g. 3221225479 -> real gid by stripping flip bits
    return (gid >>> 0) & ~TiledMapRenderer.FLIP_MASK;
    }

    // Initialize the renderer.
    async init() {
        try {
            if (typeof TileMaps === 'undefined' || !TileMaps[this.mapName]) {
                throw new Error(`Map data was not found (TileMaps["${this.mapName}"] is missing)`);
            }
            
            this.mapData = TileMaps[this.mapName];

            // Track the highest referenced tile per tileset for auto-sizing.
            this.requiredTilesByFirstgid = {};
            if (this.mapData.layers && Array.isArray(this.mapData.layers)) {
                for (const layer of this.mapData.layers) {
                    if (layer.type !== 'tilelayer' || !Array.isArray(layer.data)) continue;
                    for (const gid of layer.data) {
                        const raw = this.normalizeGid(gid);
                        if (!raw) continue;
                        const ts = this.getTilesetForGid(raw);
                        if (!ts) continue;
                        const idx = raw - ts.firstgid;
                        const need = idx + 1;
                        const cur = this.requiredTilesByFirstgid[ts.firstgid] || 0;
                        if (need > cur) this.requiredTilesByFirstgid[ts.firstgid] = need;
                    }
                }
            }


            // Check whether all declared tilesets have matching config entries.
            if (this.mapData.tilesets && Array.isArray(this.mapData.tilesets)) {
                const declared = this.mapData.tilesets.map(t => t.firstgid).filter(Boolean).sort((a,b)=>a-b);
                const configured = Object.keys(this.tilesetConfig).map(n => parseInt(n,10)).sort((a,b)=>a-b);
                const missing = declared.filter(g => !configured.includes(g));
                if (missing.length) {
                    console.warn('Missing tilesetConfig firstgid entries:', missing);
                }
            }

            // Validate layer data.
            if (!this.mapData.layers || this.mapData.layers.length === 0) {
                throw new Error('The map has no usable layers');
            }
            console.log(`Map data loaded: ${this.mapName}`, this.mapData);
            
            // Inspect used GIDs.
            this.analyzeMap();
            // Update the info panel.
            this.updateInfo();
            // Resize the canvas.
            this.resizeCanvas();
            // Load all tilesets.
            await this.loadAllTilesets();
            
            this.isReady = true;
            this.render();
            
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showError(error.message);
        }
    }

    // Inspect the GIDs used by each tile layer.
    analyzeMap() {
        this.mapData.layers.forEach(layer => {
            if (layer.type === 'tilelayer') {
                const used = new Set(
                    layer.data
                        .map(g => this.normalizeGid(g))
                        .filter(g => g > 0)
                    );
                console.log(`Layer "${layer.name}" uses GIDs:`, Array.from(used).sort((a,b)=>a-b));
            }
        });
    }

    // Update the map info display.
    updateInfo() {
        const mapSize = document.getElementById('map-size');
        const tileSize = document.getElementById('tile-size');
        const layerCount = document.getElementById('layer-count');
        
        if (mapSize) mapSize.textContent = `${this.mapData.width} x ${this.mapData.height}`;
        if (tileSize) tileSize.textContent = `${this.mapData.tilewidth || this.BASE_TILE_SIZE} x ${this.mapData.tileheight || this.BASE_TILE_SIZE}`;
        if (layerCount) layerCount.textContent = this.mapData.layers.length;
    }

    // Resize the canvas from map dimensions and zoom level.
    resizeCanvas() {
        const width = this.mapData.width * this.BASE_TILE_SIZE * this.scale;
        const height = this.mapData.height * this.BASE_TILE_SIZE * this.scale;
        
        this.canvas.width = Math.floor(width);
        this.canvas.height = Math.floor(height);
        this.canvas.style.width = Math.floor(width) + 'px';
        this.canvas.style.height = Math.floor(height) + 'px';
    }

    // Resolve the best matching tileset for a GID.
    getTilesetForGid(gid) {
        const raw = this.normalizeGid(gid);
        if (raw <= 0) return null;
        let bestMatch = null;
        // Sort by descending firstgid so the first match is the best one.
        const sortedTilesets = Array.from(this.tilesetMap.entries()).sort((a, b) => b[0] - a[0]);
        for (const [firstgid, data] of sortedTilesets) {
            if (firstgid <= raw) {
                bestMatch = { firstgid, data };
                break;
            }
        }
        // Log missing tileset matches for debugging.
        if (!bestMatch) {
            console.warn(`No matching tileset for GID: ${gid}`);
        }
        return bestMatch;
    }

    // Load all tileset images.
    async loadAllTilesets() {
        const results = await Promise.all(
            Object.entries(this.tilesetConfig).map(([firstgid, config]) => 
                this.loadTilesetImage(parseInt(firstgid), config)
            )
        );
        
        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
            console.warn('Failed tilesets:', failed.map(f => f.config.name));
        }
    }

    // Load one tileset image and fall back to a placeholder on failure.
    loadTilesetImage(firstgid, config) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                // --- AUTO: derive layout from the actual PNG ---
                const cols = Math.floor(img.width / config.tileWidth);
                const rows = Math.floor(img.height / config.tileHeight);

                // AUTO: try common tile sizes when totalTiles is not enough
                const required = (this.requiredTilesByFirstgid && this.requiredTilesByFirstgid[firstgid]) || 1;
                const trySizes = [config.tileWidth, 16, 32, 64, 128].filter((v, i, a) => v && a.indexOf(v) === i);
                const pickBest = () => {
                    for (const s of trySizes) {
                        if (img.width % s !== 0 || img.height % s !== 0) continue;
                        const c = img.width / s;
                        const r = img.height / s;
                        const total = c * r;
                        if (total >= required) {
                            config.tileWidth = s;
                            config.tileHeight = s;
                            config.columns = c;
                            config.totalTiles = total;
                            return true;
                        }
                    }
                    return false;
                };

                if (cols <= 0 || rows <= 0) {
                    console.warn(`[${firstgid}] Invalid tileset dimensions for ${config.name}: ${img.width}x${img.height}`);
                    // Fallback: treat the whole image as a single tile (prevents blank draws when tileWidth guess is wrong)
                    config.tileWidth = img.width;
                    config.tileHeight = img.height;
                    config.mapTileWidth = img.width;
                    config.mapTileHeight = img.height;
                    config.columns = 1;
                    config.totalTiles = 1;
                } else {
                    // override hardcoded values (prevents blank tiles when columns is wrong)
                    config.columns = cols;
                    config.totalTiles = cols * rows;
                    // Try common tile sizes when the current guess is too small.
                    if (config.totalTiles < required) {
                        pickBest();
                    }
                }

                console.log(` [${firstgid}] Tileset loaded: ${config.name} (${img.width}x${img.height}) cols=${config.columns} total=${config.totalTiles}`);

                this.tilesetMap.set(firstgid, {
                    image: img,
                    config: config,
                    firstgid: firstgid,
                    loaded: true
                });
                resolve({ success: true, firstgid });
            };
            
            img.onerror = () => {
                console.error(`[${firstgid}] Tileset failed to load: ${config.image}`);
                
                const placeholder = this.createPlaceholder(config, firstgid);
                
                this.tilesetMap.set(firstgid, {
                    image: placeholder,
                    config: config,
                    firstgid: firstgid,
                    loaded: false,
                    isPlaceholder: true
                });
                
                resolve({ success: false, firstgid, config });
            };
            
            img.src = config.image;
        });
    }

    // Build a placeholder image for a failed tileset load.
    createPlaceholder(config, firstgid) {
        const canvas = document.createElement('canvas');
        const w = config.tileWidth;
        const h = config.tileHeight;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        
        // Use firstgid to vary the placeholder color.
        const hue = (firstgid * 60) % 360;
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.fillRect(0, 0, w, h);
        
        // White border.
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w, h);
        
        // Draw the tileset name.
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.min(w,h)/4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(config.name, w/2, 10);
        
        // Draw the firstgid.
        ctx.font = `bold ${Math.min(w,h)/2}px Arial`;
        ctx.textBaseline = 'middle';
        ctx.fillText(firstgid, w/2, h/2);
        
        return canvas;
    }

    drawTile(gid, gridX, gridY) {
        if (gid === 0) return;

        const tilesetInfo = this.getTilesetForGid(gid);
        if (!tilesetInfo) {
            this.drawErrorTile(gridX, gridY, gid, 'No matching tileset');
            return;
        }

        const { firstgid, data } = tilesetInfo;
        const { image, config, isPlaceholder } = data;

        if (!image) {
            this.drawErrorTile(gridX, gridY, gid, 'Tileset image missing');
            return;
        }

        const raw = this.normalizeGid(gid);
        const tileIndex = raw - firstgid;

        if (tileIndex < 0 || tileIndex >= config.totalTiles) {
            this.drawErrorTile(gridX, gridY, gid, 'Tile index out of range');
            return;
        }

        // Compute the source crop inside the tileset image.
        const srcCol = tileIndex % config.columns;
        const srcRow = Math.floor(tileIndex / config.columns);
        const srcX = srcCol * config.tileWidth;
        const srcY = srcRow * config.tileHeight;

        const pixelScale = this.scale;

        const mapTileW = config.mapTileWidth || config.tileWidth;
        const mapTileH = config.mapTileHeight || config.tileHeight;

        const destW = mapTileW * pixelScale;
        const destH = mapTileH * pixelScale;

        let destX = gridX * this.BASE_TILE_SIZE * pixelScale;
        let destY = gridY * this.BASE_TILE_SIZE * pixelScale;

        const extraH = mapTileH - this.BASE_TILE_SIZE;
        const extraW = mapTileW - this.BASE_TILE_SIZE;

        // Y: shift UP by the extra height so big tiles don't look 1 cell too low
        let drawX = destX;
        let drawY = destY - extraH * pixelScale;

        // Re-alinear SOLO para tiles grandes (ej: 128x128 o más)
        const baseTileSize = this.BASE_TILE_SIZE;

        // Large tiles may span multiple base cells.
        if (mapTileW >= 128 || mapTileH >= 128) {
        // Find the top-left cell covered by the large tile block.
        const cellsW = Math.max(1, Math.round(mapTileW / baseTileSize));
        const cellsH = Math.max(1, Math.round(mapTileH / baseTileSize));

        const blockX = Math.floor(gridX / cellsW) * cellsW;
        const blockY = Math.floor(gridY / cellsH) * cellsH;

        destX = blockX * baseTileSize * pixelScale;
        destY = blockY * baseTileSize * pixelScale;
}

        try {
            this.ctx.drawImage(
            image,
            srcX, srcY, config.tileWidth, config.tileHeight,
            drawX, drawY, destW, destH
            );

            if (isPlaceholder) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            this.ctx.fillRect(destX, destY, destW, destH);
            }
        } catch (e) {
            console.error('Tile draw failed:', e);
            this.drawErrorTile(gridX, gridY, gid, 'Draw error');
        }
    }


    // Draw an error tile with a red background, yellow border, and GID label.
    drawErrorTile(gridX, gridY, gid, reason) {
        const w = this.BASE_TILE_SIZE * this.scale;
        const h = this.BASE_TILE_SIZE * this.scale;
        const x = gridX * w;
        const y = gridY * h;
        
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(x, y, w, h);
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, w, h);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `bold ${Math.max(8, w/2)}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(gid, x + w/2, y + h/2);
        console.warn(`Error tile [${gid}] @ (${gridX},${gridY}): ${reason}`);
    }

    // Main render pass.
    render() {
        if (!this.isReady) return;

        // Clear the background.
        this.ctx.fillStyle = '#0f0f1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw visible tile layers in order.
        this.mapData.layers.forEach((layer, idx) => {
            if (!layer.visible || layer.type !== 'tilelayer') return;
            this.renderLayer(layer, idx);
        });

        // Draw the debug grid when enabled.
        if (this.showGrid) this.drawGrid();
    }

    // Render one tile layer.
    renderLayer(layer, idx) {
        const { width, height, data, name } = layer;
        // Skip layers without tile data.
        if (!data) {
            console.warn(`Layer ${idx}: ${name} has no data, skipped`);
            return;
        }
        
        let count = 0;
        // Walk each grid cell and draw its tile.
        for (let gridY = 0; gridY < height; gridY++) {
            for (let gridX = 0; gridX < width; gridX++) {
                const index = gridY * width + gridX;
                const gid = data[index];
                if (gid === 0) continue;
                
                this.drawTile(gid, gridX, gridY);
                count++;
            }
        }
        console.log(`Layer ${idx}: ${name} drew ${count} tiles`);
    }

    // Draw the debug grid overlay.
    drawGrid() {
        const tileSize = this.BASE_TILE_SIZE * this.scale;
        const width = this.mapData.width * tileSize;
        const height = this.mapData.height * tileSize;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        
        // Vertical lines.
        for (let x = 0; x <= width; x += tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        
        // Horizontal lines.
        for (let y = 0; y <= height; y += tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }

    // Show initialization errors.
    showError(message) {
        const errorEl = document.getElementById('map-error');
        if (errorEl) {
            errorEl.textContent = `Initialization failed: ${message}`;
            errorEl.style.color = 'red';
            errorEl.style.padding = '10px';
        }
        // Draw the error directly on the canvas as well.
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(message, this.canvas.width/2, this.canvas.height/2);
    }

    // Switch to another map at runtime.
    async switchMap(newMapName) {
        this.mapName = newMapName;
        this.isReady = false;
        this.tilesetMap.clear();
        await this.init();
    }
}