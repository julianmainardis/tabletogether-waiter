import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WaiterUser {
  id: string;
  username: string;
  name: string;
  role: 'waiter' | 'head_waiter' | 'manager';
}

interface WaiterAuthContextType {
  user: WaiterUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const WaiterAuthContext = createContext<WaiterAuthContextType | undefined>(undefined);

export const useWaiterAuth = () => {
  const context = useContext(WaiterAuthContext);
  if (!context) {
    throw new Error('useWaiterAuth must be used within a WaiterAuthProvider');
  }
  return context;
};

interface WaiterAuthProviderProps {
  children: React.ReactNode;
}

// Datos mock de usuarios camareros
const mockWaiters = [
  {
    id: '1',
    username: 'ana.camarero',
    password: '123456',
    name: 'Ana García',
    role: 'waiter' as const,
  },
  {
    id: '2',
    username: 'carlos.camarero',
    password: '123456',
    name: 'Carlos López',
    role: 'waiter' as const,
  },
  {
    id: '3',
    username: 'maria.supervisor',
    password: '123456',
    name: 'María Rodríguez',
    role: 'head_waiter' as const,
  },
  {
    id: '4',
    username: 'jose.manager',
    password: '123456',
    name: 'José Martínez',
    role: 'manager' as const,
  },
];

export const WaiterAuthProvider: React.FC<WaiterAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<WaiterUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar si hay una sesión guardada al iniciar
  useEffect(() => {
    checkStoredSession();
  }, []);

  const checkStoredSession = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('waiter_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error checking stored session:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Buscar usuario en datos mock
      const waiter = mockWaiters.find(
        w => w.username === username && w.password === password
      );

      if (!waiter) {
        throw new Error('Usuario o contraseña incorrectos');
      }

      // Crear objeto usuario sin password
      const userData: WaiterUser = {
        id: waiter.id,
        username: waiter.username,
        name: waiter.name,
        role: waiter.role,
      };

      // Guardar en AsyncStorage
      await AsyncStorage.setItem('waiter_user', JSON.stringify(userData));
      
      setUser(userData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('waiter_user');
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: WaiterAuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    logout,
    clearError,
  };

  return (
    <WaiterAuthContext.Provider value={value}>
      {children}
    </WaiterAuthContext.Provider>
  );
}; 