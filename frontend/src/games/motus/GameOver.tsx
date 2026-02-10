import React from 'react';
import { socket } from '../../socket';
import { useGameStore } from '../../store';
import { SocketEvent, MotusState } from '../../../../shared/types';
import { Trophy, RefreshCw } from 'lucide-react';
import { PlayerAvatar } from '../../components/PlayerAvatar';

export const MotusGameOver: React.FC = () => {
    const { room, playerId } = useGameStore();

    if (!room || !room.gameData || room.gameData.gameType !== 'MOTUS' || room.gameData.status !== 'ENDED') return null;

    const state = room.gameData as MotusState;
    const winnerId = state.winner;
    const isTie = winnerId === 'TIE';
    const isWinner = winnerId === playerId;
    const winner = typeof winnerId === 'string' && winnerId !== 'TIE'
        ? room.players.find((p) => p.id === winnerId)
        : null;

    const handleNewGame = () => {
        socket.emit(SocketEvent.RESET_TO_LOBBY);
    };

    return (
        <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="fade-in" style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                        {isTie ? '🤝' : isWinner ? '🎉' : '🔤'}
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                        {isTie ? "It's a tie!" : isWinner ? 'You won!' : 'Game over'}
                    </h1>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                        {isTie
                            ? 'No one guessed the word in time.'
                            : winner
                                ? isWinner
                                    ? 'You found the Motus word!'
                                    : `${winner.name} found the word.`
                                : 'The game has ended.'}
                    </p>
                    {state.finalWord && (
                        <p style={{ marginTop: '0.75rem', fontSize: '1.1rem', fontWeight: 600 }}>
                            The word was:{' '}
                            <span style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                                {state.finalWord}
                            </span>
                        </p>
                    )}
                </div>
                {winner && !isTie && (
                    <div className="card" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '1.5rem' }}>
                        <PlayerAvatar avatarId={winner.avatar} name={winner.name} size={48} />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Winner</div>
                            <div style={{ fontWeight: '700', fontSize: '1.25rem' }}>
                                {winner.name} {winner.id === playerId && '(You)'}
                            </div>
                        </div>
                        <Trophy size={32} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                )}
                <button className="btn btn-primary" onClick={handleNewGame} style={{ width: '100%' }}>
                    <RefreshCw size={20} /> New game
                </button>
            </div>
        </div>
    );
};

