import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { SocketEvent, RoomSettings, RpsChoice, GameType, SeaBattlePosition } from '../shared/types.js';
import { RoomManager } from './room-manager.js';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const roomManager = new RoomManager(io);

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase admin client for DB access (uses service role key — full access)
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

// Track userId → socketId for real-time notifications
const userSocketMap = new Map<string, string>();

// Authenticate Socket.IO connections via Supabase JWT (guests allowed without token)
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        socket.data.userId = null;
        socket.data.email = null;
        socket.data.isGuest = true;
        return next();
    }

    // Try verifying with Supabase Admin (most robust, handles ES256/HS256 automatically)
    if (supabaseAdmin) {
        try {
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) throw error || new Error('No user found');

            socket.data.userId = user.id;
            socket.data.email = user.email;
            socket.data.isGuest = false;
            return next();
        } catch (err: any) {
            console.warn('Supabase auth verification failed:', err.message);
            // Fallthrough to local JWT check if desirable, or just guest
        }
    }

    // Fallback to local JWT verification (legacy HS256) if Supabase Admin not available or failed
    if (SUPABASE_JWT_SECRET) {
        try {
            const decoded = jwt.verify(token, SUPABASE_JWT_SECRET, {
                algorithms: ['HS256', 'RS256', 'ES256'] // Allow ES256 just in case user provides public key in SECRET env
            }) as jwt.JwtPayload;
            socket.data.userId = decoded.sub;
            socket.data.email = decoded.email;
            socket.data.isGuest = false;
            return next();
        } catch (err: any) {
            console.warn('Local JWT verification failed:', err.message);
        }
    }

    // If both failed, allow as guest
    socket.data.userId = null;
    socket.data.email = null;
    socket.data.isGuest = true;
    next();
});

