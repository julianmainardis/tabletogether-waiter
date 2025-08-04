import { waiterAuthService } from './waiterAuth';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';

export interface OrderItem {
  id: string;
  product_id: string;
  product: {
    id: string;
    name: string;
    price: number;
    description?: string;
    image_url?: string;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
  customizations?: string[];
  sharedWithAll?: boolean;
  sharedWithUsers?: string[];
  user_id: string;
}

export interface Order {
  id: string;
  table_id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface TableOrdersResponse {
  groupedOrders: Array<{
    status: string;
    products: Array<{
      product: {
        name: string;
        image_url?: string;
      };
      totalQuantity: number;
      totalPrice: number;
      variations: Array<{
        unitPrice: number;
        quantity: number;
        totalPrice: number;
        customizations: Array<{
          name: string;
          price_adjustment: number;
        }>;
        orderDetails: Array<{
          orderedBy: string;
          quantity: number;
          sharedWithAll: boolean;
          sharedWithUsers?: string[];
        }>;
      }>;
      hasSharing: boolean;
    }>;
    totalAmount: number;
  }>;
  totals: {
    tableTotal: number;
    individualTotals: Array<{
      userName: string;
      total: number;
      personal: number;
      shared: number;
    }>;
  };
}

export const orderService = {
  async getTableOrdersBySession(sessionId: string): Promise<TableOrdersResponse> {
    const auth = waiterAuthService.getCurrentAuth();
    if (!auth) {
      throw new Error('No hay sesión activa');
    }

    const response = await fetch(`${API_BASE_URL}/orders/table/session/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al obtener los pedidos de la mesa');
    }

    return await response.json();
  },

  async getOrdersByTableId(tableId: string): Promise<TableOrdersResponse> {
    const auth = waiterAuthService.getCurrentAuth();
    if (!auth) {
      throw new Error('No hay sesión activa');
    }

    const response = await fetch(`${API_BASE_URL}/orders/table/${tableId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al obtener los pedidos de la mesa');
    }

    return await response.json();
  },

  async updateOrderStatus(orderId: string, status: 'pending' | 'processing' | 'completed' | 'cancelled'): Promise<Order> {
    const auth = waiterAuthService.getCurrentAuth();
    if (!auth) {
      throw new Error('No hay sesión activa');
    }

    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al actualizar el estado del pedido');
    }

    return await response.json();
  }
}; 