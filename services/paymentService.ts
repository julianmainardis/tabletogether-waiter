import waiterAuthService from './waiterAuth';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';

export interface ProcessPaymentRequest {
  tableId: string;
  amount: number;
  method: 'cash' | 'card';
  description?: string;
}

export interface ProcessPaymentResponse {
  success: boolean;
  message: string;
  newPaidAmount?: number;
  remainingAmount?: number;
  paymentId?: string;
}

export interface PaymentStatusResponse {
  sessionId: string;
  totalAmount: number;
  totalPaid: number;
  remainingAmount: number;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    payment_type: string;
    userId?: string;
    userName?: string;
    description?: string;
    createdAt: Date;
  }>;
  userStatus: Array<{
    userId: string;
    userName: string;
    orderAmount: number;
    paidAmount: number;
    remaining: number;
    status: 'paid' | 'partial' | 'unpaid';
  }>;
}

const paymentService = {
  // Pago de mesa (simplificado para camareros)
  async processTablePayment(tableId: string, amount: number, method: 'cash' | 'card'): Promise<ProcessPaymentResponse> {
    const auth = waiterAuthService.getCurrentAuth();
    if (!auth) {
      throw new Error('No hay sesión activa');
    }

    const response = await fetch(`${API_BASE_URL}/admin/tables/${tableId}/payment/table`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        amount,
        method,
        description: `Pago de mesa - ${method}`,
        closeSession: false
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al procesar el pago');
    }

    return await response.json();
  },

  // Pago completo (método de conveniencia)
  async processFullPayment(tableId: string, method: 'cash' | 'card'): Promise<ProcessPaymentResponse> {
    const auth = waiterAuthService.getCurrentAuth();
    if (!auth) {
      throw new Error('No hay sesión activa');
    }

    const response = await fetch(`${API_BASE_URL}/admin/tables/${tableId}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        amount: 0, // Se calculará automáticamente el total restante
        method,
        payment_type: 'full',
        description: `Pago completo - ${method}`,
        closeSession: true
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al procesar el pago');
    }

    return await response.json();
  },

  // Obtener estado de pagos
  async getPaymentStatus(tableId: string): Promise<PaymentStatusResponse> {
    const auth = waiterAuthService.getCurrentAuth();
    if (!auth) {
      throw new Error('No hay sesión activa');
    }

    const response = await fetch(`${API_BASE_URL}/admin/tables/${tableId}/payment-status`, {
      headers: {
        'Authorization': `Bearer ${auth.token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener estado de pagos');
    }

    return await response.json();
  },

  // Método legacy para compatibilidad (deprecated)
  async processPayment(tableId: string, amount: number, isFullPayment: boolean): Promise<ProcessPaymentResponse> {
    console.warn('processPayment is deprecated. Use processTablePayment instead.');
    
    const method = 'card'; // Default method for legacy calls
    return this.processTablePayment(tableId, amount, method);
  }
};

export default paymentService; 