"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/context/UserContext"

interface ProtectedRouteProps {
  children: React.ReactNode
  adminOnly?: boolean
  redirectTo?: string
}

export default function ProtectedRoute({ children, adminOnly = false, redirectTo = "/dashboard" }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading, isHydrated } = useUser()
  const router = useRouter()
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    // Solo verificar autenticación después de la hidratación
    if (!isHydrated) return

    // Si está cargando, esperar
    if (isLoading) return

    // Si no está autenticado, redirigir
    if (isAuthenticated === false) {
      router.push(redirectTo)
      return
    }

    // Si está autenticado pero es null (aún no se ha verificado), esperar
    if (isAuthenticated === null) return

    // Verificar permisos de admin si es necesario
    if (adminOnly && user?.puesto !== "admin") {
      router.push("/dashboard")
      return
    }

    // Todo está bien, renderizar
    setShouldRender(true)
  }, [isAuthenticated, user, isLoading, isHydrated, adminOnly, router, redirectTo])

  // Mostrar loading mientras se hidrata o se verifica autenticación
  if (!isHydrated || isLoading || !shouldRender) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 mx-auto mb-3"></div>
          <h5 className="text-gray-700 text-lg">Verificando autenticación...</h5>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
