import {
    ChainesLogiqueState,
    PlayerId,
    RoomSettings,
    ChainesLogiqueGuessEntry,
    ChaineWordEntry
} from '../../shared/types.js';

function getChainesCount(settings: RoomSettings): number {
    const n = settings.chainesCount ?? 5;
    return n >= 3 && n <= 10 ? n : 5;
}

const TURN_TIME_LIMIT_MS = 60000; // 60 seconds

function isValidWord(word: string): boolean {
    return typeof word === 'string' && word.length >= 2 && word.length <= 20 && /^[a-zA-Z]+$/.test(word);
}

export class ChainesLogiqueGame {
    private state: ChainesLogiqueState;
    private readonly chainesCount: number;
    /** Full words stored only on server, never sent to client except when revealed */
    private fullWords: Record<PlayerId, string[]> = {};

    constructor(playerIds: PlayerId[], settings: RoomSettings, existingState?: ChainesLogiqueState) {
        this.chainesCount = getChainesCount(settings);
        if (existingState) {
            this.state = existingState;
            // full words are not in state; must be passed separately by room-manager
        } else {
            const wordsSet: Record<PlayerId, boolean> = {};
            const principalWords: Record<PlayerId, string> = {};
            const secondaryWords: Record<PlayerId, ChaineWordEntry[]> = {};
            const revealedWords: Record<PlayerId, boolean[]> = {};
            
            playerIds.forEach((id) => {
                wordsSet[id] = false;
                principalWords[id] = '';
                secondaryWords[id] = Array(this.chainesCount).fill(null).map(() => ({
                    firstLetter: '',
                    length: 0,
                    revealedLetters: 1
                }));
                revealedWords[id] = Array(this.chainesCount).fill(false);
            });
            
            this.state = {
                gameType: 'CHAINES_LOGIQUE',
                playerIds,
                status: 'PLAYING',
                winner: null,
                phase: 'ENTER_WORDS',
                wordsSet,
                principalWords,
                secondaryWords,
                revealedWords,
                guessHistory: [],
                currentPlayerIndex: 0,
                chainesCount: this.chainesCount,
                turnTimeLimit: TURN_TIME_LIMIT_MS
            };
        }
    }

    /** Call after restoring from state to re-inject server-held full words */
    setFullWords(words: Record<PlayerId, string[]>) {
        this.fullWords = { ...words };
    }

    getState(): ChainesLogiqueState {
        return { ...this.state };
    }

    getFullWords(): Record<PlayerId, string[]> {
        return { ...this.fullWords };
    }

    applySetWords(
        playerId: PlayerId,
        principalWord: string,
        secondaryWords: string[]
    ): void {
        if (this.state.phase !== 'ENTER_WORDS') {
            throw new Error('Words already set');
        }
        if (!this.state.playerIds.includes(playerId)) {
            throw new Error('Not a player');
        }
        if (this.state.wordsSet[playerId]) {
            throw new Error('Words already submitted');
        }
        
        // Validate principal word
        if (!isValidWord(principalWord)) {
            throw new Error('Principal word must be 2-20 letters');
        }
        
        // Validate secondary words count
        if (secondaryWords.length !== this.chainesCount) {
            throw new Error(`Must provide exactly ${this.chainesCount} secondary words`);
        }
        
        // Validate each secondary word
        for (const word of secondaryWords) {
            if (!isValidWord(word)) {
                throw new Error('Each secondary word must be 2-20 letters');
            }
        }
        
        // Store principal word (revealed to both players)
        this.state.principalWords[playerId] = principalWord.toUpperCase();
        
        // Store masked secondary words
        this.state.secondaryWords[playerId] = secondaryWords.map(word => ({
            firstLetter: word[0].toUpperCase(),
            length: word.length,
            revealedLetters: 1
        }));
        
        // Store full words on server only
        this.fullWords[playerId] = secondaryWords.map(w => w.toUpperCase());
        
        // Debug logging
        console.log('Words set for player', playerId, {
            principal: this.state.principalWords[playerId],
            secondary: this.fullWords[playerId],
            masked: this.state.secondaryWords[playerId]
        });
        
        // Mark as set
        this.state.wordsSet[playerId] = true;
        
        // Check if all players have set their words
        const allSet = this.state.playerIds.every((id) => this.state.wordsSet[id]);
        if (allSet) {
            this.state.phase = 'GUESSING';
            // First player starts (playerIds[0])
            this.state.currentPlayerIndex = 0;
            this.state.turnStartTime = Date.now();
        }
    }

