import React from 'react';
import { socket } from '../../socket';
import { useGameStore } from '../../store';
import { SocketEvent } from '../../../../shared/types';
import { Trophy, RefreshCw } from 'lucide-react';
import { PlayerAvatar } from '../../components/PlayerAvatar';

export const WordGuesserGameOver: React.FC = () => {
    const { room, playerId } = useGameStore();

    if (!room || !room.gameData || room.gameData.gameType !== 'WORD_GUESSER' || room.gameData.status !== 'ENDED') return null;

    const winnerId = room.gameData.winner;
    const isWinner = winnerId === playerId;
    const isTie = winnerId === 'TIE';
    const winner = winnerId && winnerId !== 'TIE' ? room.players.find((p) => p.id === winnerId) : null;

    const handleNewGame = () => {
        socket.emit(SocketEvent.RESET_TO_LOBBY);
    };

    return (
        <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="fade-in" style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{isTie ? '🤝' : isWinner ? '🎉' : '📝'}</div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                        {isTie ? "It's a tie!" : isWinner ? 'You won!' : 'Game over'}
                    </h1>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                        {isTie
                            ? 'Each player won one round.'
                            : winner
                                ? isWinner
                                    ? 'You won Word Guesser!'
                                    : `${winner.name} won!`
                                : 'Game over.'}
                    </p>
                </div>
                {winner && !isTie && (
                    <div className="card" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '1.5rem' }}>
                        <PlayerAvatar avatarId={winner.avatar} name={winner.name} size={48} />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Winner</div>
                            <div style={{ fontWeight: '700', fontSize: '1.25rem' }}>{winner.name} {winner.id === playerId && '(You)'}</div>
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
