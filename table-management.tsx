"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Clock, CheckCircle, Utensils, CreditCard, DollarSign } from "lucide-react"
import { Bell, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PaymentDialog } from "./payment-dialog"
import { MenuView } from "./menu-view"
import { OrderSummary } from "./order-summary"
import { AssignTableDialog } from "./assign-table-dialog"
import { Edit, Plus, UsersIcon } from "lucide-react"

type TableStatus = "available" | "occupied" | "reserved"

interface Table {
  id: number
  capacity: number
  status: TableStatus
  timeOccupied?: string
  waiter?: string
  orderTotal?: number
  paidAmount?: number
  hasPartialPayment?: boolean
}

type AlertType = "order-ready" | "check-request" | "assistance-needed"

interface TableAlert {
  id: string
  tableId: number
  type: AlertType
  message: string
  timestamp: Date
  priority: "low" | "medium" | "high"
  resolved: boolean
}

const initialTables: Table[] = Array.from({ length: 50 }, (_, i) => {
  const status = ["available", "occupied", "reserved"][Math.floor(Math.random() * 3)] as TableStatus
  const orderTotal = status === "occupied" && Math.random() > 0.3 ? Math.floor(Math.random() * 150) + 20 : undefined
  const hasPartialPayment = orderTotal && Math.random() > 0.8
  const paidAmount = hasPartialPayment ? Math.floor(orderTotal * 0.3) : undefined

  return {
    id: i + 1,
    capacity: [2, 4, 6, 8][Math.floor(Math.random() * 4)],
    status,
    timeOccupied:
      status === "occupied"
        ? `${Math.floor(Math.random() * 2) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}h`
        : undefined,
    waiter:
      status === "occupied" && Math.random() > 0.4
        ? ["Ana", "Carlos", "María", "José"][Math.floor(Math.random() * 4)]
        : undefined,
    orderTotal,
    paidAmount,
    hasPartialPayment: !!hasPartialPayment,
  }
})

const alertConfig = {
  "order-ready": {
    icon: Utensils,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    label: "Pedido listo",
    priority: "high" as const,
  },
  "check-request": {
    icon: DollarSign,
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200",
    label: "Pide la cuenta",
    priority: "medium" as const,
  },
  "assistance-needed": {
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
    label: "Solicita asistencia",
    priority: "high" as const,
  },
}

// Crear alertas solo para mesas ocupadas
const createInitialAlerts = (tables: Table[]): TableAlert[] => {
  const occupiedTables = tables.filter((table) => table.status === "occupied")
  if (occupiedTables.length === 0) return []

  const alertTables = occupiedTables.slice(0, 2) // Tomar las primeras 2 mesas ocupadas

  return [
    {
      id: "1",
      tableId: alertTables[0]?.id || 5,
      type: "order-ready",
      message: "Pedido principal listo para servir",
      timestamp: new Date(Date.now() - 5 * 60000),
      priority: "high",
      resolved: false,
    },
    ...(alertTables[1]
      ? [
          {
            id: "2",
            tableId: alertTables[1].id,
            type: "check-request",
            message: "Cliente solicita la cuenta",
            timestamp: new Date(Date.now() - 2 * 60000),
            priority: "medium" as const,
            resolved: false,
          },
        ]
      : []),
  ]
}

const statusConfig = {
  available: {
    color: "bg-green-100 border-green-300 hover:bg-green-200",
    textColor: "text-green-800",
    icon: CheckCircle,
    label: "Libre",
  },
  occupied: {
    color: "bg-red-100 border-red-300 hover:bg-red-200",
    textColor: "text-red-800",
    icon: Users,
    label: "Ocupada",
  },
  reserved: {
    color: "bg-yellow-100 border-yellow-300 hover:bg-yellow-200",
    textColor: "text-yellow-800",
    icon: Clock,
    label: "Reservada",
  },
}

