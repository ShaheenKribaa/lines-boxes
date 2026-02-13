import React, { useState, useCallback, useMemo } from 'react';
import { socket } from '../../socket';
import { useGameStore } from '../../store';
import { SocketEvent } from '../../../../shared/types';
import type { SeaBattleState, SeaBattlePosition, SeaBattleShip } from '../../../../shared/types';
import { SeaBattleGrid } from './Grid';
import { PlayerAvatar } from '../../components/PlayerAvatar';

/* ─── SHIP CONFIGS (must match backend) ─── */
interface ShipConfig { name: string; size: number; count: number }
const SHIP_CONFIGS: ShipConfig[] = [
    { name: 'Battleship', size: 4, count: 1 },
    { name: 'Cruiser', size: 3, count: 2 },
    { name: 'Destroyer', size: 2, count: 3 },
    { name: 'Submarine', size: 1, count: 4 },
];
const GRID_SIZE = 10;
type Orientation = 'horizontal' | 'vertical';

function getShipsToPlace(): ShipConfig[] {
    const list: ShipConfig[] = [];
    for (const cfg of SHIP_CONFIGS) {
        for (let i = 0; i < cfg.count; i++) list.push(cfg);
    }
    return list;
}

function isInBounds(pos: SeaBattlePosition): boolean {
    return pos.row >= 0 && pos.row < GRID_SIZE && pos.col >= 0 && pos.col < GRID_SIZE;
}

function getShipPositions(origin: SeaBattlePosition, size: number, orientation: Orientation): SeaBattlePosition[] {
    const positions: SeaBattlePosition[] = [];
    for (let i = 0; i < size; i++) {
        positions.push({
            row: origin.row + (orientation === 'vertical' ? i : 0),
            col: origin.col + (orientation === 'horizontal' ? i : 0),
        });
    }
    return positions;
}

function canPlaceShip(origin: SeaBattlePosition, size: number, orientation: Orientation, existingShips: SeaBattleShip[]): boolean {
    const positions = getShipPositions(origin, size, orientation);
    if (!positions.every(isInBounds)) return false;

    const occupied = new Set<string>();
    for (const ship of existingShips) {
        for (const p of ship.positions) {
            occupied.add(`${p.row},${p.col}`);
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = p.row + dr, nc = p.col + dc;
                    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                        occupied.add(`${nr},${nc}`);
                    }
                }
            }
        }
    }
    return positions.every(p => !occupied.has(`${p.row},${p.col}`));
}

function randomPlacement(): SeaBattleShip[] {
    const ships: SeaBattleShip[] = [];
    const configs = getShipsToPlace();
    let id = 0;
    for (const cfg of configs) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 1000) {
            const orient: Orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
            const origin = { row: Math.floor(Math.random() * GRID_SIZE), col: Math.floor(Math.random() * GRID_SIZE) };
            if (canPlaceShip(origin, cfg.size, orient, ships)) {
                ships.push({
                    id: `ship-${id++}`,
                    name: cfg.name,
                    size: cfg.size,
                    positions: getShipPositions(origin, cfg.size, orient),
                    hits: [],
                    sunk: false,
                });
                placed = true;
            }
            attempts++;
        }
    }
    return ships;
}

/* ─── Placement Phase ─── */
interface PlacementProps {
    onComplete: (ships: SeaBattleShip[]) => void;
    opponentReady: boolean;
}

