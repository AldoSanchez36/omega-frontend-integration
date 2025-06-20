"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/services/authService"

export default function LogoutPage() {
  const [isLoggingOut, setIsLoggingOut] = useState(true)
  const [message, setMessage] = useState("Cerrando sesión...")
  const router = useRouter()

  useEffect(() => {
    const performLogout = async () => {
      try {
        setMessage("Limpiando datos de sesión...")
        
        // Limpiar token del authService
        authService.logout()
        
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
          router.push("/")
        }, 1500)
        
      } catch (error) {
        console.error("Error durante el logout:", error)
        setMessage("Error al cerrar sesión. Redirigiendo...")
        
        // Aún así, intentar limpiar y redirigir
        setTimeout(() => {
          router.push("/")
        }, 2000)
      }
    }

    performLogout()
  }, [router])

  return (
    <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
      <div className="text-center">
        <div className="card shadow-sm" style={{ maxWidth: "400px" }}>
          <div className="card-body p-5">
            {isLoggingOut ? (
              <>
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Cerrando sesión...</span>
                </div>
                <h5 className="text-primary mb-3">Cerrando Sesión</h5>
                <p className="text-muted mb-0">{message}</p>
              </>
            ) : (
              <>
                <div className="text-success mb-3">
                  <span className="material-icons" style={{ fontSize: "3rem" }}>
                    check_circle
                  </span>
                </div>
                <h5 className="text-success mb-3">¡Hasta Luego!</h5>
                <p className="text-muted mb-0">Tu sesión ha sido cerrada correctamente</p>
              </>
            )}
          </div>
        </div>
        
        <div className="mt-4">
          <small className="text-muted">
            Si no eres redirigido automáticamente,{" "}
            <a href="/" className="text-decoration-none">haz clic aquí</a>
          </small>
        </div>
      </div>
    </div>
  )
} 