"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingCart, Plus, Minus, ArrowLeft } from "lucide-react"

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  available: boolean
}

interface CartItem extends MenuItem {
  quantity: number
  notes?: string
}

interface MenuViewProps {
  tableId: number
  diners: number
  onBack: () => void
  onConfirmOrder: (items: CartItem[]) => void
}

const menuItems: MenuItem[] = [
  // Entrantes
  {
    id: "1",
    name: "Jamón Ibérico",
    description: "Jamón ibérico de bellota con pan tostado",
    price: 18.5,
    category: "entrantes",
    available: true,
  },
  {
    id: "2",
    name: "Croquetas Caseras",
    description: "6 unidades de croquetas de jamón",
    price: 12.0,
    category: "entrantes",
    available: true,
  },
  {
    id: "3",
    name: "Ensalada César",
    description: "Lechuga, pollo, parmesano y salsa césar",
    price: 14.5,
    category: "entrantes",
    available: true,
  },
  {
    id: "4",
    name: "Tabla de Quesos",
    description: "Selección de quesos manchegos",
    price: 16.0,
    category: "entrantes",
    available: false,
  },

  // Principales
  {
    id: "5",
    name: "Paella Valenciana",
    description: "Arroz con pollo, conejo y verduras",
    price: 22.0,
    category: "principales",
    available: true,
  },
  {
    id: "6",
    name: "Solomillo a la Plancha",
    description: "Con patatas y pimientos",
    price: 28.5,
    category: "principales",
    available: true,
  },
  {
    id: "7",
    name: "Lubina al Horno",
    description: "Con verduras de temporada",
    price: 24.0,
    category: "principales",
    available: true,
  },
  {
    id: "8",
    name: "Cochinillo Asado",
    description: "Especialidad de la casa",
    price: 32.0,
    category: "principales",
    available: true,
  },

  // Postres
  {
    id: "9",
    name: "Tarta de Santiago",
    description: "Con helado de vainilla",
    price: 8.5,
    category: "postres",
    available: true,
  },
  { id: "10", name: "Flan Casero", description: "Con nata montada", price: 6.5, category: "postres", available: true },
  {
    id: "11",
    name: "Tiramisú",
    description: "Postre italiano tradicional",
    price: 9.0,
    category: "postres",
    available: true,
  },

  // Bebidas
  { id: "12", name: "Agua Mineral", description: "500ml", price: 2.5, category: "bebidas", available: true },
  {
    id: "13",
    name: "Vino Tinto Crianza",
    description: "Copa de vino de la casa",
    price: 4.5,
    category: "bebidas",
    available: true,
  },
  {
    id: "14",
    name: "Cerveza Estrella",
    description: "Caña de cerveza",
    price: 3.0,
    category: "bebidas",
    available: true,
  },
  { id: "15", name: "Café Solo", description: "Café expreso", price: 2.0, category: "bebidas", available: true },
]

const categories = [
  { id: "entrantes", name: "Entrantes", icon: "🥗" },
  { id: "principales", name: "Principales", icon: "🍖" },
  { id: "postres", name: "Postres", icon: "🍰" },
  { id: "bebidas", name: "Bebidas", icon: "🍷" },
]

export function MenuView({ tableId, diners, onBack, onConfirmOrder }: MenuViewProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeCategory, setActiveCategory] = useState("entrantes")

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existingItem = prev.find((cartItem) => cartItem.id === item.id)
      if (existingItem) {
        return prev.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem,
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existingItem = prev.find((cartItem) => cartItem.id === itemId)
      if (existingItem && existingItem.quantity > 1) {
        return prev.map((cartItem) =>
          cartItem.id === itemId ? { ...cartItem, quantity: cartItem.quantity - 1 } : cartItem,
        )
      }
      return prev.filter((cartItem) => cartItem.id !== itemId)
    })
  }

  const getCartItemQuantity = (itemId: string) => {
    return cart.find((item) => item.id === itemId)?.quantity || 0
  }

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const filteredItems = menuItems.filter((item) => item.category === activeCategory)

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
              <h1 className="text-2xl font-bold">Menú - Mesa {tableId}</h1>
              <p className="text-gray-600">{diners} comensales</p>
            </div>
          </div>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-semibold">{getTotalItems()} productos</div>
                    <div className="text-sm text-gray-600">€{getTotalPrice().toFixed(2)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu */}
          <div className="lg:col-span-2">
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="grid w-full grid-cols-4">
                {categories.map((category) => (
                  <TabsTrigger key={category.id} value={category.id} className="text-sm">
                    {category.icon} {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map((category) => (
                <TabsContent key={category.id} value={category.id} className="mt-4">
                  <div className="grid gap-4">
                    {filteredItems.map((item) => {
                      const quantity = getCartItemQuantity(item.id)
                      return (
                        <Card key={item.id} className={!item.available ? "opacity-50" : ""}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold">{item.name}</h3>
                                  {!item.available && <Badge variant="secondary">No disponible</Badge>}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                                <p className="font-bold text-lg">€{item.price.toFixed(2)}</p>
                              </div>

                              <div className="flex items-center gap-2 ml-4">
                                {quantity > 0 ? (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => removeFromCart(item.id)}>
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-8 text-center font-semibold">{quantity}</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => addToCart(item)}
                                      disabled={!item.available}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button size="sm" onClick={() => addToCart(item)} disabled={!item.available}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Añadir
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Cart */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Pedido Mesa {tableId}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Añade productos al pedido</p>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-gray-500">
                            €{item.price.toFixed(2)} x {item.quantity}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => removeFromCart(item.id)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <Button size="sm" variant="ghost" onClick={() => addToCart(item)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center font-bold">
                        <span>Total:</span>
                        <span>€{getTotalPrice().toFixed(2)}</span>
                      </div>
                    </div>

                    <Button className="w-full" onClick={() => onConfirmOrder(cart)} disabled={cart.length === 0}>
                      Confirmar Pedido
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
