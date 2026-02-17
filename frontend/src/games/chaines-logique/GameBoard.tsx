import React, { useState } from 'react';
import { socket } from '../../socket';
import { useGameStore } from '../../store';
import { SocketEvent } from '../../../../shared/types';
import type { ChainesLogiqueState } from '../../../../shared/types';
import { Lock, Send, Eye, EyeOff, BookOpen } from 'lucide-react';
import { PlayerAvatar } from '../../components/PlayerAvatar';

export const ChainesLogiqueGameBoard: React.FC = () => {
    const { room, playerId } = useGameStore();
    const [principalWord, setPrincipalWord] = useState('');
    const [secondaryWords, setSecondaryWords] = useState<string[]>(['']);
    const [guessInput, setGuessInput] = useState('');
    const [showMyWords, setShowMyWords] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(60);

    // Reset guess input when turn changes
    React.useEffect(() => {
        if (room?.gameData?.gameType === 'CHAINES_LOGIQUE') {
            const state = room.gameData as ChainesLogiqueState;
            const currentPlayerId = state.playerIds[state.currentPlayerIndex];
            if (currentPlayerId !== playerId) {
                setGuessInput(''); // Clear input when it's not our turn
            }
        }
    }, [room?.gameData?.gameType, (room?.gameData as ChainesLogiqueState)?.currentPlayerIndex, playerId]);

    // Timer effect
    React.useEffect(() => {
        if (!room || !room.gameData || room.gameData.gameType !== 'CHAINES_LOGIQUE' || room.gameData.phase !== 'GUESSING') {
            return;
        }

        const state = room.gameData as ChainesLogiqueState;
        const currentPlayerId = state.playerIds[state.currentPlayerIndex];
        const isMyTurn = currentPlayerId === playerId;

        // Reset timer when it's not my turn or when turn changes
        if (!isMyTurn) {
            setTimeLeft(60);
            return;
        }

        // Only track timer for current player
        if (!state.turnStartTime) {
            setTimeLeft(60);
            return;
        }

        const updateTimer = () => {
            const elapsed = Date.now() - state.turnStartTime!;
            const remaining = Math.max(0, Math.floor((state.turnTimeLimit - elapsed) / 1000));
            setTimeLeft(remaining);
        };

        updateTimer(); // Initial update
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [room, playerId]); // Removed state.currentPlayerIndex dependency

    if (!room || !room.gameData || room.gameData.gameType !== 'CHAINES_LOGIQUE') return null;

    const state = room.gameData as ChainesLogiqueState;
    const chainesCount = state.chainesCount;
    const myWordsSet = state.wordsSet[playerId ?? ''] ?? false;
    const otherPlayerId = state.playerIds.find((id) => id !== playerId);
    const otherWordsSet = otherPlayerId ? (state.wordsSet[otherPlayerId] ?? false) : false;
    const currentPlayerId = state.playerIds[state.currentPlayerIndex];
    const isMyTurn = currentPlayerId === playerId;
    const currentPlayer = room.players.find((p) => p.id === currentPlayerId);
    const otherPlayer = room.players.find((p) => p.id === otherPlayerId);
    const myPrincipalWord = state.principalWords[playerId ?? ''];
    const mySecondaryWords = state.secondaryWords[playerId ?? ''] ?? [];

    // Initialize secondary words array when chainesCount changes
    React.useEffect(() => {
        if (secondaryWords.length !== chainesCount) {
            setSecondaryWords(Array(chainesCount).fill(''));
        }
    }, [chainesCount]);

    const handleWordChange = (index: number, value: string) => {
        const newWords = [...secondaryWords];
        newWords[index] = value.replace(/[^a-zA-Z]/g, '').slice(0, 20);
        setSecondaryWords(newWords);
    };

    const handleSubmitWords = (e: React.FormEvent) => {
        e.preventDefault();
        const principal = principalWord.trim();
        const secondaries = secondaryWords.map(w => w.trim()).filter(w => w.length > 0);

        if (principal.length >= 2 && principal.length <= 20 &&
            secondaries.length === chainesCount &&
            secondaries.every(w => w.length >= 2 && w.length <= 20)) {
            socket.emit(SocketEvent.SET_CHAINES, {
                principalWord: principal,
                secondaryWords: secondaries
            });
            setPrincipalWord('');
            setSecondaryWords(Array(chainesCount).fill(''));
        }
    };

    const handleSubmitGuess = (e: React.FormEvent) => {
        e.preventDefault();
        const guess = guessInput.trim();
        if (guess.length >= 2 && guess.length <= 20) {
            socket.emit(SocketEvent.GUESS_CHAINE, guess);
            setGuessInput('');
        }
    };

    const getPlayerName = (id: string) => room.players.find((p) => p.id === id)?.name ?? 'Player';

    const renderWordEntry = (entry: any, index: number, _isRevealed: boolean) => {
        // Determine how many letters to reveal
        const revealedCount = entry.word ? entry.length : (entry.revealedLetters || 1);
        const isPartiallyRevealed = revealedCount > 1 && !entry.word;

        return (
            <div
                key={index}
                style={{
                    padding: '0.6rem 0.75rem',
                    background: entry.word ? 'rgba(16, 185, 129, 0.15)' :
                        isPartiallyRevealed ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-tertiary)',
                    borderRadius: '0.5rem',
                    borderLeft: entry.word ? '3px solid var(--success)' :
                        isPartiallyRevealed ? '3px solid var(--warning)' : 'none',
                    marginBottom: '0.5rem'
                }}
            >
                <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                    {entry.word ? (
                        <span style={{ letterSpacing: '0.1em' }}>{entry.word}</span>
                    ) : (
                        <span>
                            {Array.from({ length: entry.length }).map((_, i) => {
                                // Use revealedChars if available, otherwise fall back to firstLetter for index 0
                                const revealedChars = entry.revealedChars || entry.firstLetter;
                                const isRevealed = i < revealedCount;
                                const char = isRevealed && i < revealedChars.length ? revealedChars[i] : '_';
                                return (
                                    <span key={i} style={{
                                        opacity: isRevealed ? 1 : 0.3,
                                        color: isRevealed ? 'inherit' : 'var(--text-muted)',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {char}
                                    </span>
                                );
                            })}
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                                ({entry.length} letters)
                            </span>
                            {isPartiallyRevealed && (
                                <span style={{
                                    color: 'var(--warning)',
                                    fontSize: '0.8rem',
                                    marginLeft: '0.5rem',
                                    fontStyle: 'italic'
                                }}>
                                    ({revealedCount} revealed)
                                </span>
                            )}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="container" style={{ minHeight: '100vh', paddingTop: 'clamp(1rem, 2vw, 2rem)', paddingBottom: 'clamp(1rem, 2vw, 2rem)', width: '100%' }}>
            <div className="fade-in" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
                <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: '700', marginBottom: '0.5rem', textAlign: 'center' }}>
                    Chaines Logique
                </h1>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1.5rem', fontSize: '1rem', maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
                    Guess your opponent's themed word chain. Each player chooses a theme and related words.
                </p>

                {state.phase === 'ENTER_WORDS' && (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BookOpen size={20} /> Set your words
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            Choose {chainesCount} words related to your theme. Your theme word will be revealed to both players.
                        </p>

                        {!myWordsSet ? (
                            <form onSubmit={handleSubmitWords}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                                        Your Theme Word:
                                    </label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Enter your theme (e.g., Animals)"
                                        value={principalWord}
                                        onChange={(e) => setPrincipalWord(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 20))}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            fontSize: '1rem'
                                        }}
                                        autoComplete="off"
                                    />
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                                        Related Words ({chainesCount} required):
                                    </label>
                                    {secondaryWords.map((word, index) => (
                                        <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder={`Word ${index + 1}`}
                                                value={word}
                                                onChange={(e) => handleWordChange(index, e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.75rem',
                                                    fontSize: '1rem'
                                                }}
                                                autoComplete="off"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={!principalWord.trim() || secondaryWords.filter(w => w.trim().length >= 2).length !== chainesCount}
                                    style={{ width: '100%', padding: '0.75rem' }}
                                >
                                    <Lock size={18} /> Set Words
                                </button>
                            </form>
                        ) : (
                            <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', color: 'var(--text-secondary)' }}>
                                <p style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>Words set.</p>
                                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                    {otherWordsSet ? 'Both players ready. Starting game…' : 'Waiting for the other player to set their words…'}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {state.phase === 'GUESSING' && (
                    <>
                        {/* Three-column layout */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                            {/* Left side - First player words */}
                            <div className="card" style={{ flex: 1, minWidth: '250px' }}>
                                <div style={{
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    marginBottom: '0.75rem',
                                    color: 'var(--text-secondary)',
                                    textAlign: 'center',
                                    padding: '0.5rem',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: '0.5rem'
                                }}>
                                    {getPlayerName(state.playerIds[0])}'s Chain
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
                                        Theme: {state.principalWords[state.playerIds[0]]}
                                    </div>
                                </div>
                                <div>
                                    {state.secondaryWords[state.playerIds[0]]?.map((entry, index) =>
                                        renderWordEntry(entry, index, state.revealedWords[state.playerIds[0]][index])
                                    )}
                                </div>
                            </div>

                            {/* Center - Main content */}
                            <div style={{ flex: 1.5, minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* Current player info */}
                                <div className="card">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <PlayerAvatar avatarId={currentPlayer?.avatar} name={currentPlayer?.name ?? ''} size={36} />
                                        <div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Now guessing</div>
                                            <div style={{ fontWeight: '600' }}>
                                                {currentPlayer?.name} {isMyTurn && '(You)'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timer display */}
                                    {state.phase === 'GUESSING' && (
                                        <div style={{
                                            marginTop: '0.75rem',
                                            padding: '0.75rem',
                                            background: timeLeft <= 10 ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-tertiary)',
                                            borderRadius: '0.5rem',
                                            border: timeLeft <= 10 ? '1px solid var(--error)' : 'none'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                fontSize: '0.9rem'
                                            }}>
                                                <span style={{ fontWeight: '600' }}>
                                                    Time remaining:
                                                </span>
                                                <span style={{
                                                    fontWeight: '700',
                                                    fontSize: '1.1rem',
                                                    color: timeLeft <= 10 ? 'var(--error)' : 'var(--text-primary)'
                                                }}>
                                                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                                </span>
                                            </div>
                                            {timeLeft <= 10 && (
                                                <div style={{
                                                    fontSize: '0.8rem',
                                                    color: 'var(--error)',
                                                    marginTop: '0.25rem',
                                                    fontWeight: '500'
                                                }}>
                                                    Hurry up!
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {myPrincipalWord && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                                            <BookOpen size={18} style={{ color: 'var(--text-muted)' }} />
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>My theme:</span>
                                            <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                                                {myPrincipalWord}
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => setShowMyWords((v) => !v)}
                                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                                title={showMyWords ? 'Hide words' : 'Show words'}
                                            >
                                                {showMyWords ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    )}
                                    {showMyWords && mySecondaryWords.length > 0 && (
                                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                                            <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>My words:</div>
                                            {mySecondaryWords.map((entry, index) => (
                                                <div key={index} style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                                    {entry.word ? (
                                                        <span style={{ color: 'var(--success)' }}>✓ {entry.word}</span>
                                                    ) : (
                                                        <span>{entry.firstLetter}{'_'.repeat(entry.length - 1)} ({entry.length} letters)</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Guess input */}
                                {isMyTurn ? (
                                    <div className="card">
                                        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                                            Guess a word from {otherPlayer?.name}'s chain
                                        </h3>
                                        <form onSubmit={handleSubmitGuess}>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="Enter your guess"
                                                value={guessInput}
                                                onChange={(e) => setGuessInput(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 20))}
                                                style={{
                                                    width: '100%',
                                                    padding: '1rem',
                                                    fontSize: '1.25rem',
                                                    textAlign: 'center',
                                                    borderColor: timeLeft <= 5 ? 'var(--error)' : undefined
                                                }}
                                                autoComplete="off"
                                                disabled={timeLeft <= 0}
                                            />
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={guessInput.length < 2 || timeLeft <= 0}
                                                style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem' }}
                                            >
                                                <Send size={18} /> {timeLeft <= 0 ? 'Time Expired' : 'Submit Guess'}
                                            </button>
                                        </form>
                                    </div>
                                ) : (
                                    <div className="card" style={{
                                        background: 'var(--bg-tertiary)',
                                        textAlign: 'center',
                                        padding: '1.5rem'
                                    }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                                            Waiting for {currentPlayer?.name}'s turn
                                        </div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            {timeLeft <= 0 ? '⏰ Time expired, passing turn...' : `Time left: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
                                        </div>
                                    </div>
                                )}

                                {/* Show timer expired message for non-current player */}
                                {!isMyTurn && timeLeft <= 0 && (
                                    <div className="card" style={{
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        border: '1px solid var(--error)'
                                    }}>
                                        <div style={{ textAlign: 'center', color: 'var(--error)', fontWeight: '600' }}>
                                            ⏰ {currentPlayer?.name}'s time has expired!
                                        </div>
                                    </div>
                                )}

                                {/* Guess history */}
                                {state.guessHistory.length > 0 && (
                                    <div className="card">
                                        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                                            Guess History
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {state.guessHistory.slice(-5).reverse().map((entry, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        padding: '0.6rem 0.75rem',
                                                        background: entry.guesserId === playerId ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-tertiary)',
                                                        borderRadius: '0.5rem',
                                                        borderLeft: entry.guesserId === playerId ? '3px solid var(--accent-primary)' : 'none'
                                                    }}
                                                >
                                                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                                                        {getPlayerName(entry.guesserId)} guessed: <strong>{entry.word}</strong>
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: entry.isCorrect ? 'var(--success)' : 'var(--error)' }}>
                                                        {entry.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right side - Second player words */}
                            <div className="card" style={{ flex: 1, minWidth: '250px' }}>
                                <div style={{
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    marginBottom: '0.75rem',
                                    color: 'var(--text-secondary)',
                                    textAlign: 'center',
                                    padding: '0.5rem',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: '0.5rem'
                                }}>
                                    {getPlayerName(state.playerIds[1])}'s Chain
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
                                        Theme: {state.principalWords[state.playerIds[1]]}
                                    </div>
                                </div>
                                <div>
                                    {state.secondaryWords[state.playerIds[1]]?.map((entry, index) =>
                                        renderWordEntry(entry, index, state.revealedWords[state.playerIds[1]][index])
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};