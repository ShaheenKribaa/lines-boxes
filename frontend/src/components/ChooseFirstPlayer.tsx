import React from 'react';
import { socket } from '../socket';
import { useGameStore } from '../store';
import { SocketEvent, RpsChoice } from '../../../shared/types';

export const ChooseFirstPlayer: React.FC = () => {
    const { room, playerId } = useGameStore();

    if (!room || room.status !== 'CHOOSING_FIRST') return null;

    const isHost = room.hostId === playerId;
    const myPick = room.rpsPicks?.[playerId ?? ''];
    const connectedCount = room.players.filter(p => p.isConnected).length;
    const pickedCount = Object.keys(room.rpsPicks ?? {}).length;

    const handlePick = (choice: RpsChoice) => {
        if (myPick) return;
        socket.emit(SocketEvent.RPS_PICK, choice);
    };

    const handleCancel = () => {
        if (isHost) socket.emit(SocketEvent.RESET_TO_LOBBY);
    };

    return (
        <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="fade-in" style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    Rock, Paper, Scissors
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    Pick to decide who goes first
                </p>

                {!myPick ? (
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {(['ROCK', 'PAPER', 'SCISSORS'] as const).map((choice) => (
                            <button
                                key={choice}
                                className="btn btn-primary"
                                onClick={() => handlePick(choice)}
                                style={{
                                    padding: '1.5rem 2rem',
                                    fontSize: '1.25rem',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {choice === 'ROCK' && '🪨'}
                                {choice === 'PAPER' && '📄'}
                                {choice === 'SCISSORS' && '✂️'}
                                {' '}{choice.toLowerCase()}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '1.1rem', color: 'var(--accent-primary)', fontWeight: '600' }}>
                            You picked: {myPick === 'ROCK' && '🪨'} {myPick === 'PAPER' && '📄'} {myPick === 'SCISSORS' && '✂️'} {myPick?.toLowerCase()}
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
                            Waiting for others... ({pickedCount}/{connectedCount} picked)
                        </p>
                    </div>
                )}

                {isHost && (
                    <button
                        className="btn btn-secondary"
                        onClick={handleCancel}
                        style={{ marginTop: '2rem', fontSize: '0.9rem' }}
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
};
