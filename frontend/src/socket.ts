import { io, Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let _socket: Socket = io(SERVER_URL, { autoConnect: false });

/** Get the current socket instance */
export function getSocket(): Socket {
    return _socket;
}

/** For backward compatibility — re-exported as a live reference */
export { _socket as socket };

/** Reconnect the socket with an auth token. Returns the new socket. */
export function connectWithToken(token: string): Socket {
    if (_socket.connected) {
        _socket.disconnect();
    }
    _socket = io(SERVER_URL, {
        autoConnect: false,
        auth: { token }
    });
    return _socket;
}
