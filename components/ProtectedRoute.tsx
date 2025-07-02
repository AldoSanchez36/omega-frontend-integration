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

    if (isLoading) return

    if (!isAuthenticated) {
      router.push(redirectTo)
      return
    }

    if (adminOnly && user?.puesto !== "admin") {
      router.push("/dashboard")
      return
    }

    setShouldRender(true)
  }, [isAuthenticated, user, isLoading, isHydrated, adminOnly, router, redirectTo])

  // Mostrar loading mientras se hidrata o se verifica autenticación
  if (!isHydrated || isLoading || !shouldRender) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
