import { useEffect, useRef } from 'react';
import { Routes, Route, useParams, useNavigate, Navigate } from 'react-router-dom';
import { useGameStore, getClientId, getSavedAvatar } from './store';
import { socket, connectWithToken } from './socket';
import { supabase } from './supabase';
import { SocketEvent } from '../../shared/types';
import { Landing } from './components/Landing';
import { AuthPage } from './components/AuthPage';
import { Lobby } from './components/Lobby';
import { ChooseFirstPlayer } from './components/ChooseFirstPlayer';
import { DotsAndBoxesGameBoard, DotsAndBoxesGameOver } from './games/dots-and-boxes';
import { MemoryGameBoard, MemoryGameOver } from './games/memory';
import { FourChiffreGameBoard, FourChiffreGameOver } from './games/four-chiffre';
import { MotusGameBoard, MotusGameOver } from './games/motus';
import { WordGuesserGameBoard, WordGuesserGameOver } from './games/word-guesser';
import { ChainesLogiqueGameBoard, ChainesLogiqueGameOver } from './games/chaines-logique';
import './index.css';
import { MrWhiteGameOver } from './games/mr-white/MrWhiteGameOver';
import { MrWhiteGameBoard } from './games/mr-white/MrWhiteGameBoard';
import { SeaBattleGameBoard, SeaBattleGameOver } from './games/sea-battle';

function RoomPage() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const { room, setError, session } = useGameStore();
    const navigate = useNavigate();

    // Redirect to auth if not logged in
    useEffect(() => {
        if (!session) {
            navigate('/auth');
        }
    }, [session, navigate]);

    useEffect(() => {
        // If we have a room code in URL but no room in state, try to rejoin (e.g. after page reload)
        if (roomCode && !room) {
            const savedName = localStorage.getItem('playerName');
            if (savedName) {
                // Socket.io queues emits when disconnected; rejoin will send once connected
                socket.emit(SocketEvent.JOIN_ROOM, { code: roomCode.toUpperCase(), name: savedName, clientId: getClientId(), avatar: getSavedAvatar() });
            } else {
                navigate('/');
            }
        }

        // If we have a room but the code doesn't match URL, update URL
        if (room && room.code !== roomCode?.toUpperCase()) {
            navigate(`/room/${room.code}`);
        }

        // If room is null and we're on a room page, show error after delay (use fresh state from store)
        if (!room && roomCode) {
            const timeout = setTimeout(() => {
                if (!useGameStore.getState().room) {
                    setError('Room not found or session expired');
                    navigate('/');
                }
            }, 5000);
            return () => clearTimeout(timeout);
        }
    }, [roomCode, room, navigate, setError]);

    if (!room) {
        return (
            <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                        Connecting to room...
                    </div>
                </div>
            </div>
        );
    }

    // Show game over if game has ended
    if (room.status === 'ENDED') {
        const gameType = room.gameData?.gameType ?? room.settings?.gameType ?? 'DOTS_AND_BOXES';
        if (gameType === 'MEMORY') return <MemoryGameOver />;
        if (gameType === 'FOUR_CHIFFRE') return <FourChiffreGameOver />;
        if (gameType === 'MOTUS') return <MotusGameOver />;
        if (gameType === 'WORD_GUESSER') return <WordGuesserGameOver />;
        if (gameType === 'CHAINES_LOGIQUE') return <ChainesLogiqueGameOver />;
        if (gameType === 'MR_WHITE') return <MrWhiteGameOver />;
        if (gameType === 'SEA_BATTLE') return <SeaBattleGameOver />;
        return <DotsAndBoxesGameOver />;
    }

    // Show game board if game is playing
    if (room.status === 'PLAYING') {
        const gameType = room.gameData?.gameType ?? 'DOTS_AND_BOXES';
        if (gameType === 'MEMORY') return <MemoryGameBoard />;
        if (gameType === 'FOUR_CHIFFRE') return <FourChiffreGameBoard />;
        if (gameType === 'MOTUS') return <MotusGameBoard />;
        if (gameType === 'WORD_GUESSER') return <WordGuesserGameBoard />;
        if (gameType === 'CHAINES_LOGIQUE') return <ChainesLogiqueGameBoard />;
        if (gameType === 'MR_WHITE') return <MrWhiteGameBoard />;
        if (gameType === 'SEA_BATTLE') return <SeaBattleGameBoard />;
        return <DotsAndBoxesGameBoard />;
    }

    // Rock Paper Scissors to decide who goes first
    if (room.status === 'CHOOSING_FIRST') {
        return <ChooseFirstPlayer />;
    }

    // Show lobby if in a room but not playing
    if (room.status === 'LOBBY') {
        return <Lobby />;
    }

    return null;
}

/** Protected route wrapper — redirects to /auth if not logged in */
function RequireAuth({ children }: { children: React.ReactElement }) {
    const { session, authLoading } = useGameStore();

    if (authLoading) {
        return (
            <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                        Loading...
                    </div>
                </div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/auth" replace />;
    }

    return children;
}

function App() {
    const socketInitialized = useRef(false);

    // Initialize Supabase auth listener
    useEffect(() => {
        const store = useGameStore.getState();

        // Get the initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            store.setSession(session);
            store.setUser(session?.user ?? null);
            store.setAuthLoading(false);

            // Connect socket with token if we have a session
            if (session?.access_token) {
                const newSocket = connectWithToken(session.access_token);
                newSocket.connect();
                store.setPlayerId(newSocket.id ?? null);
                setupSocketListeners(newSocket);
                socketInitialized.current = true;
            }
        });

        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const s = useGameStore.getState();
            s.setSession(session);
            s.setUser(session?.user ?? null);

            if (session?.access_token) {
                const newSocket = connectWithToken(session.access_token);
                newSocket.connect();
                s.setPlayerId(newSocket.id ?? null);
                setupSocketListeners(newSocket);
                socketInitialized.current = true;
            } else if (socketInitialized.current) {
                // Logged out — disconnect socket
                socket.disconnect();
                s.setRoom(null);
                s.setPlayerId(null);
                socketInitialized.current = false;
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<RequireAuth><Landing /></RequireAuth>} />
            <Route path="/room/:roomCode" element={<RequireAuth><RoomPage /></RequireAuth>} />
        </Routes>
    );
}

/** Set up the global socket event listeners */
function setupSocketListeners(sock: ReturnType<typeof connectWithToken>) {
    // Remove any existing listeners first
    sock.off('connect');
    sock.off(SocketEvent.ROOM_UPDATED);
    sock.off(SocketEvent.GAME_STARTED);
    sock.off(SocketEvent.ERROR);

    sock.on('connect', () => {
        console.log('Socket connected, ID:', sock.id);
        useGameStore.getState().setPlayerId(sock.id ?? null);
    });

    sock.on(SocketEvent.ROOM_UPDATED, (room) => {
        console.log('ROOM_UPDATED received:', room);
        useGameStore.getState().setRoom(room);
        useGameStore.getState().setError(null);
    });

    sock.on(SocketEvent.GAME_STARTED, (gameData) => {
        console.log('Game started:', gameData);
    });

    sock.on(SocketEvent.ERROR, (message) => {
        console.log('Socket error:', message);
        useGameStore.getState().setError(message);
    });
}

export default App;
