import React, { useEffect } from 'react';
import { WaiterLogin } from '../components/WaiterLogin';
import { useWaiterAuth } from '../contexts/WaiterAuthContext';

interface WaiterLoginScreenProps {
  onLoginSuccess: () => void;
}

export const WaiterLoginScreen: React.FC<WaiterLoginScreenProps> = ({ onLoginSuccess }) => {
  const { login, loading, error, isAuthenticated, clearError } = useWaiterAuth();

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      onLoginSuccess();
    }
  }, [isAuthenticated, onLoginSuccess]);

  const handleLogin = async (username: string, password: string) => {
    try {
      await login(username, password);
      // El onLoginSuccess se llamará automáticamente cuando isAuthenticated cambie
    } catch (error) {
      // El error se maneja en el contexto
    }
  };

  return (
    <WaiterLogin
      onLogin={handleLogin}
      loading={loading}
      error={error}
    />
  );
};
