import React from 'react';
import { useGameStore } from '../../store';
import { SocketEvent, MrWhiteState } from '../../../../shared/types';
import { socket } from '../../socket';
import { RotateCcw, Trophy } from 'lucide-react';

export const MrWhiteGameOver: React.FC = () => {
    const { room, playerId } = useGameStore();

    if (!room || !room.gameData || room.gameData.gameType !== 'MR_WHITE') return null;

    const state = room.gameData as MrWhiteState;
    const isMrWhite = state.mrWhiteId === playerId;

    // Winner logic from backend:
    // If Mr White wins -> winner = mrWhiteId
    // If Civilians win -> winner = 'TIE' (as per my backend hack)

    const mrWhiteWon = state.winner === state.mrWhiteId;
    const civiliansWon = state.winner === 'TIE';

    // Determine if "I" won
    const iWon = (isMrWhite && mrWhiteWon) || (!isMrWhite && civiliansWon);

    const handlePlayAgain = () => {
        socket.emit(SocketEvent.RESET_TO_LOBBY);
    };

    return (
        <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card fade-in" style={{ textAlign: 'center', maxWidth: '500px', width: '100%', padding: '3rem' }}>
                <div style={{
                    display: 'inline-flex',
                    padding: '1.5rem',
                    borderRadius: '50%',
                    background: iWon ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: iWon ? 'var(--success)' : 'var(--error)',
                    marginBottom: '1.5rem'
                }}>
                    <Trophy size={48} />
                </div>

                <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {mrWhiteWon ? 'Mr White Wins!' : 'Civilians Win!'}
                </h1>

                <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    {iWon ? 'Victory!' : 'Defeat!'}
                </p>

                <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        The secret word was
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '0.1em' }}>
                        {state.word}
                    </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Mr White was
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                        {room.players.find(p => p.id === state.mrWhiteId)?.name}
                    </div>
                </div>

                {room.hostId === playerId && (
                    <button className="btn btn-primary" onClick={handlePlayAgain} style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <RotateCcw size={20} />
                        Play Again
                    </button>
                )}
            </div>
        </div>
    );
};
