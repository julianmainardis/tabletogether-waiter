"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users, ArrowRight } from "lucide-react"

interface AssignTableDialogProps {
  tableId: number
  tableCapacity: number
  isOpen: boolean
  onClose: () => void
  onAssign: (tableId: number, diners: number) => void
}

export function AssignTableDialog({ tableId, tableCapacity, isOpen, onClose, onAssign }: AssignTableDialogProps) {
  const [diners, setDiners] = useState<number>(2)

  const handleAssign = () => {
    if (diners > 0 && diners <= tableCapacity) {
      onAssign(tableId, diners)
      onClose()
    }
  }

  const quickSelect = (count: number) => {
    setDiners(count)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Asignar Mesa {tableId}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-gray-600">
              Capacidad máxima: <span className="font-semibold">{tableCapacity} personas</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="diners">¿Cuántos comensales van a ser?</Label>
            <Input
              id="diners"
              type="number"
              min="1"
              max={tableCapacity}
              value={diners}
              onChange={(e) => setDiners(Number.parseInt(e.target.value) || 1)}
              className="text-center text-lg"
            />
          </div>

          {/* Botones rápidos */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Selección rápida:</Label>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: Math.min(tableCapacity, 8) }, (_, i) => i + 1).map((count) => (
                <Button
                  key={count}
                  variant={diners === count ? "default" : "outline"}
                  size="sm"
                  onClick={() => quickSelect(count)}
                >
                  {count}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancelar
            </Button>
            <Button onClick={handleAssign} className="flex-1" disabled={diners < 1 || diners > tableCapacity}>
              Asignar y ver menú
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
