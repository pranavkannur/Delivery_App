import { io, Socket } from 'socket.io-client';

// Connect relative to current origin through Nginx reverse proxy
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/';

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
});