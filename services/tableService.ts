import { waiterAuthService } from './waiterAuth';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';

export interface UpdateTableStatusRequest {
  status: 'available' | 'occupied' | 'reserved';
  capacity?: number;
  waiter?: string;
}

export interface UpdateTableStatusResponse {
  id: string;
  number: number;
  status: 'available' | 'occupied' | 'reserved';
  capacity?: number;
  waiter?: string;
  updatedAt: Date;
}

export interface TableSession {
  id: string;
  tableId: string;
  startedAt: Date;
  endedAt?: Date;
  status: 'active' | 'ended';
}

export const tableService = {
  async updateTableStatus(tableId: string, updateData: UpdateTableStatusRequest): Promise<UpdateTableStatusResponse> {
    const auth = waiterAuthService.getCurrentAuth();
    if (!auth) {
      throw new Error('No hay sesión activa');
    }

    const response = await fetch(`${API_BASE_URL}/admin/tables/${tableId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al actualizar el estado de la mesa');
    }

    const data = await response.json();
    return {
      ...data,
      updatedAt: new Date(data.updatedAt)
    };
  },

  async getTableSessions(tableId: string): Promise<TableSession[]> {
    const auth = waiterAuthService.getCurrentAuth();
    if (!auth) {
      throw new Error('No hay sesión activa');
    }

    const response = await fetch(`${API_BASE_URL}/admin/tables/${tableId}/sessions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al obtener las sesiones de la mesa');
    }

    const data = await response.json();
    return data.map((session: any) => ({
      ...session,
      startedAt: new Date(session.startedAt),
      endedAt: session.endedAt ? new Date(session.endedAt) : undefined
    }));
  }
}; 