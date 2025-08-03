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
import Modal from '../components/ui/Modal';
import { MenuView } from '../components/MenuView';
import { Table, TableStatus, TableAlert, AlertType } from '../types/table';
import { statusConfig, alertConfig } from '../data/mockData';
import { useWaiterAuth } from '../contexts/WaiterAuthContext';
import { useTables, TableStatus as RealTableStatus } from '../hooks/useTables';
import { tableService } from '../services/tableService';

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

  // Convertir datos reales del backend al formato de la aplicación
  useEffect(() => {
    if (realTables.length > 0) {
      const convertedTables: Table[] = realTables.map((realTable: RealTableStatus) => ({
        id: realTable.number,
        number: realTable.number,
        status: realTable.status,
        capacity: realTable.capacity,
        occupiedTime: realTable.lastActivity,
        waiter: realTable.waiter,
        total: realTable.orderTotal || 0,
        orderTotal: realTable.orderTotal,
        paidAmount: realTable.paidAmount || 0,
        hasPartialPayment: realTable.hasPartialPayment,
        hasAlerts: realTable.hasAlerts,
        sessionId: realTable.sessionId,
        timeOccupied: realTable.timeOccupied
      }));
      
      setTables(convertedTables);
    }
  }, [realTables, user]);

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

      if (isFullPayment || (realTable.orderTotal || 0) - (realTable.paidAmount || 0) <= amount) {
        // Pago completo - liberar mesa
        await tableService.updateTableStatus(realTable.id, {
          status: 'available'
        });
      }

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

  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
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
  };

  const handlePaymentRequest = (table: Table) => {
    setSelectedTable(table);
    setShowPaymentModal(true);
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

  const renderTableCard = ({ item: table }: { item: Table }) => {
    const config = statusConfig[table.status];
    const hasAlert = activeAlerts.some(alert => alert.tableId === table.id);
    const order = tableOrders[table.id] || [];

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
              {table.timeOccupied && (
                <Text style={[styles.tableInfoText, { color: config.textColor }]}>
                  Tiempo: {table.timeOccupied}
                </Text>
              )}
            </View>

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
              const config = alertConfig[alert.type];
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

      {/* Indicador de carga */}
      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando mesas...</Text>
        </View>
      )}

      {/* Manejo de errores */}
      {error && (
        <View style={styles.errorContainer}>
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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
            <Alert style={styles.validationErrorAlert}>
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
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
          <View style={styles.paymentModalContent}>
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
  },
  tableCardInner: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableCardWithAlert: {
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  tableContent: {
    padding: isTablet ? 16 : 12,
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
    marginBottom: 8,
  },
  tableInfoText: {
    fontSize: isTablet ? 12 : 10,
    marginBottom: 2,
  },
  orderTotal: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '600',
    marginTop: 4,
  },
  paidAmount: {
    color: '#10b981',
    fontSize: isTablet ? 12 : 10,
  },
  alertIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
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
}); 