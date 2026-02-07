import { create } from 'zustand';
import type { Room } from '../../shared/types';

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
