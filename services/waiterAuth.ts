import { WaiterAuth, WaiterUser } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';

class WaiterAuthService {
  private auth: WaiterAuth | null = null;

  async login(username: string, password: string): Promise<WaiterAuth> {
    try {
      console.log('🔐 Intentando login para usuario:', username);
      
      const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username, 
          password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error de autenticación:', errorData.message || 'Credenciales inválidas');
        throw new Error(errorData.message || 'Credenciales inválidas');
      }

      const data = await response.json();
      console.log('✅ Login exitoso');
      return this.processLoginResponse(data);
      
    } catch (error: any) {
      console.error('❌ Error en login:', error.message);
      throw error;
    }
  }

  private processLoginResponse(data: any): WaiterAuth {
    console.log('✅ Login exitoso, datos recibidos:', {
      token: data.token ? 'Presente' : 'Ausente',
      user: data.user ? {
        id: data.user.id,
        username: data.user.username,
        fullName: data.user.fullName,
        role: data.user.role,
        isActive: data.user.isActive
      } : 'Ausente',
      expiresAt: data.expiresAt
    });
    
    // Validar que el usuario tenga rol de waiter o admin
    if (!['waiter', 'admin'].includes(data.user.role)) {
      console.error('❌ Rol incorrecto:', data.user.role);
      throw new Error('Acceso denegado. Solo los camareros y administradores pueden acceder a la app de camareros.');
    }

    console.log('✅ Rol validado correctamente:', data.user.role);

    this.auth = data;
    
    // Guardar en AsyncStorage
    AsyncStorage.setItem('waiterAuth', JSON.stringify(data)).then(() => {
      console.log('💾 Sesión guardada en AsyncStorage');
    });
    
    return data;
  }

  async logout(): Promise<void> {
    try {
      if (this.auth?.token) {
        // Intentar hacer logout en el servidor
        await fetch(`${API_BASE_URL}/admin/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.auth.token}`,
          },
        });
      }
    } catch (error) {
      console.error('Error en logout de waiter:', error);
    } finally {
      this.auth = null;
      await AsyncStorage.removeItem('waiterAuth');
    }
  }

  async getStoredAuth(): Promise<WaiterAuth | null> {
    try {
      const stored = await AsyncStorage.getItem('waiterAuth');
      if (stored) {
        const auth = JSON.parse(stored);
        // Verificar si el token no ha expirado
        if (new Date(auth.expiresAt) > new Date()) {
          this.auth = auth;
          return auth;
        } else {
          await this.logout();
        }
      }
    } catch (error) {
      console.error('Error al recuperar auth de waiter:', error);
      await this.logout();
    }
    return null;
  }

  getCurrentAuth(): WaiterAuth | null {
    return this.auth;
  }

  async isAuthenticated(): Promise<boolean> {
    const auth = await this.getStoredAuth();
    return auth !== null && new Date(auth.expiresAt) > new Date();
  }

  getCurrentUser(): WaiterUser | null {
    const auth = this.getCurrentAuth();
    return auth?.user || null;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const auth = this.getCurrentAuth();
      if (!auth) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`${API_BASE_URL}/admin/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al cambiar contraseña');
      }
    } catch (error: any) {
      console.error('Error cambiando contraseña:', error);
      throw error;
    }
  }
}

export const waiterAuthService = new WaiterAuthService(); 