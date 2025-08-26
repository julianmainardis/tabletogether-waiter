import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private orderModifiedCallbacks: Array<() => void> = [];

  connect() {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      timeout: 10000,
    });

    this.setupListeners();
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      // Socket conectado
    });

    this.socket.on('disconnect', () => {
      // Socket desconectado
    });

    this.socket.on('order-modified', (data: any) => {
      this.orderModifiedCallbacks.forEach(callback => callback());
    });

    this.socket.on('order-item-removed', (data: any) => {
      this.orderModifiedCallbacks.forEach(callback => callback());
    });
  }

  onOrderModified(callback: () => void) {
    this.orderModifiedCallbacks.push(callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

const socketService = new SocketService();
export default socketService;
