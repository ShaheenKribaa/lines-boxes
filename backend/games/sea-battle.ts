import {
    SeaBattleState, SeaBattleShip, SeaBattlePosition, SeaBattleShotResult,
    SeaBattlePlayerView, PlayerId, RoomSettings
} from '../../shared/types.js';

const GRID_SIZE = 10;

interface ShipPlacement {
    name: string;
    size: number;
    positions: SeaBattlePosition[];
}

/** Validate that a position is within the grid */
function isInBounds(pos: SeaBattlePosition): boolean {
    return pos.row >= 0 && pos.row < GRID_SIZE && pos.col >= 0 && pos.col < GRID_SIZE;
}

/** Get all adjacent cells (including diagonals) around a set of positions */
function getAdjacentCells(positions: SeaBattlePosition[]): Set<string> {
    const adjacent = new Set<string>();
    for (const pos of positions) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const np = { row: pos.row + dr, col: pos.col + dc };
                if (isInBounds(np)) {
                    adjacent.add(`${np.row},${np.col}`);
                }
            }
        }
    }
    // Remove the positions themselves
    for (const pos of positions) {
        adjacent.delete(`${pos.row},${pos.col}`);
    }
    return adjacent;
}

/** Validate ship placements: in bounds, no overlap, no diagonal touching */
function validateShipPlacements(ships: ShipPlacement[]): boolean {
    const occupied = new Set<string>();
    const blocked = new Set<string>(); // including adjacent cells

    for (const ship of ships) {
        // Each position must be in bounds
        if (!ship.positions.every(isInBounds)) return false;

        // Positions must form a contiguous line (horizontal or vertical)
        if (ship.positions.length !== ship.size) return false;
        if (ship.size > 1) {
            const rows = ship.positions.map(p => p.row);
            const cols = ship.positions.map(p => p.col);
            const isHorizontal = rows.every(r => r === rows[0]);
            const isVertical = cols.every(c => c === cols[0]);
            if (!isHorizontal && !isVertical) return false;

            // Must be consecutive
            if (isHorizontal) {
                cols.sort((a, b) => a - b);
                for (let i = 1; i < cols.length; i++) {
                    if (cols[i] !== cols[i - 1] + 1) return false;
                }
            } else {
                rows.sort((a, b) => a - b);
                for (let i = 1; i < rows.length; i++) {
                    if (rows[i] !== rows[i - 1] + 1) return false;
                }
            }
        }

        // No overlap with previously placed ships or their adjacent cells
        for (const p of ship.positions) {
            const key = `${p.row},${p.col}`;
            if (occupied.has(key) || blocked.has(key)) return false;
        }

        // Mark cells as occupied and blocked
        for (const p of ship.positions) {
            occupied.add(`${p.row},${p.col}`);
        }
        const adj = getAdjacentCells(ship.positions);
        for (const key of adj) {
            blocked.add(key);
        }
    }

    return true;
}

/** Expected fleet: 1 Battleship(4), 2 Cruisers(3), 3 Destroyers(2), 4 Submarines(1) */
const EXPECTED_FLEET: { name: string; size: number; count: number }[] = [
    { name: 'Battleship', size: 4, count: 1 },
    { name: 'Cruiser', size: 3, count: 2 },
    { name: 'Destroyer', size: 2, count: 3 },
    { name: 'Submarine', size: 1, count: 4 },
];

function validateFleetComposition(ships: ShipPlacement[]): boolean {
    const expected = new Map<string, number>();
    for (const f of EXPECTED_FLEET) {
        expected.set(f.name, f.count);
    }

    const actual = new Map<string, number>();
    for (const ship of ships) {
        actual.set(ship.name, (actual.get(ship.name) || 0) + 1);
    }

    // Check fleet matches expected
    for (const [name, count] of expected) {
        if ((actual.get(name) || 0) !== count) return false;
    }

    // Check no extra ship types
    for (const [name] of actual) {
        if (!expected.has(name)) return false;
    }

    // Validate sizes match expected
    for (const ship of ships) {
        const fleetEntry = EXPECTED_FLEET.find(f => f.name === ship.name);
        if (!fleetEntry || ship.size !== fleetEntry.size) return false;
    }

    return true;
}

export class SeaBattleGame {
    private state: SeaBattleState;
    /** Server-side ship storage: playerId -> ships (never sent raw to clients) */
    private boards: Map<string, SeaBattleShip[]> = new Map();
    /** Server-side shot storage: playerId -> shots fired BY that player */
    private shots: Map<string, SeaBattlePosition[]> = new Map();
    /** Shot results: playerId -> results of shots fired BY that player */
    private shotResults: Map<string, SeaBattleShotResult[]> = new Map();

    constructor(playerIds: PlayerId[], _settings: RoomSettings, existingState?: SeaBattleState) {
        if (existingState) {
            this.state = existingState;
        } else {
            const shipsPlaced: Record<PlayerId, boolean> = {};
            playerIds.forEach(id => { shipsPlaced[id] = false; });

            this.state = {
                gameType: 'SEA_BATTLE',
                playerIds,
                status: 'PLAYING',
                winner: null,
                phase: 'PLACEMENT',
                shipsPlaced,
                currentPlayerIndex: 0,
                lastShotResult: null
            };
        }

        // Initialize maps for both players
        for (const pid of this.state.playerIds) {
            if (!this.boards.has(pid)) this.boards.set(pid, []);
            if (!this.shots.has(pid)) this.shots.set(pid, []);
            if (!this.shotResults.has(pid)) this.shotResults.set(pid, []);
        }
    }

    /** Restore boards/shots from external storage (for room-manager reconnect) */
    restoreBoards(boards: Map<string, SeaBattleShip[]>) {
        this.boards = boards;
    }

