import { useState, useCallback } from "react"

interface DebugInfo {
  type: "info" | "success" | "error" | "warning"
  message: string
  timestamp: string
}

export const useDebugLogger = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([])

  const addDebugLog = useCallback((type: "info" | "success" | "error" | "warning", message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const newLog: DebugInfo = {
      type,
      message,
      timestamp
    }
    
    console.log(`🐛 Dashboard [${type.toUpperCase()}]: ${message}`)
    
    setDebugInfo((prev) => {
      const updated = [...prev, newLog]
      // Mantener solo los últimos 10 logs
      return updated.slice(-10)
    })
  }, [])

  const clearLogs = useCallback(() => {
    setDebugInfo([])
  }, [])

  return {
    debugInfo,
    addDebugLog,
    clearLogs
  }
}

export default useDebugLogger 