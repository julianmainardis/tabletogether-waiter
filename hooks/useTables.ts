import { useState, useEffect, useRef } from 'react';
import { waiterAuthService } from '../services/waiterAuth';
import { alertsService } from '../services/alertsService';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';

export interface TableStatus {
  id: string;
  number: number;
  capacity?: number;
  status: 'available' | 'occupied' | 'reserved';
  timeOccupied?: string;
  waiter?: string;
  orderTotal?: number;
  paidAmount?: number;
  hasPartialPayment: boolean;
  hasAlerts: boolean;
  sessionId?: string | null;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TablesResponse {
  tables: TableStatus[];
  totalAvailable: number;
  totalOccupied: number;
  totalTables: number;
}

export const useTables = () => {
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalAvailable: 0,
    totalOccupied: 0,
    totalTables: 0
  });

  // Referencias para controlar el polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const previousTablesRef = useRef<TableStatus[]>([]);

  // Función para detectar cambios en las mesas
  const detectChanges = (newTables: TableStatus[], oldTables: TableStatus[]) => {
    if (oldTables.length === 0) return []; // Primera carga, no hay cambios
    
    const changedTableIds: string[] = [];
    
    newTables.forEach(newTable => {
      const oldTable = oldTables.find(t => t.id === newTable.id);
      if (!oldTable) {
        // Nueva mesa
        changedTableIds.push(newTable.id);
        return;
      }
      
      // Verificar cambios en propiedades importantes
      if (
        oldTable.status !== newTable.status ||
        oldTable.orderTotal !== newTable.orderTotal ||
        oldTable.paidAmount !== newTable.paidAmount ||
        oldTable.sessionId !== newTable.sessionId ||
        oldTable.timeOccupied !== newTable.timeOccupied
      ) {
        changedTableIds.push(newTable.id);
      }
    });
    
    return changedTableIds;
  };

  const fetchTables = async () => {
    try {
      // Solo mostrar loading en la primera carga
      if (tables.length === 0) {
      setLoading(true);
      }
      setError(null);

      const auth = waiterAuthService.getCurrentAuth();
      if (!auth) {
        throw new Error('No hay sesión activa');
      }

      console.log('🔄 Fetching tables from:', `${API_BASE_URL}/admin/tables`);
      console.log('🔐 Auth token present:', !!auth.token);

      const response = await fetch(`${API_BASE_URL}/admin/tables`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`,
        },
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error response:', errorData);
        throw new Error(errorData.message || 'Error al obtener las mesas');
      }

      const data: TablesResponse = await response.json();
      console.log('✅ Tables data received:', {
        totalTables: data.totalTables,
        totalAvailable: data.totalAvailable,
        totalOccupied: data.totalOccupied,
        tablesCount: data.tables.length
      });
      
      // Log details for each table
      data.tables.forEach((table, index) => {
        console.log(`📊 Mesa ${table.number}:`, {
          status: table.status,
          sessionId: table.sessionId,
          orderTotal: table.orderTotal,
          paidAmount: table.paidAmount,
          hasAlerts: table.hasAlerts
        });
      });
      
      // Convertir las fechas de string a Date
      const tablesWithDates = data.tables.map(table => ({
        ...table,
        lastActivity: new Date(table.lastActivity),
        createdAt: new Date(table.createdAt),
        updatedAt: new Date(table.updatedAt)
      }));

      // Detectar cambios antes de actualizar el estado
      const changedTableIds = detectChanges(tablesWithDates, previousTablesRef.current);
      
      // Actualizar la referencia anterior
      previousTablesRef.current = tablesWithDates;

      setTables(tablesWithDates);
      setStats({
        totalAvailable: data.totalAvailable,
        totalOccupied: data.totalOccupied,
        totalTables: data.totalTables
      });

      // Log de cambios detectados (sin eventos personalizados)
      if (changedTableIds.length > 0) {
        console.log('🔄 Cambios detectados en mesas:', changedTableIds);
      }

    } catch (error: any) {
      console.error('❌ Error fetching tables:', error);
      setError(error.message || 'Error al obtener las mesas');
    } finally {
      setLoading(false);
    }
  };

  // Función para iniciar el polling automático
  const startPolling = () => {
    if (isPollingRef.current) return;
    
    isPollingRef.current = true;
    console.log('🔄 Iniciando polling automático cada 5 segundos');
    
    pollingIntervalRef.current = setInterval(() => {
      console.log('⏰ Polling automático - actualizando mesas...');
      fetchTables();
    }, 5000); // Actualizar cada 5 segundos
  };

  // Función para detener el polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isPollingRef.current = false;
    console.log('⏹️ Polling automático detenido');
  };

  // Efecto para manejar la actualización automática
  useEffect(() => {
    // Carga inicial
    fetchTables();
    
    // Iniciar polling automático
    startPolling();

    // Cleanup al desmontar
    return () => {
      stopPolling();
    };
  }, []);

  const refreshTables = () => {
    console.log('🔄 Actualización manual solicitada');
    fetchTables();
  };

  return {
    tables,
    loading,
    error,
    stats,
    refreshTables
  };
}; 