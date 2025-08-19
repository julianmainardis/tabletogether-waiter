import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { waiterAuthService } from './waiterAuth';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';
const WS_BASE_URL = API_BASE_URL.replace('/api', '');

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
        console.log('🔍 Alertas encontradas en almacenamiento:', parsedAlerts.length);
        console.log('🔍 Detalle de alertas:', parsedAlerts.map((a: any) => ({
          id: a.alertId,
          resolved: a.resolved,
          message: a.message,
          timestamp: a.timestamp
        })));

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
      console.log('📋 Tipo de alerta:', alert.alertType);
      console.log('📋 Mesa:', alert.tableNumber);
      console.log('📋 Mensaje:', alert.message);
      this.handleNewAlert(alert);
    });

    this.socket.on('alert-resolved', (data) => {
      console.log('✅ Alerta resuelta:', data);
      this.handleAlertResolved(data.alertId);
    });

    this.socket.on('order:mark-delivered-response', (data) => {
      console.log('📦 Respuesta de pedido entregado:', data);
      if (data.success) {
        console.log('✅ Pedido marcado como entregado exitosamente');
      } else {
        console.error('❌ Error marcando pedido como entregado:', data.error);
      }
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

    // Manejo específico para diferentes tipos de alerta
    switch (alert.alertType) {
      case 'new-order':
        console.log(`🍽️ NUEVO PEDIDO: Mesa ${alert.tableNumber} - Pedido #${alert.orderId} - Total: $${alert.total}`);
        console.log(`📋 Detalles del pedido: ${alert.message}`);

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
        console.log(`🚨 ALERTA GENERAL: Mesa ${alert.tableNumber} - ${alert.message}`);
    }

    // Agregar la alerta a la lista local (solo para alertas que requieren atención)
    this.alerts.push(alert);
    this.saveAlertsToStorage();

    // Emitir evento personalizado para que otros componentes puedan escuchar
    // En React Native usamos un sistema de eventos personalizado
    this.emitCustomEvent('new-table-alert', alert);
  }

  private handleAlertResolved(alertId: string) {
    console.log(`✅ Alerta ${alertId} resuelta desde servidor`);
    console.log(`📋 Alertas antes de marcar como resuelta: ${this.alerts.length}`);

    // Marcar la alerta como resuelta en lugar de eliminarla
    this.alerts = this.alerts.map(alert =>
      alert.alertId === alertId ? { ...alert, resolved: true } : alert
    );
    this.saveAlertsToStorage();

    console.log(`📋 Alertas después de marcar como resuelta: ${this.alerts.length}`);

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
      console.log('🔍 Validando alertas de order-ready...');

      const orderReadyAlerts = this.alerts.filter(alert => alert.alertType === 'order-ready');
      console.log(`📋 Encontradas ${orderReadyAlerts.length} alertas de order-ready`);

      if (orderReadyAlerts.length === 0) {
        console.log('✅ No hay alertas de order-ready para validar');
        return;
      }

      // Por ahora, vamos a limpiar todas las alertas de order-ready antiguas
      // ya que no tenemos acceso directo a la base de datos desde el frontend
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const validOrderReadyAlerts = orderReadyAlerts.filter(alert => {
        const alertDate = new Date(alert.timestamp);
        return alertDate > oneHourAgo;
      });

      const removedCount = orderReadyAlerts.length - validOrderReadyAlerts.length;
      console.log(`🗑️ Removidas ${removedCount} alertas de order-ready antiguas`);

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
      console.log('✅ Validación de alertas order-ready completada');

    } catch (error) {
      console.error('❌ Error validando alertas order-ready:', error);
    }
  }



  // Método para limpiar completamente y recargar (más agresivo)
  public async forceCleanAndReload() {
    console.log('🧹 Limpieza completa y recarga...');

    // Limpiar almacenamiento
    await this.cleanupResolvedAlertsFromStorage();

    // Recargar desde almacenamiento limpio
    await this.loadAlertsFromStorage();

    console.log('📋 Alertas después de limpieza completa:', this.alerts.length);
    await this.debugStorage();
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

      console.log(`🔄 Iniciando resolución de alerta: ${alertId}`);
      console.log(`📋 Alertas antes de resolver: ${this.alerts.length}`);

      // Encontrar la alerta para verificar su tipo
      const alert = this.alerts.find(a => a.alertId === alertId);
 

      
      this.socket.emit('resolve-alert', {
        alertId,
        alertType: alert?.alertType,
        orderId: alert?.orderId,
        tableId: alert?.tableId
      }, (response: any) => {
        console.log(`📡 Respuesta del servidor para resolución de alerta:`, response);
        if (response.success) {
          console.log(`✅ Servidor confirmó resolución de alerta: ${alertId}`);
          this.alerts = this.alerts.map(a =>
            a.alertId === alertId ? { ...a, resolved: true } : a
          );
          console.log(`📋 Alertas después de marcar como resuelta: ${this.alerts.length}`);

          // Guardar estado actualizado
          this.saveAlertsToStorage();

          // Limpiar alertas resueltas del almacenamiento
          this.cleanupResolvedAlertsFromStorage();

          // Si es una alerta de pedido listo, también actualizar el estado del pedido
       

          if (alert && alert.alertType === 'order-ready' && alert.orderId) {
            console.log(`🔍 Alerta de pedido listo detectada, orderId: ${alert.orderId}`);
            console.log(`🚀 Iniciando llamada a markOrderAsDelivered...`);
            // Llamar al endpoint HTTP para marcar como entregado
            this.markOrderAsDelivered(alert.orderId).catch(error => {
              console.error('❌ Error al marcar pedido como entregado:', error);
            });
          } else {
            console.log(`🔍 Alerta resuelta (no es order-ready): ${alert?.alertType}`);
          }

          resolve(response);
        } else {
          console.error(`❌ Error del servidor al resolver alerta: ${alertId}`);
          reject(new Error('Error al resolver alerta'));
        }
      });
    });
  }

  private async markOrderAsDelivered(orderId: string) {
    try {
      console.log(`📦 Marcando pedido ${orderId} como entregado`);

      // Obtener token de autenticación
      const auth = waiterAuthService.getCurrentAuth();
      console.log(`🔐 Estado de autenticación:`, {
        hasAuth: !!auth,
        hasToken: !!auth?.token,
        tokenLength: auth?.token?.length || 0
      });

      if (!auth?.token) {
        console.error('❌ No hay token de autenticación disponible');
        return;
      }

      const url = `${API_BASE_URL}/kitchen/orders/${orderId}/delivered`;
      console.log(`🌐 Llamando endpoint: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        }
      });

      console.log(`📡 Respuesta del servidor:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Pedido marcado como entregado:', orderId, responseData);
        console.log('📤 Evento emitido a la cocina para actualizar UI');
      } else {
        const errorData = await response.text();
        console.error('❌ Error marcando pedido como entregado:', response.statusText, errorData);
      }
    } catch (error) {
      console.error('❌ Error en markOrderAsDelivered:', error);
    }
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