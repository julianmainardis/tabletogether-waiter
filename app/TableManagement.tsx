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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Modal } from '../components/ui/Modal';
import { MenuView } from '../components/MenuView';
import { Table, TableStatus, TableAlert, AlertType } from '../types/table';
import { initialTables, createInitialAlerts, statusConfig, alertConfig } from '../data/mockData';
import { useWaiterAuth } from '../contexts/WaiterAuthContext';

type ViewType = 'tables' | 'menu' | 'order-summary';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function TableManagement() {
  const { user, logout } = useWaiterAuth();
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [alerts, setAlerts] = useState<TableAlert[]>(() => createInitialAlerts(initialTables));
  const [showAlerts, setShowAlerts] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TableStatus | "all">("all");
  const [showTableModal, setShowTableModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedDiners, setSelectedDiners] = useState(2);
  const [manualDiners, setManualDiners] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [currentView, setCurrentView] = useState<ViewType>('tables');
  const [selectedTableForMenu, setSelectedTableForMenu] = useState<number | null>(null);
  const [isModifyingOrder, setIsModifyingOrder] = useState(false);
  const [tableOrders, setTableOrders] = useState<Record<number, any[]>>(() => {
    // Generar pedidos de ejemplo para TODAS las mesas ocupadas que tienen orderTotal
    const occupiedTablesWithTotal = initialTables.filter(t => t.status === 'occupied' && t.orderTotal);
    const initialOrders: Record<number, any[]> = {};
    
    // Productos de ejemplo
    const sampleItems = [
      { id: '1', name: 'Jamón Ibérico', price: 18.50 },
      { id: '2', name: 'Paella Valenciana', price: 22.00 },
      { id: '3', name: 'Ensalada César', price: 12.50 },
      { id: '4', name: 'Solomillo a la parrilla', price: 28.00 },
      { id: '5', name: 'Tiramisú', price: 8.50 },
      { id: '6', name: 'Gazpacho', price: 9.00 },
      { id: '7', name: 'Pulpo a la gallega', price: 16.00 },
      { id: '8', name: 'Tarta de queso', price: 7.50 }
    ];
    
    // Generar pedidos para cada mesa ocupada
    occupiedTablesWithTotal.forEach((table, index) => {
      const targetTotal = table.orderTotal!;
      const order: any[] = [];
      let currentTotal = 0;
      
      // Seleccionar productos aleatoriamente hasta acercarse al total
      const availableItems = [...sampleItems];
      const maxItems = Math.min(4, Math.floor(Math.random() * 3) + 2); // Entre 2 y 4 productos
      
      for (let i = 0; i < maxItems && currentTotal < targetTotal * 0.8; i++) {
        const randomIndex = Math.floor(Math.random() * availableItems.length);
        const item = availableItems[randomIndex];
        const maxQuantity = Math.floor((targetTotal - currentTotal) / item.price);
        const quantity = Math.max(1, Math.min(3, maxQuantity));
        
        if (quantity > 0) {
          order.push({ ...item, quantity });
          currentTotal += item.price * quantity;
        }
        
        availableItems.splice(randomIndex, 1); // No repetir el mismo producto
      }
      
      // Si no llegamos al total, ajustar la cantidad del último producto
      if (order.length > 0 && currentTotal < targetTotal) {
        const lastItem = order[order.length - 1];
        const difference = targetTotal - currentTotal;
        const additionalQuantity = Math.floor(difference / lastItem.price);
        if (additionalQuantity > 0) {
          lastItem.quantity += additionalQuantity;
        }
      }
      
      initialOrders[table.id] = order;
    });
    
    return initialOrders;
  });
  const [tableDiners, setTableDiners] = useState<Record<number, number>>(() => {
    // Generar cantidad de comensales para TODAS las mesas ocupadas
    const occupiedTables = initialTables.filter(t => t.status === 'occupied');
    const initialDiners: Record<number, number> = {};
    
    occupiedTables.forEach(table => {
      // Generar cantidad realista pero no siempre la capacidad máxima
      // Entre 1 y la capacidad de la mesa, con tendencia hacia valores medios
      const minDiners = 1;
      const maxDiners = table.capacity;
      
      let diners;
      if (maxDiners <= 2) {
        diners = maxDiners; // Mesas pequeñas generalmente llenas
      } else if (maxDiners <= 4) {
        // Mesas de 4: entre 2-4, más probabilidad de 2-3
        diners = Math.random() < 0.7 ? 
                 Math.floor(Math.random() * 2) + 2 : // 2-3
                 maxDiners; // 4
      } else {
        // Mesas grandes: entre 2 y capacidad, más probabilidad de valores medios
        const midPoint = Math.ceil(maxDiners * 0.6);
        diners = Math.floor(Math.random() * (maxDiners - minDiners + 1)) + minDiners;
        // Sesgar hacia valores medios
        if (Math.random() < 0.6) {
          diners = Math.min(midPoint, diners);
        }
      }
      
      initialDiners[table.id] = diners;
    });
    
    return initialDiners;
  });

  // Sincronizar una sola vez al inicio los totales con pedidos existentes
  useEffect(() => {
    const occupiedTablesWithOrders = Object.keys(tableOrders);
    if (occupiedTablesWithOrders.length > 0) {
      setTables(prevTables => 
        prevTables.map(table => {
          const order = tableOrders[table.id];
          if (order && order.length > 0) {
            // Calcular el total exacto basado en los productos del pedido
            const calculatedTotal = order.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            return {
              ...table,
              orderTotal: Math.round(calculatedTotal * 100) / 100 // Redondear a 2 decimales
            };
          }
          return table;
        })
      );
    }
  }, []); // Solo ejecutar una vez al inicio

  const updateTableStatus = (tableId: number, newStatus: TableStatus) => {
    // Obtener la mesa antes de actualizar el estado
    const currentTable = tables.find(t => t.id === tableId);
    
    setTables((prev) =>
      prev.map((table) => {
        if (table.id === tableId) {
          if (newStatus === "available") {
            return {
              ...table,
              status: newStatus,
              timeOccupied: undefined,
              waiter: undefined,
              orderTotal: undefined,
              paidAmount: undefined,
              hasPartialPayment: false,
            };
          } else if (newStatus === "occupied" && table.status === "available") {
            return {
              ...table,
              status: newStatus,
              timeOccupied: "0:00h",
            };
          } else if (newStatus === "occupied" && table.status === "reserved") {
            return {
              ...table,
              status: newStatus,
              timeOccupied: "0:00h",
            };
          }
          return { ...table, status: newStatus };
        }
        return table;
      }),
    );
    setSelectedTable(null);
    setShowTableModal(false);
    
    // Si se está confirmando la llegada de una mesa reservada, redirigir al menú
    if (newStatus === "occupied") {
      if (currentTable?.status === "reserved") {
        // Para mesa reservada, usar capacidad máxima
        setTableDiners(prev => ({ ...prev, [tableId]: currentTable.capacity }));
        setSelectedDiners(currentTable.capacity);
      }
      setSelectedTableForMenu(tableId);
      setCurrentView('menu');
    }
  };

  const processPayment = (tableId: number, amount: number, isFullPayment: boolean) => {
    setTables((prev) =>
      prev.map((table) => {
        if (table.id === tableId) {
          const newPaidAmount = (table.paidAmount || 0) + amount;
          const orderTotal = table.orderTotal || 0;

          if (isFullPayment || newPaidAmount >= orderTotal) {
            return {
              ...table,
              status: "available" as TableStatus,
              timeOccupied: undefined,
              waiter: undefined,
              orderTotal: undefined,
              paidAmount: undefined,
              hasPartialPayment: false,
            };
          } else {
            return {
              ...table,
              paidAmount: newPaidAmount,
              hasPartialPayment: true,
            };
          }
        }
        return table;
      }),
    );
  };

  const addAlert = (tableId: number, type: AlertType, message: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (table?.status !== "occupied") return; // Solo mesas ocupadas pueden tener alertas

    const newAlert: TableAlert = {
      id: Date.now().toString(),
      tableId,
      type,
      message,
      timestamp: new Date(),
      priority: alertConfig[type].priority,
      resolved: false,
    };
    setAlerts((prev) => [...prev, newAlert]);
  };

  const resolveAlert = (alertId: string) => {
    setAlerts((prev) => prev.map((alert) => (alert.id === alertId ? { ...alert, resolved: true } : alert)));
  };

  const getTimeAgo = (timestamp: Date) => {
    const minutes = Math.floor((Date.now() - timestamp.getTime()) / 60000);
    if (minutes < 1) return "Ahora";
    if (minutes === 1) return "1 min";
    return `${minutes} min`;
  };

  const activeAlerts = alerts.filter((alert) => !alert.resolved);
  const highPriorityAlerts = activeAlerts.filter((alert) => alert.priority === "high");

  const filteredTables = filterStatus === "all" ? tables : tables.filter((table) => table.status === filterStatus);

  const statusCounts = tables.reduce(
    (acc, table) => {
      acc[table.status] = (acc[table.status] || 0) + 1;
      return acc;
    },
    {} as Record<TableStatus, number>,
  );

  const handleTablePress = (table: Table) => {
    setSelectedTable(table);
    setShowTableModal(true);
  };

  const handleAssignTable = (tableId: number, diners: number) => {
    updateTableStatus(tableId, "occupied");
    setTableDiners(prev => ({ ...prev, [tableId]: diners }));
    setSelectedTableForMenu(tableId);
    setSelectedDiners(diners);
    setCurrentView('menu');
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
  };

  const handlePaymentRequest = (table: Table) => {
    setSelectedTable(table);
    setPaymentAmount('');
    setShowTableModal(false);
    setShowPaymentModal(true);
  };

  const handlePartialPayment = () => {
    if (selectedTable && paymentAmount) {
      const amount = parseFloat(paymentAmount);
      const pendingAmount = (selectedTable.orderTotal || 0) - (selectedTable.paidAmount || 0);
      
      if (amount > 0 && amount <= pendingAmount) {
        processPayment(selectedTable.id, amount, false);
        setShowPaymentModal(false);
        setPaymentAmount('');
      }
    }
  };

  const handleFullPayment = () => {
    if (selectedTable) {
      processPayment(selectedTable.id, selectedTable.orderTotal || 0, true);
      setShowPaymentModal(false);
      setPaymentAmount('');
    }
  };

  const handleConfirmOrder = (items: any[]) => {
    console.log("Pedido confirmado:", items);
    
    // Calcular el total del pedido
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Almacenar el pedido de la mesa
    setTableOrders(prev => ({
      ...prev,
      [selectedTableForMenu!]: items
    }));
    
    // Actualizar el total de la mesa
    setTables(prev => prev.map(table => {
      if (table.id === selectedTableForMenu) {
        return {
          ...table,
          orderTotal: total
        };
      }
      return table;
    }));
    
    setCurrentView('tables');
    setSelectedTableForMenu(null);
    setIsModifyingOrder(false);
  };

  const validateDiners = (diners: number) => {
    if (!selectedTable) return false;
    return diners > 0 && diners <= selectedTable.capacity;
  };

  const handleDinerSelection = (diners: number) => {
    setSelectedDiners(diners);
    setManualDiners('');
    setValidationError('');
    
    if (!validateDiners(diners)) {
      setValidationError(`La cantidad de comensales debe ser entre 1 y ${selectedTable?.capacity || 0}`);
    }
  };

  const renderTableCard = ({ item: table }: { item: Table }) => {
    const config = statusConfig[table.status];
    const hasAlert = activeAlerts.some((alert) => alert.tableId === table.id);
    const hasPartialPayment = table.hasPartialPayment;

    return (
      <TouchableOpacity onPress={() => handleTablePress(table)}>
        <Card
          style={StyleSheet.flatten([
            styles.tableCard,
            {
              backgroundColor: config.color,
              borderColor: config.borderColor,
            },
            hasAlert && styles.alertTable,
            hasPartialPayment && styles.partialPaymentTable,
          ])}
        >
          <CardContent style={styles.tableContent}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableNumber, { color: config.textColor }]}>
                Mesa {table.id}
              </Text>
              {hasPartialPayment && (
                <View style={styles.paymentIcon}>
                  <Ionicons name="card" size={isTablet ? 20 : 16} color="#3b82f6" />
                </View>
              )}
            </View>
            
            <Text style={[styles.tableCapacity, { color: config.textColor }]}>
              {table.status === 'occupied' && tableDiners[table.id] 
                ? `${tableDiners[table.id]} comensales`
                : `${table.capacity} personas`
              }
            </Text>

            {table.timeOccupied && (
              <Badge variant="secondary" style={styles.timeBadge}>
                {table.timeOccupied}
              </Badge>
            )}

            {hasAlert && (
              <View style={styles.alertIndicator}>
                <View>
                  <Ionicons name="notifications" size={isTablet ? 18 : 16} color="#ef4444" />
                </View>
                <Text style={styles.alertCount}>
                  {activeAlerts.filter((alert) => alert.tableId === table.id).length}
                </Text>
              </View>
            )}

            {table.orderTotal && (
              <Text style={[styles.orderTotal, { color: config.textColor }]}>
                €{table.orderTotal}
                {table.paidAmount && (
                  <Text style={styles.paidAmount}> (-€{table.paidAmount})</Text>
                )}
              </Text>
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
              {tables.length}
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
        <Button
          title={`${activeAlerts.length}`}
          onPress={() => setShowAlerts(!showAlerts)}
          variant={showAlerts ? "default" : "outline"}
          size="sm"
          icon={<View><Ionicons name="notifications" size={16} color="#ffffff" /></View>}
        />
      </View>
      
      {showAlerts && activeAlerts.length > 0 && (
        <ScrollView style={styles.alertsList} showsVerticalScrollIndicator={false}>
          {activeAlerts
            .sort((a, b) => {
              const priorityOrder = { high: 3, medium: 2, low: 1 };
              return priorityOrder[b.priority] - priorityOrder[a.priority];
            })
            .map((alert) => {
              const config = alertConfig[alert.type];
              return (
                <Alert
                  key={alert.id}
                  style={StyleSheet.flatten([
                    styles.alert,
                    {
                      backgroundColor: config.bgColor,
                      borderLeftColor: config.borderColor,
                    },
                  ])}
                >
                  <View style={styles.alertDescription}>
                    <View style={styles.alertContent}>
                      <Text style={styles.alertText}>
                        <Text style={styles.alertTableText}>Mesa {alert.tableId}</Text> - {alert.message}
                      </Text>
                      <Text style={styles.alertTime}>({getTimeAgo(alert.timestamp)})</Text>
                    </View>
                    <Button
                      title="Resolver"
                      onPress={() => resolveAlert(alert.id)}
                      variant="ghost"
                      size="sm"
                    />
                  </View>
                </Alert>
              );
            })}
        </ScrollView>
      )}
    </View>
  );

  // Renderizar vista del menú
  if (currentView === 'menu' && selectedTableForMenu) {
    const currentTable = tables.find(t => t.id === selectedTableForMenu);
    let currentDiners = tableDiners[selectedTableForMenu];
    
    // Fallback solo para casos extremos
    if (!currentDiners) {
      if (currentTable?.status === 'reserved') {
        // Para mesas reservadas, usar la capacidad máxima
        currentDiners = currentTable.capacity;
      } else {
        // Fallback para cualquier caso no previsto
        currentDiners = 2;
      }
    }
    
    return (
      <MenuView
        tableId={selectedTableForMenu}
        diners={currentDiners}
        isModifying={isModifyingOrder}
        currentOrder={tableOrders[selectedTableForMenu] || []}
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
            <Button
              title="Cerrar Sesión"
              onPress={logout}
              variant="outline"
              size="sm"
            />
          )}
        </View>
      </View>

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
        title={selectedTable ? `Mesa ${selectedTable.id}` : ""}
      >
        {selectedTable && (
          <View style={styles.modalContent}>
            <View style={styles.tableInfo}>
              <Text style={styles.infoText}>
                <Text style={styles.infoLabel}>Capacidad:</Text> {selectedTable.capacity} personas
              </Text>
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
                  icon={<View><Ionicons name="people" size={16} color="#ffffff" /></View>}
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
                    icon={<View><Ionicons name="add" size={16} color="#374151" /></View>}
                    style={styles.actionButton}
                  />
                  <Button
                    title="Modificar pedido"
                    onPress={() => {
                      setShowTableModal(false);
                      handleModifyOrder(selectedTable.id);
                    }}
                    variant="outline"
                    icon={<View><Ionicons name="create" size={16} color="#374151" /></View>}
                    style={styles.actionButton}
                  />
                  <Button
                    title="Procesar pago"
                    onPress={() => {
                      handlePaymentRequest(selectedTable);
                    }}
                    variant="outline"
                    icon={<View><Ionicons name="card" size={16} color="#374151" /></View>}
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
                  icon={<View><Ionicons name="checkmark-circle" size={16} color="#ffffff" /></View>}
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
      >
        <View style={styles.assignModalContent}>
          <Text style={styles.assignText}>
            ¿Cuántos comensales para la mesa {selectedTable?.id}?
          </Text>
          
          <View style={styles.manualInputSection}>
            <TextInput
              style={styles.textInput}
              value={manualDiners}
              onChangeText={(text) => {
                setManualDiners(text);
                setValidationError('');
                if (text) {
                  setSelectedDiners(0);
                  const diners = parseInt(text);
                  if (!isNaN(diners) && !validateDiners(diners)) {
                    setValidationError(`La cantidad de comensales debe ser entre 1 y ${selectedTable?.capacity || 0}`);
                  }
                }
              }}
              placeholder="Indique cantidad de comensales"
              keyboardType="numeric"
              maxLength={2}
            />
            {validationError && (
              <Text style={styles.inputHelper}>
                {validationError}
              </Text>
            )}
          </View>
          
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

          <View style={styles.confirmSection}>
            <Button
              title="Confirmar"
              onPress={() => {
                if (selectedTable) {
                  const finalDiners = manualDiners 
                    ? parseInt(manualDiners) 
                    : selectedDiners;
                  
                  if (validateDiners(finalDiners)) {
                    handleAssignTable(selectedTable.id, finalDiners);
                    setShowAssignModal(false);
                    setManualDiners('');
                    setValidationError('');
                  } else {
                    setValidationError(`La cantidad de comensales debe ser entre 1 y ${selectedTable.capacity || 0}`);
                  }
                }
              }}
              disabled={manualDiners ? (!manualDiners || !validateDiners(parseInt(manualDiners))) : !validateDiners(selectedDiners)}
              style={styles.confirmButton}
            />
          </View>
        </View>
      </Modal>

      {/* Modal de pago */}
      <Modal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={selectedTable ? `Procesar pago - Mesa ${selectedTable.id}` : "Procesar pago"}
      >
        {selectedTable && (
          <View style={styles.paymentModalContent}>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentInfoText}>
                <Text style={styles.paymentLabel}>Total de la cuenta:</Text> €{selectedTable.orderTotal?.toFixed(2)}
              </Text>
              {selectedTable.paidAmount && (
                <Text style={styles.paymentInfoText}>
                  <Text style={styles.paymentLabel}>Ya pagado:</Text> €{selectedTable.paidAmount.toFixed(2)}
                </Text>
              )}
              <Text style={styles.paymentInfoText}>
                <Text style={styles.paymentLabel}>Pendiente:</Text> €{((selectedTable.orderTotal || 0) - (selectedTable.paidAmount || 0)).toFixed(2)}
              </Text>
            </View>

            <View style={styles.paymentOptions}>
              <Text style={styles.paymentOptionsTitle}>Opciones de pago:</Text>
              
              <Button
                title="Pago completo"
                onPress={handleFullPayment}
                style={StyleSheet.flatten([styles.paymentButton, styles.fullPaymentButton])}
                icon={<View><Ionicons name="card" size={16} color="#ffffff" /></View>}
              />

              <View style={styles.partialPaymentSection}>
                <Text style={styles.partialPaymentLabel}>Pago parcial:</Text>
                <TextInput
                  style={styles.paymentInput}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  placeholder={`Máximo: €${((selectedTable.orderTotal || 0) - (selectedTable.paidAmount || 0)).toFixed(2)}`}
                  keyboardType="numeric"
                />
                <Button
                  title="Confirmar pago parcial"
                  onPress={handlePartialPayment}
                  variant="outline"
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > ((selectedTable.orderTotal || 0) - (selectedTable.paidAmount || 0))}
                  style={styles.paymentButton}
                  icon={<View><Ionicons name="cash" size={16} color="#374151" /></View>}
                />
              </View>
            </View>
          </View>
        )}
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
    padding: isTablet ? 24 : 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: isTablet ? 32 : 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  userInfo: {
    fontSize: isTablet ? 16 : 14,
    color: '#6b7280',
  },
  subtitle: {
    fontSize: isTablet ? 16 : 14,
    color: '#6b7280',
  },
  mainContent: {
    flex: 1,
    flexDirection: isTablet ? 'row' : 'column',
  },
  leftPanel: {
    width: isTablet ? 300 : '100%',
    backgroundColor: '#ffffff',
    borderRightWidth: isTablet ? 1 : 0,
    borderRightColor: '#e5e7eb',
    padding: isTablet ? 16 : 0,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  statusSummary: {
    flexDirection: isTablet ? 'column' : 'row',
    padding: 16,
    gap: isTablet ? 12 : 8,
  },
  statusCard: {
    flex: isTablet ? undefined : 1,
    marginBottom: isTablet ? 12 : 0,
    minHeight: isTablet ? 80 : 60,
  },
  statusCardInner: {
    flex: 1,
    minHeight: isTablet ? 80 : 60,
  },
  statusContent: {
    alignItems: 'center',
    padding: isTablet ? 16 : 12,
    justifyContent: 'center',
    flex: 1,
  },
  statusCount: {
    fontSize: isTablet ? 32 : 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '500',
  },
  alertsSection: {
    padding: 16,
    flex: isTablet ? 1 : undefined,
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertsTitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#111827',
  },
  alertsList: {
    maxHeight: isTablet ? 300 : 200,
  },
  alert: {
    marginBottom: 8,
  },
  alertDescription: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertText: {
    fontSize: isTablet ? 16 : 14,
    color: '#1f2937',
  },
  alertTableText: {
    fontWeight: '600',
  },
  alertTime: {
    fontSize: isTablet ? 14 : 12,
    color: '#6b7280',
    marginTop: 2,
  },
  tablesList: {
    flex: 1,
  },
  tablesGrid: {
    padding: isTablet ? 8 : 6,
    alignItems: 'center',
  },
  tableCard: {
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 2,
    height: isTablet ? 140 : 100,
    minHeight: isTablet ? 140 : 100,
    aspectRatio: 1,
  },
  tableContent: {
    padding: isTablet ? 12 : 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tableNumber: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: 'bold',
  },
  paymentIcon: {
    marginLeft: 3,
  },
  tableCapacity: {
    fontSize: isTablet ? 14 : 12,
    marginBottom: 4,
  },
  timeBadge: {
    marginBottom: 4,
    alignSelf: 'center',
  },
  alertIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  alertCount: {
    fontSize: isTablet ? 14 : 12,
    color: '#ef4444',
    marginLeft: 2,
  },
  orderTotal: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '600',
    marginTop: 4,
  },
  paidAmount: {
    color: '#10b981',
  },
  alertTable: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  partialPaymentTable: {
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  modalContent: {
    gap: 16,
  },
  tableInfo: {
    gap: 8,
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
    color: '#ef4444',
  },
  tableAlert: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  alertMessage: {
    fontSize: isTablet ? 14 : 12,
    flex: 1,
  },
  actions: {
    gap: 12,
  },
  actionsTitle: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#374151',
  },
  actionButton: {
    marginBottom: 8,
  },
  occupiedActions: {
    gap: 8,
  },
  assignModalContent: {
    gap: 16,
  },
  assignText: {
    fontSize: isTablet ? 18 : 16,
    color: '#374151',
    textAlign: 'center',
  },
  manualInputSection: {
    alignItems: 'center',
  },
  textInput: {
    fontSize: isTablet ? 16 : 14,
    color: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    width: '40%',
    textAlign: 'center',
  },
  inputHelper: {
    fontSize: isTablet ? 12 : 10,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  dinersSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  dinerButton: {
    minWidth: isTablet ? 100 : 80,
  },
  confirmSection: {
    alignItems: 'center',
  },
  confirmButton: {
    width: '40%',
  },
  tableRow: {
    justifyContent: 'space-between',
    marginBottom: 8,
    width: '100%',
    paddingHorizontal: 8,
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
}); 