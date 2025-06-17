"use client"

import { useState, useEffect } from "react"

export default function ConnectionTest() {
  const [status, setStatus] = useState<"checking" | "connected" | "error">("checking")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Intenta hacer una petición simple al backend
        const response = await fetch("http://localhost:4000/api/health", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          setStatus("connected")
          setMessage("✅ Conexión exitosa con el backend")
        } else {
          setStatus("error")
          setMessage(`❌ Backend responde pero con error: ${response.status}`)
        }
      } catch (error) {
        setStatus("error")
        setMessage("❌ No se puede conectar al backend. ¿Está corriendo en puerto 4000?")
      }
    }

    testConnection()
  }, [])

  if (status === "checking") {
    return (
      <div className="alert alert-info">
        <div className="d-flex align-items-center">
          <div className="spinner-border spinner-border-sm me-2" role="status"></div>
          Verificando conexión con el backend...
        </div>
      </div>
    )
  }

  return (
    <div className={`alert ${status === "connected" ? "alert-success" : "alert-danger"}`}>
      {message}
      {status === "error" && (
        <div className="mt-2">
          <small>
            <strong>Solución:</strong>
            <br />
            1. Verifica que tu backend esté corriendo en http://localhost:4000
            <br />
            2. Revisa que tenga configurado CORS para http://localhost:3000
          </small>
        </div>
      )}
    </div>
  )
}
