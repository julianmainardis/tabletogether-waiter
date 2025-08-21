import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WaiterAuthProvider, useWaiterAuth } from '../contexts/WaiterAuthContext';
import { WaiterLoginScreen } from './WaiterLoginScreen';
import TableManagement from './TableManagement';

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
