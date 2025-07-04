"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/context/UserContext"

export default function LogoutPage() {
  const { logout } = useUser()
  const router = useRouter()
  const [message, setMessage] = useState("Cerrando sesión...")
  const didRunRef = useRef(false)

  const handleLogout = () => {
    if (didRunRef.current) return
    didRunRef.current = true
    setMessage("Limpiando datos de sesión...")
    logout()
    setMessage("Sesión cerrada exitosamente. Redirigiendo...")
    setTimeout(() => {
      router.replace("/")
    }, 300)
  }

  // Ejecutar handleLogout una sola vez al montar
  if (typeof window !== "undefined" && !didRunRef.current) {
    handleLogout()
  }

  return (
    <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
      <div className="text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Cerrando sesión...</span>
        </div>
        <h5 className="text-primary mb-3">{message}</h5>
      </div>
    </div>
  )
} 