import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert as UIAlert, AlertDescription } from '../components/ui/alert';
import Modal from '../components/ui/Modal';
import { MenuView } from '../components/MenuView';
import { Table, TableStatus, TableAlert, AlertType } from '../types/table';
import { statusConfig, alertConfig } from '../data/mockData';
import { useWaiterAuth } from '../contexts/WaiterAuthContext';
import { useTables, TableStatus as RealTableStatus } from '../hooks/useTables';
import { tableService } from '../services/tableService';
import { alertsService } from '../services/alertsService';
import { orderService, TableOrdersResponse } from '../services/orderService';
import { paymentService } from '../services/paymentService';

type ViewType = 'tables' | 'menu' | 'order-summary';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function TableManagement() {
  const { user, logout } = useWaiterAuth();
  const { tables: realTables, loading, error, stats, refreshTables } = useTables();
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [alerts, setAlerts] = useState<TableAlert[]>([]);
  const [showAlerts, setShowAlerts] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TableStatus | "all">("all");
  const [showTableModal, setShowTableModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedDiners, setSelectedDiners] = useState(2);
  const [manualDiners, setManualDiners] = useState('');
  const [validationError, setValidationError] = useState('');
  const [currentView, setCurrentView] = useState<ViewType>('tables');
  const [selectedTableForMenu, setSelectedTableForMenu] = useState<number | null>(null);
  const [isModifyingOrder, setIsModifyingOrder] = useState(false);
  const [tableOrders, setTableOrders] = useState<Record<number, any[]>>({});
  const [tableDiners, setTableDiners] = useState<Record<number, number>>({});
  const [currentOrderData, setCurrentOrderData] = useState<TableOrdersResponse | null>(null);
  const [loadingCurrentOrder, setLoadingCurrentOrder] = useState(false);

  // Convertir datos reales del backend al formato de la aplicación
  useEffect(() => {
    if (realTables.length > 0) {
      console.log('🔄 Convirtiendo datos del backend:', realTables.length, 'mesas');
      
      const convertedTables: Table[] = realTables.map((realTable: RealTableStatus) => {
        const convertedTable = {
          id: realTable.number, // Mantener el número para la UI
          number: realTable.number,
          status: realTable.status,
          capacity: realTable.capacity,
          occupiedTime: realTable.lastActivity,
          waiter: realTable.waiter,
          total: realTable.orderTotal || 0,
          orderTotal: realTable.orderTotal || 0, // Asegurar que siempre sea un número
          paidAmount: realTable.paidAmount || 0, // Asegurar que siempre sea un número
          hasPartialPayment: realTable.hasPartialPayment,
          hasAlerts: realTable.hasAlerts,
          sessionId: realTable.sessionId,
          timeOccupied: realTable.timeOccupied,
          realId: realTable.id // Agregar el ID real para usar en las llamadas al API
        };
        
        console.log(`📊 Mesa ${realTable.number}:`, {
          orderTotal: realTable.orderTotal,
          paidAmount: realTable.paidAmount,
          status: realTable.status,
          convertedOrderTotal: convertedTable.orderTotal,
          convertedPaidAmount: convertedTable.paidAmount
        });
        
        return convertedTable;
      });
      
      console.log('✅ Mesas convertidas:', convertedTables.length);
      setTables(convertedTables);
    }
  }, [realTables, user]);

  // Escuchar alertas en tiempo real
  useEffect(() => {
    console.log('🔌 Configurando listeners de alertas en TableManagement');
    
    // Cargar alertas existentes al iniciar
    const existingAlerts = alertsService.getActiveAlerts();
    if (existingAlerts.length > 0) {
      console.log('📋 Cargando alertas activas existentes:', existingAlerts.length);
      const mappedAlerts = existingAlerts.map(alert => ({
        id: alert.alertId,
        tableId: alert.tableNumber,
        type: alert.alertType,
        message: alert.message,
        timestamp: alert.timestamp,
        priority: alert.priority,
        resolved: alert.resolved
      }));
      setAlerts(mappedAlerts);
    }
    
    const handleNewAlert = (alert: any) => {
      console.log('🚨 Nueva alerta recibida en TableManagement:', alert);
      console.log('📊 Estado actual de alertas:', alerts);
      
      // Agregar la alerta a la lista local
      const newAlert = {
        id: alert.alertId,
        tableId: alert.tableNumber,
        type: alert.alertType,
        message: alert.message,
        timestamp: new Date(alert.timestamp),
        priority: alert.priority,
        resolved: alert.resolved
      };
      
      console.log('➕ Agregando nueva alerta:', newAlert);
      setAlerts(prev => {
        const updated = [...prev, newAlert];
        console.log('📋 Lista actualizada de alertas:', updated);
        return updated;
      });
    };

    const handleAlertResolved = (data: any) => {
      const { alertId } = data;
      console.log('✅ Alerta resuelta en TableManagement:', alertId);
      
      // Marcar la alerta como resuelta
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true } : alert
      ));
    };

    // Verificar si el servicio está conectado
    console.log('🔍 Estado del alertsService:', {
      isConnected: alertsService.isConnectedToServer()
    });

    // Verificar que el alertsService esté escuchando eventos
    console.log('🎧 Configurando event listeners para alertas');
    
    // Agregar event listeners usando el servicio de alertas
    alertsService.addEventListener('new-table-alert', handleNewAlert);
    alertsService.addEventListener('alert-resolved', handleAlertResolved);

    // Cleanup
    return () => {
      console.log('🧹 Limpiando listeners de alertas');
      alertsService.removeEventListener('new-table-alert', handleNewAlert);
      alertsService.removeEventListener('alert-resolved', handleAlertResolved);
    };
  }, []);

  // Monitorear el estado del modal de pago
  useEffect(() => {
    console.log('💰 Estado del modal de pago:', showPaymentModal);
  }, [showPaymentModal]);

  // Filtrar mesas según el estado seleccionado
  const filteredTables = tables.filter(table => {
    if (filterStatus === "all") return true;
    return table.status === filterStatus;
  });

  // Contar mesas por estado
  const statusCounts = {
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
  };

  // Obtener alertas activas
  const activeAlerts = alerts.filter(alert => !alert.resolved);

  const updateTableStatus = async (tableId: number, newStatus: TableStatus) => {
    try {
      // Encontrar la mesa en los datos reales del backend
      const realTable = realTables.find(t => t.number === tableId);
      if (!realTable) {
        console.error('Table not found in backend data');
        return;
      }

      // Actualizar en el backend
      await tableService.updateTableStatus(realTable.id, {
        status: newStatus,
        capacity: newStatus === 'occupied' ? 4 : undefined,
        waiter: newStatus === 'occupied' ? user?.fullName : undefined
      });

      // Refrescar los datos del backend
      await refreshTables();

    } catch (error) {
      console.error('Error updating table status:', error);
      // Mostrar error al usuario si es necesario
    }
  };

  const processPayment = async (tableId: number, amount: number, isFullPayment: boolean) => {
    try {
      // Encontrar la mesa en los datos reales del backend
      const realTable = realTables.find(t => t.number === tableId);
      if (!realTable) {
        console.error('Table not found in backend data');
        return;
      }

      console.log(`💳 Procesando pago para mesa ${tableId}:`, {
        amount,
        isFullPayment,
        currentPaidAmount: realTable.paidAmount || 0,
        orderTotal: realTable.orderTotal || 0
      });

      // Usar el nuevo servicio de pagos
      const paymentResult = await paymentService.processPayment(realTable.id, amount, isFullPayment);
      
      console.log(`✅ Resultado del pago:`, paymentResult);

      // Refrescar los datos del backend
      await refreshTables();

    } catch (error) {
      console.error('Error processing payment:', error);
      // Mostrar error al usuario si es necesario
    }

    setShowPaymentModal(false);
    setPaymentAmount('');
  };

  const addAlert = (tableId: number, type: AlertType, message: string) => {
    const newAlert: TableAlert = {
      id: `alert-${Date.now()}`,
      tableId,
      type,
      message,
      timestamp: new Date(),
      priority: "medium",
      resolved: false,
    };
    setAlerts(prev => [...prev, newAlert]);
  };

  const resolveAlert = async (alertId: string) => {
    try {
      console.log(`🔄 Resolviendo alerta: ${alertId}`);
      await alertsService.resolveAlert(alertId);
      
      // Recargar alertas activas después de resolver
      const updatedAlerts = alertsService.getActiveAlerts();
      const mappedAlerts = updatedAlerts.map(alert => ({
        id: alert.alertId,
        tableId: alert.tableNumber,
        type: alert.alertType,
        message: alert.message,
        timestamp: alert.timestamp,
        priority: alert.priority,
        resolved: alert.resolved
      }));
      setAlerts(mappedAlerts);
      console.log(`✅ Alerta ${alertId} resuelta y lista actualizada`);
    } catch (error) {
      console.error(`❌ Error resolviendo alerta ${alertId}:`, error);
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    
    if (hours < 24) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const handleTablePress = (table: Table) => {
    setSelectedTable(table);
    setShowTableModal(true);
  };

  const handleAssignTable = async (tableId: number, diners: number) => {
    try {
      // Encontrar la mesa en los datos reales del backend
      const realTable = realTables.find(t => t.number === tableId);
      if (!realTable) {
        console.error('Table not found in backend data');
        return;
      }

      // Actualizar en el backend
      await tableService.updateTableStatus(realTable.id, {
        status: 'occupied',
        capacity: diners,
        waiter: user?.fullName
      });

      // Actualizar estado local
      setTableDiners(prev => ({ ...prev, [tableId]: diners }));
      setShowAssignModal(false);
      setSelectedDiners(2);
      setManualDiners('');
      setValidationError('');
      
      // Refrescar los datos del backend
      await refreshTables();
      
      // Redirigir al menú después de asignar la mesa
      setSelectedTableForMenu(tableId);
      setIsModifyingOrder(false);
      setCurrentView('menu');

    } catch (error) {
      console.error('Error assigning table:', error);
      // Mostrar error al usuario si es necesario
    }
  };

  const handleNewOrder = (tableId: number) => {
    setSelectedTableForMenu(tableId);
    setIsModifyingOrder(false);
    setCurrentView('menu');
  };

  const handleModifyOrder = (tableId: number) => {
    setSelectedTableForMenu(tableId);
    setIsModifyingOrder(true);
    setCurrentView('menu');
    loadCurrentOrder(tableId);
  };

  const loadCurrentOrder = async (tableId: number) => {
    try {
      setLoadingCurrentOrder(true);
      console.log('🔄 Cargando pedido actual para mesa:', tableId);
      
      // Encontrar la mesa para obtener el realId
      const table = tables.find(t => t.id === tableId);
      if (!table || !table.realId) {
        console.error('❌ No se encontró la mesa o no tiene realId:', tableId);
        Alert.alert('Error', 'No se pudo identificar la mesa');
        return;
      }
      
      console.log('🔍 Usando realId para la mesa:', table.realId);
      const orderData = await orderService.getOrdersByTableId(table.realId);
      console.log('📦 Pedido actual cargado:', orderData);
      
      // El backend devuelve groupedOrders, necesitamos extraer los items de ahí
      let currentOrderItems: any[] = [];
      
      if (orderData && orderData.groupedOrders) {
        // Extraer todos los productos de todos los grupos de órdenes
        currentOrderItems = orderData.groupedOrders.flatMap(group => 
          group.products.flatMap(product => 
            product.variations.flatMap(variation => 
              variation.orderDetails.map(detail => ({
                id: product.product.name, // Usar el nombre como ID temporal
                name: product.product.name,
                price: variation.unitPrice,
                quantity: detail.quantity,
                description: product.product.name,
                image_url: product.product.image_url
              }))
            )
          )
        );
      }
      
      console.log('📋 Items convertidos:', currentOrderItems);
      setTableOrders(prev => ({
        ...prev,
        [tableId]: currentOrderItems
      }));
      
    } catch (error) {
      console.error('❌ Error cargando pedido actual:', error);
      Alert.alert('Error', 'No se pudo cargar el pedido actual');
      setTableOrders(prev => ({
        ...prev,
        [tableId]: []
      }));
    } finally {
      setLoadingCurrentOrder(false);
    }
  };

  const handlePaymentRequest = (table: Table) => {
    console.log('💰 Abriendo modal de pago para mesa:', table.number);
    setSelectedTable(table);
    setShowPaymentModal(true);
    console.log('✅ Estado del modal actualizado a true');
  };

  const handlePartialPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setValidationError('Por favor ingrese un monto válido');
      return;
    }
    if (selectedTable && amount > (selectedTable.orderTotal || 0)) {
      setValidationError('El monto no puede ser mayor al total');
      return;
    }
    processPayment(selectedTable!.id, amount, false);
  };

  const handleFullPayment = () => {
    if (selectedTable) {
      const remainingAmount = (selectedTable.orderTotal || 0) - (selectedTable.paidAmount || 0);
      processPayment(selectedTable.id, remainingAmount, true);
    }
  };

  const handleConfirmOrder = (items: any[]) => {
    if (selectedTableForMenu) {
      setTableOrders(prev => ({
        ...prev,
        [selectedTableForMenu]: items
      }));

      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      setTables(prev => prev.map(table => 
        table.id === selectedTableForMenu 
          ? { ...table, orderTotal: Math.round(total * 100) / 100 }
          : table
      ));

      // Recargar el pedido actual después de confirmar
      if (isModifyingOrder) {
        loadCurrentOrder(selectedTableForMenu);
      }

      setCurrentView('tables');
      setSelectedTableForMenu(null);
      setIsModifyingOrder(false);
    }
  };

  const validateDiners = (diners: number) => {
    return diners >= 1 && diners <= 8;
  };

  const handleDinerSelection = (diners: number) => {
    setSelectedDiners(diners);
    setManualDiners('');
    setValidationError('');
  };

  const handleRefresh = async () => {
    try {
      console.log('🔄 Actualizando datos de mesas...');
      await refreshTables();
      console.log('✅ Datos actualizados correctamente');
    } catch (error) {
      console.error('❌ Error al actualizar datos:', error);
    }
  };

  const renderTableCard = ({ item: table }: { item: Table }) => {
    const config = statusConfig[table.status];
    const hasAlert = activeAlerts.some(alert => alert.tableId === table.id);
    const order = tableOrders[table.id] || [];

    // Debug: Log de los datos de la mesa
    console.log(`Mesa ${table.number}:`, {
      orderTotal: table.orderTotal,
      paidAmount: table.paidAmount,
      status: table.status,
      hasAlert
    });

    return (
      <TouchableOpacity
        key={table.id}
        style={styles.tableCard}
        onPress={() => handleTablePress(table)}
      >
        <Card style={StyleSheet.flatten([
          styles.tableCardInner,
          { backgroundColor: config.color },
          hasAlert && styles.tableCardWithAlert
        ])}>
          <CardContent style={styles.tableContent}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableNumber, { color: config.textColor }]}>
                Mesa {table.number}
              </Text>
            </View>

            <View style={styles.tableInfo}>
              {table.timeOccupied ? (
                <Text style={[styles.tableInfoText, { color: config.textColor }]}>
                  Tiempo: {table.timeOccupied}
                </Text>
              ) : null}
              
              {/* Solo mostrar el total si hay una sesión activa */}
              {table.sessionId && (
                <Text style={[styles.orderTotal, { color: config.textColor }]}>
                  €{(table.orderTotal || 0).toFixed(2)}
                  {table.paidAmount && table.paidAmount > 0 && (
                    <Text style={styles.paidAmount}> (-€{table.paidAmount.toFixed(2)})</Text>
                  )}
                </Text>
              )}
            </View>

            {hasAlert && (
              <View style={styles.alertIndicator}>
                <Ionicons name="warning" size={14} color="#ef4444" />
              </View>
            )}
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderStatusSummary = () => (
    <View style={styles.statusSummary}>
      <TouchableOpacity
        style={[
          styles.statusCard,
          filterStatus === "all" && styles.selectedStatusCard,
        ]}
        onPress={() => setFilterStatus("all")}
      >
        <Card style={styles.statusCardInner}>
          <CardContent style={styles.statusContent}>
            <Text style={[
              styles.statusCount,
              filterStatus === "all" && styles.selectedStatusText,
            ]}>
              {loading ? '...' : stats.totalTables}
            </Text>
            <Text style={[
              styles.statusLabel,
              filterStatus === "all" && styles.selectedStatusText,
            ]}>
              Todas
            </Text>
          </CardContent>
        </Card>
      </TouchableOpacity>
      
      {Object.entries(statusConfig).map(([status, config]) => {
        const count = statusCounts[status as TableStatus] || 0;
        return (
          <TouchableOpacity
            key={status}
            style={[
              styles.statusCard,
              filterStatus === status && styles.selectedStatusCard,
            ]}
            onPress={() => setFilterStatus(status as TableStatus)}
          >
            <Card style={StyleSheet.flatten([
              styles.statusCardInner,
              filterStatus === status && styles.selectedStatusCardInner,
              { backgroundColor: config.color },
            ])}>
              <CardContent style={styles.statusContent}>
                <Text style={[
                  styles.statusCount,
                  { color: config.textColor },
                  filterStatus === status && styles.selectedStatusText,
                ]}>
                  {count}
                </Text>
                <Text style={[
                  styles.statusLabel,
                  { color: config.textColor },
                  filterStatus === status && styles.selectedStatusText,
                ]}>
                  {config.label}
                </Text>
              </CardContent>
            </Card>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderAlerts = () => (
    <View style={styles.alertsSection}>
      <View style={styles.alertsHeader}>
        <Text style={styles.alertsTitle}>Alertas Activas</Text>
        <TouchableOpacity
          onPress={() => setShowAlerts(!showAlerts)}
          style={styles.alertsToggle}
        >
          <Ionicons 
            name={showAlerts ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#6b7280" 
          />
        </TouchableOpacity>
      </View>
      
      {showAlerts && (
        <ScrollView style={styles.alertsList} showsVerticalScrollIndicator={false}>
          {activeAlerts.length === 0 ? (
            <Text style={styles.noAlertsText}>No hay alertas activas</Text>
          ) : (
            activeAlerts.map((alert) => {
              const config = alertConfig[alert.type] || {
                bgColor: '#f3f4f6',
                borderColor: '#6b7280',
                color: '#374151',
                label: 'Alerta'
              };
              return (
                <View
                  key={alert.id}
                  style={[
                    styles.alertItem,
                    {
                      backgroundColor: config.bgColor,
                      borderColor: config.borderColor,
                    },
                  ]}
                >
                  <View style={styles.alertContent}>
                    <Text style={[styles.alertMessage, { color: config.color }]}>
                      Mesa {alert.tableId}: {alert.message}
                    </Text>
                    <Text style={styles.alertTime}>
                      {getTimeAgo(alert.timestamp)}
                    </Text>
                  </View>
                  <Button
                    title="Resolver"
                    onPress={() => resolveAlert(alert.id)}
                    variant="ghost"
                    size="sm"
                  />
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );

  if (currentView === 'menu') {
    let currentDiners;
    if (selectedTableForMenu) {
      const currentTable = tables.find(t => t.id === selectedTableForMenu);
      if (currentTable && currentTable.capacity) {
        currentDiners = currentTable.capacity;
      } else {
        currentDiners = 2;
      }
    }
    
    return (
      <MenuView
        tableId={selectedTableForMenu || 0}
        diners={currentDiners || 2}
        isModifying={isModifyingOrder}
        currentOrder={selectedTableForMenu ? (tableOrders[selectedTableForMenu] || []) : []}
        loadingCurrentOrder={loadingCurrentOrder}
        onBack={() => {
          setCurrentView('tables');
          setSelectedTableForMenu(null);
          setIsModifyingOrder(false);
        }}
        onConfirmOrder={handleConfirmOrder}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>TableTogether - Gestión de Mesas</Text>
          {user && (
            <Text style={styles.userInfo}>
              {user.fullName} • {user.role}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {user && (
            <>
              <Button
                title="Actualizar"
                onPress={handleRefresh}
                variant="outline"
                size="sm"
                style={styles.refreshButton}
                icon={<Ionicons name="refresh" size={16} color="#10b981" />}
              />
              <Button
                title="Cerrar Sesión"
                onPress={logout}
                variant="outline"
                size="sm"
                style={styles.logoutButton}
              />
            </>
          )}
        </View>
      </View>

      {/* Indicador de carga */}
      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando mesas...</Text>
        </View>
      )}

      {/* Manejo de errores */}
      {error && (
        <View style={styles.errorContainer}>
          <UIAlert>
            <AlertDescription>{error}</AlertDescription>
          </UIAlert>
          <Button
            title="Reintentar"
            onPress={refreshTables}
            style={styles.retryButton}
          />
        </View>
      )}

      <View style={styles.mainContent}>
        {/* Panel izquierdo con alertas y filtros */}
        <View style={styles.leftPanel}>
          {renderStatusSummary()}
          {renderAlerts()}
        </View>

        {/* Panel derecho con el mapa de mesas */}
        <View style={styles.rightPanel}>
          <FlatList
            data={filteredTables}
            renderItem={renderTableCard}
            keyExtractor={(item) => item.id.toString()}
            numColumns={isTablet ? 4 : 2}
            contentContainerStyle={styles.tablesGrid}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            style={styles.tablesList}
            columnWrapperStyle={styles.tableRow}
            horizontal={false}
            key={isTablet ? 'tablet' : 'mobile'}
          />
        </View>
      </View>

      {/* Modal de detalles de mesa */}
      <Modal
        visible={showTableModal}
        onClose={() => setShowTableModal(false)}
        title={selectedTable ? `Mesa ${selectedTable.id}` : undefined}
      >
        {selectedTable && (
          <View style={styles.modalContent}>
            <View style={styles.tableInfo}>
              {selectedTable.status === "occupied" && selectedTable.capacity && (
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Capacidad:</Text> {selectedTable.capacity} personas
                </Text>
              )}
              <Text style={styles.infoText}>
                <Text style={styles.infoLabel}>Estado:</Text> {statusConfig[selectedTable.status].label}
              </Text>
              {selectedTable.waiter && (
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Camarero:</Text> {selectedTable.waiter}
                </Text>
              )}
              {selectedTable.orderTotal && (
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Total cuenta:</Text> €{selectedTable.orderTotal}
                </Text>
              )}
            </View>

            {/* Alertas de la mesa */}
            {activeAlerts.filter((alert) => alert.tableId === selectedTable.id).length > 0 && (
              <View style={styles.tableAlerts}>
                <Text style={styles.alertsSubtitle}>Alertas activas:</Text>
                {activeAlerts
                  .filter((alert) => alert.tableId === selectedTable.id)
                  .map((alert) => {
                    const config = alertConfig[alert.type];
                    return (
                      <View
                        key={alert.id}
                        style={[
                          styles.tableAlert,
                          {
                            backgroundColor: config.bgColor,
                            borderColor: config.borderColor,
                          },
                        ]}
                      >
                        <View style={styles.tableAlertContent}>
                          <Text style={[styles.alertMessage, { color: config.color }]}>
                            {alert.message}
                          </Text>
                          <Button
                            title="Resolver"
                            onPress={() => resolveAlert(alert.id)}
                            variant="ghost"
                            size="sm"
                          />
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}

            {/* Acciones disponibles */}
            <View style={styles.actions}>
              <Text style={styles.actionsTitle}>Acciones disponibles:</Text>
              
              {selectedTable.status === "available" && (
                <Button
                  title="Asignar mesa"
                  onPress={() => {
                    setShowTableModal(false);
                    setShowAssignModal(true);
                  }}
                  icon={<Ionicons name="people" size={16} color="#ffffff" />}
                  style={styles.actionButton}
                />
              )}

              {selectedTable.status === "occupied" && (
                <View style={styles.occupiedActions}>
                  <Button
                    title="Realizar pedido"
                    onPress={() => {
                      setShowTableModal(false);
                      handleNewOrder(selectedTable.id);
                    }}
                    variant="outline"
                    icon={<Ionicons name="add" size={16} color="#374151" />}
                    style={styles.actionButton}
                  />
                  <Button
                    title="Modificar pedido"
                    onPress={() => {
                      setShowTableModal(false);
                      handleModifyOrder(selectedTable.id);
                    }}
                    variant="outline"
                    icon={<Ionicons name="create" size={16} color="#374151" />}
                    style={styles.actionButton}
                  />
                  <Button
                    title="Procesar pago"
                    onPress={() => {
                      handlePaymentRequest(selectedTable);
                    }}
                    variant="outline"
                    icon={<Ionicons name="card" size={16} color="#374151" />}
                    style={styles.actionButton}
                  />
                </View>
              )}

              {selectedTable.status === "reserved" && (
                <Button
                  title="Confirmar llegada"
                  onPress={() => {
                    setShowTableModal(false);
                    updateTableStatus(selectedTable.id, "occupied");
                  }}
                  icon={<Ionicons name="checkmark-circle" size={16} color="#ffffff" />}
                  style={styles.actionButton}
                />
              )}
            </View>
          </View>
        )}
      </Modal>

      {/* Modal de asignación de mesa */}
      <Modal
        visible={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Asignar Mesa"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalSubtitle}>
            Selecciona el número de comensales:
          </Text>

          <View style={styles.dinersSelector}>
            {[2, 4, 6, 8].map((diners) => (
              <Button
                key={diners}
                title={`${diners} personas`}
                onPress={() => handleDinerSelection(diners)}
                variant={selectedDiners === diners ? "default" : "outline"}
                style={styles.dinerButton}
              />
            ))}
          </View>

          <View style={styles.manualInputSection}>
            <TextInput
              style={styles.manualInput}
              placeholder="Indique cantidad de comensales"
              value={manualDiners}
              onChangeText={setManualDiners}
              keyboardType="numeric"
            />
          </View>

          {validationError && (
            <UIAlert style={styles.validationErrorAlert}>
              <AlertDescription>{validationError}</AlertDescription>
            </UIAlert>
          )}

          <View style={styles.confirmSection}>
            <Button
              title="Confirmar Asignación"
              onPress={() => {
                if (selectedTable) {
                  handleAssignTable(selectedTable.id, selectedDiners);
                }
              }}
              style={styles.confirmButton}
            />
          </View>
        </View>
      </Modal>

      {/* Modal de pago */}
      <Modal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Procesar Pago"
      >
        <View style={styles.modalContent}>
          {selectedTable && (
            <>
              <Text style={styles.modalTitle}>Mesa {selectedTable.number}</Text>
              <Text style={styles.modalSubtitle}>
                Total: €{selectedTable.orderTotal?.toFixed(2) || '0.00'}
              </Text>
              {selectedTable.paidAmount && selectedTable.paidAmount > 0 && (
                <Text style={styles.modalSubtitle}>
                  Pagado: €{selectedTable.paidAmount.toFixed(2)}
                </Text>
              )}

              <View style={styles.paymentOptions}>
                <Text style={styles.paymentOptionsTitle}>Opciones de pago:</Text>
                
                <Button
                  title="Pago completo"
                  onPress={handleFullPayment}
                  style={styles.fullPaymentButton}
                />

                <View style={styles.partialPaymentSection}>
                  <Text style={styles.partialPaymentLabel}>Pago parcial:</Text>
                  <TextInput
                    style={styles.paymentInput}
                    placeholder="Monto a pagar"
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    keyboardType="numeric"
                  />
                  <Button
                    title="Procesar pago parcial"
                    onPress={handlePartialPayment}
                    variant="outline"
                    style={styles.paymentButton}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 24 : 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  userInfo: {
    fontSize: isTablet ? 14 : 12,
    color: '#6b7280',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: isTablet ? 18 : 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  errorContainer: {
    padding: 20,
    gap: 12,
  },
  retryButton: {
    alignSelf: 'center',
    marginTop: 8,
  },
  mainContent: {
    flex: 1,
    flexDirection: isTablet ? 'row' : 'column',
  },
  leftPanel: {
    width: isTablet ? 300 : '100%',
    backgroundColor: '#ffffff',
    borderRightWidth: isTablet ? 1 : 0,
    borderBottomWidth: isTablet ? 0 : 1,
    borderColor: '#e5e7eb',
    padding: isTablet ? 16 : 12,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  statusSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statusCard: {
    flex: 1,
    minWidth: isTablet ? 80 : 70,
  },
  statusCardInner: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  statusContent: {
    padding: 8,
    alignItems: 'center',
  },
  statusCount: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  statusLabel: {
    fontSize: isTablet ? 12 : 10,
    color: '#6b7280',
    marginTop: 2,
  },
  alertsSection: {
    marginTop: 16,
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertsTitle: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#374151',
  },
  alertsToggle: {
    padding: 4,
  },
  alertsList: {
    maxHeight: isTablet ? 300 : 200,
  },
  noAlertsText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: isTablet ? 14 : 12,
    paddingVertical: 20,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '500',
    marginBottom: 4,
    flex: 1,
    marginRight: 8,
  },
  alertTime: {
    fontSize: isTablet ? 12 : 10,
    color: '#6b7280',
  },
  tablesList: {
    flex: 1,
  },
  tablesGrid: {
    padding: isTablet ? 16 : 12,
  },
  tableRow: {
    justifyContent: 'space-between',
    marginBottom: 8,
    width: '100%',
    paddingHorizontal: 8,
  },
  tableCard: {
    flex: 1,
    margin: 4,
    height: isTablet ? 100 : 80,
  },
  tableCardInner: {
    borderRadius: 12,
    overflow: 'hidden',
    height: '100%',
  },
  tableCardWithAlert: {
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  tableContent: {
    padding: isTablet ? 16 : 12,
    height: '100%',
    justifyContent: 'space-between',
  },
  tableHeader: {
    alignItems: 'center',
    marginBottom: 4,
  },
  tableNumber: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: 'bold',
  },
  tableStatus: {
    fontSize: isTablet ? 12 : 10,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    fontSize: isTablet ? 10 : 8,
  },
  tableInfo: {
    marginBottom: 4,
    flex: 1,
    justifyContent: 'center',
  },
  tableInfoText: {
    fontSize: isTablet ? 12 : 10,
    marginBottom: 2,
    textAlign: 'center',
  },
  orderTotal: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  paidAmount: {
    color: '#10b981',
    fontSize: isTablet ? 12 : 10,
  },
  alertCount: {
    fontSize: isTablet ? 10 : 8,
    color: '#ef4444',
    fontWeight: 'bold',
    marginLeft: 2,
  },
  modalContent: {
    gap: 16,
  },
  infoText: {
    fontSize: isTablet ? 16 : 14,
    color: '#374151',
  },
  infoLabel: {
    fontWeight: '600',
  },
  tableAlerts: {
    gap: 8,
  },
  alertsSubtitle: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  tableAlert: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  tableAlertContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  actions: {
    gap: 12,
  },
  actionsTitle: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  actionButton: {
    marginBottom: 4,
  },
  occupiedActions: {
    gap: 8,
  },
  modalSubtitle: {
    fontSize: isTablet ? 16 : 14,
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  manualInputSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  manualInput: {
    fontSize: isTablet ? 16 : 14,
    color: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    width: '80%',
    textAlign: 'center',
  },
  dinersSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },
  dinerButton: {
    minWidth: isTablet ? 100 : 80,
  },
  confirmSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  confirmButton: {
    width: '60%',
    alignSelf: 'center',
  },
  selectedStatusCard: {
    borderColor: '#3b82f6',
    borderWidth: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectedStatusCardInner: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
  },
  selectedStatusText: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  validationErrorAlert: {
    marginTop: 12,
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
    borderWidth: 1,
  },
  paymentModalContent: {
    gap: 16,
  },
  paymentInfo: {
    gap: 4,
  },
  paymentInfoText: {
    fontSize: isTablet ? 16 : 14,
    color: '#374151',
  },
  paymentLabel: {
    fontWeight: '600',
  },
  paymentOptions: {
    gap: 12,
  },
  paymentOptionsTitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  paymentButton: {
    marginBottom: 4,
  },
  fullPaymentButton: {
    paddingVertical: 12,
    minHeight: 48,
    width: '70%',
    alignSelf: 'center',
  },
  partialPaymentSection: {
    gap: 8,
    alignItems: 'center',
  },
  partialPaymentLabel: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  paymentInput: {
    fontSize: isTablet ? 16 : 14,
    color: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    width: '60%',
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  refreshButton: {
    marginRight: 8,
  },
  logoutButton: {
    marginLeft: 8,
  },
  alertIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#ef4444',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
  },
}); 