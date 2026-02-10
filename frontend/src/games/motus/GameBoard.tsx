import React, { useState } from 'react';
import { socket } from '../../socket';
import { useGameStore } from '../../store';
import { SocketEvent, MotusState, MotusLetterColor } from '../../../../shared/types';
import { PlayerAvatar } from '../../components/PlayerAvatar';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

type KeyColor = MotusLetterColor | undefined;
type KeyboardState = Record<string, KeyColor>;

const COLOR_PRIORITY: Record<MotusLetterColor, number> = {
    BLUE: 1,
    YELLOW: 2,
    RED: 3
};

function updateKeyboardState(current: KeyboardState, rows: MotusState['attempts']): KeyboardState {
    const next: KeyboardState = { ...current };
    for (const row of rows) {
        for (const { letter, color } of row.letters) {
            const key = letter.toUpperCase();
            const existing = next[key];
            if (!existing) {
                next[key] = color;
            } else if (COLOR_PRIORITY[color] > COLOR_PRIORITY[existing]) {
                next[key] = color;
            }
        }
    }
    return next;
}

export const MotusGameBoard: React.FC = () => {
    const { room, playerId } = useGameStore();
    const [currentGuess, setCurrentGuess] = useState('');
    const [keyboard, setKeyboard] = useState<KeyboardState>({});

    // Update keyboard state whenever attempts change
    React.useEffect(() => {
        if (!room || !room.gameData || room.gameData.gameType !== 'MOTUS') return;
        const state = room.gameData as MotusState;
        setKeyboard((prev) => updateKeyboardState(prev, state.attempts));
    }, [room?.gameData]);

    if (!room || !room.gameData || room.gameData.gameType !== 'MOTUS') return null;

    const state = room.gameData as MotusState;
    const wordLength = state.wordLength;
    const maxAttempts = state.maxAttempts;
    const rows = state.attempts;

    const currentPlayerId = state.playerIds[state.currentPlayerIndex];
    const currentPlayer = room.players.find((p) => p.id === currentPlayerId);
    const isMyTurn = currentPlayerId === playerId;

    const attemptsUsed = rows.length;
    const remainingAttempts = maxAttempts - attemptsUsed;

    const canGuess = isMyTurn && state.status === 'PLAYING' && attemptsUsed < maxAttempts;

    const handleInputChange = (value: string) => {
        const cleaned = value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/[^A-Z]/g, '');
        // enforce first letter and max length
        const enforced = (state.firstLetter + cleaned.slice(1))
            .slice(0, wordLength);
        setCurrentGuess(enforced);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canGuess) return;
        if (currentGuess.length !== wordLength) return;
        if (currentGuess[0] !== state.firstLetter) return;

        socket.emit(SocketEvent.MOTUS_GUESS, currentGuess);
        setCurrentGuess('');

        // keyboard will update automatically on ROOM_UPDATED via effect below (using state.attempts)
    };

    const handleKeyClick = (letter: string) => {
        if (!canGuess) return;
        if (currentGuess.length >= wordLength) return;
        if (currentGuess.length === 0) {
            setCurrentGuess(state.firstLetter);
            if (state.firstLetter === letter) return;
        }
        const next = (currentGuess || state.firstLetter) + letter;
        handleInputChange(next);
    };

    const handleBackspace = () => {
        if (!canGuess) return;
        if (currentGuess.length <= 1) return; // keep first letter fixed
        setCurrentGuess(currentGuess.slice(0, -1));
    };

    const renderCell = (rowIndex: number, colIndex: number) => {
        const row = rows[rowIndex];
        let letter = '';
        let color: MotusLetterColor | 'DEFAULT' = 'DEFAULT';

        if (row) {
            const cell = row.letters[colIndex];
            if (cell) {
                letter = cell.letter;
                color = cell.color;
            }
        } else if (rowIndex === rows.length) {
            // current input row
            const guessChar = (currentGuess[colIndex] ?? '');
            if (guessChar) {
                letter = guessChar;
            } else if (colIndex === 0) {
                letter = state.firstLetter;
            }
        } else if (colIndex === 0) {
            letter = state.firstLetter;
        }

        const bg =
            color === 'RED'
                ? 'var(--success-soft)'
                : color === 'YELLOW'
                    ? 'rgba(234, 179, 8, 0.25)'
                    : color === 'BLUE'
                        ? 'var(--bg-tertiary)'
                        : 'var(--bg-tertiary)';
        const borderColor =
            color === 'RED'
                ? 'var(--success)'
                : color === 'YELLOW'
                    ? 'rgba(234, 179, 8, 1)'
                    : color === 'BLUE'
                        ? 'var(--border-color)'
                        : 'var(--border-subtle)';

        return (
            <div
                key={colIndex}
                style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '0.5rem',
                    border: `2px solid ${borderColor}`,
                    background: bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.2rem',
                    textTransform: 'uppercase',
                    color: '#ffffff'
                }}
            >
                {letter}
            </div>
        );
    };

    return (
        <div className="container" style={{ minHeight: '100vh', paddingTop: 'clamp(1rem, 2vw, 2rem)', paddingBottom: 'clamp(1rem, 2vw, 2rem)' }}>
            <div className="fade-in" style={{ maxWidth: '560px', margin: '0 auto' }}>
                <h1 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', fontWeight: '700', marginBottom: '0.5rem', textAlign: 'center' }}>
                    Motus
                </h1>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                    Guess the hidden word in {maxAttempts} attempts. Red = correct spot, Yellow = wrong spot, Blue = not in word.
                </p>

                <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <PlayerAvatar avatarId={currentPlayer?.avatar} name={currentPlayer?.name ?? ''} size={36} />
                        <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Now playing</div>
                            <div style={{ fontWeight: '600' }}>
                                {currentPlayer?.name} {isMyTurn && '(You)'}
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <div>Word length: <strong>{wordLength}</strong></div>
                        <div>Attempts left: <strong>{remainingAttempts}</strong></div>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateRows: `repeat(${maxAttempts}, auto)`, gap: '0.4rem', justifyItems: 'center' }}>
                        {Array.from({ length: maxAttempts }).map((_, rowIndex) => (
                            <div key={rowIndex} style={{ display: 'flex', gap: '0.35rem' }}>
                                {Array.from({ length: wordLength }).map((__, colIndex) => renderCell(rowIndex, colIndex))}
                            </div>
                        ))}
                    </div>
                </div>

                {canGuess && (
                    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1rem' }}>
                        <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Type your guess (must start with {state.firstLetter} and be a valid word).
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                className="input"
                                value={currentGuess || state.firstLetter}
                                onChange={(e) => handleInputChange(e.target.value)}
                                maxLength={wordLength}
                                placeholder="Enter your guess"
                                style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'center' }}
                            />
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={currentGuess.length !== wordLength}
                            >
                                Submit
                            </button>
                        </div>
                    </form>
                )}

                <div className="card">
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Keyboard
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', justifyContent: 'center' }}>
                        {ALPHABET.map((letter) => {
                            const color = keyboard[letter];
                            const bg =
                                color === 'RED'
                                    ? 'var(--success-soft)'
                                    : color === 'YELLOW'
                                        ? 'rgba(234, 179, 8, 0.25)'
                                        : color === 'BLUE'
                                            ? 'var(--bg-tertiary)'
                                            : 'var(--bg-tertiary)';
                            const border =
                                color === 'RED'
                                    ? 'var(--success)'
                                    : color === 'YELLOW'
                                        ? 'rgba(234, 179, 8, 1)'
                                        : color === 'BLUE'
                                            ? 'var(--border-color)'
                                            : 'var(--border-subtle)';
                            return (
                                <button
                                    key={letter}
                                    type="button"
                                    onClick={() => handleKeyClick(letter)}
                                    disabled={!canGuess}
                                    style={{
                                        width: '2rem',
                                        height: '2.4rem',
                                        borderRadius: '0.4rem',
                                        border: `2px solid ${border}`,
                                        background: bg,
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        color: '#ffffff',
                                        cursor: canGuess ? 'pointer' : 'default'
                                    }}
                                >
                                    {letter}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={handleBackspace}
                            disabled={!canGuess}
                            style={{
                                width: '4rem',
                                height: '2.4rem',
                                borderRadius: '0.4rem',
                                border: '2px solid var(--border-subtle)',
                                background: 'var(--bg-tertiary)',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                color: '#ffffff',
                                cursor: canGuess ? 'pointer' : 'default'
                            }}
                        >
                            ⌫
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