    applyGuess(playerId: PlayerId, word: string): { isCorrect: boolean; targetId: PlayerId; wordIndex: number } {
        if (this.state.phase !== 'GUESSING') {
            throw new Error('Not in guessing phase');
        }
        const currentPlayerId = this.state.playerIds[this.state.currentPlayerIndex];
        if (playerId !== currentPlayerId) {
            throw new Error('Not your turn');
        }
        
        if (!isValidWord(word)) {
            throw new Error('Guess must be 2-20 letters');
        }
        
        const guessUpper = word.toUpperCase();
        
        // Find opponent
        const otherPlayerId = this.state.playerIds[1 - this.state.currentPlayerIndex];
        const targetWords = this.fullWords[otherPlayerId];
        
        if (!targetWords) {
            throw new Error('Opponent words not set');
        }
        
        // Check if word matches any unrevealed word
        let foundMatch = false;
        let matchedIndex = -1;
        
        for (let i = 0; i < targetWords.length; i++) {
            if (!this.state.revealedWords[otherPlayerId][i] && targetWords[i] === guessUpper) {
                foundMatch = true;
                matchedIndex = i;
                break;
            }
        }
        
        // Debug logging
        console.log('Guess validation:', {
            guess: guessUpper,
            targetWords,
            revealed: this.state.revealedWords[otherPlayerId],
            foundMatch,
            matchedIndex
        });
        
        // Create guess entry
        const entry: ChainesLogiqueGuessEntry = {
            guesserId: playerId,
            targetId: otherPlayerId,
            word: guessUpper,
            isCorrect: foundMatch
        };
        this.state.guessHistory.push(entry);
        
        if (foundMatch) {
            // Correct guess - reveal the word
            this.state.revealedWords[otherPlayerId][matchedIndex] = true;
            this.state.secondaryWords[otherPlayerId][matchedIndex].word = guessUpper;
            
            // Check win condition
            const allRevealed = this.state.revealedWords[otherPlayerId].every(Boolean);
            if (allRevealed) {
                this.state.status = 'ENDED';
                this.state.winner = playerId;
            }
            // Player gets another turn on correct guess
            // Reset timer for continued turn
            this.state.turnStartTime = Date.now();
        } else {
            // Incorrect guess - reveal one more letter from the first unrevealed word and end turn
            const targetWordEntries = this.state.secondaryWords[otherPlayerId];
            const revealedStatus = this.state.revealedWords[otherPlayerId];
            
            // Find the first unrevealed word to reveal more letters from
            let wordToRevealIndex = -1;
            for (let i = 0; i < revealedStatus.length; i++) {
                if (!revealedStatus[i]) {
                    wordToRevealIndex = i;
                    break;
                }
            }
            
            // Reveal one more letter if we found an unrevealed word
            if (wordToRevealIndex !== -1 && targetWordEntries[wordToRevealIndex]) {
                const currentRevealed = targetWordEntries[wordToRevealIndex].revealedLetters || 1;
                const targetWordLength = targetWords[wordToRevealIndex].length;
                
                // Reveal one more letter (up to the full word length)
                if (currentRevealed < targetWordLength) {
                    targetWordEntries[wordToRevealIndex].revealedLetters = currentRevealed + 1;
                }
            }
            
            // End turn
            this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.playerIds.length;
            this.state.turnStartTime = Date.now(); // Reset timer for next player
        }
        
        return {
            isCorrect: foundMatch,
            targetId: otherPlayerId,
            wordIndex: matchedIndex
        };
    }

    isGameOver(): boolean {
        return this.state.status === 'ENDED';
    }

    getScores(): Record<string, number> {
        // Optional: count correct guesses; for now no score display
        return {};
    }
}