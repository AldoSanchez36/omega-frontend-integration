"use client"

import { useEffect, useState } from "react"
import { useUser } from "@/context/UserContext"
import { authService } from "@/services/authService"

export default function AuthDebug() {
  const { user, isAuthenticated, isLoading, error, isHydrated } = useUser()
  const [mounted, setMounted] = useState(false)
  const [showDebug, setShowDebug] = useState(true) // Mostrar por defecto para debug

  useEffect(() => {
    setMounted(true)
  }, [])

  // Mostrar siempre en desarrollo para debuggear el problema
  if (!mounted || process.env.NODE_ENV !== "development") {
    return null
  }

  const handleTestAuth = () => {
    console.log("🧪 Test Auth State:")
    console.log("Context User:", user)
    console.log("Context Authenticated:", isAuthenticated)
    console.log("Context Hydrated:", isHydrated)
    console.log("Context Loading:", isLoading)
    console.log("LocalStorage Token:", localStorage.getItem("Organomex_token"))
    console.log("LocalStorage User:", localStorage.getItem("Organomex_user"))
    /* console.log("AuthService User:", authService.getCurrentUser()) */
    console.log("AuthService Token:", authService.getToken())
  }

  return (
    <div className="position-fixed bottom-0 end-0 m-3" style={{ zIndex: 9999 }}>
      {!showDebug ? (
        <button
          className="btn btn-dark btn-sm"
          onClick={() => setShowDebug(true)}
          title="Mostrar debug de autenticación"
        >
          🐛 Auth Debug
        </button>
      ) : (
        <div className="p-3 bg-dark text-white rounded shadow" style={{ fontSize: "12px", maxWidth: "350px" }}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <strong>🐛 Auth Debug</strong>
            <div>
              <button className="btn btn-sm btn-outline-light me-1" onClick={handleTestAuth}>
                Test
              </button>
              <button className="btn btn-sm btn-outline-light" onClick={() => setShowDebug(false)}>
                ✕
              </button>
            </div>
          </div>
          <div>
            <strong>Hydrated:</strong> {isHydrated ? "✅" : "❌"}
            <br />
            <strong>Loading:</strong> {isLoading ? "✅" : "❌"}
            <br />
            <strong>Authenticated:</strong> {isAuthenticated ? "✅" : "❌"}
            <br />
            <strong>User:</strong> {user ? user.username : "null"}
            <br />
            <strong>Role:</strong> {user ? user.puesto : "none"}
            <br />
            <strong>Error:</strong> {error || "none"}
            <br />
            <strong>Token:</strong> {localStorage.getItem("Organomex_token") ? "✅" : "❌"}
            <br />
            <strong>LocalStorage User:</strong> {localStorage.getItem("Organomex_user") ? "✅" : "❌"}
            <br />
            <strong>Current URL:</strong> {window.location.pathname}
          </div>
        </div>
      )}
    </div>
  )
}
