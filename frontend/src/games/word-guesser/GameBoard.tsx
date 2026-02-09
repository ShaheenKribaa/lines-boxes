import React, { useState } from 'react';
import { socket } from '../../socket';
import { useGameStore } from '../../store';
import { SocketEvent } from '../../../../shared/types';
import type { WordGuesserState } from '../../../../shared/types';
import { Lock, AlertCircle } from 'lucide-react';
import { PlayerAvatar } from '../../components/PlayerAvatar';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

export const WordGuesserGameBoard: React.FC = () => {
    const { room, playerId } = useGameStore();
    const [wordInput, setWordInput] = useState('');

    if (!room || !room.gameData || room.gameData.gameType !== 'WORD_GUESSER') return null;

    const state = room.gameData as WordGuesserState;
    const myWordSet = state.wordSet[playerId ?? ''] ?? false;
    const otherPlayerId = state.playerIds.find((id) => id !== playerId);
    const otherWordSet = otherPlayerId ? (state.wordSet[otherPlayerId] ?? false) : false;
    const guesserIndex = 1 - state.roundIndex;
    const targetIndex = state.roundIndex;
    const guesserId = state.playerIds[guesserIndex];
    const targetId = state.playerIds[targetIndex];
    const isMyTurnToGuess = guesserId === playerId;
    const guesser = room.players.find((p) => p.id === guesserId);
    const target = room.players.find((p) => p.id === targetId);

    const handleSubmitWord = (e: React.FormEvent) => {
        e.preventDefault();
        const w = wordInput.trim();
        if (w.length >= 2 && w.length <= 30 && /^[a-zA-Z]+$/.test(w)) {
            socket.emit(SocketEvent.SET_WORD, w);
            setWordInput('');
        }
    };

    const handleGuessLetter = (letter: string) => {
        if (!isMyTurnToGuess || state.guessedLetters.includes(letter)) return;
        socket.emit(SocketEvent.GUESS_LETTER, letter);
    };

    const rawWord = state.revealedWord || (state.wordLength ? '_'.repeat(state.wordLength) : '');
    const displayWord = rawWord.split('').join(' ');
    const wrongGuesses = state.guessedLetters.filter(
        (l) => !(state.revealedWord || '').toLowerCase().includes(l)
    );

    return (
        <div className="container" style={{ minHeight: '100vh', paddingTop: 'clamp(1rem, 2vw, 2rem)', paddingBottom: 'clamp(1rem, 2vw, 2rem)' }}>
            <div className="fade-in" style={{ maxWidth: '560px', margin: '0 auto' }}>
                <h1 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', fontWeight: '700', marginBottom: '0.5rem', textAlign: 'center' }}>
                    Word Guesser
                </h1>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                    Each player enters a word. Take turns guessing the other&apos;s word — one letter at a time. 7 wrong guesses and you&apos;re out.
                </p>

                {state.phase === 'ENTER_WORD' && (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Lock size={20} /> Your secret word
                        </h2>
                        {!myWordSet ? (
                            <form onSubmit={handleSubmitWord}>
                                <input
                                    type="password"
                                    className="input"
                                    placeholder="Enter a word (2–30 letters)"
                                    value={wordInput}
                                    onChange={(e) => setWordInput(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 30))}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        fontSize: '1.25rem',
                                        letterSpacing: '0.05em',
                                        textAlign: 'center'
                                    }}
                                    autoComplete="off"
                                />
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={wordInput.trim().length < 2}
                                    style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
                                >
                                    <Lock size={18} /> Set word
                                </button>
                            </form>
                        ) : (
                            <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', color: 'var(--text-secondary)' }}>
                                <p style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>Word set.</p>
                                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                    {otherWordSet ? "Both players ready. Let's guess!" : 'Waiting for the other player to set their word…'}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {state.phase === 'GUESSING' && (
                    <>
                        <div className="card" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <PlayerAvatar avatarId={guesser?.avatar} name={guesser?.name ?? ''} size={36} />
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Guessing</div>
                                    <div style={{ fontWeight: '600' }}>
                                        {guesser?.name} {isMyTurnToGuess && '(You)'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertCircle size={18} style={{ color: 'var(--text-muted)' }} />
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Mistakes:</span>
                                <span style={{ fontWeight: '700', color: state.mistakes >= 7 ? 'var(--error)' : 'var(--text-primary)' }}>
                                    {state.mistakes} / 7
                                </span>
                            </div>
                        </div>

                        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                {target?.name}&apos;s word ({state.wordLength} letters)
                            </div>
                            <div
                                style={{
                                    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                                    fontWeight: '700',
                                    letterSpacing: '0.25em',
                                    fontFamily: 'monospace',
                                    wordBreak: 'break-all',
                                    minHeight: '2.5rem'
                                }}
                            >
                                {displayWord}
                            </div>
                        </div>

                        {wrongGuesses.length > 0 && (
                            <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                Wrong: {wrongGuesses.join(', ')}
                            </div>
                        )}

                        <div className="card" style={{ marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                Pick a letter
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
                                {ALPHABET.map((letter) => {
                                    const guessed = state.guessedLetters.includes(letter);
                                    const inWord = (state.revealedWord || '').toLowerCase().includes(letter);
                                    const disabled = !isMyTurnToGuess || guessed || state.mistakes >= 7 || !state.revealedWord.includes('_');
                                    return (
                                        <button
                                            key={letter}
                                            type="button"
                                            onClick={() => handleGuessLetter(letter)}
                                            disabled={disabled}
                                            style={{
                                                width: '2.25rem',
                                                height: '2.25rem',
                                                borderRadius: '0.5rem',
                                                border: '2px solid var(--border-color)',
                                                background: guessed
                                                    ? inWord
                                                        ? 'rgba(16, 185, 129, 0.3)'
                                                        : 'rgba(239, 68, 68, 0.3)'
                                                    : 'var(--bg-tertiary)',
                                                color: guessed ? (inWord ? 'var(--success)' : 'var(--error)') : 'var(--text-primary)',
                                                fontSize: '1rem',
                                                fontWeight: '600',
                                                cursor: disabled ? 'not-allowed' : 'pointer',
                                                opacity: disabled && !guessed ? 0.6 : 1,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {letter}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {state.roundIndex === 1 && state.roundWinners[0] && (
                            <div className="card" style={{ marginBottom: '1rem', background: 'var(--bg-tertiary)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                Round 1: {room.players.find((p) => p.id === state.roundWinners[0])?.name} won.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
