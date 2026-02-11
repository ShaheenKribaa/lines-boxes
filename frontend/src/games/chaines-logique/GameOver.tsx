import React from 'react';
import { useGameStore } from '../../store';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { Trophy, RotateCcw } from 'lucide-react';
import { socket } from '../../socket';
import { SocketEvent } from '../../../../shared/types';

export const ChainesLogiqueGameOver: React.FC = () => {
    const { room, playerId } = useGameStore();

    if (!room || !room.gameData || room.gameData.gameType !== 'CHAINES_LOGIQUE' || room.gameData.status !== 'ENDED') return null;

    const winnerId = room.gameData.winner;
    const isWinner = winnerId === playerId;
    const winner = room.players.find((p) => p.id === winnerId);

    const handlePlayAgain = () => {
        socket.emit(SocketEvent.RESET_TO_LOBBY);
    };

    return (
        <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="fade-in" style={{ maxWidth: '500px', width: '100%' }}>
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <Trophy size={64} style={{ color: 'var(--accent-primary)', margin: '0 auto 1rem' }} />
                        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                            {isWinner ? 'You Win!' : 'Game Over'}
                        </h1>
                        {winner && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <PlayerAvatar avatarId={winner.avatar} name={winner.name} size={40} />
                                <span style={{ fontSize: '1.25rem', fontWeight: '600' }}>{winner.name} won!</span>
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>Final Chains:</h3>
                        
                        {room.gameData.playerIds.map(playerId => {
                            const player = room.players.find(p => p.id === playerId);
                            const gameState = room.gameData as import('../../../../shared/types').ChainesLogiqueState;
                            const principalWord = gameState.principalWords?.[playerId] || '';
                            const secondaryWords = gameState.secondaryWords?.[playerId] || [];
                            const revealedWords = gameState.revealedWords?.[playerId] || [];
                            
                            return (
                                <div key={playerId} style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
                                    <div style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
                                        {player?.name}'s Chain
                                    </div>
                                    <div style={{ fontWeight: '500', marginBottom: '0.75rem' }}>
                                        Theme: {principalWord}
                                    </div>
                                    <div>
                                        {secondaryWords.map((entry: any, index: number) => (
                                            <div key={index} style={{ 
                                                fontSize: '0.9rem', 
                                                marginBottom: '0.25rem',
                                                color: revealedWords[index] ? 'var(--success)' : 'var(--text-primary)'
                                            }}>
                                                {revealedWords[index] ? (
                                                    <span>✓ {entry.word}</span>
                                                ) : (
                                                    <span>○ {entry.firstLetter}{'_'.repeat(entry.length - 1)} ({entry.length} letters)</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={handlePlayAgain}
                        style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        <RotateCcw size={20} /> Play Again
                    </button>
                </div>
            </div>
        </div>
    );
};