// Importar manejador global de errores primero
import '../global-error-handler';

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, LogBox } from 'react-native';
import { WaiterAuthProvider, useWaiterAuth } from '../contexts/WaiterAuthContext';
import { WaiterLoginScreen } from './WaiterLoginScreen';
import TableManagement from './TableManagement';

// Ignorar errores específicos de desarrollo
LogBox.ignoreLogs([
  'Text strings must be rendered within a <Text> component.',
  'Property \'r\' doesn\'t exist',
  'Warning: ReferenceError:',
  'Route "./WaiterLoginScreen.tsx" is missing the required default export',
]);

// Deshabilitar todos los warnings en desarrollo (opcional)
if (__DEV__) {
  LogBox.ignoreAllLogs();
}

const AppContent = () => {
  const { isAuthenticated, loading } = useWaiterAuth();
  const [showMainApp, setShowMainApp] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      setShowMainApp(true);
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    // Mostrar pantalla de carga mientras verifica la sesión
    return <View style={styles.loadingContainer} />;
  }

  if (!isAuthenticated) {
    return (
      <WaiterLoginScreen
        onLoginSuccess={() => setShowMainApp(true)}
      />
    );
  }

  if (showMainApp) {
    return <TableManagement />;
  }

  return <View style={styles.loadingContainer} />;
};

export default function App() {
  return (
    <WaiterAuthProvider>
      <AppContent />
    </WaiterAuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
});
