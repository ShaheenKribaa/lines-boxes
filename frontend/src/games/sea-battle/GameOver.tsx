import React from 'react';
import { useGameStore } from '../../store';
import type { SeaBattleState } from '../../../../shared/types';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { socket } from '../../socket';
import { SocketEvent } from '../../../../shared/types';

export const SeaBattleGameOver: React.FC = () => {
    const { room, playerId } = useGameStore();

    if (!room || !room.gameData || room.gameData.gameType !== 'SEA_BATTLE') return null;

    const gameState = room.gameData as SeaBattleState;
    const isWinner = gameState.winner === playerId;
    const winnerPlayer = room.players.find(p => p.id === gameState.winner);
    const playerView = gameState.playerView;

    const myShots = playerView?.myShots.length ?? 0;
    const myShotResults = playerView?.myShotResults ?? [];
    const hits = myShotResults.filter(r => r.hit).length;
    const sunk = playerView?.sunkEnemyShips.length ?? 0;

    const handleReturnToLobby = () => {
        socket.emit(SocketEvent.RESET_TO_LOBBY);
    };

    return (
        <div className="container fade-in" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div className="card" style={{
                textAlign: 'center',
                maxWidth: '500px',
                width: '100%',
                padding: '3rem 2rem',
            }}>
                <div style={{
                    fontSize: '4rem',
                    marginBottom: '1rem',
                    lineHeight: 1,
                }}>
                    {isWinner ? '🏆' : '💀'}
                </div>
                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    background: isWinner ? 'var(--accent-gradient)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '0.5rem',
                }}>
                    {isWinner ? 'Victory!' : 'Defeat!'}
                </h1>

                {winnerPlayer && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        marginBottom: '1.5rem',
                    }}>
                        <PlayerAvatar avatarId={winnerPlayer.avatar} name={winnerPlayer.name} size={36} />
                        <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                            {isWinner ? 'You' : winnerPlayer.name} won!
                        </span>
                    </div>
                )}

                {/* Battle Stats */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '1rem',
                    marginBottom: '2rem',
                    padding: '1rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '0.75rem',
                }}>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                            {myShots}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Shots</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>
                            {hits}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hits</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--error)' }}>
                            {sunk}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sunk</div>
                    </div>
                </div>

                <button className="btn btn-primary" onClick={handleReturnToLobby} style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>
                    🔄 Return to Lobby
                </button>
            </div>
        </div>
    );
};
