"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/context/UserContext"

export default function LogoutPage() {
  const { logout } = useUser()
  const router = useRouter()
  const [message, setMessage] = useState("Cerrando sesión...")

  useEffect(() => {
    let didRun = false
    const performLogout = async () => {
      if (didRun) return
      didRun = true
      
      try {
        setMessage("Limpiando datos de sesión...")
        
        // Limpiar localStorage inmediatamente
        if (typeof window !== "undefined") {
          localStorage.clear()
          console.log("🗑️ localStorage limpiado")
        }
        
        // Intentar logout del contexto (opcional)
        try {
          await logout()
          console.log("✅ Logout del contexto completado")
        } catch (error) {
          console.warn("⚠️ Error en logout del contexto:", error)
        }

        setMessage("Sesión cerrada exitosamente. Redirigiendo...")
        
        // Redirigir después de un breve delay
        setTimeout(() => {
          router.replace("/login")
        }, 100)
        
      } catch (error) {
        console.error("❌ Error en logout:", error)
        setMessage("Error al cerrar sesión. Redirigiendo...")
        
        // Redirigir de todas formas
        setTimeout(() => {
          router.replace("/login")
        }, 100)
      }
    }
    
    performLogout()
  }, [logout, router])

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