import React from 'react';
import type { SeaBattlePosition, SeaBattleShip } from '../../../../shared/types';

const GRID_SIZE = 10;
const COL_LABELS = 'ABCDEFGHIJ';

interface GridProps {
    /** Returns cell state for each position */
    getCellState: (pos: SeaBattlePosition) => 'empty' | 'ship' | 'hit' | 'miss' | 'sunk' | 'blocked';
    onCellClick?: (pos: SeaBattlePosition) => void;
    onCellHover?: (pos: SeaBattlePosition) => void;
    onMouseLeave?: () => void;
    interactive?: boolean;
    label: string;
    /** Hover preview for ship placement */
    hoverCells?: { positions: SeaBattlePosition[]; valid: boolean } | null;
    /** Ships to render as SVG overlays */
    ships?: SeaBattleShip[];
    showShips?: boolean;
}

const SHIP_COLORS: Record<string, { fill: string; stroke: string; accent: string }> = {
    Battleship: { fill: '#2563eb', stroke: '#1e3a8a', accent: '#60a5fa' },
    Cruiser: { fill: '#9333ea', stroke: '#581c87', accent: '#c084fc' },
    Destroyer: { fill: '#059669', stroke: '#064e3b', accent: '#34d399' },
    Submarine: { fill: '#d97706', stroke: '#78350f', accent: '#fbbf24' },
};

function ShipSVG({ ship, cellSize }: { ship: SeaBattleShip; cellSize: number }) {
    const colors = SHIP_COLORS[ship.name] || SHIP_COLORS.Destroyer;
    const length = ship.size * cellSize;
    const beam = cellSize;
    const pad = 2;
    const w = length;
    const h = beam;

    if (ship.size === 1) {
        return (
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
                <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - pad} ry={h / 2 - pad}
                    fill={colors.fill} stroke={colors.stroke} strokeWidth="1.5" />
                <circle cx={w / 2} cy={h / 2} r={3} fill={colors.accent} />
            </svg>
        );
    }

    const midY = h / 2;
    const topY = pad;
    const botY = h - pad;
    const bowTip = pad;
    const bowX = pad;
    const sternX = w - pad;
    const sternW = cellSize * 0.3;

    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <path
                d={`
                    M ${bowTip} ${midY}
                    Q ${bowX + cellSize * 0.3} ${topY}, ${bowX + cellSize * 0.6} ${topY}
                    L ${sternX - sternW} ${topY}
                    Q ${sternX} ${topY}, ${sternX} ${midY}
                    Q ${sternX} ${botY}, ${sternX - sternW} ${botY}
                    L ${bowX + cellSize * 0.6} ${botY}
                    Q ${bowX + cellSize * 0.3} ${botY}, ${bowTip} ${midY}
                    Z
                `}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth="1.5"
            />
            {ship.size >= 3 && (
                <rect x={w * 0.35} y={midY - 3} width={w * 0.2} height={6} rx={2}
                    fill={colors.accent} opacity={0.7} />
            )}
            {ship.size >= 2 && (
                <circle cx={w * 0.25} cy={midY} r={2.5} fill={colors.accent} opacity={0.6} />
            )}
            {ship.size === 4 && (
                <>
                    <rect x={w * 0.6} y={midY - 2} width={w * 0.12} height={4} rx={1}
                        fill={colors.accent} opacity={0.5} />
                    <circle cx={w * 0.15} cy={midY} r={2} fill={colors.stroke} opacity={0.5} />
                </>
            )}
        </svg>
    );
}