export default function TableManagement() {
  const [tables, setTables] = useState<Table[]>(initialTables)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [alerts, setAlerts] = useState<TableAlert[]>(() => createInitialAlerts(initialTables))
  const [showAlerts, setShowAlerts] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [filterStatus, setFilterStatus] = useState<TableStatus | "all">("all")
  const [currentView, setCurrentView] = useState<"tables" | "menu" | "order-summary">("tables")
  const [selectedTableForMenu, setSelectedTableForMenu] = useState<number | null>(null)
  const [selectedDiners, setSelectedDiners] = useState<number>(2)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  const updateTableStatus = (tableId: number, newStatus: TableStatus) => {
    setTables((prev) =>
      prev.map((table) => {
        if (table.id === tableId) {
          if (newStatus === "available") {
            // Al liberar mesa, limpiar todos los datos
            return {
              ...table,
              status: newStatus,
              timeOccupied: undefined,
              waiter: undefined,
              orderTotal: undefined,
              paidAmount: undefined,
              hasPartialPayment: false,
            }
          } else if (newStatus === "occupied" && table.status === "available") {
            // Al ocupar mesa libre, inicializar datos
            return {
              ...table,
              status: newStatus,
              timeOccupied: "0:00h",
              orderTotal: Math.floor(Math.random() * 100) + 30, // Simular cuenta
            }
          } else if (newStatus === "occupied" && table.status === "reserved") {
            // Al confirmar llegada de reserva
            return {
              ...table,
              status: newStatus,
              timeOccupied: "0:00h",
              orderTotal: 0, // Empezar sin cuenta
            }
          }
          return { ...table, status: newStatus }
        }
        return table
      }),
    )
    setSelectedTable(null)
  }

  const processPayment = (tableId: number, amount: number, isFullPayment: boolean) => {
    setTables((prev) =>
      prev.map((table) => {
        if (table.id === tableId) {
          const newPaidAmount = (table.paidAmount || 0) + amount
          const orderTotal = table.orderTotal || 0

          if (isFullPayment || newPaidAmount >= orderTotal) {
            // Pago completo - mesa queda libre
            return {
              ...table,
              status: "available" as TableStatus,
              timeOccupied: undefined,
              waiter: undefined,
              orderTotal: undefined,
              paidAmount: undefined,
              hasPartialPayment: false,
            }
          } else {
            // Pago parcial - mesa sigue ocupada con indicador
            return {
              ...table,
              paidAmount: newPaidAmount,
              hasPartialPayment: true,
            }
          }
        }
        return table
      }),
    )
  }

  const addAlert = (tableId: number, type: AlertType, message: string) => {
    const table = tables.find((t) => t.id === tableId)
    if (table?.status !== "occupied") {
      return // Solo permitir alertas en mesas ocupadas
    }

    const newAlert: TableAlert = {
      id: Date.now().toString(),
      tableId,
      type,
      message,
      timestamp: new Date(),
      priority: alertConfig[type].priority,
      resolved: false,
    }
    setAlerts((prev) => [...prev, newAlert])

    if (soundEnabled && (type === "order-ready" || type === "assistance-needed")) {
      console.log("🔔 Nueva alerta de alta prioridad!")
    }
  }

  const resolveAlert = (alertId: string) => {
    setAlerts((prev) => prev.map((alert) => (alert.id === alertId ? { ...alert, resolved: true } : alert)))
  }

  const getTimeAgo = (timestamp: Date) => {
    const minutes = Math.floor((Date.now() - timestamp.getTime()) / 60000)
    if (minutes < 1) return "Ahora"
    if (minutes === 1) return "1 min"
    return `${minutes} min`
  }

  const activeAlerts = alerts.filter((alert) => !alert.resolved)
  const highPriorityAlerts = activeAlerts.filter((alert) => alert.priority === "high")

  const filteredTables = filterStatus === "all" ? tables : tables.filter((table) => table.status === filterStatus)

  const statusCounts = tables.reduce(
    (acc, table) => {
      acc[table.status] = (acc[table.status] || 0) + 1
      return acc
    },
    {} as Record<TableStatus, number>,
  )

  const handleAssignTable = (tableId: number, diners: number) => {
    updateTableStatus(tableId, "occupied")
    setSelectedTableForMenu(tableId)
    setSelectedDiners(diners)
    setCurrentView("menu")
  }

  const handleConfirmArrival = (tableId: number) => {
    updateTableStatus(tableId, "occupied")
    setSelectedTableForMenu(tableId)
    setSelectedDiners(2) // Valor por defecto para reservas
    setCurrentView("menu")
  }

  const handleNewOrder = (tableId: number) => {
    setSelectedTableForMenu(tableId)
    setCurrentView("menu")
  }

  const handleModifyOrder = (tableId: number) => {
    // Simular orden existente
    const mockOrder = {
      id: `order-${tableId}-${Date.now()}`,
      tableId,
      items: [
        { id: "1", name: "Jamón Ibérico", price: 18.5, quantity: 1, status: "served" as const },
        {
          id: "5",
          name: "Paella Valenciana",
          price: 22.0,
          quantity: 2,
          status: "preparing" as const,
          notes: "Sin mariscos",
        },
      ],
      totalAmount: 62.5,
      status: "active" as const,
      timestamp: new Date(Date.now() - 30 * 60000), // 30 minutos atrás
    }
    setSelectedOrder(mockOrder)
    setCurrentView("order-summary")
  }

  const handleConfirmOrder = (items: any[]) => {
    console.log("Pedido confirmado:", items)
    setCurrentView("tables")
    setSelectedTableForMenu(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header con alertas */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Mesas</h1>
              <p className="text-gray-600">Vista del camarero - Estado actual del restaurante</p>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant={showAlerts ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAlerts(!showAlerts)}
                className="relative"
              >
                <Bell className="h-4 w-4 mr-2" />
                Alertas ({activeAlerts.length})
                {highPriorityAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {highPriorityAlerts.length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Panel de alertas */}
          {showAlerts && activeAlerts.length > 0 && (
            <div className="mb-6 space-y-2">
              <h3 className="font-semibold text-lg">Alertas Activas</h3>
              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {activeAlerts
                  .sort((a, b) => {
                    const priorityOrder = { high: 3, medium: 2, low: 1 }
                    return priorityOrder[b.priority] - priorityOrder[a.priority]
                  })
                  .map((alert) => {
                    const config = alertConfig[alert.type]
                    const Icon = config.icon
                    return (
                      <Alert key={alert.id} className={`${config.bgColor} border-l-4`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <AlertDescription className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">Mesa {alert.tableId}</span> - {alert.message}
                            <span className="text-xs text-gray-500 ml-2">({getTimeAgo(alert.timestamp)})</span>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => resolveAlert(alert.id)} className="ml-2">
                            Resolver
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon
            const count = statusCounts[status as TableStatus] || 0
            return (
              <Card key={status} className="text-center">
                <CardContent className="p-4">
                  <div className="flex items-center justify-center mb-2">
                    <Icon className={`h-5 w-5 ${config.textColor}`} />
                  </div>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-gray-600">{config.label}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Filter */}
        <div className="mb-6">
          <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as TableStatus | "all")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las mesas</SelectItem>
              <SelectItem value="available">Libres</SelectItem>
              <SelectItem value="occupied">Ocupadas</SelectItem>
              <SelectItem value="reserved">Reservadas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tables Grid */}
        {currentView === "tables" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {filteredTables.map((table) => {
                const config = statusConfig[table.status]
                const Icon = config.icon
                const hasAlert = activeAlerts.some((alert) => alert.tableId === table.id)
                const hasPartialPayment = table.hasPartialPayment

                return (
                  <Dialog key={table.id}>
                    <DialogTrigger asChild>
                      <Card
                        className={`cursor-pointer transition-all duration-200 ${config.color} ${
                          hasAlert ? "ring-2 ring-red-400 ring-opacity-75" : ""
                        } ${hasPartialPayment ? "ring-2 ring-blue-400 ring-opacity-75" : ""}`}
                      >
                        <CardContent className="p-4 text-center">
                          <div className="flex items-center justify-center mb-2">
                            <Icon className={`h-4 w-4 ${config.textColor}`} />
                            {hasPartialPayment && <CreditCard className="h-3 w-3 text-blue-600 ml-1" />}
                          </div>
                          <div className={`font-bold text-lg ${config.textColor}`}>Mesa {table.id}</div>
                          <div className={`text-xs ${config.textColor} opacity-75`}>{table.capacity} personas</div>

                          {table.timeOccupied && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {table.timeOccupied}
                            </Badge>
                          )}

                          {hasAlert && (
                            <div className="flex items-center justify-center mt-1">
                              <Bell className="h-3 w-3 text-red-500 animate-pulse" />
                              <span className="text-xs text-red-600 ml-1">
                                {activeAlerts.filter((alert) => alert.tableId === table.id).length}
                              </span>
                            </div>
                          )}

                          {table.orderTotal && (
                            <div className={`text-xs font-semibold mt-1 ${config.textColor}`}>
                              €{table.orderTotal}
                              {table.paidAmount && <span className="text-green-600"> (-€{table.paidAmount})</span>}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Utensils className="h-5 w-5" />
                          Mesa {table.id}
                          {hasPartialPayment && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              Pago parcial
                            </Badge>
                          )}
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Capacidad:</span> {table.capacity} personas
                          </div>
                          <div>
                            <span className="font-medium">Estado actual:</span> {statusConfig[table.status].label}
                          </div>
                          {table.waiter && (
                            <div>
                              <span className="font-medium">Camarero:</span> {table.waiter}
                            </div>
                          )}
                          {table.orderTotal && (
                            <div className="col-span-2">
                              <span className="font-medium">Total cuenta:</span> €{table.orderTotal}
                              {table.paidAmount && (
                                <div className="text-green-600 text-sm">
                                  Pagado: €{table.paidAmount} | Pendiente: €
                                  {(table.orderTotal - table.paidAmount).toFixed(2)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Alertas de la mesa */}
                        {activeAlerts.filter((alert) => alert.tableId === table.id).length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-red-600">Alertas activas:</h4>
                            {activeAlerts
                              .filter((alert) => alert.tableId === table.id)
                              .map((alert) => {
                                const config = alertConfig[alert.type]
                                const Icon = config.icon
                                return (
                                  <div
                                    key={alert.id}
                                    className={`p-2 rounded ${config.bgColor} flex items-center justify-between`}
                                  >
                                    <div className="flex items-center">
                                      <Icon className={`h-4 w-4 ${config.color} mr-2`} />
                                      <span className="text-sm">{alert.message}</span>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => resolveAlert(alert.id)}>
                                      Resolver
                                    </Button>
                                  </div>
                                )
                              })}
                          </div>
                        )}

                        {/* Acciones disponibles */}
                        <div className="space-y-2">
                          <h4 className="font-medium">Acciones disponibles:</h4>

                          {table.status === "available" && (
                            <Button
                              className="w-full justify-start"
                              onClick={() => {
                                setSelectedTable(table)
                                setShowAssignDialog(true)
                              }}
                            >
                              <UsersIcon className="h-4 w-4 mr-2" />
                              Asignar mesa
                            </Button>
                          )}

                          {table.status === "occupied" && (
                            <div className="grid grid-cols-1 gap-2">
                              <Button
                                variant="outline"
                                className="justify-start bg-transparent"
                                onClick={() => {
                                  setSelectedTable(null)
                                  handleNewOrder(table.id)
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Realizar pedido
                              </Button>
                              <Button
                                variant="outline"
                                className="justify-start bg-transparent"
                                onClick={() => {
                                  setSelectedTable(null)
                                  handleModifyOrder(table.id)
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Modificar pedido
                              </Button>
                              <PaymentDialog table={table} onPayment={processPayment} />
                            </div>
                          )}

                          {table.status === "reserved" && (
                            <Button
                              className="w-full justify-start"
                              onClick={() => {
                                setSelectedTable(null)
                                handleConfirmArrival(table.id)
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Confirmar llegada y ir al menú
                            </Button>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )
              })}
            </div>

            {filteredTables.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No hay mesas que coincidan con el filtro seleccionado.</p>
              </div>
            )}
          </>
        )}

        {/* Conditional Views */}
        {currentView === "menu" && selectedTableForMenu && (
          <MenuView
            tableId={selectedTableForMenu}
            diners={selectedDiners}
            onBack={() => {
              setCurrentView("tables")
              setSelectedTableForMenu(null)
            }}
            onConfirmOrder={handleConfirmOrder}
          />
        )}

        {currentView === "order-summary" && selectedOrder && (
          <OrderSummary
            order={selectedOrder}
            onBack={() => {
              setCurrentView("tables")
              setSelectedOrder(null)
            }}
            onModifyOrder={(orderId) => {
              console.log("Modificar orden:", orderId)
              setCurrentView("menu")
            }}
            onAddItems={(orderId) => {
              console.log("Añadir items a orden:", orderId)
              setCurrentView("menu")
            }}
          />
        )}

        {/* Assign Table Dialog */}
        {selectedTable && (
          <AssignTableDialog
            tableId={selectedTable.id}
            tableCapacity={selectedTable.capacity}
            isOpen={showAssignDialog}
            onClose={() => setShowAssignDialog(false)}
            onAssign={handleAssignTable}
          />
        )}
      </div>
    </div>
  )
}
