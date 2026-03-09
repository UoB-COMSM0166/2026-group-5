// Tiled Map Renderer - 修复瓦片重复绘制/拼写错误/逻辑鲁棒性问题
// 适配 basic test2 地图，处理超大GID、多图层渲染
class TiledMapRenderer {
    constructor(canvasId, mapName = "basic test2") { // 默认加载新地图
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.mapData = null;
        this.scale = 2; // 默认缩放2倍提升可视性
        this.showGrid = false;
        this.isReady = false;
        this.tilesetMap = new Map();
        this.mapName = mapName; // 可传入地图名称，适配多地图
        // 统一管理基础网格尺寸（避免硬编码分散）
        this.BASE_TILE_SIZE = 16;

        // 瓦片集配置 - Key: firstgid | Value: 瓦片集信息（核心：mapTileWidth/Height定义瓦片在地图上的实际占用像素）
        this.tilesetConfig = {
    // 基础瓦片 (1-10)
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
        image: './tilesets/floordarkpurple6464.png',  // 注意：你的截图显示文件名是 floordarkpurple6464.png
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
    
    // 注意：11, 12, 13 在地图数据中被跳过！
    
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
    

    
    // 32: neonbars_pink64 (你的截图显示是 neonbars_pink64.png)
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
    
    // 33-39 被跳过
    
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
    
    // 41-47 被跳过
    
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
    
    // 49-55 被跳过
    
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
        image: './tilesets/key1616.png',  // 或者 key3232.png，看你的实际需求
        tileWidth: 16,
        tileHeight: 16,
        mapTileWidth: 16,
        mapTileHeight: 16,
        columns: 1,
        totalTiles: 1
    },

    // 59: door (door.tsx) - 使用 door1.png
    59: {
        name: 'door',
        image: './tilesets/door_twoside3232.png',
        // 下面的 tileWidth/tileHeight 是“默认猜测值”。真正裁剪尺寸会在图片加载时自动校准：
        // - 如果发现当前 tileWidth 导致 cols/rows 计算为 0，会自动改用整张图片作为单 tile（1x1）。
        tileWidth: 16,
        tileHeight: 16,
        mapTileWidth: 16,
        mapTileHeight: 16,
        columns: 2,
        totalTiles: 4
    },

    // 83: door_lateral (door_lateral.tsx) - 使用 door2.png
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

        // GID 重映射（临时兼容：当 tileset 实际只有 1 张 tile，但地图里误用了更大的 gid）
        // door_twoside3232.png 实际 32x32（1 tile），但地图里用了 60/61/62（属于 firstgid=59 的 tileIndex 1/2/3）
        // linedoor1632.png 实际 16x32（1 tile），但地图里用了 84（属于 firstgid=83 的 tileIndex 1）
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

    // 初始化渲染器
    async init() {
        try {
            if (typeof TileMaps === 'undefined' || !TileMaps[this.mapName]) {
                throw new Error(`未找到地图数据（TileMaps["${this.mapName}"]不存在）`);
            }
            
            this.mapData = TileMaps[this.mapName];

            // 统计：每个 tileset(firstgid) 在地图中实际用到了多少个 tile（用于自动推断 tileWidth/Height）
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


            // 检查：地图里声明的 tileset firstgid 是否都在 tilesetConfig 里（方便定位缺图/路径问题）
            if (this.mapData.tilesets && Array.isArray(this.mapData.tilesets)) {
                const declared = this.mapData.tilesets.map(t => t.firstgid).filter(Boolean).sort((a,b)=>a-b);
                const configured = Object.keys(this.tilesetConfig).map(n => parseInt(n,10)).sort((a,b)=>a-b);
                const missing = declared.filter(g => !configured.includes(g));
                if (missing.length) {
                    console.warn('⚠️ tilesetConfig 缺少这些 firstgid（将导致占位图或无法正确裁剪）:', missing);
                }
            }

            // 校验图层是否存在
            if (!this.mapData.layers || this.mapData.layers.length === 0) {
                throw new Error('地图无可用图层');
            }
            console.log(`地图数据加载完成: ${this.mapName}`, this.mapData);
            
            // 分析地图使用的GID
            this.analyzeMap();
            // 更新页面信息展示
            this.updateInfo();
            // 调整画布尺寸
            this.resizeCanvas();
            // 加载所有瓦片集
            await this.loadAllTilesets();
            
            this.isReady = true;
            this.render();
            
        } catch (error) {
            console.error('初始化失败:', error);
            this.showError(error.message);
        }
    }

    // 分析各图层使用的GID（过滤超大无效GID）
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
                console.log(`图层 "${layer.name}" 使用的GID:`, Array.from(used).sort((a,b)=>a-b));
            }
        });
    }

    // 更新页面上的地图信息（尺寸/瓦片数/图层数）
    updateInfo() {
        const mapSize = document.getElementById('map-size');
        const tileSize = document.getElementById('tile-size');
        const layerCount = document.getElementById('layer-count');
        
        if (mapSize) mapSize.textContent = `${this.mapData.width} x ${this.mapData.height}`;
        if (tileSize) tileSize.textContent = `${this.mapData.tilewidth || this.BASE_TILE_SIZE} x ${this.mapData.tileheight || this.BASE_TILE_SIZE}`;
        if (layerCount) layerCount.textContent = this.mapData.layers.length;
    }

    // 调整画布尺寸（基于地图网格数*基础网格尺寸*缩放比例）
    resizeCanvas() {
        const width = this.mapData.width * this.BASE_TILE_SIZE * this.scale;
        const height = this.mapData.height * this.BASE_TILE_SIZE * this.scale;
        
        this.canvas.width = Math.floor(width);
        this.canvas.height = Math.floor(height);
        this.canvas.style.width = Math.floor(width) + 'px';
        this.canvas.style.height = Math.floor(height) + 'px';
    }

    // 根据GID匹配对应的瓦片集（优化：降序遍历，优先匹配大的firstgid）
    getTilesetForGid(gid) {
    // ------------------updated jinni -----------------------------
        const raw = this.normalizeGid(gid);
        if (raw <= 0) return null;
    // ------------------updated jinni -----------------------------   
        let bestMatch = null;
        // 转为数组并按firstgid降序排序，避免无序匹配错误
        const sortedTilesets = Array.from(this.tilesetMap.entries()).sort((a, b) => b[0] - a[0]);
        for (const [firstgid, data] of sortedTilesets) {
            if (firstgid <= raw) {
                bestMatch = { firstgid, data };
                break; // 降序排序后，第一个匹配的就是最优解
            }
        }
        // 未匹配到瓦片集时增加日志提示
        if (!bestMatch) {
            console.warn(`无匹配的瓦片集 for GID: ${gid}`);
        }
        return bestMatch;
    }

    // 加载所有瓦片集图片
    async loadAllTilesets() {
        const results = await Promise.all(
            Object.entries(this.tilesetConfig).map(([firstgid, config]) => 
                this.loadTilesetImage(parseInt(firstgid), config)
            )
        );
        
        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
            console.warn('加载失败的瓦片集:', failed.map(f => f.config.name));
        }
    }

    // 加载单个瓦片集图片（失败时生成占位图）
    loadTilesetImage(firstgid, config) {
        return new Promise((resolve) => {
            const img = new Image();
            
            //img.onload = () => {
                //console.log(` [${firstgid}] 瓦片集加载成功: ${config.name} (${img.width}x${img.height})`);
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
                    // 如果按当前 tileWidth 计算出来的 tile 数量不够用，则尝试常见尺寸自动修正
                    if (config.totalTiles < required) {
                        pickBest();
                    }
                }

                console.log(` [${firstgid}] 瓦片集加载成功: ${config.name} (${img.width}x${img.height}) cols=${config.columns} total=${config.totalTiles}`);

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
                console.error(`[${firstgid}] 瓦片集加载失败: ${config.image}`);
                
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

    // 生成瓦片集加载失败时的占位图（优化：增加瓦片集名称显示）
    createPlaceholder(config, firstgid) {
        const canvas = document.createElement('canvas');
        const w = config.tileWidth;
        const h = config.tileHeight;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        
        // 按firstgid生成不同色调的背景
        const hue = (firstgid * 60) % 360;
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.fillRect(0, 0, w, h);
        
        // 白色边框
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w, h);
        
        // 绘制瓦片集名称
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.min(w,h)/4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(config.name, w/2, 10);
        
        // 绘制firstgid
        ctx.font = `bold ${Math.min(w,h)/2}px Arial`;
        ctx.textBaseline = 'middle';
        ctx.fillText(firstgid, w/2, h/2);
        
        return canvas;
    }

    drawTile(gid, gridX, gridY) {
        if (gid === 0) return;

        const tilesetInfo = this.getTilesetForGid(gid);
        if (!tilesetInfo) {
            this.drawErrorTile(gridX, gridY, gid, '无匹配瓦片集');
            return;
        }

        const { firstgid, data } = tilesetInfo;
        const { image, config, isPlaceholder } = data;

        if (!image) {
            this.drawErrorTile(gridX, gridY, gid, '瓦片图片不存在');
            return;
        }

        const raw = this.normalizeGid(gid);
        const tileIndex = raw - firstgid;

        if (tileIndex < 0 || tileIndex >= config.totalTiles) {
            this.drawErrorTile(gridX, gridY, gid, '瓦片索引越界');
            return;
        }

        // 计算瓦片在图集里的裁剪位置
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

        // OJO: mapTileW/H puede ser 16, 32, 64, 128...
        if (mapTileW >= 128 || mapTileH >= 128) {
        // 计算包含当前格子的区域起始位置
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
            console.error('瓦片绘制失败:', e);
            this.drawErrorTile(gridX, gridY, gid, '绘制异常');
        }
    }


    // 绘制单个瓦片（核心修复：大瓦片仅在起始网格绘制，避免重复）
    //drawTile(gid, gridX, gridY) {
        //if (gid === 0) return;
//
        //const tilesetInfo = this.getTilesetForGid(gid);
        //if (!tilesetInfo) {
            //this.drawErrorTile(gridX, gridY, gid, '无匹配瓦片集');
            //return;
        //}
//
        //const { firstgid, data } = tilesetInfo;
        //const { image, config, isPlaceholder } = data;
//        
        //if (!image) {
            //this.drawErrorTile(gridX, gridY, gid, '瓦片图片不存在');
            //return;
        //}
    //// ------------------updated jinni -----------------------------
        //const raw = this.normalizeGid(gid);
        //const tileIndex = raw - firstgid;
    //// ------------------updated jinni -----------------------------
        //if (tileIndex < 0 || tileIndex >= config.totalTiles) {
            //this.drawErrorTile(gridX, gridY, gid, '瓦片索引越界');
            //return;
        //}
//
        //// ===== 核心修复：仅在大瓦片的起始网格绘制 =====
        //const mapTileW = config.mapTileWidth || config.tileWidth;
        //const mapTileH = config.mapTileHeight || config.tileHeight;
        //const cellsW = mapTileW / this.BASE_TILE_SIZE; // 横向占用网格数（如128/16=8）
        //const cellsH = mapTileH / this.BASE_TILE_SIZE; // 纵向占用网格数
        //// 仅当当前网格是大瓦片的左上角起始网格时，才执行绘制
        //if (gridX % cellsW !== 0 || gridY % cellsH !== 0) {
            //return;
        //}
        //// ==============================================
//        
        //// 计算瓦片在图集里的裁剪位置
        //const srcCol = tileIndex % config.columns;
        //const srcRow = Math.floor(tileIndex / config.columns);
        //const srcX = srcCol * config.tileWidth;
        //const srcY = srcRow * config.tileHeight;
//        
        //// 计算瓦片在画布上的绘制尺寸和位置
        //const pixelScale = this.scale;
        //const destW = mapTileW * pixelScale;
        //const destH = mapTileH * pixelScale;
//        
        //let destX, destY;
        //if (mapTileW === this.BASE_TILE_SIZE && mapTileH === this.BASE_TILE_SIZE) {
            //// 16x16瓦片：直接对齐网格
            //destX = gridX * this.BASE_TILE_SIZE * pixelScale;
            //destY = gridY * this.BASE_TILE_SIZE * pixelScale;
        //} else {
            //// 大尺寸瓦片：对齐到占用网格区域的左上角
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
            //// 占位图增加红色半透明覆盖层
            //if (isPlaceholder) {
                //this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                //this.ctx.fillRect(destX, destY, destW, destH);
            //}
//            
        //} catch (e) {
            //console.error('瓦片绘制失败:', e);
            //this.drawErrorTile(gridX, gridY, gid, '绘制异常');
        //}
    //}

    // 绘制错误瓦片（红色背景+黄色边框+GID）
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
        console.warn(`错误瓦片 [${gid}] @ (${gridX},${gridY}): ${reason}`);
    }

    // 主渲染逻辑
    render() {
        if (!this.isReady) return;

        // 清空画布背景
        this.ctx.fillStyle = '#0f0f1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 按顺序渲染所有可见的瓦片图层
        this.mapData.layers.forEach((layer, idx) => {
            if (!layer.visible || layer.type !== 'tilelayer') return;
            this.renderLayer(layer, idx);
        });

        // 绘制网格（如果开启）
        if (this.showGrid) this.drawGrid();
    }

    // 渲染单个图层
    renderLayer(layer, idx) {
        const { width, height, data, name } = layer;
        // 校验图层数据是否存在
        if (!data) {
            console.warn(`图层 ${idx}: ${name} 无数据，跳过渲染`);
            return;
        }
        
        let count = 0;
        // 遍历图层所有网格，绘制瓦片
        for (let gridY = 0; gridY < height; gridY++) {
            for (let gridX = 0; gridX < width; gridX++) {
                const index = gridY * width + gridX;
                const gid = data[index];
                if (gid === 0) continue;
                
                this.drawTile(gid, gridX, gridY);
                count++;
            }
        }
        console.log(`图层 ${idx}: ${name} 绘制瓦片数: ${count}`);
    }

    // 绘制网格（辅助调试）
    drawGrid() {
        const tileSize = this.BASE_TILE_SIZE * this.scale;
        const width = this.mapData.width * tileSize;
        const height = this.mapData.height * tileSize;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        
        // 绘制竖线
        for (let x = 0; x <= width; x += tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        
        // 绘制横线
        for (let y = 0; y <= height; y += tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }

    // 显示初始化错误信息
    showError(message) {
        const errorEl = document.getElementById('map-error');
        if (errorEl) {
            errorEl.textContent = `初始化失败: ${message}`;
            errorEl.style.color = 'red';
            errorEl.style.padding = '10px';
        }
        // 画布上绘制错误信息
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(message, this.canvas.width/2, this.canvas.height/2);
    }

    // 切换地图（扩展功能：支持动态切换地图）
    async switchMap(newMapName) {
        this.mapName = newMapName;
        this.isReady = false;
        this.tilesetMap.clear();
        await this.init();
    }
}

globalThis.TiledMapRenderer = TiledMapRenderer;

// 初始化示例（页面加载后执行）

//----------------jinni new updated-----------
//window.addEventListener('load', () => {
    //// 传入canvas ID和地图名称，初始化渲染器
    //const renderer = new TiledMapRenderer('map-canvas', 'basic test2');
    //renderer.init();
//
    //// 可选：绑定网格显示切换按钮
    //const gridToggle = document.getElementById('toggle-grid');
    //if (gridToggle) {
        //gridToggle.addEventListener('click', () => {
            //renderer.showGrid = !renderer.showGrid;
            //renderer.render();
        //});
    //}
//
    //// 可选：绑定缩放控制
    //const scaleControl = document.getElementById('scale-control');
    //if (scaleControl) {
        //scaleControl.addEventListener('input', (e) => {
            //renderer.scale = parseFloat(e.target.value);
            //renderer.resizeCanvas();
            //renderer.render();
        //});
    //}
//});