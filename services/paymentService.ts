import { waiterAuthService } from './waiterAuth';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';

export interface ProcessPaymentRequest {
  tableId: string;
  amount: number;
  isFullPayment: boolean;
}

export interface ProcessPaymentResponse {
  success: boolean;
  message: string;
  newPaidAmount?: number;
  remainingAmount?: number;
}

export const paymentService = {
  async processPayment(tableId: string, amount: number, isFullPayment: boolean): Promise<ProcessPaymentResponse> {
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
        amount,
        isFullPayment,
        closeSession: false // Mantener la mesa ocupada después del pago
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al procesar el pago');
    }

    const data = await response.json();
    return data;
  }
}; 