    restoreShots(shots: Map<string, SeaBattlePosition[]>, results: Map<string, SeaBattleShotResult[]>) {
        this.shots = shots;
        this.shotResults = results;
    }

    getBoards(): Map<string, SeaBattleShip[]> {
        return this.boards;
    }

    getShots(): Map<string, SeaBattlePosition[]> {
        return this.shots;
    }

    getShotResults(): Map<string, SeaBattleShotResult[]> {
        return this.shotResults;
    }

    getState(): SeaBattleState {
        return { ...this.state };
    }

    /** Get per-player view of the game state */
    getStateForPlayer(playerId: PlayerId): SeaBattleState {
        const opponentId = this.state.playerIds.find(id => id !== playerId)!;
        const myShips = this.boards.get(playerId) || [];
        const opponentShips = this.boards.get(opponentId) || [];
        const myShots = this.shots.get(playerId) || [];
        const enemyShots = this.shots.get(opponentId) || [];
        const myShotResults = this.shotResults.get(playerId) || [];
        const sunkEnemyShips = opponentShips.filter(s => s.sunk);

        const playerView: SeaBattlePlayerView = {
            myShips: myShips.map(s => ({ ...s, hits: [...s.hits], positions: [...s.positions] })),
            enemyShots: [...enemyShots],
            myShots: [...myShots],
            myShotResults: [...myShotResults],
            sunkEnemyShips: sunkEnemyShips.map(s => ({ ...s, hits: [...s.hits], positions: [...s.positions] }))
        };

        return {
            ...this.state,
            playerView,
            lastShotResult: this.state.lastShotResult
        };
    }

    /** Place ships for a player */
    applySetShips(playerId: PlayerId, ships: ShipPlacement[]): void {
        if (this.state.phase !== 'PLACEMENT') {
            throw new Error('Not in placement phase');
        }
        if (!this.state.playerIds.includes(playerId)) {
            throw new Error('Player not in game');
        }
        if (this.state.shipsPlaced[playerId]) {
            throw new Error('Ships already placed');
        }

        // Validate fleet composition
        if (!validateFleetComposition(ships)) {
            throw new Error('Invalid fleet composition');
        }

        // Validate placement rules
        if (!validateShipPlacements(ships)) {
            throw new Error('Invalid ship placement');
        }

        // Create ship objects
        const gameShips: SeaBattleShip[] = ships.map((s, i) => ({
            id: `${playerId}-ship-${i}`,
            name: s.name,
            size: s.size,
            positions: [...s.positions],
            hits: [],
            sunk: false
        }));

        this.boards.set(playerId, gameShips);
        this.state.shipsPlaced[playerId] = true;

        // Check if both players have placed
        const allPlaced = this.state.playerIds.every(id => this.state.shipsPlaced[id]);
        if (allPlaced) {
            this.state.phase = 'BATTLE';
        }
    }

    /** Fire a shot at the opponent's board */
    applyShot(playerId: PlayerId, position: SeaBattlePosition): SeaBattleShotResult {
        if (this.state.phase !== 'BATTLE') {
            throw new Error('Not in battle phase');
        }
        if (this.state.status !== 'PLAYING') {
            throw new Error('Game is over');
        }

        const currentPlayerId = this.state.playerIds[this.state.currentPlayerIndex];
        if (playerId !== currentPlayerId) {
            throw new Error('Not your turn');
        }

        if (!isInBounds(position)) {
            throw new Error('Shot out of bounds');
        }

        // Check if already fired at this position
        const myShots = this.shots.get(playerId) || [];
        if (myShots.some(s => s.row === position.row && s.col === position.col)) {
            throw new Error('Already fired at this position');
        }

        // Find opponent
        const opponentId = this.state.playerIds.find(id => id !== playerId)!;
        const opponentShips = this.boards.get(opponentId) || [];

        // Record the shot
        myShots.push(position);
        this.shots.set(playerId, myShots);

        // Check if hit
        let hit = false;
        let sunkShip: SeaBattleShip | null = null;

        for (const ship of opponentShips) {
            const hitPos = ship.positions.find(p => p.row === position.row && p.col === position.col);
            if (hitPos && !ship.hits.some(h => h.row === position.row && h.col === position.col)) {
                ship.hits.push(position);
                hit = true;
                if (ship.hits.length === ship.size) {
                    ship.sunk = true;
                    sunkShip = ship;

                    // Auto-reveal surrounding cells as misses
                    const surrounding = getAdjacentCells(ship.positions);
                    for (const key of surrounding) {
                        const [r, c] = key.split(',').map(Number);
                        const sp = { row: r, col: c };
                        if (!myShots.some(s => s.row === sp.row && s.col === sp.col)) {
                            myShots.push(sp);
                            // Add miss result for surrounding cells
                            const results = this.shotResults.get(playerId) || [];
                            results.push({ position: sp, hit: false });
                            this.shotResults.set(playerId, results);
                        }
                    }
                }
                break;
            }
        }

        // Record shot result
        const result: SeaBattleShotResult = {
            position,
            hit,
            sunkShipName: sunkShip?.name
        };

        const results = this.shotResults.get(playerId) || [];
        results.push(result);
        this.shotResults.set(playerId, results);

        this.state.lastShotResult = result;

        // Check game over
        const allSunk = opponentShips.every(s => s.sunk);
        if (allSunk) {
            this.state.status = 'ENDED';
            this.state.winner = playerId;
        } else {
            // Switch turn
            this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.playerIds.length;
        }

        return result;
    }

    isGameOver(): boolean {
        return this.state.status === 'ENDED';
    }
}
