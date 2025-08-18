import { useState, useEffect, useRef, useCallback } from 'react';
import Constants from 'expo-constants';
import { waiterAuthService } from '../services/waiterAuth';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';

export interface TableStatus {
  id: string;
  number: number;
  status: 'available' | 'occupied' | 'reserved';
  capacity: number;
  sessionId?: string;
  orderTotal?: number;
  paidAmount?: number;
  timeOccupied?: string;
  waiter?: string;
  hasPartialPayment?: boolean;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
  hasAlerts?: boolean;
}

export interface TablesResponse {
  tables: TableStatus[];
  totalAvailable: number;
  totalOccupied: number;
  totalTables: number;
}

export const useTables = () => {
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalAvailable: 0,
    totalOccupied: 0,
    totalTables: 0
  });

  const previousTablesRef = useRef<TableStatus[]>([]);
  const isFirstLoadRef = useRef(true);

  const detectChanges = (newTables: TableStatus[], oldTables: TableStatus[]) => {
    if (oldTables.length === 0) return [];
    
    const changedTableIds: string[] = [];
    
    newTables.forEach(newTable => {
      const oldTable = oldTables.find(t => t.id === newTable.id);
      if (!oldTable) {
        changedTableIds.push(newTable.id);
        return;
      }
      
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
      if (isFirstLoadRef.current) {
        setLoading(true);
      }

      const auth = waiterAuthService.getCurrentAuth();
      console.log('🔐 Auth status:', auth ? 'Presente' : 'Ausente');
      if (!auth) {
        console.log('❌ No hay sesión activa');
        throw new Error('No hay sesión activa');
      }
      console.log('✅ Token presente:', auth.token ? 'SÍ' : 'NO');

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: La solicitud tardó demasiado')), 10000);
      });

      const fetchPromise = fetch(`${API_BASE_URL}/admin/tables`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`,
        },
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      if (!response.ok) {
        console.log('❌ Response status:', response.status);
        console.log('❌ Response status text:', response.statusText);
        const errorText = await response.text();
        console.log('❌ Error response:', errorText);
        throw new Error(`Error al obtener las mesas: ${response.status} ${response.statusText}`);
      }

      const data: TablesResponse = await response.json();
      
      console.log('📊 Datos de mesas recibidos:', {
        totalTables: data.totalTables,
        totalAvailable: data.totalAvailable,
        totalOccupied: data.totalOccupied,
        tablesCount: data.tables.length
      });

      data.tables.forEach((table, index) => {
        console.log(`📊 Mesa ${table.number}:`, {
          status: table.status,
          sessionId: table.sessionId,
          orderTotal: table.orderTotal,
          paidAmount: table.paidAmount,
          hasAlerts: table.hasAlerts
        });
      });
      
      const tablesWithDates = data.tables.map(table => ({
        ...table,
        lastActivity: new Date(table.lastActivity),
        createdAt: new Date(table.createdAt),
        updatedAt: new Date(table.updatedAt)
      }));

      const changedTableIds = detectChanges(tablesWithDates, previousTablesRef.current);
      previousTablesRef.current = tablesWithDates;

      setTables(tablesWithDates);
      setStats({
        totalAvailable: data.totalAvailable,
        totalOccupied: data.totalOccupied,
        totalTables: data.totalTables
      });

      if (changedTableIds.length > 0) {
        console.log('🔄 Cambios detectados en mesas:', changedTableIds);
      }

      isFirstLoadRef.current = false;

    } catch (error: any) {
      console.error('❌ Error fetching tables:', error);
      setError(error.message || 'Error al obtener las mesas');
      isFirstLoadRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Solo cargar las mesas si hay autenticación
    const auth = waiterAuthService.getCurrentAuth();
    if (auth) {
      console.log('🔐 Usuario autenticado, cargando mesas...');
      fetchTables();
    } else {
      console.log('🔐 Usuario no autenticado, no cargando mesas');
    }
  }, []);

  // Efecto para recargar cuando cambie la autenticación
  useEffect(() => {
    const checkAuthAndLoad = () => {
      const auth = waiterAuthService.getCurrentAuth();
      if (auth && tables.length === 0) {
        console.log('🔐 Usuario autenticado detectado, cargando mesas...');
        fetchTables();
      }
    };

    // Verificar cada 2 segundos si el usuario se autenticó
    const interval = setInterval(checkAuthAndLoad, 2000);
    return () => clearInterval(interval);
  }, [tables.length]);

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