export const SeaBattleGrid: React.FC<GridProps> = ({
    getCellState, onCellClick, onCellHover, onMouseLeave,
    interactive, label, hoverCells, ships, showShips
}) => {
    const hoverSet = new Set<string>();
    if (hoverCells) {
        for (const p of hoverCells.positions) {
            hoverSet.add(`${p.row},${p.col}`);
        }
    }

    const shipOverlays = showShips && ships ? ships.map(ship => {
        const minRow = Math.min(...ship.positions.map(p => p.row));
        const minCol = Math.min(...ship.positions.map(p => p.col));
        const isVertical = ship.size > 1 && ship.positions[0].col === ship.positions[1]?.col;
        return { ship, minRow, minCol, isVertical };
    }) : [];

    const cellSize = 28; // Base cell size

    return (
        <div className="sb-grid-container">
            <h3 className="sb-grid-label">{label}</h3>
            <div className="sb-grid" onMouseLeave={onMouseLeave}>
                {/* Column headers */}
                <div className="sb-grid-row">
                    <div className="sb-grid-header-cell" />
                    {Array.from({ length: GRID_SIZE }, (_, i) => (
                        <div key={i} className="sb-grid-header-cell">
                            {COL_LABELS[i]}
                        </div>
                    ))}
                </div>
                {/* Rows */}
                {Array.from({ length: GRID_SIZE }, (_, row) => (
                    <div key={row} className="sb-grid-row">
                        <div className="sb-grid-header-cell">{row + 1}</div>
                        {Array.from({ length: GRID_SIZE }, (_, col) => {
                            const pos = { row, col };
                            const state = getCellState(pos);
                            const isHover = hoverSet.has(`${row},${col}`);
                            const hoverValid = hoverCells?.valid ?? false;

                            let cellClass = 'sb-cell';
                            if (state === 'empty') cellClass += ' sb-cell-empty';
                            else if (state === 'blocked') cellClass += ' sb-cell-blocked';
                            else if (state === 'ship' && showShips) cellClass += ' sb-cell-ship-visible';
                            else if (state === 'ship') cellClass += ' sb-cell-ship';
                            else if (state === 'hit') cellClass += ' sb-cell-hit';
                            else if (state === 'miss') cellClass += ' sb-cell-miss';
                            else if (state === 'sunk') cellClass += ' sb-cell-sunk';

                            if (interactive && (state === 'empty' || state === 'blocked')) {
                                cellClass += ' sb-cell-interactive';
                            }
                            if (isHover && hoverValid) cellClass += ' sb-cell-hover-valid';
                            if (isHover && !hoverValid) cellClass += ' sb-cell-hover-invalid';

                            return (
                                <button
                                    key={col}
                                    className={cellClass}
                                    onClick={() => interactive && onCellClick?.(pos)}
                                    onMouseEnter={() => onCellHover?.(pos)}
                                    disabled={!interactive}
                                >
                                    {state === 'miss' && <span className="sb-cell-marker">•</span>}
                                    {state === 'hit' && <span className="sb-cell-marker sb-cell-marker-hit">✕</span>}
                                    {state === 'sunk' && <span className="sb-cell-marker sb-cell-marker-sunk">✕</span>}
                                </button>
                            );
                        })}
                    </div>
                ))}
                {/* Ship SVG overlays */}
                {shipOverlays.map(({ ship, minRow, minCol, isVertical }) => (
                    <div
                        key={ship.id}
                        className="sb-ship-overlay"
                        style={{
                            top: `calc(${cellSize}px + ${cellSize * minRow}px)`,
                            left: `calc(${cellSize}px + ${cellSize * minCol}px)`,
                            width: isVertical ? `${cellSize}px` : `${cellSize * ship.size}px`,
                            height: isVertical ? `${cellSize * ship.size}px` : `${cellSize}px`,
                        }}
                    >
                        <div style={{
                            width: '100%',
                            height: '100%',
                            ...(isVertical ? {
                                transform: 'rotate(90deg)',
                                transformOrigin: 'top left',
                                position: 'absolute' as const,
                                top: 0,
                                left: `${cellSize}px`,
                                width: `${cellSize * ship.size}px`,
                                height: `${cellSize}px`,
                            } : {}),
                        }}>
                            <ShipSVG ship={ship} cellSize={cellSize} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