io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id, '| User:', socket.data.email ?? 'guest');

    // Register authenticated user in the socketMap
    if (socket.data.userId) {
        userSocketMap.set(socket.data.userId, socket.id);
    }

    // ============ Room/Game Events ============
    socket.on(SocketEvent.CREATE_ROOM, (data: { settings: RoomSettings; name?: string; clientId?: string; avatar?: string }) => {
        roomManager.createRoom(socket, data);
    });

    socket.on(SocketEvent.JOIN_ROOM, (data: { code: string; name: string; clientId?: string; avatar?: string }) => {
        roomManager.joinRoom(socket, data);
    });

    socket.on(SocketEvent.UPDATE_ROOM_SETTINGS, (data: { settings: Partial<RoomSettings> }) => {
        roomManager.updateRoomSettings(socket, data);
    });

    socket.on(SocketEvent.UPDATE_AVATAR, (avatar: string) => {
        roomManager.updateAvatar(socket, avatar);
    });

    socket.on(SocketEvent.RESET_TO_LOBBY, () => {
        roomManager.resetToLobby(socket);
    });

    socket.on(SocketEvent.START_GAME, () => {
        roomManager.startGame(socket);
    });

    socket.on(SocketEvent.RPS_PICK, (choice: RpsChoice) => {
        roomManager.handleRpsPick(socket, choice);
    });

    socket.on(SocketEvent.ROLL_DICE, () => {
        roomManager.handleGameMove(socket, { type: SocketEvent.ROLL_DICE });
    });

    socket.on(SocketEvent.PLACE_LINE, (moveData: any) => {
        roomManager.handleGameMove(socket, { type: SocketEvent.PLACE_LINE, ...moveData });
    });

    socket.on(SocketEvent.SELECT_GAME, (gameType: GameType) => {
        roomManager.updateRoomSettings(socket, { settings: { gameType } });
    });

    socket.on(SocketEvent.FLIP_CARD, (cardIndex: number) => {
        roomManager.handleGameMove(socket, { type: SocketEvent.FLIP_CARD, cardIndex });
    });

    socket.on(SocketEvent.SET_SECRET, (secret: string) => {
        roomManager.handleSetSecret(socket, secret);
    });

    socket.on(SocketEvent.GUESS_NUMBER, (guess: string) => {
        roomManager.handleGuessNumber(socket, guess);
    });

    socket.on(SocketEvent.SET_WORD, (word: string) => {
        roomManager.handleSetWord(socket, word);
    });

    socket.on(SocketEvent.GUESS_LETTER, (letter: string) => {
        roomManager.handleGuessLetter(socket, letter);
    });

    socket.on(SocketEvent.MOTUS_GUESS, (guess: string) => {
        roomManager.handleMotusGuess(socket, guess);
    });

    socket.on(SocketEvent.SET_CHAINES, (data: { principalWord: string; secondaryWords: string[] }) => {
        roomManager.handleSetChaines(socket, data.principalWord, data.secondaryWords);
    });

    socket.on(SocketEvent.GUESS_CHAINE, (word: string) => {
        roomManager.handleGuessChaine(socket, word);
    });

    socket.on(SocketEvent.SUBMIT_CLUE, (text: string) => {
        roomManager.handleMrWhiteClue(socket, text);
    });

    socket.on(SocketEvent.SUBMIT_VOTE, (votedId: string) => {
        roomManager.handleMrWhiteVote(socket, votedId);
    });

    socket.on(SocketEvent.MR_WHITE_GUESS, (guess: string) => {
        roomManager.handleMrWhiteGuess(socket, guess);
    });

    socket.on(SocketEvent.SET_SHIPS, (ships: { name: string; size: number; positions: SeaBattlePosition[] }[]) => {
        roomManager.handleSetShips(socket, ships);
    });

    socket.on(SocketEvent.FIRE_SHOT, (position: SeaBattlePosition) => {
        roomManager.handleFireShot(socket, position);
    });

    // ============ Friend System Events ============

    socket.on(SocketEvent.SEARCH_PLAYERS, async (query: string) => {
        if (!supabaseAdmin || !socket.data.userId) {
            socket.emit(SocketEvent.ERROR, 'Login required for friend features');
            return;
        }
        try {
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .select('id, display_name, avatar')
                .ilike('display_name', `%${query}%`)
                .neq('id', socket.data.userId)
                .limit(20);

            if (error) throw error;

            // Add online status
            const results = (data ?? []).map(p => ({
                ...p,
                is_online: userSocketMap.has(p.id)
            }));

            socket.emit(SocketEvent.SEARCH_RESULTS, results);
        } catch (err: any) {
            socket.emit(SocketEvent.ERROR, 'Search failed: ' + err.message);
        }
    });

    socket.on(SocketEvent.SEND_FRIEND_REQUEST, async (toUserId: string) => {
        if (!supabaseAdmin || !socket.data.userId) {
            socket.emit(SocketEvent.ERROR, 'Login required');
            return;
        }
        try {
            // Check if already friends
            const { data: existing } = await supabaseAdmin
                .from('friendships')
                .select('id')
                .or(`and(user1.eq.${socket.data.userId},user2.eq.${toUserId}),and(user1.eq.${toUserId},user2.eq.${socket.data.userId})`)
                .limit(1);

            if (existing && existing.length > 0) {
                socket.emit(SocketEvent.ERROR, 'Already friends');
                return;
            }

            // Check if request already exists
            const { data: existingReq } = await supabaseAdmin
                .from('friend_requests')
                .select('id, status')
                .eq('from_user', socket.data.userId)
                .eq('to_user', toUserId)
                .limit(1);

            if (existingReq && existingReq.length > 0) {
                socket.emit(SocketEvent.ERROR, 'Request already sent');
                return;
            }

            // Check if they sent us a request (auto-accept)
            const { data: reverseReq } = await supabaseAdmin
                .from('friend_requests')
                .select('id')
                .eq('from_user', toUserId)
                .eq('to_user', socket.data.userId)
                .eq('status', 'pending')
                .limit(1);

            if (reverseReq && reverseReq.length > 0) {
                // Auto-accept — they already sent us a request
                await supabaseAdmin
                    .from('friend_requests')
                    .update({ status: 'accepted' })
                    .eq('id', reverseReq[0].id);

                // Create friendship (ensure user1 < user2 for uniqueness)
                const [u1, u2] = [socket.data.userId, toUserId].sort();
                await supabaseAdmin.from('friendships').insert({ user1: u1, user2: u2 });

                // Notify both users
                const targetSocketId = userSocketMap.get(toUserId);
                if (targetSocketId) {
                    io.to(targetSocketId).emit(SocketEvent.FRIEND_REQUEST_UPDATED, { requestId: reverseReq[0].id, status: 'accepted' });
                }
                socket.emit(SocketEvent.FRIEND_REQUEST_UPDATED, { requestId: reverseReq[0].id, status: 'accepted' });
                return;
            }

            // Insert new request
            const { error } = await supabaseAdmin
                .from('friend_requests')
                .insert({ from_user: socket.data.userId, to_user: toUserId });

            if (error) throw error;

            // Notify target if online
            const targetSocketId = userSocketMap.get(toUserId);
            if (targetSocketId) {
                const { data: fromProfile } = await supabaseAdmin
                    .from('profiles')
                    .select('id, display_name, avatar')
                    .eq('id', socket.data.userId)
                    .single();

                io.to(targetSocketId).emit(SocketEvent.FRIEND_REQUEST_RECEIVED, fromProfile);
            }
        } catch (err: any) {
            socket.emit(SocketEvent.ERROR, 'Failed to send request: ' + err.message);
        }
    });

    socket.on(SocketEvent.ACCEPT_FRIEND_REQUEST, async (requestId: string) => {
        if (!supabaseAdmin || !socket.data.userId) return;
        try {
            // Get the request
            const { data: req } = await supabaseAdmin
                .from('friend_requests')
                .select('*')
                .eq('id', requestId)
                .eq('to_user', socket.data.userId)
                .eq('status', 'pending')
                .single();

            if (!req) {
                socket.emit(SocketEvent.ERROR, 'Request not found');
                return;
            }

            // Update request status
            await supabaseAdmin
                .from('friend_requests')
                .update({ status: 'accepted' })
                .eq('id', requestId);

            // Create friendship
            const [u1, u2] = [req.from_user, req.to_user].sort();
            await supabaseAdmin.from('friendships').insert({ user1: u1, user2: u2 });

            // Notify the sender if online
            const senderSocketId = userSocketMap.get(req.from_user);
            if (senderSocketId) {
                io.to(senderSocketId).emit(SocketEvent.FRIEND_REQUEST_UPDATED, { requestId, status: 'accepted' });
            }
            socket.emit(SocketEvent.FRIEND_REQUEST_UPDATED, { requestId, status: 'accepted' });
        } catch (err: any) {
            socket.emit(SocketEvent.ERROR, 'Failed to accept request: ' + err.message);
        }
    });

    socket.on(SocketEvent.DECLINE_FRIEND_REQUEST, async (requestId: string) => {
        if (!supabaseAdmin || !socket.data.userId) return;
        try {
            await supabaseAdmin
                .from('friend_requests')
                .update({ status: 'declined' })
                .eq('id', requestId)
                .eq('to_user', socket.data.userId);

            socket.emit(SocketEvent.FRIEND_REQUEST_UPDATED, { requestId, status: 'declined' });
        } catch (err: any) {
            socket.emit(SocketEvent.ERROR, 'Failed to decline request: ' + err.message);
        }
    });

    socket.on(SocketEvent.GET_FRIENDS, async () => {
        if (!supabaseAdmin || !socket.data.userId) return;
        try {
            const { data: friendships } = await supabaseAdmin
                .from('friendships')
                .select('user1, user2')
                .or(`user1.eq.${socket.data.userId},user2.eq.${socket.data.userId}`);

            if (!friendships || friendships.length === 0) {
                socket.emit(SocketEvent.FRIENDS_LIST, []);
                return;
            }

            const friendIds = friendships.map(f =>
                f.user1 === socket.data.userId ? f.user2 : f.user1
            );

            const { data: profiles } = await supabaseAdmin
                .from('profiles')
                .select('id, display_name, avatar')
                .in('id', friendIds);

            const friends = (profiles ?? []).map(p => ({
                ...p,
                is_online: userSocketMap.has(p.id)
            }));

            socket.emit(SocketEvent.FRIENDS_LIST, friends);
        } catch (err: any) {
            socket.emit(SocketEvent.ERROR, 'Failed to load friends: ' + err.message);
        }
    });

    socket.on(SocketEvent.GET_FRIEND_REQUESTS, async () => {
        if (!supabaseAdmin || !socket.data.userId) return;
        try {
            const { data: requests } = await supabaseAdmin
                .from('friend_requests')
                .select('id, from_user, to_user, status, created_at')
                .eq('to_user', socket.data.userId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (!requests || requests.length === 0) {
                socket.emit(SocketEvent.FRIEND_REQUESTS_LIST, []);
                return;
            }

            // Fetch sender profiles
            const senderIds = requests.map(r => r.from_user);
            const { data: profiles } = await supabaseAdmin
                .from('profiles')
                .select('id, display_name, avatar')
                .in('id', senderIds);

            const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

            const enriched = requests.map(r => ({
                ...r,
                from_user: profileMap.get(r.from_user) ?? { id: r.from_user, display_name: 'Unknown', avatar: null },
                to_user: { id: r.to_user, display_name: '', avatar: null }
            }));

            socket.emit(SocketEvent.FRIEND_REQUESTS_LIST, enriched);
        } catch (err: any) {
            socket.emit(SocketEvent.ERROR, 'Failed to load requests: ' + err.message);
        }
    });

    socket.on(SocketEvent.INVITE_TO_ROOM, async (data: { friendId: string; roomCode: string }) => {
        if (!supabaseAdmin || !socket.data.userId) return;

        const targetSocketId = userSocketMap.get(data.friendId);
        if (!targetSocketId) {
            socket.emit(SocketEvent.ERROR, 'Friend is offline');
            return;
        }

        // Get sender profile
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id, display_name, avatar')
            .eq('id', socket.data.userId)
            .single();

        // Get room info for game type
        const room = roomManager.getRoomByCode(data.roomCode);
        const gameType = room?.settings?.gameType ?? 'DOTS_AND_BOXES';

        io.to(targetSocketId).emit(SocketEvent.ROOM_INVITATION, {
            from: profile,
            roomCode: data.roomCode,
            gameType
        });
    });

    // ============ Disconnect ============
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Remove from userSocketMap
        if (socket.data.userId) {
            userSocketMap.delete(socket.data.userId);
        }
        roomManager.handleDisconnect(socket);
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
