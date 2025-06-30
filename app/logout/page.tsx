"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/services/authService"
import { useUser } from "@/context/UserContext"

export default function LogoutPage() {
  const [isLoggingOut, setIsLoggingOut] = useState(true)
  const [message, setMessage] = useState("Cerrando sesión...")
  const router = useRouter()
  const { logout } = useUser()

  useEffect(() => {
    const performLogout = async () => {
      try {
        setMessage("Limpiando datos de sesión...")
        await logout()
        
        // Limpiar localStorage
        localStorage.clear()
        
        // Limpiar sessionStorage
        sessionStorage.clear()
        
        // Limpiar cookies relacionadas con la sesión
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
        })
        
        setMessage("Sesión cerrada exitosamente")
        
        // Esperar un momento para mostrar el mensaje de éxito
        setTimeout(() => {
          setMessage("Redirigiendo al inicio...")
          // Redirigir a la página principal
          router.push("/login")
        }, 1500)
        
      } catch (error) {
        console.error("Error durante el logout:", error)
        setMessage("Error al cerrar sesión. Redirigiendo...")
        
        // Aún así, intentar limpiar y redirigir
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      }
    }

    performLogout()
  }, [router, logout])

  return (
    <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
      <div className="text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Cerrando sesión...</span>
        </div>
        <h5 className="text-primary mb-3">Cerrando Sesión</h5>
      </div>
    </div>
  )
} 