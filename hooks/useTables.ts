import { useState, useEffect } from 'react';
import { waiterAuthService } from '../services/waiterAuth';
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

  const fetchTables = async () => {
    try {
      setLoading(true);
      setError(null);

      const auth = waiterAuthService.getCurrentAuth();
      if (!auth) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`${API_BASE_URL}/admin/tables`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al obtener las mesas');
      }

      const data: TablesResponse = await response.json();
      
      // Convertir las fechas de string a Date
      const tablesWithDates = data.tables.map(table => ({
        ...table,
        lastActivity: new Date(table.lastActivity),
        createdAt: new Date(table.createdAt),
        updatedAt: new Date(table.updatedAt)
      }));

      setTables(tablesWithDates);
      setStats({
        totalAvailable: data.totalAvailable,
        totalOccupied: data.totalOccupied,
        totalTables: data.totalTables
      });

    } catch (error: any) {
      console.error('Error fetching tables:', error);
      setError(error.message || 'Error al obtener las mesas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const refreshTables = () => {
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