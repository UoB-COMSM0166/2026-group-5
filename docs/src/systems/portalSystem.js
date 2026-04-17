import { canMoveToRect, getEntityCollisionRect } from './collisionSystem.js';

export class PortalSystem {
    #tileSize;
    #maxPortals;
    #placementScanExtraTiles;
    #triggerScale;
    #teleportCooldownDuration;
    #exitOffsetTiles;
    #portals;
    #nextPortalId;
    #nextPortalColor;
    #teleportCooldown;
    #lastTouchedPortalId;

    constructor({ tileSize = 16, maxPortals = 2, placementScanExtraTiles = 2, triggerScale = 1.5, teleportCooldown = 0.2, exitOffsetTiles = 0.45 } = {}) {
        this.#tileSize = tileSize;
        this.#maxPortals = maxPortals;
        this.#placementScanExtraTiles = Math.max(0, placementScanExtraTiles | 0);
        this.#triggerScale = Math.max(1, triggerScale);
        this.#teleportCooldownDuration = teleportCooldown;
        this.#exitOffsetTiles = exitOffsetTiles;
        this.#portals = [];
        this.#nextPortalId = 1;
        this.#nextPortalColor = 'blue';
        this.#teleportCooldown = 0;
        this.#lastTouchedPortalId = null;
    }

    getPortals() {
        return this.#portals.map((portal) => ({ ...portal }));
    }

    clear() {
        this.#portals = [];
    }

    tryPlaceInFront(player, level) {
        if (!player || !level) {
            return { success: false, reason: 'missing_context', placedPortal: null, removedPortal: null };
        }

        const candidate = this.#findPlacementTileInFront(player, level);
        if (!candidate.success) {
            return { success: false, reason: candidate.reason, placedPortal: null, removedPortal: null };
        }
        const { tx, ty } = candidate;

        let removedPortal = null;
        const existingIndex = this.#portals.findIndex((portal) => portal.tx === tx && portal.ty === ty);
        if (existingIndex >= 0) {
            removedPortal = this.#portals.splice(existingIndex, 1)[0];
        }
        if (this.#portals.length >= this.#maxPortals) {
            removedPortal = this.#portals.shift();
        }

        const placedPortal = this.#createPortal(tx, ty, this.#nextPortalId++, this.#consumeNextPortalColor());
        this.#portals.push(placedPortal);

        // if placement still overlaps the player's current trigger footprint,
        // block same-frame teleport until the player exits and re-enters.
        const playerRect = getEntityCollisionRect(player);
        if (playerRect && this.#portalTriggerOverlapsRect(playerRect, tx, ty)) {
            this.#lastTouchedPortalId = placedPortal.id;
        }

        return { success: true, reason: '', placedPortal: { ...placedPortal }, removedPortal: removedPortal ? { ...removedPortal } : null };
    }

    #createPortal(tx, ty, id = null, color = 'blue') {
        const portalId = id == null ? this.#nextPortalId : id;
        const cx = (tx + 0.5) * this.#tileSize;
        const cy = (ty + 0.5) * this.#tileSize;

