import { create } from 'zustand';
import type { Room } from '../../shared/types';

const CLIENT_ID_KEY = 'game_client_id';

/** Get or create a persistent client ID (survives browser reload) */
export function getClientId(): string {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
}

interface GameStore {
    room: Room | null;
    playerId: string | null;
    error: string | null;
    setRoom: (room: Room | null) => void;
    setPlayerId: (id: string | null) => void;
    setError: (error: string | null) => void;
}

export const useGameStore = create<GameStore>((set) => ({
    room: null,
    playerId: null,
    error: null,
    setRoom: (room) => set({ room }),
    setPlayerId: (id) => set({ playerId: id }),
    setError: (error) => set({ error })
}));
