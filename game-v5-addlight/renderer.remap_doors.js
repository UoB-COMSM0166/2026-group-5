// Tiled Map Renderer with safer tile handling and multi-layer support
// Supports the basic test map and oversized GIDs
class TiledMapRenderer {
    constructor(canvasId, mapName = "basic test2") { // Default map name
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.mapData = null;
        this.scale = 2; // Default zoom level
        this.showGrid = false;
        this.isReady = false;
        this.tilesetMap = new Map();
        this.mapName = mapName; // Accept any registered map name
        // Shared base grid size
        this.BASE_TILE_SIZE = 16;

        // Tileset config - key: firstgid, value: tileset metadata
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
        image: './tilesets/floordarkpurple6464.png',  // Confirmed file name from the asset set
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
    
    // 11, 12, and 13 are skipped in the map data
    
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
    
    // 33-39 are skipped
    
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
    
    // 41-47 are skipped
    
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
    
    // 49-55 are skipped
    
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
    
    // 58: 1616floortile (key?)
    58: {
        name: 'key', 
        image: './tilesets/key1616.png',  // Swap to key3232.png if your asset set requires it
        tileWidth: 16,
        tileHeight: 16,
        mapTileWidth: 16,
        mapTileHeight: 16,
        columns: 1,
        totalTiles: 1
    },

    // 59: door (door.tsx) using door1.png
    59: {
        name: 'door',
        image: './tilesets/door_twoside3232.png',
        // These tile sizes are fallback guesses and are auto-corrected after the image loads.
        // If they produce zero rows or columns, the whole image is treated as a single tile.
        tileWidth: 16,
        tileHeight: 16,
        mapTileWidth: 16,
        mapTileHeight: 16,
        columns: 2,
        totalTiles: 4
    },

    // 83: door_lateral (door_lateral.tsx) using door2.png
    83: {
        name: 'door_lateral',
        image: './tilesets/linedoor1632.png',
        tileWidth: 16,
        tileHeight: 32,
        mapTileWidth: 16,
        mapTileHeight: 16,
        columns: 1,
        totalTiles: 2
    }

};

        if (typeof globalThis !== 'undefined' && globalThis.CustomTilesetConfig) {
            this.tilesetConfig = {
                ...this.tilesetConfig,
                ...globalThis.CustomTilesetConfig
            };
        }

