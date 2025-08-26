import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import waiterAuthService from './waiterAuth';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';
const WS_BASE_URL = API_BASE_URL.replace('/api', '') || 'http://localhost:3000';

export interface TableAlert {
  alertId: string;
  tableId: string;
  tableNumber: number;
  alertType: 'waiter-call' | 'order-ready' | 'check-request' | 'assistance-needed' | 'new-order' | 'table-occupied';
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  resolved: boolean;
  orderId?: string;
  total?: string;
  userName?: string;
}

export interface TableOrderUpdate {
  tableNumber: number;
  orderId: string;
  total: number;
  message: string;
}

export interface TableStatusUpdate {
  tableNumber: number;
  userName: string;
  message: string;
}

class AlertsService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private alerts: TableAlert[] = [];

  constructor() {
    this.initializeSocket();
    this.loadAlertsFromStorage().then(() => {
      // Validar alertas después de cargarlas
      this.validateOrderReadyAlerts();
    });
  }

  private async loadAlertsFromStorage() {
    try {
      const storedAlerts = await AsyncStorage.getItem('waiter_alerts');
      if (storedAlerts) {
        const parsedAlerts = JSON.parse(storedAlerts);

        // Filtrar alertas antiguas (más de 24 horas)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const recentAlerts = parsedAlerts.filter((alert: any) => {
          const alertDate = new Date(alert.timestamp);
          return alertDate > oneDayAgo;
        });

        const activeAlerts = recentAlerts.filter((alert: any) => !alert.resolved);
        this.alerts = activeAlerts.map((alert: any) => ({
          ...alert,
          timestamp: new Date(alert.timestamp)
        }));

        // Guardar las alertas limpias de vuelta al almacenamiento
        await AsyncStorage.setItem('waiter_alerts', JSON.stringify(recentAlerts));
      }
    } catch (error) {
      console.error('❌ Error cargando alertas desde almacenamiento:', error);
    }
  }

  private async saveAlertsToStorage() {
    try {
      

      await AsyncStorage.setItem('waiter_alerts', JSON.stringify(this.alerts));
      } catch (error) {
      console.error('❌ Error guardando alertas en almacenamiento:', error);
    }
  }

  private initializeSocket() {
    try {
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
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Unirse a la sala de camareros
      const auth = waiterAuthService.getCurrentAuth();

      if (auth) {
        this.joinWaiterRoom(auth.user.id);
      } else {
        this.joinWaiterRoom('waiter-default');
      }
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });

    this.socket.on('connected', (data) => {
      // Conectado al sistema de alertas
    });

    this.socket.on('joined-waiter-room', (data) => {
      // Unido a la sala de camareros
    });

    this.socket.on('new-alert', (alert: TableAlert) => {
      this.handleNewAlert(alert);
    });

    this.socket.on('alert-resolved', (data) => {
      this.handleAlertResolved(data.alertId);
    });

    this.socket.on('order:mark-delivered-response', (data) => {
      if (!data.success) {
        console.error('❌ Error marcando pedido como entregado:', data.error);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.isConnected = true;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Error de reconexión:', error);
    });
  }

  private handleNewAlert(alert: TableAlert) {
    // Manejo específico para diferentes tipos de alerta
    switch (alert.alertType) {
      case 'new-order':
        // Para alertas de nuevo pedido, NO las guardamos como alertas persistentes
        // Solo emitimos el evento para actualizar la información de la mesa
        this.emitCustomEvent('new-table-alert', alert);
        this.emitCustomEvent('table-order-updated', {
          tableNumber: alert.tableNumber,
          orderId: alert.orderId,
          total: alert.total,
          message: alert.message
        });
        return; // Salir sin guardar la alerta
      case 'table-occupied':
        this.emitCustomEvent('new-table-alert', alert);
        this.emitCustomEvent('table-status-updated', {
          tableNumber: alert.tableNumber,
          userName: alert.userName,
          message: alert.message
        });
        
        return; // Salir sin guardar la alerta

      case 'order-ready':
        break;
      case 'waiter-call':
        break;
      default:
        break;
    }

    // Agregar la alerta a la lista local (solo para alertas que requieren atención)
    this.alerts.push(alert);
    this.saveAlertsToStorage();

    // Emitir evento personalizado para que otros componentes puedan escuchar
    this.emitCustomEvent('new-table-alert', alert);
  }

  private handleAlertResolved(alertId: string) {
    // Marcar la alerta como resuelta en lugar de eliminarla
    this.alerts = this.alerts.map(alert =>
      alert.alertId === alertId ? { ...alert, resolved: true } : alert
    );
    this.saveAlertsToStorage();

    // Limpiar alertas resueltas del almacenamiento
    this.cleanupResolvedAlertsFromStorage();

    // Emitir evento personalizado
    this.emitCustomEvent('alert-resolved', { alertId });
  }

  // Método para obtener todas las alertas (incluyendo las no resueltas)
  public getAlerts(): TableAlert[] {
    return this.alerts;
  }

  // Método para obtener solo alertas no resueltas
  public getActiveAlerts(): TableAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  // Método para limpiar alertas resueltas antiguas (opcional)
  public async cleanupResolvedAlerts() {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    this.alerts = this.alerts.filter(alert =>
      !alert.resolved || alert.timestamp > oneDayAgo
    );

    await this.saveAlertsToStorage();
  }

  public async cleanupResolvedAlertsFromStorage() {
    try {
      const storedAlerts = await AsyncStorage.getItem('waiter_alerts');
      if (storedAlerts) {
        const parsedAlerts = JSON.parse(storedAlerts);

        const activeAlerts = parsedAlerts.filter((alert: any) => !alert.resolved);

        await AsyncStorage.setItem('waiter_alerts', JSON.stringify(activeAlerts));
      }
    } catch (error) {
      console.error('❌ Error limpiando alertas resueltas del almacenamiento:', error);
    }
  }


  // Método para limpiar completamente el almacenamiento (para testing)
  public async clearAllAlerts() {
    try {
      await AsyncStorage.removeItem('waiter_alerts');
      this.alerts = [];
      console.log('🗑️ Todas las alertas eliminadas del almacenamiento');
    } catch (error) {
      console.error('❌ Error limpiando almacenamiento:', error);
    }
  }

  // Método para limpiar alertas de order-ready que no tienen pedidos correspondientes
  public async validateOrderReadyAlerts() {
    try {
      const orderReadyAlerts = this.alerts.filter(alert => alert.alertType === 'order-ready');

      if (orderReadyAlerts.length === 0) {
        return;
      }

      // Limpiar alertas de order-ready antiguas (más de 1 hora)
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const validOrderReadyAlerts = orderReadyAlerts.filter(alert => {
        const alertDate = new Date(alert.timestamp);
        return alertDate > oneHourAgo;
      });

      // Actualizar la lista de alertas
      this.alerts = this.alerts.filter(alert => {
        if (alert.alertType === 'order-ready') {
          const alertDate = new Date(alert.timestamp);
          return alertDate > oneHourAgo;
        }
        return true; // Mantener otras alertas
      });

      // Guardar cambios
      await this.saveAlertsToStorage();

    } catch (error) {
      console.error('❌ Error validando alertas order-ready:', error);
    }
  }



  // Método para limpiar completamente y recargar (más agresivo)
  public async forceCleanAndReload() {
    // Limpiar almacenamiento
    await this.cleanupResolvedAlertsFromStorage();

    // Recargar desde almacenamiento limpio
    await this.loadAlertsFromStorage();
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
      this.socket.emit('join-waiter-room', { waiterId });
    }
  }

  public createAlert(alertData: {
    tableId: string;
    tableNumber: number;
    alertType: 'waiter-call' | 'order-ready' | 'check-request' | 'assistance-needed' | 'new-order';
    message: string;
    priority: 'low' | 'medium' | 'high';
    orderId?: string;
    total?: number;
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

      // Encontrar la alerta para verificar su tipo
      const alert = this.alerts.find(a => a.alertId === alertId);

      // Configurar listener temporal para la respuesta
      const onAlertResolved = (response: any) => {
        if (response.alertId === alertId) {
          this.socket!.off('alert-resolved', onAlertResolved);
          
          this.alerts = this.alerts.map(a =>
            a.alertId === alertId ? { ...a, resolved: true } : a
          );

          // Guardar estado actualizado
          this.saveAlertsToStorage();

          // Limpiar alertas resueltas del almacenamiento
          this.cleanupResolvedAlertsFromStorage();

          // Si es una alerta de pedido listo, actualizar el estado del pedido
          if (alert && alert.alertType === 'order-ready' && alert.orderId) {
            // Llamar al endpoint de prueba
            this.markOrderAsDelivered(alert.orderId).catch(error => {
              console.error('❌ Error al marcar pedido como entregado:', error);
            });
          }

          resolve({ success: true });
        }
      };

      this.socket.on('alert-resolved', onAlertResolved);
      
      // Emitir el evento sin callback
      this.socket.emit('resolve-alert', {
        alertId,
        alertType: alert?.alertType,
        orderId: alert?.orderId,
        tableId: alert?.tableId
      });

      // Timeout de seguridad
      setTimeout(() => {
        this.socket!.off('alert-resolved', onAlertResolved);
        reject(new Error('Timeout al resolver alerta'));
      }, 5000);
    });
  }

  private async markOrderAsDelivered(orderId: string) {
    try {
      const auth = waiterAuthService.getCurrentAuth();

      if (!auth?.token) {
        return;
      }

      const url = `${API_BASE_URL}/kitchen/orders/${orderId}/status`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          status: 'delivered'
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error marcando pedido como entregado:', response.statusText, errorData);
      }
    } catch (error) {
      console.error('Error en markOrderAsDelivered:', error);
    }
  }

  public isConnectedToServer(): boolean {
    return this.isConnected;
  }

  public getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      hasSocket: !!this.socket,
      socketConnected: this.socket?.connected,
      wsUrl: WS_BASE_URL,
      apiUrl: API_BASE_URL
    };
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  public reconnect() {
    this.disconnect();
    setTimeout(() => {
      this.initializeSocket();
    }, 1000);
  }
}

const alertsService = new AlertsService();
export default alertsService; 