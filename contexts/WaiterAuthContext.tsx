import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { waiterAuthService } from '../services/waiterAuth';
import { WaiterUser, WaiterAuth } from '../types';

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

interface WaiterAuthProviderProps {
  children: ReactNode;
}

export const WaiterAuthProvider: React.FC<WaiterAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<WaiterUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar autenticación al cargar la app
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const auth = await waiterAuthService.getStoredAuth();
      
      if (auth && new Date(auth.expiresAt) > new Date()) {
        setUser(auth.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const auth = await waiterAuthService.login(username, password);
      setUser(auth.user);
      setIsAuthenticated(true);
    } catch (error: any) {
      setError(error.message || 'Error al iniciar sesión');
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await waiterAuthService.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: WaiterAuthContextType = {
    user,
    isAuthenticated,
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

export const useWaiterAuth = (): WaiterAuthContextType => {
  const context = useContext(WaiterAuthContext);
  if (context === undefined) {
    throw new Error('useWaiterAuth must be used within a WaiterAuthProvider');
  }
  return context;
}; 