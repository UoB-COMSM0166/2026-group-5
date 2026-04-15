// NPC state machine: PATROL / SEARCH / CHASE transitions, alert thresholds.
// Possible NPC behaviour states.
export const NPC_STATES = {
  PATROL: 'PATROL',
  SEARCH: 'SEARCH',
  CHASE: 'CHASE'
};

// Alert level thresholds for state escalation.
export const ALERT_CHASE_THRESHOLD = 20; 
export const ALERT_SEARCH_THRESHOLD = 10; 
export const SEARCH_ALERT_BONUS = 5;
export const MIN_STATE_HOLD_MS = 1000;

// Guarantee an NPC has all runtime state fields initialised.
export function ensureNpcRuntimeState(npc, now = Date.now()) {
  npc.state = npc.state || NPC_STATES.PATROL;
  npc.stateChangedAt = npc.stateChangedAt || now;
  npc.wpIndex = npc.wpIndex || 0;
  npc.searchTimer = (npc.searchTimer !== undefined && npc.searchTimer !== null) ? npc.searchTimer : 0;
  npc.alertLevel = npc.alertLevel || 0;
  npc.moving = false;
  npc.vision = null;
  npc.searchReason ||= '';
  npc.patrolForward = npc.patrolForward !== false;
  npc.patrolRouteJoined = !!npc.patrolRouteJoined;
  npc.searchScanIndex = npc.searchScanIndex || 0;
  npc.searchScanStepTimer = npc.searchScanStepTimer || 0;
  npc.searchMoveTargetX = npc.searchMoveTargetX || 0;
  npc.searchMoveTargetY = npc.searchMoveTargetY || 0;
}

// Transition an NPC to a new state and record the timestamp.
export function setNpcState(npc, nextState) {
  if (npc.state === nextState) return false;
  npc.state = nextState;
  npc.stateChangedAt = Date.now();
  return true;
}

// Raise or decay the NPC's alert level based on player visibility.
export function updateNpcAlertLevel(npc, seesPlayer, deltaTime, options = {}) {
  const riseRate = options.riseRate ?? 34;
  const decayRate = options.decayRate ?? 18;
  npc.alertLevel = npc.alertLevel || 0;
  const rise = seesPlayer ? riseRate : 0;
  const decay = seesPlayer ? 0 : decayRate;
  npc.alertLevel = Math.max(0, Math.min(100, npc.alertLevel + rise * deltaTime - decay * deltaTime));
  return npc.alertLevel;
}

// Instantly increase an NPC's alert level by a fixed amount.
export function bumpNpcAlert(npc, amount) {
  npc.alertLevel = Math.max(0, Math.min(100, (npc.alertLevel || 0) + amount));
  return npc.alertLevel;
}

// Put the NPC into SEARCH state aimed at a target position.
export function beginSearchState(npc, targetX, targetY, reason, level, options = {}) {
  setNpcState(npc, NPC_STATES.SEARCH);
  // Light search: wait until near button to start countdown; others start immediately
  npc.searchTimer = reason === 'LIGHT' ? -1 : 2;
  // searchTargetX/Y for rendering question mark (button position)
  npc.searchTargetX = targetX;
  npc.searchTargetY = targetY;
  // searchBaseX/Y for actual search origin (may differ from question mark position)
  npc.searchBaseX = options.searchBaseX ?? targetX;
  npc.searchBaseY = options.searchBaseY ?? targetY;
  npc.searchReason = reason;
  npc.lastSeenX = npc.searchBaseX;
  npc.lastSeenY = npc.searchBaseY;
  npc.roomLightResponse = null;
  npc.searchScanIndex = 0;
  npc.searchScanStepTimer = 0;
  npc.searchMoveTargetX = npc.searchBaseX;
  npc.searchMoveTargetY = npc.searchBaseY;
  bumpNpcAlert(npc, SEARCH_ALERT_BONUS);
}

// Return the NPC to PATROL state and clear all search data.
export function enterPatrolState(npc) {
  setNpcState(npc, NPC_STATES.PATROL);
  npc.searchTimer = 0;
  npc.searchTargetX = 0;
  npc.searchTargetY = 0;
  npc.searchBaseX = 0;
  npc.searchBaseY = 0;
  npc.searchReason = '';
  npc.searchMoveTargetX = 0;
  npc.searchMoveTargetY = 0;
  npc.roomLightResponse = null;
  npc.patrolRouteJoined = false;
}

// Check if alert is high enough to escalate to CHASE.
export function shouldEnterChase(npc, seesPlayer) {
  return !!seesPlayer && (npc.alertLevel || 0) >= ALERT_CHASE_THRESHOLD;
}

// Check if the NPC lost sight and alert dropped enough to de-escalate.
export function shouldExitChaseToSearch(npc, seesPlayer) {
  return !seesPlayer && npc.state === NPC_STATES.CHASE && (npc.alertLevel || 0) <= ALERT_SEARCH_THRESHOLD;
}

// Enforce minimum hold time before allowing another state change.
export function canStateTransition(npc, now = Date.now(), minHoldMs = MIN_STATE_HOLD_MS) {
  return now - (npc.stateChangedAt || 0) >= minHoldMs;
}

// Return a human-readable label for the NPC's current state.
export function getNpcStateLabel(npc) {
  if (npc.state === NPC_STATES.CHASE) return 'CHASE';
  if (npc.state === NPC_STATES.SEARCH) return 'SEARCH';
  return 'PATROL';
}
