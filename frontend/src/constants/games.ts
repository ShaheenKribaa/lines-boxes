import type { GameType } from '../../../shared/types';

export const GAME_OPTIONS: { id: GameType; label: string; description: string }[] = [
    { id: 'DOTS_AND_BOXES', label: 'Dots and Boxes', description: 'Connect dots to claim boxes' },
    { id: 'MEMORY', label: 'Memory Game', description: 'Match pairs of cards' },
    { id: 'FOUR_CHIFFRE', label: '4 Chiffres', description: 'Guess the other player\'s 4-digit number' },
    { id: 'WORD_GUESSER', label: 'Word Guesser', description: 'Guess the other player\'s word, 7 mistakes max' }
];
