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
  private alerts: TableAlert[] = [];

  constructor() {
    this.initializeSocket();
    this.loadAlertsFromStorage();
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
          message: a.message
        })));
        
        // Solo cargar alertas no resueltas
        const activeAlerts = parsedAlerts.filter((alert: any) => !alert.resolved);
        this.alerts = activeAlerts.map((alert: any) => ({
          ...alert,
          timestamp: new Date(alert.timestamp)
        }));
        console.log('📋 Alertas activas cargadas desde almacenamiento:', this.alerts.length);
        console.log('🗑️ Alertas resueltas filtradas:', parsedAlerts.length - this.alerts.length);
      } else {
        console.log('📭 No hay alertas almacenadas');
      }
    } catch (error) {
      console.error('❌ Error cargando alertas desde almacenamiento:', error);
    }
  }

  private async saveAlertsToStorage() {
    try {
      console.log('💾 Guardando alertas en almacenamiento:', this.alerts.length);
      console.log('💾 Detalle de alertas a guardar:', this.alerts.map(a => ({
        id: a.alertId,
        resolved: a.resolved,
        message: a.message
      })));
      
      await AsyncStorage.setItem('waiter_alerts', JSON.stringify(this.alerts));
      console.log('✅ Alertas guardadas en almacenamiento:', this.alerts.length);
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
    
    // Agregar la alerta a la lista local
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

  // Método para limpiar completamente las alertas resueltas del almacenamiento
  public async cleanupResolvedAlertsFromStorage() {
    try {
      const storedAlerts = await AsyncStorage.getItem('waiter_alerts');
      if (storedAlerts) {
        const parsedAlerts = JSON.parse(storedAlerts);
        console.log('🧹 Alertas en almacenamiento antes de limpiar:', parsedAlerts.length);
        
        // Solo mantener alertas no resueltas
        const activeAlerts = parsedAlerts.filter((alert: any) => !alert.resolved);
        
        console.log('🧹 Alertas activas después de filtrar:', activeAlerts.length);
        
        // Guardar solo las alertas activas
        await AsyncStorage.setItem('waiter_alerts', JSON.stringify(activeAlerts));
        console.log('🧹 Limpieza de almacenamiento completada. Alertas activas:', activeAlerts.length);
      }
    } catch (error) {
      console.error('❌ Error limpiando alertas resueltas del almacenamiento:', error);
    }
  }

  // Método para verificar el estado del almacenamiento
  public async debugStorage() {
    try {
      const storedAlerts = await AsyncStorage.getItem('waiter_alerts');
      if (storedAlerts) {
        const parsedAlerts = JSON.parse(storedAlerts);
        console.log('🔍 DEBUG - Alertas en almacenamiento:', parsedAlerts.length);
        console.log('🔍 DEBUG - Detalle completo:', parsedAlerts);
      } else {
        console.log('🔍 DEBUG - No hay alertas en almacenamiento');
      }
    } catch (error) {
      console.error('❌ Error en debugStorage:', error);
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

  // Método temporal para forzar limpieza de alertas resueltas (para testing)
  public async forceCleanupResolved() {
    console.log('🧹 Forzando limpieza de alertas resueltas...');
    await this.cleanupResolvedAlertsFromStorage();
    await this.debugStorage();
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

      console.log(`🔄 Iniciando resolución de alerta: ${alertId}`);
      console.log(`📋 Alertas antes de resolver: ${this.alerts.length}`);

      // Encontrar la alerta para verificar su tipo
      const alert = this.alerts.find(a => a.alertId === alertId);
      
      this.socket.emit('resolve-alert', { alertId }, (response: any) => {
        if (response.success) {
          console.log(`✅ Servidor confirmó resolución de alerta: ${alertId}`);
          
          // Marcar la alerta como resuelta en lugar de eliminarla
          this.alerts = this.alerts.map(a => 
            a.alertId === alertId ? { ...a, resolved: true } : a
          );
          console.log(`📋 Alertas después de marcar como resuelta: ${this.alerts.length}`);
          
          // Guardar estado actualizado
          this.saveAlertsToStorage();
          
          // Limpiar alertas resueltas del almacenamiento
          this.cleanupResolvedAlertsFromStorage();
          
          // Verificar estado final
          this.debugStorage();
          
          // Si es una alerta de pedido listo, también actualizar el estado del pedido
          if (alert && alert.alertType === 'order-ready') {
            this.updateOrderToDelivered(alert.tableId);
          }
          
          resolve(response);
        } else {
          console.error(`❌ Error del servidor al resolver alerta: ${alertId}`);
          reject(new Error('Error al resolver alerta'));
        }
      });
    });
  }

  private updateOrderToDelivered(tableId: string) {
    if (!this.socket || !this.isConnected) {
      console.error('Socket no conectado para actualizar pedido');
      return;
    }

    console.log(`🔄 Enviando evento para marcar pedido como entregado para mesa: ${tableId}`);

    // Enviar evento para marcar el pedido como entregado
    this.socket.emit('order:mark-delivered', { tableId }, (response: any) => {
      if (response.success) {
        console.log('✅ Pedido marcado como entregado para mesa:', tableId);
      } else {
        console.error('❌ Error marcando pedido como entregado:', response.error);
      }
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