const PlacementPhase: React.FC<PlacementProps> = ({ onComplete, opponentReady }) => {
    const shipsToPlace = getShipsToPlace();
    const [placedShips, setPlacedShips] = useState<SeaBattleShip[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [orientation, setOrientation] = useState<Orientation>('horizontal');
    const [hoverPos, setHoverPos] = useState<SeaBattlePosition | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const currentConfig = shipsToPlace[currentIndex];
    const allPlaced = currentIndex >= shipsToPlace.length;

    const blockedCells = useMemo(() => {
        const set = new Set<string>();
        for (const ship of placedShips) {
            for (const p of ship.positions) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const nr = p.row + dr, nc = p.col + dc;
                        if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10) {
                            set.add(`${nr},${nc}`);
                        }
                    }
                }
            }
            for (const p of ship.positions) set.delete(`${p.row},${p.col}`);
        }
        return set;
    }, [placedShips]);

    const getCellState = useCallback((pos: SeaBattlePosition) => {
        for (const ship of placedShips) {
            if (ship.positions.some(p => p.row === pos.row && p.col === pos.col)) return 'ship' as const;
        }
        if (blockedCells.has(`${pos.row},${pos.col}`)) return 'blocked' as const;
        return 'empty' as const;
    }, [placedShips, blockedCells]);

    const hoverCells = hoverPos && currentConfig ? (() => {
        const positions = getShipPositions(hoverPos, currentConfig.size, orientation);
        const valid = canPlaceShip(hoverPos, currentConfig.size, orientation, placedShips);
        return { positions, valid };
    })() : null;

    const handleCellClick = (pos: SeaBattlePosition) => {
        if (!currentConfig || submitted) return;
        if (canPlaceShip(pos, currentConfig.size, orientation, placedShips)) {
            const newShip: SeaBattleShip = {
                id: `ship-${placedShips.length}`,
                name: currentConfig.name,
                size: currentConfig.size,
                positions: getShipPositions(pos, currentConfig.size, orientation),
                hits: [],
                sunk: false,
            };
            setPlacedShips([...placedShips, newShip]);
            setCurrentIndex(currentIndex + 1);
            setHoverPos(null);
        }
    };

    const handleUndo = () => {
        if (placedShips.length === 0 || submitted) return;
        setPlacedShips(placedShips.slice(0, -1));
        setCurrentIndex(currentIndex - 1);
    };

    const handleRandomize = () => {
        if (submitted) return;
        const ships = randomPlacement();
        setPlacedShips(ships);
        setCurrentIndex(shipsToPlace.length);
    };

    const handleRotate = () => {
        setOrientation(o => o === 'horizontal' ? 'vertical' : 'horizontal');
    };

    const handleSubmit = () => {
        if (!allPlaced || submitted) return;
        setSubmitted(true);
        onComplete(placedShips);
    };

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'r' || e.key === 'R') {
            setOrientation(o => o === 'horizontal' ? 'vertical' : 'horizontal');
        }
    }, []);

    return (
        <div className="container fade-in" style={{ minHeight: '100vh', paddingTop: '2rem' }} onKeyDown={handleKeyDown} tabIndex={0}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    ⚓ Place Your Ships
                </h1>

                {submitted ? (
                    <div className="card" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
                        <p style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--accent-primary)' }}>
                            ✅ Ships placed! {opponentReady ? 'Starting battle...' : 'Waiting for opponent...'}
                        </p>
                    </div>
                ) : (
                    <>
                        {!allPlaced && currentConfig && (
                            <div style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                Placing: <strong style={{ color: 'var(--text-primary)' }}>{currentConfig.name}</strong> ({currentConfig.size} cells) — {orientation}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary" onClick={handleRotate} disabled={allPlaced} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                                🔄 Rotate (R)
                            </button>
                            <button className="btn btn-secondary" onClick={handleUndo} disabled={placedShips.length === 0} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                                ↩ Undo
                            </button>
                            <button className="btn btn-secondary" onClick={handleRandomize} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                                🎲 Randomize
                            </button>
                        </div>
                    </>
                )}

                <SeaBattleGrid
                    getCellState={getCellState}
                    onCellClick={handleCellClick}
                    onCellHover={setHoverPos}
                    onMouseLeave={() => setHoverPos(null)}
                    interactive={!allPlaced && !submitted}
                    label="Your Fleet"
                    hoverCells={hoverCells}
                    ships={placedShips}
                    showShips={true}
                />

                {allPlaced && !submitted && (
                    <button className="btn btn-primary" onClick={handleSubmit} style={{ marginTop: '1rem', fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
                        ⚔️ Ready for Battle!
                    </button>
                )}
            </div>
        </div>
    );
};

/* ─── Battle Phase ─── */
interface BattleProps {
    gameState: SeaBattleState;
    playerId: string;
    players: { id: string; name: string; avatar?: string; score: number }[];
}

const BattlePhase: React.FC<BattleProps> = ({ gameState, playerId, players }) => {
    const playerView = gameState.playerView;
    if (!playerView) return null;

    const currentPlayerId = gameState.playerIds[gameState.currentPlayerIndex];
    const isMyTurn = currentPlayerId === playerId;

    const lastShot = gameState.lastShotResult;

    const handleFireShot = (pos: SeaBattlePosition) => {
        if (!isMyTurn) return;
        // Check if already shot here
        if (playerView.myShots.some(s => s.row === pos.row && s.col === pos.col)) return;
        socket.emit(SocketEvent.FIRE_SHOT, pos);
    };

    // Opponent grid: show my shots + results
    const getOpponentCellState = (pos: SeaBattlePosition): 'empty' | 'hit' | 'miss' | 'sunk' => {
        // Check if this position is on a sunk enemy ship
        for (const ship of playerView.sunkEnemyShips) {
            if (ship.positions.some(p => p.row === pos.row && p.col === pos.col)) {
                return 'sunk';
            }
        }
        // Check shot results
        const result = playerView.myShotResults.find(r => r.position.row === pos.row && r.position.col === pos.col);
        if (result) {
            return result.hit ? 'hit' : 'miss';
        }
        return 'empty';
    };

    // My grid: show my ships + enemy shots
    const getMyGridCellState = (pos: SeaBattlePosition): 'empty' | 'ship' | 'hit' | 'miss' | 'sunk' => {
        const wasShot = playerView.enemyShots.some(s => s.row === pos.row && s.col === pos.col);
        const myShip = playerView.myShips.find(s => s.positions.some(p => p.row === pos.row && p.col === pos.col));

        if (myShip?.sunk && wasShot) return 'sunk';
        if (wasShot && myShip) return 'hit';
        if (wasShot) return 'miss';
        if (myShip) return 'ship';
        return 'empty';
    };

    const myShipsRemaining = playerView.myShips.filter(s => !s.sunk).length;
    const enemySunk = playerView.sunkEnemyShips.length;
    const totalEnemyShips = SHIP_CONFIGS.reduce((sum, c) => sum + c.count, 0);
    const enemyRemaining = totalEnemyShips - enemySunk;

    // Determine message
    let message = '';
    if (lastShot) {
        if (lastShot.sunkShipName) {
            message = isMyTurn
                ? `💥 You sunk their ${lastShot.sunkShipName}! Fire again!`
                : `⚠️ Your ${lastShot.sunkShipName} was sunk!`;
        } else if (lastShot.hit) {
            message = isMyTurn ? '🔥 Hit! Fire again!' : '⚠️ Your ship was hit!';
        } else {
            message = isMyTurn ? 'Your turn! Click on the enemy grid to fire.' : '💨 Miss!';
        }
    } else {
        message = isMyTurn ? 'Your turn! Click on the enemy grid to fire.' : "Waiting for opponent's move...";
    }

    return (
        <div className="container fade-in" style={{ minHeight: '100vh', paddingTop: '1.5rem' }}>
            <div style={{ textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>⚓ Sea Battle</h1>

                {/* Players */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    {players.map(p => (
                        <div key={p.id} style={{
                            padding: '0.5rem 1rem',
                            background: p.id === currentPlayerId ? 'var(--accent-gradient)' : 'var(--bg-tertiary)',
                            borderRadius: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            border: p.id === playerId ? '2px solid var(--accent-primary)' : 'none',
                        }}>
                            <PlayerAvatar avatarId={p.avatar} name={p.name} size={28} />
                            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{p.name}</span>
                        </div>
                    ))}
                </div>

                {/* Status */}
                <div className="card" style={{
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    background: isMyTurn ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-tertiary)',
                    border: isMyTurn ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                }}>
                    <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                        {isMyTurn ? '🎯 ' : '⏳ '}{message}
                    </span>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>🛡️ Your ships: {myShipsRemaining}</span>
                    <span>💀 Enemy ships: {enemyRemaining}</span>
                    <span>🎯 Shots: {playerView.myShots.length}</span>
                </div>

                {/* Grids */}
                <div className="sb-battle-grids">
                    <SeaBattleGrid
                        getCellState={getOpponentCellState}
                        onCellClick={handleFireShot}
                        interactive={isMyTurn}
                        label="Enemy Waters"
                    />
                    <SeaBattleGrid
                        getCellState={getMyGridCellState}
                        interactive={false}
                        label="Your Fleet"
                        ships={playerView.myShips}
                        showShips={true}
                    />
                </div>
            </div>
        </div>
    );
};

/* ─── Main GameBoard ─── */
export const SeaBattleGameBoard: React.FC = () => {
    const { room, playerId } = useGameStore();

    if (!room || !room.gameData || room.gameData.gameType !== 'SEA_BATTLE') return null;

    const gameState = room.gameData as SeaBattleState;

    // Placement phase
    if (gameState.phase === 'PLACEMENT') {
        const opponentId = gameState.playerIds.find(id => id !== playerId);
        const opponentPlaced = opponentId ? gameState.shipsPlaced[opponentId] ?? false : false;

        const handlePlacementComplete = (ships: SeaBattleShip[]) => {
            const shipData = ships.map(s => ({
                name: s.name,
                size: s.size,
                positions: s.positions,
            }));
            socket.emit(SocketEvent.SET_SHIPS, shipData);
        };

        return <PlacementPhase onComplete={handlePlacementComplete} opponentReady={opponentPlaced} />;
    }

    // Battle phase
    return (
        <BattlePhase
            gameState={gameState}
            playerId={playerId || ''}
            players={room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score }))}
        />
    );
};
