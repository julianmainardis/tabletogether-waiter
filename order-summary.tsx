"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Edit, Trash2, Plus, Clock, CheckCircle } from "lucide-react"

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  notes?: string
  status: "pending" | "preparing" | "ready" | "served"
}

interface Order {
  id: string
  tableId: number
  items: OrderItem[]
  totalAmount: number
  status: "active" | "completed"
  timestamp: Date
  notes?: string
}

interface OrderSummaryProps {
  order: Order
  onBack: () => void
  onModifyOrder: (orderId: string) => void
  onAddItems: (orderId: string) => void
}

const statusConfig = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  preparing: { label: "Preparando", color: "bg-blue-100 text-blue-800", icon: Clock },
  ready: { label: "Listo", color: "bg-green-100 text-green-800", icon: CheckCircle },
  served: { label: "Servido", color: "bg-gray-100 text-gray-800", icon: CheckCircle },
}

export function OrderSummary({ order, onBack, onModifyOrder, onAddItems }: OrderSummaryProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState<number>(1)
  const [editNotes, setEditNotes] = useState<string>("")

  const startEditing = (item: OrderItem) => {
    setEditingItem(item.id)
    setEditQuantity(item.quantity)
    setEditNotes(item.notes || "")
  }

  const cancelEditing = () => {
    setEditingItem(null)
    setEditQuantity(1)
    setEditNotes("")
  }

  const saveChanges = (itemId: string) => {
    // Aquí implementarías la lógica para guardar los cambios
    console.log(`Guardando cambios para item ${itemId}:`, { quantity: editQuantity, notes: editNotes })
    setEditingItem(null)
  }

  const removeItem = (itemId: string) => {
    // Aquí implementarías la lógica para eliminar el item
    console.log(`Eliminando item ${itemId}`)
  }

  const updateItemStatus = (itemId: string, newStatus: OrderItem["status"]) => {
    // Aquí implementarías la lógica para actualizar el estado
    console.log(`Actualizando estado de ${itemId} a ${newStatus}`)
  }

  const getTimeAgo = (timestamp: Date) => {
    const minutes = Math.floor((Date.now() - timestamp.getTime()) / 60000)
    if (minutes < 1) return "Ahora"
    if (minutes === 1) return "1 min"
    return `${minutes} min`
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Pedido Mesa {order.tableId}</h1>
              <p className="text-gray-600">
                Pedido #{order.id} • {getTimeAgo(order.timestamp)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onAddItems(order.id)}>
              <Plus className="h-4 w-4 mr-2" />
              Añadir Productos
            </Button>
            <Button onClick={() => onModifyOrder(order.id)}>
              <Edit className="h-4 w-4 mr-2" />
              Modificar Pedido
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Productos del Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => {
                    const StatusIcon = statusConfig[item.status].icon
                    const isEditing = editingItem === item.id

                    return (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold">{item.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={statusConfig[item.status].color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig[item.status].label}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">€{(item.price * item.quantity).toFixed(2)}</div>
                            <div className="text-sm text-gray-500">
                              €{item.price.toFixed(2)} x {item.quantity}
                            </div>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="space-y-3 bg-gray-50 p-3 rounded">
                            <div className="flex items-center gap-2">
                              <label className="text-sm font-medium">Cantidad:</label>
                              <Input
                                type="number"
                                min="1"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(Number.parseInt(e.target.value))}
                                className="w-20"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Notas:</label>
                              <Textarea
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                placeholder="Instrucciones especiales..."
                                className="mt-1"
                                rows={2}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveChanges(item.id)}>
                                Guardar
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditing}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {item.notes && (
                              <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded mt-2">
                                <strong>Notas:</strong> {item.notes}
                              </div>
                            )}
                            <div className="flex justify-between items-center mt-3">
                              <div className="flex gap-1">
                                {Object.entries(statusConfig).map(([status, config]) => (
                                  <Button
                                    key={status}
                                    size="sm"
                                    variant={item.status === status ? "default" : "outline"}
                                    onClick={() => updateItemStatus(item.id, status as OrderItem["status"])}
                                    className="text-xs"
                                  >
                                    {config.label}
                                  </Button>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={() => startEditing(item)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeItem(item.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Resumen del Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Mesa:</span>
                    <span className="font-semibold">{order.tableId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Productos:</span>
                    <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estado:</span>
                    <Badge variant={order.status === "active" ? "default" : "secondary"}>
                      {order.status === "active" ? "Activo" : "Completado"}
                    </Badge>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          {item.name} x{item.quantity}
                        </span>
                        <span>€{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total:</span>
                    <span>€{order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {order.notes && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Notas del pedido:</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{order.notes}</p>
                  </div>
                )}

                <div className="space-y-2 pt-4">
                  <Button className="w-full" onClick={() => onAddItems(order.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir más productos
                  </Button>
                  <Button variant="outline" className="w-full bg-transparent" onClick={() => onModifyOrder(order.id)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modificar pedido
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
