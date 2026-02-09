import React, { useState } from 'react';
import { socket } from '../../socket';
import { useGameStore } from '../../store';
import { SocketEvent } from '../../../../shared/types';
import type { FourChiffreState } from '../../../../shared/types';
import { Lock, Send, Target, User } from 'lucide-react';
import { PlayerAvatar } from '../../components/PlayerAvatar';

export const FourChiffreGameBoard: React.FC = () => {
    const { room, playerId } = useGameStore();
    const [secretInput, setSecretInput] = useState('');
    const [guessInput, setGuessInput] = useState('');

    if (!room || !room.gameData || room.gameData.gameType !== 'FOUR_CHIFFRE') return null;

    const state = room.gameData as FourChiffreState;
    const mySecretSet = state.secretSet[playerId ?? ''] ?? false;
    const otherPlayerId = state.playerIds.find((id) => id !== playerId);
    const otherSecretSet = otherPlayerId ? (state.secretSet[otherPlayerId] ?? false) : false;
    const currentPlayerId = state.playerIds[state.currentPlayerIndex];
    const isMyTurn = currentPlayerId === playerId;
    const currentPlayer = room.players.find((p) => p.id === currentPlayerId);
    const otherPlayer = room.players.find((p) => p.id === otherPlayerId);

    const handleSubmitSecret = (e: React.FormEvent) => {
        e.preventDefault();
        const s = secretInput.trim();
        if (/^\d{4}$/.test(s)) {
            socket.emit(SocketEvent.SET_SECRET, s);
            setSecretInput('');
        }
    };

    const handleSubmitGuess = (e: React.FormEvent) => {
        e.preventDefault();
        const g = guessInput.trim();
        if (/^\d{4}$/.test(g)) {
            socket.emit(SocketEvent.GUESS_NUMBER, g);
            setGuessInput('');
        }
    };

    const getPlayerName = (id: string) => room.players.find((p) => p.id === id)?.name ?? 'Player';

    return (
        <div className="container" style={{ minHeight: '100vh', paddingTop: 'clamp(1rem, 2vw, 2rem)', paddingBottom: 'clamp(1rem, 2vw, 2rem)' }}>
            <div className="fade-in" style={{ maxWidth: '560px', margin: '0 auto' }}>
                <h1 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', fontWeight: '700', marginBottom: '0.5rem', textAlign: 'center' }}>
                    4 Chiffres
                </h1>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                    Guess the other player&apos;s 4-digit number. You get: correct digits, and how many are in the right place.
                </p>

                {state.phase === 'ENTER_SECRET' && (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Lock size={20} /> Your secret number
                        </h2>
                        {!mySecretSet ? (
                            <form onSubmit={handleSubmitSecret}>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={4}
                                    className="input"
                                    placeholder="Enter 4 digits (e.g. 1256)"
                                    value={secretInput}
                                    onChange={(e) => setSecretInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        fontSize: '1.5rem',
                                        letterSpacing: '0.25em',
                                        textAlign: 'center'
                                    }}
                                    autoComplete="off"
                                />
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={secretInput.length !== 4}
                                    style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
                                >
                                    <Lock size={18} /> Set secret
                                </button>
                            </form>
                        ) : (
                            <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', color: 'var(--text-secondary)' }}>
                                <p style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>Secret set.</p>
                                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                    {otherSecretSet ? 'Both players ready. Starting guesses…' : 'Waiting for the other player to set their number…'}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {state.phase === 'GUESSING' && (
                    <>
                        <div className="card" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <PlayerAvatar avatarId={currentPlayer?.avatar} name={currentPlayer?.name ?? ''} size={36} />
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Now guessing</div>
                                    <div style={{ fontWeight: '600' }}>
                                        {currentPlayer?.name} {isMyTurn && '(You)'}
                                    </div>
                                </div>
                            </div>
                            {isMyTurn && (
                                <span style={{ background: 'var(--accent-gradient)', padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.9rem', fontWeight: '600' }}>
                                    <Target size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                                    Your turn
                                </span>
                            )}
                        </div>

                        {isMyTurn && (
                            <div className="card" style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Guess {otherPlayer?.name}&apos;s number</h3>
                                <form onSubmit={handleSubmitGuess}>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={4}
                                        className="input"
                                        placeholder="4 digits"
                                        value={guessInput}
                                        onChange={(e) => setGuessInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        style={{
                                            width: '100%',
                                            padding: '1rem',
                                            fontSize: '1.5rem',
                                            letterSpacing: '0.2em',
                                            textAlign: 'center'
                                        }}
                                        autoComplete="off"
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={guessInput.length !== 4}
                                        style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem' }}
                                    >
                                        <Send size={18} /> Submit guess
                                    </button>
                                </form>
                            </div>
                        )}

                        {state.guessHistory.length > 0 && (
                            <div className="card">
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <User size={18} /> Guess history
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {state.guessHistory.map((entry, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                flexWrap: 'wrap',
                                                gap: '0.5rem',
                                                padding: '0.6rem 0.75rem',
                                                background: entry.guesserId === playerId ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-tertiary)',
                                                borderRadius: '0.5rem',
                                                borderLeft: entry.guesserId === playerId ? '3px solid var(--accent-primary)' : 'none'
                                            }}
                                        >
                                            <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                                                {getPlayerName(entry.guesserId)} guessed <strong style={{ letterSpacing: '0.1em' }}>{entry.guess}</strong>
                                            </span>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                {entry.correctDigits} correct digit{entry.correctDigits !== 1 ? 's' : ''}, {entry.correctPlace} in correct place
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
