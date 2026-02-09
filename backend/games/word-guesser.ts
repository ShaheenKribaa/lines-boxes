import {
    PlayerId,
    WordGuesserState,
    RoomSettings
} from '../../shared/types.js';

const MAX_MISTAKES = 7;
const MIN_WORD_LENGTH = 2;
const MAX_WORD_LENGTH = 30;
const VALID_WORD_REGEX = /^[a-zA-Z]+$/;

function normalizeLetter(letter: string): string {
    return letter.toLowerCase().slice(0, 1);
}

function buildRevealedWord(word: string, guessedLetters: string[]): string {
    const lower = word.toLowerCase();
    const guessed = new Set(guessedLetters.map(normalizeLetter));
    return lower
        .split('')
        .map((c) => (guessed.has(c) ? c : '_'))
        .join('');
}

export class WordGuesserGame {
    private state: WordGuesserState;
    /** Words stored only on server, never sent to client */
    private words: Record<PlayerId, string> = {};

    constructor(playerIds: PlayerId[], _settings: RoomSettings, existingState?: WordGuesserState) {
        if (existingState) {
            this.state = existingState;
        } else {
            const wordSet: Record<PlayerId, boolean> = {};
            playerIds.forEach((id) => {
                wordSet[id] = false;
            });
            this.state = {
                gameType: 'WORD_GUESSER',
                playerIds,
                status: 'PLAYING',
                winner: null,
                phase: 'ENTER_WORD',
                wordSet,
                roundIndex: 0,
                guessedLetters: [],
                mistakes: 0,
                revealedWord: '',
                wordLength: 0,
                roundWinners: [null, null]
            };
        }
    }

    setWords(words: Record<PlayerId, string>) {
        this.words = { ...words };
    }

    getState(): WordGuesserState {
        return { ...this.state };
    }

    applySetWord(playerId: PlayerId, word: string): void {
        if (this.state.phase !== 'ENTER_WORD') {
            throw new Error('Words already set');
        }
        if (!this.state.playerIds.includes(playerId)) {
            throw new Error('Not a player');
        }
        const trimmed = word.trim();
        if (trimmed.length < MIN_WORD_LENGTH || trimmed.length > MAX_WORD_LENGTH) {
            throw new Error(`Word must be ${MIN_WORD_LENGTH}-${MAX_WORD_LENGTH} letters`);
        }
        if (!VALID_WORD_REGEX.test(trimmed)) {
            throw new Error('Word must contain only letters');
        }
        this.words[playerId] = trimmed.toLowerCase();
        this.state.wordSet[playerId] = true;

        const allSet = this.state.playerIds.every((id) => this.state.wordSet[id]);
        if (allSet) {
            this.state.phase = 'GUESSING';
            this.startRound(0);
        }
    }

    private startRound(roundIndex: number): void {
        this.state.roundIndex = roundIndex;
        this.state.guessedLetters = [];
        this.state.mistakes = 0;
        const targetId = this.state.playerIds[roundIndex];
        const word = this.words[targetId];
        if (!word) return;
        this.state.wordLength = word.length;
        this.state.revealedWord = '_'.repeat(word.length);
    }

    applyGuessLetter(playerId: PlayerId, letter: string): void {
        if (this.state.phase !== 'GUESSING') {
            throw new Error('Not in guessing phase');
        }
        const guesserIndex = 1 - this.state.roundIndex;
        const targetIndex = this.state.roundIndex;
        const guesserId = this.state.playerIds[guesserIndex];
        const targetId = this.state.playerIds[targetIndex];
        if (playerId !== guesserId) {
            throw new Error('Not your turn to guess');
        }

        const normalized = normalizeLetter(letter);
        if (!normalized || !/^[a-z]$/.test(normalized)) {
            throw new Error('Guess a single letter');
        }
        if (this.state.guessedLetters.includes(normalized)) {
            throw new Error('Already guessed that letter');
        }

        const word = this.words[targetId];
        if (!word) throw new Error('Target word not set');

        this.state.guessedLetters.push(normalized);
        const inWord = word.includes(normalized);
        if (!inWord) {
            this.state.mistakes += 1;
        }
        this.state.revealedWord = buildRevealedWord(word, this.state.guessedLetters);

        const wordRevealed = !this.state.revealedWord.includes('_');
        if (wordRevealed) {
            this.state.roundWinners[this.state.roundIndex] = guesserId;
            if (this.state.roundIndex === 1) {
                this.endGame();
                return;
            }
            this.startRound(1);
            return;
        }
        if (this.state.mistakes >= MAX_MISTAKES) {
            this.state.roundWinners[this.state.roundIndex] = targetId;
            if (this.state.roundIndex === 1) {
                this.endGame();
                return;
            }
            this.startRound(1);
        }
    }

    private endGame(): void {
        this.state.status = 'ENDED';
        const [r0, r1] = this.state.roundWinners;
        if (r0 === r1) {
            this.state.winner = r0;
        } else {
            this.state.winner = 'TIE';
        }
    }

    isGameOver(): boolean {
        return this.state.status === 'ENDED';
    }
}