        // GID remapping for temporary compatibility when map data references out-of-range tiles
        // door_twoside3232.png is effectively a single 32x32 tile, but the map used 60/61/62
        // linedoor1632.png is effectively a single 16x32 tile, but the map used 84
        this.gidRemap = {
            60: 59,
            61: 59,
            62: 59,
            84: 83
        };


    }

    // ------------------updated jinni -----------------------------
    // Tiled flip flags (high bits)
    static FLIP_H = 0x80000000;
    static FLIP_V = 0x40000000;
    static FLIP_D = 0x20000000;
    static FLIP_MASK = TiledMapRenderer.FLIP_H | TiledMapRenderer.FLIP_V | TiledMapRenderer.FLIP_D;

    normalizeGid(gid) {
    // Convert e.g. 3221225479 -> real gid by stripping flip bits
    return (gid >>> 0) & ~TiledMapRenderer.FLIP_MASK;
    }

    // ------------------updated jinni -----------------------------

    // Initialize the renderer
    async init() {
        try {
            if (typeof TileMaps === 'undefined' || !TileMaps[this.mapName]) {
                throw new Error(`Map data was not found: TileMaps["${this.mapName}"] is missing`);
            }
            
            this.mapData = TileMaps[this.mapName];

            // Count the highest tile index used by each tileset for auto sizing
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


            // Check whether every declared tileset firstgid has a matching config entry
            if (this.mapData.tilesets && Array.isArray(this.mapData.tilesets)) {
                const declared = this.mapData.tilesets.map(t => t.firstgid).filter(Boolean).sort((a,b)=>a-b);
                const configured = Object.keys(this.tilesetConfig).map(n => parseInt(n,10)).sort((a,b)=>a-b);
                const missing = declared.filter(g => !configured.includes(g));
                if (missing.length) {
                    console.warn('Missing firstgid entries in tilesetConfig. Placeholder rendering may be used:', missing);
                }
            }

            // Validate that at least one layer exists
            if (!this.mapData.layers || this.mapData.layers.length === 0) {
                throw new Error('The map has no usable layers');
            }
            console.log(`Map data loaded: ${this.mapName}`, this.mapData);
            
            // Analyze the GIDs used by the map
            this.analyzeMap();
            // Update map info in the UI
            this.updateInfo();
            // Resize the canvas
            this.resizeCanvas();
            // Load all tilesets
            await this.loadAllTilesets();
            
            this.isReady = true;
            this.render();
            
        } catch (error) {
            console.error('Renderer initialization failed:', error);
            this.showError(error.message);
        }
    }

    // Analyze the GIDs used by each layer
    analyzeMap() {
        this.mapData.layers.forEach(layer => {
            if (layer.type === 'tilelayer') {
    // ------------------updated jinni -----------------------------
                const used = new Set(
                    layer.data
                        .map(g => this.normalizeGid(g))
                        .filter(g => g > 0)
                    );
    // ------------------updated jinni -----------------------------
                console.log(`Layer "${layer.name}" uses GIDs:`, Array.from(used).sort((a,b)=>a-b));
            }
        });
    }

    // Update map info shown in the page UI
    updateInfo() {
        const mapSize = document.getElementById('map-size');
        const tileSize = document.getElementById('tile-size');
        const layerCount = document.getElementById('layer-count');
        
        if (mapSize) mapSize.textContent = `${this.mapData.width} x ${this.mapData.height}`;
        if (tileSize) tileSize.textContent = `${this.mapData.tilewidth || this.BASE_TILE_SIZE} x ${this.mapData.tileheight || this.BASE_TILE_SIZE}`;
        if (layerCount) layerCount.textContent = this.mapData.layers.length;
    }

    // Resize the canvas from map dimensions and zoom
    resizeCanvas() {
        const width = this.mapData.width * this.BASE_TILE_SIZE * this.scale;
        const height = this.mapData.height * this.BASE_TILE_SIZE * this.scale;
        
        this.canvas.width = Math.floor(width);
        this.canvas.height = Math.floor(height);
        this.canvas.style.width = Math.floor(width) + 'px';
        this.canvas.style.height = Math.floor(height) + 'px';
    }

    // Find the matching tileset for a GID using descending firstgid order
    getTilesetForGid(gid) {
    // ------------------updated jinni -----------------------------
        const raw = this.normalizeGid(gid);
        if (raw <= 0) return null;
    // ------------------updated jinni -----------------------------   
        let bestMatch = null;
        // Sort by firstgid descending so the first match is the best match
        const sortedTilesets = Array.from(this.tilesetMap.entries()).sort((a, b) => b[0] - a[0]);
        for (const [firstgid, data] of sortedTilesets) {
            if (firstgid <= raw) {
                bestMatch = { firstgid, data };
                break; // The first descending match is the best match
            }
        }
        // Log when no tileset matches the GID
        if (!bestMatch) {
            console.warn(`No matching tileset for GID: ${gid}`);
        }
        return bestMatch;
    }

    // Load all tileset images
    async loadAllTilesets() {
        const results = await Promise.all(
            Object.entries(this.tilesetConfig).map(([firstgid, config]) => 
                this.loadTilesetImage(parseInt(firstgid), config)
            )
        );
        
        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
            console.warn('Tilesets that failed to load:', failed.map(f => f.config.name));
        }
    }

    // Load a single tileset image and fall back to a placeholder on failure
    loadTilesetImage(firstgid, config) {
        return new Promise((resolve) => {
            const img = new Image();
            
            //img.onload = () => {
                //console.log(` [${firstgid}] Tileset loaded: ${config.name} (${img.width}x${img.height})`);
//                
                //this.tilesetMap.set(firstgid, {
                    //image: img,
                    //config: config,
                    //firstgid: firstgid,
                    //loaded: true
                //});
//                
                //resolve({ success: true, firstgid });
            //};
// ------------------updated jinni -----------------------------
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
                    // If the current tile width yields too few tiles, try common fallback sizes
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
// ------------------updated jinni -----------------------------
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

    // Build a placeholder image when a tileset fails to load
    createPlaceholder(config, firstgid) {
        const canvas = document.createElement('canvas');
        const w = config.tileWidth;
        const h = config.tileHeight;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        
        // Use a different background hue for each firstgid
        const hue = (firstgid * 60) % 360;
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.fillRect(0, 0, w, h);
        
        // White border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w, h);
        
        // Draw the tileset name
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.min(w,h)/4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(config.name, w/2, 10);
        
        // Draw the firstgid value
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
            this.drawErrorTile(gridX, gridY, gid, 'Missing tile image');
            return;
        }

        const raw = this.normalizeGid(gid);
        const tileIndex = raw - firstgid;

        if (tileIndex < 0 || tileIndex >= config.totalTiles) {
            this.drawErrorTile(gridX, gridY, gid, 'Tile index out of range');
            return;
        }

        // Compute the source rectangle inside the atlas
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

        // Shift upward by the extra height so large tiles do not appear too low
        let drawX = destX;
        let drawY = destY - extraH * pixelScale;

        // Realign only very large tiles, such as 128x128 or larger
        const baseTileSize = this.BASE_TILE_SIZE;

        // mapTileW/H may be 16, 32, 64, 128, and so on
        if (mapTileW >= 128 || mapTileH >= 128) {
        // Find the origin of the block that contains the current cell
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


    // Legacy drawTile implementation kept for reference
    //drawTile(gid, gridX, gridY) {
        //if (gid === 0) return;
//
        //const tilesetInfo = this.getTilesetForGid(gid);
        //if (!tilesetInfo) {
            //this.drawErrorTile(gridX, gridY, gid, 'No matching tileset');
            //return;
        //}
//
        //const { firstgid, data } = tilesetInfo;
        //const { image, config, isPlaceholder } = data;
//        
        //if (!image) {
            //this.drawErrorTile(gridX, gridY, gid, 'Missing tile image');
            //return;
        //}
    //// ------------------updated jinni -----------------------------
        //const raw = this.normalizeGid(gid);
        //const tileIndex = raw - firstgid;
    //// ------------------updated jinni -----------------------------
        //if (tileIndex < 0 || tileIndex >= config.totalTiles) {
            //this.drawErrorTile(gridX, gridY, gid, 'Tile index out of range');
            //return;
        //}
//
        //// ===== Core idea: only draw large tiles at their origin cell =====
        //const mapTileW = config.mapTileWidth || config.tileWidth;
        //const mapTileH = config.mapTileHeight || config.tileHeight;
        //const cellsW = mapTileW / this.BASE_TILE_SIZE; // Horizontal cell span
        //const cellsH = mapTileH / this.BASE_TILE_SIZE; // Vertical cell span
        //// Only draw when the current cell is the top-left origin of the large tile
        //if (gridX % cellsW !== 0 || gridY % cellsH !== 0) {
            //return;
        //}
        //// ==============================================
//        
        //// Compute the source rectangle inside the atlas
        //const srcCol = tileIndex % config.columns;
        //const srcRow = Math.floor(tileIndex / config.columns);
        //const srcX = srcCol * config.tileWidth;
        //const srcY = srcRow * config.tileHeight;
//        
        //// Compute the draw size and position on the canvas
        //const pixelScale = this.scale;
        //const destW = mapTileW * pixelScale;
        //const destH = mapTileH * pixelScale;
//        
        //let destX, destY;
        //if (mapTileW === this.BASE_TILE_SIZE && mapTileH === this.BASE_TILE_SIZE) {
            //// 16x16 tiles align directly to the grid
            //destX = gridX * this.BASE_TILE_SIZE * pixelScale;
            //destY = gridY * this.BASE_TILE_SIZE * pixelScale;
        //} else {
            //// Large tiles align to the top-left corner of their covered block
            //const blockX = Math.floor(gridX / cellsW) * cellsW;
            //const blockY = Math.floor(gridY / cellsH) * cellsH;
            //destX = blockX * this.BASE_TILE_SIZE * pixelScale;
            //destY = blockY * this.BASE_TILE_SIZE * pixelScale;
        //}
//
        //try {
            //this.ctx.drawImage(
                //image,
                //srcX, srcY, config.tileWidth, config.tileHeight,
                //destX, destY, destW, destH
            //);
//            
            //// Add a red translucent overlay for placeholders
            //if (isPlaceholder) {
                //this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                //this.ctx.fillRect(destX, destY, destW, destH);
            //}
//            
        //} catch (e) {
            //console.error('Tile draw failed:', e);
            //this.drawErrorTile(gridX, gridY, gid, 'Draw error');
        //}
    //}

    // Draw an error tile with a red fill and yellow border
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

    // Main render loop
    render() {
        if (!this.isReady) return;

        // Clear the canvas background
        this.ctx.fillStyle = '#0f0f1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Render all visible tile layers in order
        this.mapData.layers.forEach((layer, idx) => {
            if (!layer.visible || layer.type !== 'tilelayer') return;
            this.renderLayer(layer, idx);
        });

        // Draw the grid if enabled
        if (this.showGrid) this.drawGrid();
    }

    // Render a single layer
    renderLayer(layer, idx) {
        const { width, height, data, name } = layer;
        // Validate layer data
        if (!data) {
            console.warn(`Layer ${idx}: ${name} has no data and will be skipped`);
            return;
        }
        
        let count = 0;
        // Walk every cell in the layer and draw its tile
        for (let gridY = 0; gridY < height; gridY++) {
            for (let gridX = 0; gridX < width; gridX++) {
                const index = gridY * width + gridX;
                const gid = data[index];
                if (gid === 0) continue;
                
                this.drawTile(gid, gridX, gridY);
                count++;
            }
        }
        console.log(`Layer ${idx}: ${name} rendered tiles: ${count}`);
    }

    // Draw the debug grid
    drawGrid() {
        const tileSize = this.BASE_TILE_SIZE * this.scale;
        const width = this.mapData.width * tileSize;
        const height = this.mapData.height * tileSize;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= width; x += tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= height; y += tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }

    // Display an initialization error
    showError(message) {
        const errorEl = document.getElementById('map-error');
        if (errorEl) {
            errorEl.textContent = `Initialization failed: ${message}`;
            errorEl.style.color = 'red';
            errorEl.style.padding = '10px';
        }
        // Draw the error text on the canvas
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(message, this.canvas.width/2, this.canvas.height/2);
    }

    // Switch maps dynamically
    async switchMap(newMapName) {
        this.mapName = newMapName;
        this.isReady = false;
        this.tilesetMap.clear();
        await this.init();
    }
}

// Initialization example

//----------------jinni new updated-----------
//window.addEventListener('load', () => {
    //// Pass the canvas ID and map name to initialize the renderer
    //const renderer = new TiledMapRenderer('map-canvas', 'basic test2');
    //renderer.init();
//
    //// Optional: bind a grid toggle button
    //const gridToggle = document.getElementById('toggle-grid');
    //if (gridToggle) {
        //gridToggle.addEventListener('click', () => {
            //renderer.showGrid = !renderer.showGrid;
            //renderer.render();
        //});
    //}
//
    //// Optional: bind zoom controls
    //const scaleControl = document.getElementById('scale-control');
    //if (scaleControl) {
        //scaleControl.addEventListener('input', (e) => {
            //renderer.scale = parseFloat(e.target.value);
            //renderer.resizeCanvas();
            //renderer.render();
        //});
    //}
//});