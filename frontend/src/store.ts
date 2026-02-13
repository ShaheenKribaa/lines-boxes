import { create } from 'zustand';
import type { Room } from '../../shared/types';
import type { User, Session } from '@supabase/supabase-js';

const CLIENT_ID_KEY = 'game_client_id';
const AVATAR_KEY = 'game_avatar';

/** Get or create a persistent client ID (survives browser reload) */
export function getClientId(): string {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
}

/** Get saved avatar or null */
export function getSavedAvatar(): string | null {
    return localStorage.getItem(AVATAR_KEY);
}

/** Save avatar to localStorage */
export function saveAvatar(avatarId: string): void {
    localStorage.setItem(AVATAR_KEY, avatarId);
}

interface GameStore {
    room: Room | null;
    playerId: string | null;
    error: string | null;
    user: User | null;
    session: Session | null;
    authLoading: boolean;
    setRoom: (room: Room | null) => void;
    setPlayerId: (id: string | null) => void;
    setError: (error: string | null) => void;
    setUser: (user: User | null) => void;
    setSession: (session: Session | null) => void;
    setAuthLoading: (loading: boolean) => void;
}

export const useGameStore = create<GameStore>((set) => ({
    room: null,
    playerId: null,
    error: null,
    user: null,
    session: null,
    authLoading: true,
    setRoom: (room) => set({ room }),
    setPlayerId: (id) => set({ playerId: id }),
    setError: (error) => set({ error }),
    setUser: (user) => set({ user }),
    setSession: (session) => set({ session }),
    setAuthLoading: (authLoading) => set({ authLoading }),
}));
