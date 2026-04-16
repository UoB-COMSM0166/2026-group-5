import { canMoveToRect } from './collisionSystem.js';

export class PortalSystem {
    #tileSize;
    #portals;
    #nextPortalId;

    constructor({ tileSize = 16, maxPortals = 2, placementScanExtraTiles = 2, triggerScale = 1.5, teleportCooldown = 0.2, exitOffsetTiles = 0.45 } = {}) {
        this.#tileSize = tileSize;
        this.#portals = [];
        this.#nextPortalId = 1;
    }


    getPortals() {
        return this.#portals.map((portal) => ({ ...portal }));
    }


    clear() {
        this.#portals = [];
    }


    #createPortal(tx, ty, id = null, color = 'blue') {
        const portalId = id == null ? this.#nextPortalId : id;
        const cx = (tx + 0.5) * this.#tileSize;
        const cy = (ty + 0.5) * this.#tileSize;
        
        return { id: portalId, tx, ty, cx, cy, color };
    }


    #getFrontTile(player) {
        const dir = this.#getFacingDirection(player);
        const baseTx = Math.floor((player.x + player.w / 2) / this.#tileSize);
        const baseTy = Math.floor((player.y + player.h / 2) / this.#tileSize);

        return { tx: baseTx + dir.x, ty: baseTy + dir.y };
    }


    #getFacingDirection(player) {
        const facing = String(player.facing || 'down').toLowerCase();

        if (facing === 'left') {
            return { x: -1, y: 0 };
        }
        if (facing === 'right') {
            return { x: 1, y: 0 };
        }
        if (facing === 'up') {
            return { x: 0, y: -1 };
        }

        return { x: 0, y: 1 };
    }


    #canPlayerOccupy(player, x, y, level) {
        return canMoveToRect(player, x, y, level.collision, this.#tileSize, level);
    }
}