"use client"

import { useEffect, useState } from "react"
import { Bell, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AlertSystemProps {
  alerts: any[]
  onSoundToggle: (enabled: boolean) => void
  soundEnabled: boolean
}

export function AlertSystem({ alerts, onSoundToggle, soundEnabled }: AlertSystemProps) {
  const [lastAlertCount, setLastAlertCount] = useState(alerts.length)

  useEffect(() => {
    // Detectar nuevas alertas
    if (alerts.length > lastAlertCount && soundEnabled) {
      // Simular sonido de notificación
      playNotificationSound()
    }
    setLastAlertCount(alerts.length)
  }, [alerts.length, lastAlertCount, soundEnabled])

  const playNotificationSound = () => {
    // En una implementación real, aquí reproducirías un archivo de audio
    console.log("🔔 ¡Nueva alerta!")

    // Simular vibración en dispositivos móviles
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200])
    }
  }

  const highPriorityCount = alerts.filter((alert) => alert.priority === "high" && !alert.resolved).length
  const mediumPriorityCount = alerts.filter((alert) => alert.priority === "medium" && !alert.resolved).length
  const lowPriorityCount = alerts.filter((alert) => alert.priority === "low" && !alert.resolved).length

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Sistema de Alertas
          </div>
          <Button variant="ghost" size="sm" onClick={() => onSoundToggle(!soundEnabled)}>
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{highPriorityCount}</div>
            <Badge variant="destructive" className="text-xs">
              Alta prioridad
            </Badge>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{mediumPriorityCount}</div>
            <Badge variant="secondary" className="text-xs">
              Media prioridad
            </Badge>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{lowPriorityCount}</div>
            <Badge variant="outline" className="text-xs">
              Baja prioridad
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