        return { id: portalId, tx, ty, cx, cy, color };
    }

    #findPlacementTileInFront(player, level) {
        const dir = this.#getFacingDirection(player);
        const start = this.#getFrontTile(player);
        const playerRect = getEntityCollisionRect(player);
        let hadNonOverlappingCandidate = false;

        for (let i = 0; i <= this.#placementScanExtraTiles; i += 1) {
            const tx = start.tx + dir.x * i;
            const ty = start.ty + dir.y * i;

            if (this.#portalTriggerOverlapsRect(playerRect, tx, ty)) {
                continue;
            }
            hadNonOverlappingCandidate = true;

            const candidatePortal = this.#createPortal(tx, ty);
            const candidatePos = {
                x: candidatePortal.cx - player.w / 2,
                y: candidatePortal.cy - player.h / 2
            };

            if (this.#canPlayerOccupy(player, candidatePos.x, candidatePos.y, level)) {
                return { success: true, tx, ty };
            }
        }

        return { success: false, reason: hadNonOverlappingCandidate ? 'invalid_tile' : 'no_non_overlapping_tile' };
    }

    #portalTriggerOverlapsRect(rect, tx, ty) {
        const triggerRect = this.#getPortalTriggerRect(tx, ty);
        return this.#rectsOverlap(rect, triggerRect);
    }

    #rectsOverlap(a, b) {
        return !(
            a.x + a.w <= b.x ||
            a.x >= b.x + b.w ||
            a.y + a.h <= b.y ||
            a.y >= b.y + b.h
        );
    }

    #getPortalTriggerRect(tx, ty) {
        const triggerSize = this.#tileSize * this.#triggerScale;
        const triggerOffset = (triggerSize - this.#tileSize) / 2;

        return {
            x: tx * this.#tileSize - triggerOffset,
            y: ty * this.#tileSize - triggerOffset,
            w: triggerSize,
            h: triggerSize
        };
    }

    #consumeNextPortalColor() {
        const color = this.#nextPortalColor;
        this.#nextPortalColor = color === 'blue' ? 'red' : 'blue';
        return color;
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

    updatePlayerTeleport(player, level, deltaTime) {
        this.#teleportCooldown = Math.max(0, this.#teleportCooldown - (deltaTime || 0));

        const touched = this.#getTouchedPortal(player);
        if (this.#portals.length < 2) {
            this.#lastTouchedPortalId = touched ? touched.id : null;
            return { teleported: false, reason: 'not_ready' };
        }
        if (!touched) {
            this.#lastTouchedPortalId = null;
            return { teleported: false, reason: 'not_in_portal' };
        }
        if (this.#teleportCooldown > 0) {
            this.#lastTouchedPortalId = touched.id;
            return { teleported: false, reason: 'cooldown' };
        }
        if (this.#lastTouchedPortalId === touched.id) {
            return { teleported: false, reason: 'already_inside' };
        }

        const destination = this.#portals.find((portal) => portal.id !== touched.id);
        if (!destination) {
            this.#lastTouchedPortalId = touched.id;
            return { teleported: false, reason: 'missing_pair' };
        }

        const target = this.#resolveDestinationPosition(player, touched, destination, level);
        if (!target) {
            this.#lastTouchedPortalId = touched.id;
            return { teleported: false, reason: 'invalid_destination' };
        }

        player.x = target.x;
        player.y = target.y;
        this.#teleportCooldown = this.#teleportCooldownDuration;

        const touchedAfter = this.#getTouchedPortal(player);
        this.#lastTouchedPortalId = touchedAfter ? touchedAfter.id : destination.id;
        return { teleported: true, reason: '', fromPortalId: touched.id, toPortalId: destination.id };
    }

    #getTouchedPortal(player) {
        if (!player || !this.#portals.length) {
            return null;
        }
        const rect = getEntityCollisionRect(player);
        if (!rect) {
            return null;
        }
        const centerX = rect.x + rect.w / 2;
        const centerY = rect.y + rect.h / 2;

        let best = null;
        let bestDist = Infinity;
        for (const portal of this.#portals) {
            if (!this.#portalTriggerOverlapsRect(rect, portal.tx, portal.ty)) {
                continue;
            }

            const dist = Math.hypot(centerX - portal.cx, centerY - portal.cy);
            if (dist < bestDist) {
                bestDist = dist;
                best = portal;
            }
        }
        return best;
    }

    #resolveDestinationPosition(player, sourcePortal, destinationPortal, level) {
        const baseX = destinationPortal.cx - player.w / 2;
        const baseY = destinationPortal.cy - player.h / 2;
        const offset = this.#buildExitOffset(sourcePortal, destinationPortal, player);
        const preferredX = baseX + offset.x;
        const preferredY = baseY + offset.y;

        if (this.#canPlayerOccupy(player, preferredX, preferredY, level)) {
            return { x: preferredX, y: preferredY };
        }
        if ((Math.abs(offset.x) > 0.001 || Math.abs(offset.y) > 0.001) && this.#canPlayerOccupy(player, baseX, baseY, level)) {
            return { x: baseX, y: baseY };
        }

        return null;
    }

    #buildExitOffset(sourcePortal, destinationPortal, player) {
        let dx = destinationPortal.cx - sourcePortal.cx;
        let dy = destinationPortal.cy - sourcePortal.cy;
        const len = Math.hypot(dx, dy);

        if (len < 0.001) {
            const facing = String(player.facing || 'down').toLowerCase();
            if (facing === 'left') {
                { dx = -1; dy = 0; }
            } else if (facing === 'right') {
                { dx = 1; dy = 0; }
            } else if (facing === 'up') {
                { dx = 0; dy = -1; }
            } else {
                { dx = 0; dy = 1; }
            }
        } else {
            dx /= len;
            dy /= len;
        }

        const distance = this.#exitOffsetTiles * this.#tileSize;
        return { x: dx * distance, y: dy * distance };
    }
}