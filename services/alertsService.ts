import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { waiterAuthService } from './waiterAuth';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';
const WS_BASE_URL = API_BASE_URL.replace('/api', '');

export interface TableAlert {
  alertId: string;
  tableId: string;
  tableNumber: number;
  alertType: 'waiter-call' | 'order-ready' | 'check-request' | 'assistance-needed';
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  resolved: boolean;
}

class AlertsService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    try {
      console.log('🔌 Inicializando conexión WebSocket...');
      
      this.socket = io(WS_BASE_URL, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('❌ Error al inicializar WebSocket:', error);
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Conectado al servidor de alertas');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Unirse a la sala de camareros
      const auth = waiterAuthService.getCurrentAuth();
      console.log('🔍 Verificando autenticación para unirse a sala:', auth);
      
      if (auth) {
        console.log('👤 Usuario autenticado:', auth.user);
        this.joinWaiterRoom(auth.user.id);
      } else {
        console.warn('⚠️ No hay autenticación, usando ID por defecto');
        this.joinWaiterRoom('waiter-default');
      }
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Desconectado del servidor de alertas');
      this.isConnected = false;
    });

    this.socket.on('connected', (data) => {
      console.log('🎉 Conectado al sistema de alertas:', data);
    });

    this.socket.on('joined-waiter-room', (data) => {
      console.log('👨‍💼 Unido a la sala de camareros:', data);
    });

    this.socket.on('new-alert', (alert: TableAlert) => {
      console.log('🚨 Nueva alerta recibida:', alert);
      this.handleNewAlert(alert);
    });

    this.socket.on('alert-resolved', (data) => {
      console.log('✅ Alerta resuelta:', data);
      this.handleAlertResolved(data.alertId);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconectado después de ${attemptNumber} intentos`);
      this.isConnected = true;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Error de reconexión:', error);
    });
  }

  private handleNewAlert(alert: TableAlert) {
    // Aquí puedes implementar la lógica para mostrar notificaciones
    // Por ejemplo, usar expo-notifications o mostrar un modal
    
    // Por ahora, solo logueamos la alerta
    console.log(`🚨 ALERTA: Mesa ${alert.tableNumber} - ${alert.message}`);
    
    // Emitir evento personalizado para que otros componentes puedan escuchar
    // En React Native usamos un sistema de eventos personalizado
    this.emitCustomEvent('new-table-alert', alert);
  }

  private handleAlertResolved(alertId: string) {
    console.log(`✅ Alerta ${alertId} resuelta`);
    
    // Emitir evento personalizado
    this.emitCustomEvent('alert-resolved', { alertId });
  }

  // Sistema de eventos personalizado para React Native
  private eventListeners: Map<string, Function[]> = new Map();

  public addEventListener(eventName: string, callback: Function) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName)?.push(callback);
  }

  public removeEventListener(eventName: string, callback: Function) {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitCustomEvent(eventName: string, data: any) {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error en event listener para ${eventName}:`, error);
        }
      });
    }
  }

  public joinWaiterRoom(waiterId: string) {
    if (this.socket && this.isConnected) {
      console.log(`👨‍💼 Uniéndose a la sala de camareros como ${waiterId}`);
      this.socket.emit('join-waiter-room', { waiterId });
    } else {
      console.warn('⚠️ Socket no conectado, no se puede unir a la sala');
      console.log('🔍 Estado del socket:', {
        socketExists: !!this.socket,
        isConnected: this.isConnected,
        socketConnected: this.socket?.connected
      });
    }
  }

  public createAlert(alertData: {
    tableId: string;
    tableNumber: number;
    alertType: 'waiter-call' | 'order-ready' | 'check-request' | 'assistance-needed';
    message: string;
    priority: 'low' | 'medium' | 'high';
  }): Promise<{ success: boolean; alertId: string }> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Socket no conectado'));
        return;
      }

      this.socket.emit('create-alert', alertData, (response: any) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error('Error al crear alerta'));
        }
      });
    });
  }

  public resolveAlert(alertId: string): Promise<{ success: boolean }> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Socket no conectado'));
        return;
      }

      this.socket.emit('resolve-alert', { alertId }, (response: any) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error('Error al resolver alerta'));
        }
      });
    });
  }

  public isConnectedToServer(): boolean {
    return this.isConnected;
  }

  public disconnect() {
    if (this.socket) {
      console.log('🔌 Desconectando del servidor de alertas');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  public reconnect() {
    console.log('🔄 Intentando reconectar...');
    this.disconnect();
    setTimeout(() => {
      this.initializeSocket();
    }, 1000);
  }
}

export const alertsService = new AlertsService(); 