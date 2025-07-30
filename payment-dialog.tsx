"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CreditCard, DollarSign, Receipt } from "lucide-react"

interface PaymentDialogProps {
  table: {
    id: number
    orderTotal?: number
    paidAmount?: number
  }
  onPayment: (tableId: number, amount: number, isFullPayment: boolean) => void
}

export function PaymentDialog({ table, onPayment }: PaymentDialogProps) {
  const [paymentAmount, setPaymentAmount] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  const orderTotal = table.orderTotal || 0
  const paidAmount = table.paidAmount || 0
  const remainingAmount = orderTotal - paidAmount

  const handlePartialPayment = () => {
    const amount = Number.parseFloat(paymentAmount)
    if (amount > 0 && amount <= remainingAmount) {
      onPayment(table.id, amount, false)
      setPaymentAmount("")
      setIsOpen(false)
    }
  }

  const handleFullPayment = () => {
    onPayment(table.id, remainingAmount, true)
    setPaymentAmount("")
    setIsOpen(false)
  }

  if (orderTotal === 0) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => setIsOpen(true)}>
        <CreditCard className="h-4 w-4 mr-2" />
        Procesar Pago
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Pago Mesa {table.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen de cuenta */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Total de la cuenta:</span>
              <span className="font-semibold">€{orderTotal.toFixed(2)}</span>
            </div>
            {paidAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Ya pagado:</span>
                <span className="font-semibold">€{paidAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Pendiente:</span>
              <span>€{remainingAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Input para cantidad */}
          <div className="space-y-2">
            <Label htmlFor="amount">Cantidad a cobrar</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="pl-10"
                step="0.01"
                min="0"
                max={remainingAmount}
              />
            </div>
          </div>

          {/* Botones de pago */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handlePartialPayment}
              disabled={
                !paymentAmount ||
                Number.parseFloat(paymentAmount) <= 0 ||
                Number.parseFloat(paymentAmount) > remainingAmount
              }
            >
              Pago Parcial
            </Button>
            <Button onClick={handleFullPayment} className="bg-green-600 hover:bg-green-700">
              Pagar Todo
            </Button>
          </div>

          {/* Botones rápidos */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Pagos rápidos:</Label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 50, remainingAmount].map((amount) => (
                <Button
                  key={amount}
                  variant="ghost"
                  size="sm"
                  onClick={() => setPaymentAmount(amount.toString())}
                  className="text-xs"
                >
                  €{amount === remainingAmount ? remainingAmount.toFixed(0) : amount}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
