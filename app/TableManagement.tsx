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
import { socketService } from '../services/socketService';

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

  const [tableOrders, setTableOrders] = useState<Record<number, any[]>>({});
  const [tableDiners, setTableDiners] = useState<Record<number, number>>({});
  const [currentOrderData, setCurrentOrderData] = useState<TableOrdersResponse | null>(null);
  const [loadingCurrentOrder, setLoadingCurrentOrder] = useState(false);
  const [animatingTables, setAnimatingTables] = useState<Set<string>>(new Set());
  const [showPartialPaymentInput, setShowPartialPaymentInput] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeUpdate, setTimeUpdate] = useState(0);

 



  // Convertir datos reales del backend al formato de la aplicación
  useEffect(() => {
    if (realTables.length > 0) {
      
      const convertedTables: Table[] = realTables.map((realTable: RealTableStatus) => {
        const convertedTable = {
          id: realTable.number, // Mantener el número para la UI
          number: realTable.number,
          status: realTable.status,
          capacity: realTable.capacity,
          occupiedTime: realTable.createdAt,
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
        

     
        
        return convertedTable;
      });
      
      setTables(convertedTables);
    }
  }, [realTables, user]);

  // Actualizar tiempo cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUpdate(prev => prev + 1);
    }, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, []);

  // Configurar socket y listeners
  useEffect(() => {
    // Conectar socket
    socketService.connect();
    
    // Configurar listener para actualizar cuando se modifica un pedido
    socketService.onOrderModified(() => {
      refreshTables();
      
      // Si estamos en la vista de modificar pedido, recargar el pedido actual
      if (selectedTableForMenu) {
        loadCurrentOrder(selectedTableForMenu);
      }
    });
    
    // Cargar alertas existentes al iniciar (excluyendo 'new-order')
    const existingAlerts = alertsService.getActiveAlerts();
    if (existingAlerts.length > 0) {
      const mappedAlerts = existingAlerts
        .filter(alert => alert.alertType !== 'new-order' && alert.alertType !== 'table-occupied') // Excluir alertas de actualización
        .map(alert => ({
          id: alert.alertId,
          tableId: alert.tableNumber,
          type: alert.alertType as AlertType, // Cast para excluir 'new-order'
          message: alert.message,
          timestamp: alert.timestamp,
          priority: alert.priority,
          resolved: alert.resolved
        }));
      setAlerts(mappedAlerts);
    }
    
    const handleNewAlert = (alert: any) => {
      // Manejo especial para alertas de nuevo pedido
      if (alert.alertType === 'new-order') {
     
        // Actualizar automáticamente la información de la mesa
        handleTableOrderUpdate({
          tableNumber: alert.tableNumber,
          orderId: alert.orderId,
          total: alert.total,
          message: alert.message
        });
        
        // NO agregar como alerta que requiera atención
        return;
      }
      
      // Para otros tipos de alerta, agregar normalmente (excluyendo 'new-order' y 'table-occupied')
      if (alert.alertType !== 'new-order' && alert.alertType !== 'table-occupied') {
        const newAlert = {
          id: alert.alertId,
          tableId: alert.tableNumber,
          type: alert.alertType as AlertType, // Cast para excluir 'new-order'
          message: alert.message,
          timestamp: new Date(alert.timestamp),
          priority: alert.priority,
          resolved: alert.resolved
        };
        
        setAlerts(prev => {
          const updated = [...prev, newAlert];
          return updated;
        });
      }
    };

    const handleAlertResolved = (data: any) => {
      const { alertId } = data;
      
      // Marcar la alerta como resuelta
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true } : alert
      ));
    };

  

    
    // Agregar event listeners usando el servicio de alertas
    alertsService.addEventListener('new-table-alert', handleNewAlert);
    alertsService.addEventListener('alert-resolved', handleAlertResolved);
    alertsService.addEventListener('table-order-updated', handleTableOrderUpdate);
    alertsService.addEventListener('table-status-updated', handleTableStatusUpdate);

    // Cleanup
    return () => {
      alertsService.removeEventListener('new-table-alert', handleNewAlert);
      alertsService.removeEventListener('alert-resolved', handleAlertResolved);
      alertsService.removeEventListener('table-order-updated', handleTableOrderUpdate);
      alertsService.removeEventListener('table-status-updated', handleTableStatusUpdate);
      socketService.disconnect();
    };
  }, []);





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
      const paymentResult = await paymentService.processTablePayment(realTable.id, amount, 'card');
      
      console.log(`✅ Resultado del pago:`, paymentResult);

      // Actualizar inmediatamente el estado local con la información del pago
      if (paymentResult.success) {
        setTables(prev => prev.map(table => {
          if (table.number === tableId) {
            return {
              ...table,
              paidAmount: paymentResult.newPaidAmount || 0
            };
          }
          return table;
        }));

        // También actualizar selectedTable si está abierto el modal
        if (selectedTable && selectedTable.number === tableId) {
          setSelectedTable(prev => prev ? {
            ...prev,
            paidAmount: paymentResult.newPaidAmount || 0
          } : null);
        }
      }

      // Refrescar los datos del backend para asegurar sincronización
      await refreshTables();

      // Mostrar confirmación al usuario
      Alert.alert(
        "Pago Exitoso",
        `Se procesó el pago de $${amount.toFixed(2)}.\n${paymentResult.message}`,
        [{ text: "OK" }]
      );

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

  // Función para manejar actualizaciones de pedidos de mesa
  const handleTableOrderUpdate = async (data: { tableNumber: number; orderId: string; total: number; message: string }) => {
    const { tableNumber, orderId, total } = data;
    console.log(`🔄 Nuevo pedido recibido para mesa ${tableNumber}:`, {
      orderId,
      total
    });

    try {
      // Animar la mesa para indicar que se actualizó
      setAnimatingTables(prev => new Set([...prev, tableNumber.toString()]));
      
      // Remover la animación después de 2 segundos
      setTimeout(() => {
        setAnimatingTables(prev => {
          const newSet = new Set(prev);
          newSet.delete(tableNumber.toString());
          return newSet;
        });
      }, 2000);

      // Refrescar datos del backend para obtener información actualizada
      setTimeout(async () => {
        try {
          await refreshTables();
        } catch (error) {
          console.error('Error refrescando datos del backend:', error);
        }
      }, 500);

    } catch (error) {
      console.error(`Error procesando actualización de mesa ${tableNumber}:`, error);
    }
  };

  // Función para manejar actualizaciones de estado de mesa
  const handleTableStatusUpdate = async (data: { tableNumber: number; userName: string; message: string }) => {
    const { tableNumber, userName } = data;

    try {
      // Animar la mesa para indicar que se actualizó
      setAnimatingTables(prev => new Set([...prev, tableNumber.toString()]));
      
      // Remover la animación después de 2 segundos
      setTimeout(() => {
        setAnimatingTables(prev => {
          const newSet = new Set(prev);
          newSet.delete(tableNumber.toString());
          return newSet;
        });
      }, 2000);

      // Refrescar datos del backend para obtener información actualizada
      setTimeout(async () => {
        try {
          console.log(`🔄 Refrescando datos del backend para mesa ${tableNumber}`);
          await refreshTables();
        } catch (error) {
          console.error('Error refrescando datos del backend:', error);
        }
      }, 500);

    } catch (error) {
      console.error(`Error procesando actualización de estado de mesa ${tableNumber}:`, error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      console.log(`🔄 Resolviendo alerta: ${alertId}`);
      await alertsService.resolveAlert(alertId);
      
      // Recargar alertas activas después de resolver
      const updatedAlerts = alertsService.getActiveAlerts();
      const mappedAlerts = updatedAlerts
        .filter(alert => alert.alertType !== 'new-order' && alert.alertType !== 'table-occupied') // Excluir alertas de actualización
        .map(alert => ({
          id: alert.alertId,
          tableId: alert.tableNumber,
          type: alert.alertType as AlertType, // Cast para excluir 'new-order'
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

  const getTimeAgo = (timestamp: Date | undefined) => {
    if (!timestamp || !(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
      return 'Reciente';
    }
    
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

  const getSessionTime = (timeOccupied?: string) => {
    // El backend ya calcula timeOccupied correctamente usando started_at
    // Solo necesitamos retornarlo tal como viene
    return timeOccupied || null;
  };

  // Función que incluye timeUpdate para forzar la actualización
  const getSessionTimeWithUpdate = (timeOccupied?: string) => {
    // Usar timeUpdate para forzar la recalculación
    timeUpdate; // Esto fuerza la recalculación cuando cambia
    return getSessionTime(timeOccupied);
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

    } catch (error) {
      console.error('Error assigning table:', error);
      // Mostrar error al usuario si es necesario
    }
  };



  const handleModifyOrder = (tableId: number) => {
    setSelectedTableForMenu(tableId);
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
                id: `${product.product.name}-${group.status}`, // ID único con estado
                name: product.product.name,
                price: variation.unitPrice,
                quantity: detail.quantity,
                description: product.product.name,
                image_url: product.product.image_url,
                status: group.status, // Agregar el estado del pedido
                orderId: detail.orderId, // ID de la orden
                itemId: detail.itemId // ID del item específico
              }))
            )
          )
        );
      }
      
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
    setSelectedTable(table);
    setShowTableModal(false);
    setShowPaymentModal(true);
  };

  const handlePartialPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setValidationError('Por favor ingrese un monto válido');
      return;
    }

    // Encontrar la mesa en los datos reales del backend
    const realTable = realTables.find(t => t.number === selectedTable?.number);
    if (!realTable) {
      setValidationError('No se pudo identificar la mesa');
      return;
    }

    // Validar contra el total real del backend
    const remainingAmount = (realTable.orderTotal || 0) - (realTable.paidAmount || 0);
    if (amount > remainingAmount) {
      setValidationError(`El monto no puede ser mayor a $${remainingAmount.toFixed(2)} (restante)`);
      return;
    }

    processPayment(selectedTable!.id, amount, false);
  };

  const handleFullPayment = async () => {
    if (selectedTable) {
      try {
        // Encontrar la mesa en los datos reales del backend
        const realTable = realTables.find(t => t.number === selectedTable.number);
        if (!realTable) {
          console.error('Table not found in backend data');
          return;
        }

        // Calcular el monto restante usando los datos reales del backend
        const remainingAmount = (realTable.orderTotal || 0) - (realTable.paidAmount || 0);
        
        console.log(`💰 Calculando pago completo:`, {
          orderTotal: realTable.orderTotal,
          paidAmount: realTable.paidAmount,
          remainingAmount
        });

        if (remainingAmount <= 0) {
          Alert.alert('Información', 'La cuenta ya está pagada completamente');
          return;
        }

        processPayment(selectedTable.id, remainingAmount, true);
      } catch (error) {
        console.error('Error calculating full payment:', error);
        Alert.alert('Error', 'No se pudo calcular el monto del pago');
      }
    }
  };

  const handleConfirmOrder = async (items: any[]) => {
    if (selectedTableForMenu) {
      try {
        const currentTable = tables.find(t => t.id === selectedTableForMenu);
        if (!currentTable?.realId) {
          Alert.alert('Error', 'No se pudo identificar la mesa');
          return;
        }

        // Obtener los productos que están en el pedido actual
        const currentOrderItems = tableOrders[selectedTableForMenu] || [];
        
        // Filtrar solo los productos que están en estado 'pending' (nuevos)
        const newItems = items.filter(item => 
          !currentOrderItems.some(currentItem => 
            currentItem.id === item.id && currentItem.status === 'pending'
          )
        );

        // Enviar todos los productos nuevos en una sola orden al backend
        if (newItems.length > 0) {
          try {
            // Crear las modificaciones para todos los productos
            const modifications = newItems.map(item => ({
              action: 'add' as const,
              productId: String(item.id),
              quantity: item.quantity,
              customizations: Array.isArray(item.customizations) 
                ? item.customizations.map((c: any) => typeof c === 'string' ? c : String(c))
                : (item.customizations ? [String(item.customizations)] : [])
            }));

            // Enviar todos los productos en una sola llamada
            await orderService.modifyOrder(currentTable.realId, {
              orderId: '', // Para 'add' se creará una nueva orden
              modifications: modifications
            });

            Alert.alert('Éxito', `${newItems.length} producto(s) agregado(s) al pedido`);
          } catch (error: any) {
            console.error('Error agregando productos:', error);
            Alert.alert('Error', `No se pudieron agregar los productos: ${error.message}`);
            return;
          }
        }

        setTableOrders(prev => ({
          ...prev,
          [selectedTableForMenu]: items
        }));

        // Recargar el pedido actual después de confirmar para obtener el total real del backend
        await loadCurrentOrder(selectedTableForMenu);
        
        // Actualizar el total de la mesa con los datos reales del backend
        setTimeout(async () => {
          await refreshTables();
        }, 500);

        setCurrentView('tables');
        setSelectedTableForMenu(null);
        
      } catch (error: any) {
        console.error('Error confirmando pedido:', error);
        Alert.alert('Error', 'No se pudo confirmar el pedido');
      }
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

  const formatCurrency = (amount: number): string => {
    return Number(amount).toFixed(2);
  };

  const renderTableCard = ({ item: table }: { item: Table }) => {
    const config = statusConfig[table.status];
    const hasAlert = activeAlerts.some(alert => alert.tableId === table.id);
    const order = tableOrders[table.id] || [];
    const isAnimating = animatingTables.has(table.id.toString());


    return (
      <TouchableOpacity
        key={table.id}
        style={styles.tableCard}
        onPress={() => handleTablePress(table)}
      >
        <Card style={StyleSheet.flatten([
          styles.tableCardInner,
          { backgroundColor: config.color },
          hasAlert && styles.tableCardWithAlert,
          isAnimating && styles.tableCardAnimating
        ])}>
          <CardContent style={styles.tableContent}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableNumber, { color: config.textColor }]}>
                Mesa {table.number}
              </Text>
            </View>

            <View style={styles.tableInfo}>
              {table.timeOccupied && table.sessionId ? (
                <Text style={[styles.tableInfoText, { color: config.textColor }]}>
                  Tiempo: {getSessionTimeWithUpdate(table.timeOccupied)}
                </Text>
              ) : null}
              
              {/* Solo mostrar el total si hay una sesión activa */}
              {table.sessionId && (
                <View style={styles.tableTotalInfo}>
                  <Text style={[styles.orderTotal, { color: config.textColor }]}>
                    ${formatCurrency(table.orderTotal || 0)}
                  </Text>
                  {table.paidAmount && table.paidAmount > 0 && (
                    <Text style={[styles.paidAmount, { color: config.textColor }]}>
                      Pagado: ${formatCurrency(table.paidAmount)}
                    </Text>
                  )}
                </View>
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
        <ScrollView 
          style={styles.alertsList} 
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
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
    
    const currentTable = tables.find(t => t.id === selectedTableForMenu);
    
    return (
      <MenuView
        tableId={selectedTableForMenu || 0}
        diners={currentDiners || 2}
        currentOrder={selectedTableForMenu ? (tableOrders[selectedTableForMenu] || []) : []}
        loadingCurrentOrder={loadingCurrentOrder}
        tableRealId={currentTable?.realId}
        onBack={() => {
          setCurrentView('tables');
          setSelectedTableForMenu(null);
        }}
        onConfirmOrder={handleConfirmOrder}
        onRefresh={refreshTables}
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
          <Button
            title="🔄 Actualizar"
            onPress={refreshTables}
            variant="outline"
            size="sm"
            style={styles.refreshButton}
          />
          {user && (
              <Button
                title="Cerrar Sesión"
                onPress={logout}
                variant="outline"
                size="sm"
                style={styles.logoutButton}
              />
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
                  <Text style={styles.infoLabel}>Total cuenta:</Text> ${selectedTable.orderTotal}
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
                            onPress={() => {
                              console.log('🔘 Botón resolver presionado para alerta:', alert.id);
                              resolveAlert(alert.id);
                            }}
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
        onClose={() => {
          setShowPaymentModal(false);
          setShowPartialPaymentInput(false);
          setPaymentAmount('');
        }}
        title="Procesar Pago"
      >
        <View style={styles.paymentModalContent}>
          {selectedTable && (
            <>
              <View style={styles.paymentInfo}>
                <Text style={styles.modalTitle}>Mesa {selectedTable.number}</Text>
                
                {/* Información del total */}
                <Text style={styles.paymentInfoText}>
                  <Text style={styles.paymentLabel}>Total de la cuenta:</Text> ${formatCurrency(selectedTable.orderTotal || 0)}
                </Text>
                
                {/* Mostrar información de pagos previos solo si hay pagos */}
                {selectedTable.paidAmount && selectedTable.paidAmount > 0 && (
                  <>
                    <Text style={styles.paymentInfoText}>
                      <Text style={styles.paymentLabel}>Ya pagado:</Text> ${formatCurrency(selectedTable.paidAmount)}
                    </Text>
                    <Text style={[styles.paymentInfoText, styles.remainingAmount]}>
                      <Text style={styles.paymentLabel}>Falta pagar:</Text> ${formatCurrency((selectedTable.orderTotal || 0) - selectedTable.paidAmount)}
                    </Text>
                  </>
                )}
              </View>

              <View style={styles.paymentOptions}>
                <Text style={styles.paymentOptionsTitle}>Selecciona el tipo de pago:</Text>
                
                <TouchableOpacity
                  style={styles.fullPaymentButton}
                  onPress={handleFullPayment}
                >
                  <Ionicons name="card" size={20} color="#ffffff" style={styles.buttonIcon} />
                  <Text style={styles.paymentButtonText}>Pago Completo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.partialPaymentButton}
                  onPress={() => setShowPartialPaymentInput(true)}
                >
                  <Ionicons name="calculator" size={20} color="#3b82f6" style={styles.buttonIcon} />
                  <Text style={styles.partialPaymentButtonText}>Pago Parcial</Text>
                </TouchableOpacity>
              </View>

              {showPartialPaymentInput && (
                <View style={styles.partialPaymentSection}>
                  <Text style={styles.partialPaymentLabel}>Ingresa el monto a pagar:</Text>
                  <TextInput
                    style={styles.paymentInput}
                    placeholder="0.00"
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={styles.payButton}
                    onPress={handlePartialPayment}
                  >
                    <Text style={styles.payButtonText}>Confirmar Pago</Text>
                  </TouchableOpacity>
                </View>
              )}
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
    paddingBottom: isTablet ? 32 : 24,
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
    maxHeight: isTablet ? screenHeight * 0.85 : screenHeight * 0.8,
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
    height: isTablet ? 120 : 100,
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
  tableCardAnimating: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  tableContent: {
    padding: isTablet ? 16 : 12,
    height: '100%',
    justifyContent: 'space-between',
    paddingVertical: isTablet ? 12 : 8,
  },
  tableHeader: {
    alignItems: 'center',
    marginBottom: 8,
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
    gap: 6,
  },
  tableInfoText: {
    fontSize: isTablet ? 12 : 10,
    marginBottom: 2,
    textAlign: 'center',
    lineHeight: 16,
  },
  orderTotal: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  tableTotalInfo: {
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
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
    gap: 20,
    paddingHorizontal: 8,
  },
  paymentInfo: {
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentInfoText: {
    fontSize: isTablet ? 16 : 14,
    color: '#374151',
  },
  paymentLabel: {
    fontWeight: '600',
  },
  remainingAmount: {
    color: '#dc2626',
    fontWeight: '600',
  },
  paymentOptions: {
    gap: 16,
    alignItems: 'center',
  },
  paymentOptionsTitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },

  fullPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    minHeight: 52,
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  partialPaymentSection: {
    gap: 12,
    alignItems: 'center',
    marginTop: 8,
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
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    width: '100%',
    textAlign: 'center',
    minHeight: 48,
  },
  modalTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  logoutButton: {
    marginLeft: 8,
  },
  refreshButton: {
    marginRight: 8,
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

  paymentButtonText: {
    color: '#ffffff',
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  partialPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    minHeight: 52,
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  partialPaymentButtonText: {
    color: '#3b82f6',
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  payButton: {
    width: '100%',
    paddingVertical: 14,
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    borderWidth: 1,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
  },
}); 