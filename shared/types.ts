export type PlayerId = string;
export type RoomId = string;

export interface Player {
    id: PlayerId;
    clientId?: string; // Persistent ID from localStorage - survives browser reload
    avatar?: string; // Character icon id (e.g. 'buggs-bunny', 'jerry', 'tom', 'hellokitty')
    name: string;
    score: number;
    isConnected: boolean;
    isHost: boolean;
    colorIndex: number; // Stable color assignment (0-3)
}

export type GameType = 'DOTS_AND_BOXES' | 'MEMORY' | 'FOUR_CHIFFRE' | 'WORD_GUESSER' | 'MOTUS';

export interface RoomSettings {
    gameType: GameType;
    gridSize: number; // e.g., 5 for 5x5 dots (DOTS_AND_BOXES)
    diceSides: number;
    maxPlayers: number;
    pairCount?: number; // 4-40 pairs for MEMORY game (20 images reused)
    secretSize?: number; // 4, 5, or 6 digits for FOUR_CHIFFRE
    motusLang?: 'en' | 'fr'; // language for MOTUS (Wiktionary host)
}

export type GameStatus = 'LOBBY' | 'CHOOSING_FIRST' | 'PLAYING' | 'ENDED';

export type RpsChoice = 'ROCK' | 'PAPER' | 'SCISSORS';

export interface BaseGameState {
    status: GameStatus;
    winner: PlayerId | 'TIE' | null;
}

export interface DotsAndBoxesState extends BaseGameState {
    gameType: 'DOTS_AND_BOXES';
    playerIds: PlayerId[];
    board: {
        horizontalLines: boolean[][]; // (gridSize) x (gridSize-1)
        verticalLines: boolean[][];   // (gridSize-1) x (gridSize)
        boxes: (PlayerId | null)[][];  // (gridSize-1) x (gridSize-1)
    };
    currentPlayerIndex: number;
    diceRoll: number | null;
    movesRemaining: number;
    lastMove: {
        type: 'LINE' | 'DICE';
        playerId: PlayerId;
        details?: any;
    } | null;
}

/** Card index in shuffled deck. cards[i] is the image id (1-20). Face-up cards are in revealed. */
export interface MemoryGameState extends BaseGameState {
    gameType: 'MEMORY';
    playerIds: PlayerId[];
    cards: number[]; // shuffled card ids (each id appears twice for pairs)
    revealed: number[]; // indices of currently face-up cards (0 or 2)
    matched: number[]; // indices of matched pairs
    currentPlayerIndex: number;
    scores: Record<PlayerId, number>;
}

/** Phase: enter 4-digit secret, then take turns guessing opponent's number. */
export type FourChiffrePhase = 'ENTER_SECRET' | 'GUESSING';

export interface FourChiffreGuessEntry {
    guesserId: PlayerId;
    targetId: PlayerId;
    guess: string;
    correctDigits: number;
    correctPlace: number;
}

export interface FourChiffreState extends BaseGameState {
    gameType: 'FOUR_CHIFFRE';
    playerIds: PlayerId[];
    phase: FourChiffrePhase;
    secretSet: Record<PlayerId, boolean>; // whether each player has submitted their secret (secrets never sent to client)
    guessHistory: FourChiffreGuessEntry[];
    currentPlayerIndex: number;
}

/** Phase: both enter word, then take turns guessing (round 0: P2 guesses P1's word, round 1: P1 guesses P2's word). */
export type WordGuesserPhase = 'ENTER_WORD' | 'GUESSING';

export interface WordGuesserState extends BaseGameState {
    gameType: 'WORD_GUESSER';
    playerIds: PlayerId[];
    phase: WordGuesserPhase;
    wordSet: Record<PlayerId, boolean>;
    /** Current round (0 or 1). Round 0 = playerIds[1] guesses playerIds[0]'s word. */
    roundIndex: number;
    /** Letters the current guesser has guessed this round. */
    guessedLetters: string[];
    /** Wrong guesses this round (max 7). */
    mistakes: number;
    /** Revealed word for display: same length as target word, letters or _ (never sent the actual word). */
    revealedWord: string;
    /** Length of the target word (so client can show blanks before any guess). */
    wordLength: number;
    /** Round winners: roundIndex -> winner PlayerId (guesser wins if they got the word, else target wins). */
    roundWinners: (PlayerId | null)[];
}

export type MotusLetterColor = 'RED' | 'YELLOW' | 'BLUE';

export interface MotusLetterResult {
    letter: string;
    color: MotusLetterColor;
}

export interface MotusGuessRow {
    playerId: PlayerId;
    letters: MotusLetterResult[];
}

export interface MotusState extends BaseGameState {
    gameType: 'MOTUS';
    playerIds: PlayerId[];
    currentPlayerIndex: number;
    wordLength: number;
    maxAttempts: number;
    firstLetter: string;
    attempts: MotusGuessRow[];
    /** Revealed target word (normalized, uppercase), set only at game end. */
    finalWord?: string;
}

export type GameState = DotsAndBoxesState | MemoryGameState | FourChiffreState | WordGuesserState | MotusState;

export interface Room {
    id: RoomId;
    code: string;
    hostId: PlayerId;
    settings: RoomSettings;
    players: Player[];
    status: GameStatus;
    gameData: GameState | null;
    rpsPicks?: Partial<Record<PlayerId, RpsChoice>>; // Used during CHOOSING_FIRST
}

// Socket Events
export enum SocketEvent {
    // Client -> Server
    CREATE_ROOM = 'CREATE_ROOM',
    JOIN_ROOM = 'JOIN_ROOM',
    UPDATE_ROOM_SETTINGS = 'UPDATE_ROOM_SETTINGS',
    UPDATE_AVATAR = 'UPDATE_AVATAR',
    RESET_TO_LOBBY = 'RESET_TO_LOBBY',
    START_GAME = 'START_GAME',
    RPS_PICK = 'RPS_PICK',
    ROLL_DICE = 'ROLL_DICE',
    PLACE_LINE = 'PLACE_LINE',
    SELECT_GAME = 'SELECT_GAME',
    FLIP_CARD = 'FLIP_CARD',
    SET_SECRET = 'SET_SECRET',
    GUESS_NUMBER = 'GUESS_NUMBER',
    SET_WORD = 'SET_WORD',
    GUESS_LETTER = 'GUESS_LETTER',
    MOTUS_GUESS = 'MOTUS_GUESS',
    LEAVE_ROOM = 'LEAVE_ROOM',

    // Server -> Client
    ROOM_UPDATED = 'ROOM_UPDATED',
    GAME_STARTED = 'GAME_STARTED',
    DICE_ROLLED = 'DICE_ROLLED',
    LINE_PLACED = 'LINE_PLACED',
    BOX_COMPLETED = 'BOX_COMPLETED',
    TURN_CHANGED = 'TURN_CHANGED',
    GAME_ENDED = 'GAME_ENDED',
    PLAYER_DISCONNECTED = 'PLAYER_DISCONNECTED',
    ERROR = 'ERROR'
}
