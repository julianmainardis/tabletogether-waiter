"use client"

// Utilidades para el sistema de notificaciones

export const requestNotificationPermission = async () => {
  if ("Notification" in window) {
    const permission = await Notification.requestPermission()
    return permission === "granted"
  }
  return false
}

export const showBrowserNotification = (title: string, message: string, tableId: number) => {
  if ("Notification" in window && Notification.permission === "granted") {
    const notification = new Notification(title, {
      body: message,
      icon: "/placeholder.svg?height=64&width=64&text=🔔",
      badge: "/placeholder.svg?height=32&width=32&text=🍽️",
      tag: `table-${tableId}`,
      requireInteraction: true,
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    // Auto cerrar después de 10 segundos
    setTimeout(() => notification.close(), 10000)
  }
}

export const playAlertSound = (priority: "low" | "medium" | "high") => {
  // En una implementación real, tendrías diferentes sonidos para cada prioridad
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

  const frequencies = {
    low: 440, // La
    medium: 554, // Do#
    high: 659, // Mi
  }

  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.value = frequencies[priority]
  oscillator.type = "sine"

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.5)
}
