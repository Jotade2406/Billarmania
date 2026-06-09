import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      path: '/socket.io',
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(branchId: string) {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit('join:branch', { branchId });
  return s;
}

export function disconnectSocket(branchId: string) {
  const s = getSocket();
  if (s.connected) {
    s.emit('leave:branch', { branchId });
  }
}
