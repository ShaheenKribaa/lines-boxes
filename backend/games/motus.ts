import {
    MotusState,
    MotusGuessRow,
    MotusLetterResult,
    PlayerId,
    RoomSettings
} from '../../shared/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the French dictionary
let frenchDictionary: string[] | null = null;
try {
    const dictPath = path.join(__dirname, '../dictionnaire_simple_5000.json');
    const dictData = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
    frenchDictionary = dictData.mots || [];
} catch (error) {
    console.error('Failed to load French dictionary:', error);
}

if (frenchDictionary) {
    console.log(`Loaded French dictionary with ${frenchDictionary.length} words`);
} else {
    console.log('Failed to load French dictionary');
}

const DEFAULT_MAX_ATTEMPTS = 6;

function normalizeWord(input: string): string {
    if (!input) return '';
    const withoutAccents = input
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    return withoutAccents
        .toUpperCase()
        .replace(/[^A-Z]/g, '');
}

type MotusLang = 'en' | 'fr';

function getWiktionaryBase(lang: MotusLang): string {
    return lang === 'fr' ? 'https://fr.wiktionary.org' : 'https://en.wiktionary.org';
}

async function isValidWiktionaryWord(wordNorm: string, lang: MotusLang): Promise<boolean> {
    if (!wordNorm) return false;
    const title = encodeURIComponent(wordNorm.toLowerCase());
    const base = getWiktionaryBase(lang);
    const url = `${base}/w/api.php?action=query&titles=${title}&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return false;
    const data: any = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return false;
    // Missing pages are keyed by "-1"
    return !Object.prototype.hasOwnProperty.call(pages, '-1');
}

function getRandomWordFromDictionary(lang: MotusLang): { word: string; length: number } | null {
    if (lang === 'fr' && frenchDictionary !== null && frenchDictionary.length > 0) {
        // Get a random word from the French dictionary
        const randomIndex = Math.floor(Math.random() * frenchDictionary.length);
        const word = frenchDictionary[randomIndex];
        const norm = normalizeWord(word);
        
        if (norm.length > 0) {
            return { word: norm, length: norm.length };
        }
    }
    
    return null;
}

async function fetchRandomWord(lang: MotusLang): Promise<{ word: string; length: number }> {
    // First try to get a word from the local dictionary for French
    if (lang === 'fr') {
        const dictWord = getRandomWordFromDictionary(lang);
        if (dictWord) {
            return dictWord;
        }
    }
    
    // Fallback to random-word-api for English or if dictionary fails
    const apiUrl = `https://random-word-api.herokuapp.com/word?lang=${lang}`;
    
    try {
        const res = await fetch(apiUrl);
        if (!res.ok) {
            throw new Error(`API request failed with status ${res.status}`);
        }
        
        const words: string[] = await res.json();
        if (!words || words.length === 0) {
            throw new Error('No words returned from API');
        }
        
        const word = words[0];
        const norm = normalizeWord(word);
        
        // Return the first valid word found (no length restrictions)
        if (norm.length > 0) {
            return { word: norm, length: norm.length };
        }
        
        throw new Error('Could not find a valid word');
    } catch (error) {
        console.error('Error fetching random word:', error);
        throw new Error('Failed to fetch random word from API');
    }
}

export class MotusGame {
    private state: MotusState;
    /** Target word (normalized, uppercase), kept server-side only. */
    private readonly targetNorm: string;
    private readonly lang: MotusLang;

    private constructor(state: MotusState, targetNorm: string, lang: MotusLang) {
        this.state = state;
        this.targetNorm = targetNorm;
        this.lang = lang;
    }

    static async create(playerIds: PlayerId[], settings: RoomSettings): Promise<MotusGame> {
        const maxAttempts = DEFAULT_MAX_ATTEMPTS;
        const lang: MotusLang = settings.motusLang ?? 'en';
        const { word: targetNorm, length: wordLength } = await fetchRandomWord(lang);

        const initialState: MotusState = {
            gameType: 'MOTUS',
            playerIds,
            status: 'PLAYING',
            winner: null,
            currentPlayerIndex: 0,
            wordLength,
            maxAttempts,
            firstLetter: targetNorm[0],
            attempts: []
        };

        return new MotusGame(initialState, targetNorm, lang);
    }

    static fromExisting(state: MotusState, targetNorm: string, settings: RoomSettings): MotusGame {
        const lang: MotusLang = settings.motusLang ?? 'en';
        return new MotusGame(state, targetNorm, lang);
    }

    getState(): MotusState {
        return this.state;
    }

    getTarget(): string {
        return this.targetNorm;
    }

    async applyGuess(playerId: PlayerId, rawGuess: string): Promise<void> {
        if (this.state.status !== 'PLAYING') {
            throw new Error('Game is over');
        }

        const players = this.state.playerIds;
        const currentPlayerId = players[this.state.currentPlayerIndex];
        if (playerId !== currentPlayerId) {
            throw new Error('Not your turn');
        }

        const guessNorm = normalizeWord(rawGuess);
        if (guessNorm.length !== this.state.wordLength) {
            throw new Error(`Guess must be exactly ${this.state.wordLength} letters`);
        }
        if (!guessNorm.startsWith(this.state.firstLetter)) {
            throw new Error(`Guess must start with "${this.state.firstLetter}"`);
        }

        const isValid = await isValidWiktionaryWord(guessNorm, this.lang);
        if (!isValid) {
            throw new Error('Word is not in the dictionary');
        }

        const feedback = this.evaluateGuess(guessNorm);
        const row: MotusGuessRow = {
            playerId,
            letters: feedback
        };

        this.state.attempts = [...this.state.attempts, row];

        const isExactMatch = guessNorm === this.targetNorm;
        if (isExactMatch) {
            this.state.status = 'ENDED';
            this.state.winner = playerId;
            this.state.finalWord = this.targetNorm;
            return;
        }

        if (this.state.attempts.length >= this.state.maxAttempts) {
            this.state.status = 'ENDED';
            this.state.winner = 'TIE';
            this.state.finalWord = this.targetNorm;
            return;
        }

        // Next player's turn
        this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % players.length;
    }

    private evaluateGuess(guessNorm: string): MotusLetterResult[] {
        const len = this.targetNorm.length;
        if (guessNorm.length !== len) {
            throw new Error('Internal error: length mismatch');
        }

        const results: MotusLetterResult[] = new Array(len);
        const remainingCounts: Record<string, number> = {};

        // First pass: RED
        for (let i = 0; i < len; i++) {
            const t = this.targetNorm[i];
            const g = guessNorm[i];
            if (g === t) {
                results[i] = { letter: g, color: 'RED' };
            } else {
                remainingCounts[t] = (remainingCounts[t] ?? 0) + 1;
            }
        }

        // Second pass: YELLOW / BLUE
        for (let i = 0; i < len; i++) {
            if (results[i]) continue;
            const g = guessNorm[i];
            const available = remainingCounts[g] ?? 0;
            if (available > 0) {
                results[i] = { letter: g, color: 'YELLOW' };
                remainingCounts[g] = available - 1;
            } else {
                results[i] = { letter: g, color: 'BLUE' };
            }
        }

        return results;
    }
}

