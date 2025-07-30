import React, { useState } from 'react';
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

type ViewType = 'tables' | 'menu' | 'order-summary';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function TableManagement() {
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [alerts, setAlerts] = useState<TableAlert[]>(() => createInitialAlerts(initialTables));
  const [showAlerts, setShowAlerts] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TableStatus | "all">("all");
  const [showTableModal, setShowTableModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDiners, setSelectedDiners] = useState(2);
  const [currentView, setCurrentView] = useState<ViewType>('tables');
  const [selectedTableForMenu, setSelectedTableForMenu] = useState<number | null>(null);

  const updateTableStatus = (tableId: number, newStatus: TableStatus) => {
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
              orderTotal: Math.floor(Math.random() * 100) + 30,
            };
          } else if (newStatus === "occupied" && table.status === "reserved") {
            return {
              ...table,
              status: newStatus,
              timeOccupied: "0:00h",
              orderTotal: 0,
            };
          }
          return { ...table, status: newStatus };
        }
        return table;
      }),
    );
    setSelectedTable(null);
    setShowTableModal(false);
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
    if (table?.status !== "occupied") return;

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
    setSelectedTableForMenu(tableId);
    setSelectedDiners(diners);
    setCurrentView('menu');
  };

  const handleNewOrder = (tableId: number) => {
    setSelectedTableForMenu(tableId);
    setCurrentView('menu');
  };

  const handleConfirmOrder = (items: any[]) => {
    console.log("Pedido confirmado:", items);
    setCurrentView('tables');
    setSelectedTableForMenu(null);
  };

  const renderTableCard = ({ item: table }: { item: Table }) => {
    const config = statusConfig[table.status];
    const hasAlert = activeAlerts.some((alert) => alert.tableId === table.id);
    const hasPartialPayment = table.hasPartialPayment;

    return (
      <TouchableOpacity onPress={() => handleTablePress(table)}>
        <Card
          style={[
            styles.tableCard,
            {
              backgroundColor: config.color,
              borderColor: config.borderColor,
            },
            hasAlert && styles.alertTable,
            hasPartialPayment && styles.partialPaymentTable,
          ]}
        >
          <CardContent style={styles.tableContent}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableNumber, { color: config.textColor }]}>
                Mesa {table.id}
              </Text>
              {hasPartialPayment && (
                <Ionicons name="card" size={isTablet ? 20 : 16} color="#3b82f6" style={styles.paymentIcon} />
              )}
            </View>
            
            <Text style={[styles.tableCapacity, { color: config.textColor }]}>
              {table.capacity} personas
            </Text>

            {table.timeOccupied && (
              <Badge variant="secondary" style={styles.timeBadge}>
                {table.timeOccupied}
              </Badge>
            )}

            {hasAlert && (
              <View style={styles.alertIndicator}>
                <Ionicons name="notifications" size={isTablet ? 18 : 16} color="#ef4444" />
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
      {Object.entries(statusConfig).map(([status, config]) => {
        const count = statusCounts[status as TableStatus] || 0;
        return (
          <Card key={status} style={styles.statusCard}>
            <CardContent style={styles.statusContent}>
              <Text style={[styles.statusCount, { color: config.textColor }]}>{count}</Text>
              <Text style={[styles.statusLabel, { color: config.textColor }]}>{config.label}</Text>
            </CardContent>
          </Card>
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
          icon={<Ionicons name="notifications" size={16} color="#ffffff" />}
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
                  style={[
                    styles.alert,
                    {
                      backgroundColor: config.bgColor,
                      borderLeftColor: config.borderColor,
                    },
                  ]}
                >
                  <AlertDescription style={styles.alertDescription}>
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
                  </AlertDescription>
                </Alert>
              );
            })}
        </ScrollView>
      )}
    </View>
  );

  // Renderizar vista del menú
  if (currentView === 'menu' && selectedTableForMenu) {
    return (
      <MenuView
        tableId={selectedTableForMenu}
        diners={selectedDiners}
        onBack={() => {
          setCurrentView('tables');
          setSelectedTableForMenu(null);
        }}
        onConfirmOrder={handleConfirmOrder}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Mesas</Text>
        <Text style={styles.subtitle}>Vista del camarero - Estado actual del restaurante</Text>
      </View>

      <View style={styles.mainContent}>
        {/* Panel izquierdo con alertas y filtros */}
        <View style={styles.leftPanel}>
          {renderStatusSummary()}
          {renderAlerts()}
          
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Filtrar por estado:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterButtons}>
              {[
                { value: "all", label: "Todas" },
                { value: "available", label: "Libres" },
                { value: "occupied", label: "Ocupadas" },
                { value: "reserved", label: "Reservadas" },
              ].map((filter) => (
                <Button
                  key={filter.value}
                  title={filter.label}
                  onPress={() => setFilterStatus(filter.value as TableStatus | "all")}
                  variant={filterStatus === filter.value ? "default" : "outline"}
                  size="sm"
                  style={styles.filterButton}
                />
              ))}
            </ScrollView>
          </View>
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
                      console.log("Modificar pedido para mesa", selectedTable.id);
                    }}
                    variant="outline"
                    icon={<Ionicons name="create" size={16} color="#374151" />}
                    style={styles.actionButton}
                  />
                  <Button
                    title="Procesar pago"
                    onPress={() => {
                      setShowTableModal(false);
                      processPayment(selectedTable.id, selectedTable.orderTotal || 0, true);
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
        <View style={styles.assignModalContent}>
          <Text style={styles.assignText}>
            ¿Cuántos comensales para la mesa {selectedTable?.id}?
          </Text>
          
          <View style={styles.dinersSelector}>
            {[2, 4, 6, 8].map((diners) => (
              <Button
                key={diners}
                title={`${diners} personas`}
                onPress={() => setSelectedDiners(diners)}
                variant={selectedDiners === diners ? "default" : "outline"}
                style={styles.dinerButton}
              />
            ))}
          </View>

          <Button
            title="Confirmar asignación"
            onPress={() => {
              if (selectedTable) {
                handleAssignTable(selectedTable.id, selectedDiners);
                setShowAssignModal(false);
              }
            }}
            style={styles.confirmButton}
          />
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
    padding: isTablet ? 24 : 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: isTablet ? 32 : 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
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
    gap: isTablet ? 8 : 12,
  },
  statusCard: {
    flex: isTablet ? undefined : 1,
    marginBottom: isTablet ? 8 : 0,
  },
  statusContent: {
    alignItems: 'center',
    padding: isTablet ? 16 : 12,
  },
  statusCount: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: isTablet ? 14 : 12,
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
  filterSection: {
    padding: 16,
  },
  filterTitle: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
  },
  filterButton: {
    marginRight: 8,
  },
  tablesGrid: {
    padding: isTablet ? 24 : 16,
  },
  tableCard: {
    flex: 1,
    margin: isTablet ? 6 : 4,
    borderWidth: 2,
    minHeight: isTablet ? 120 : 100,
  },
  tableContent: {
    padding: isTablet ? 16 : 12,
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
    fontSize: isTablet ? 20 : 16,
    fontWeight: 'bold',
  },
  paymentIcon: {
    marginLeft: 4,
  },
  tableCapacity: {
    fontSize: isTablet ? 14 : 12,
    marginBottom: 4,
  },
  timeBadge: {
    marginBottom: 4,
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
  dinersSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  dinerButton: {
    minWidth: isTablet ? 100 : 80,
  },
  confirmButton: {
    marginTop: 16,
  },
}); 