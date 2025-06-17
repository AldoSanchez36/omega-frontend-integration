"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUser } from "@/context/UserContext"

export default function Login() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading, error, clearError, isHydrated } = useUser()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  // Memoizar el callback de redirección
  const handleRedirect = useCallback(() => {
    if (isHydrated && isAuthenticated) {
      console.log("🔄 Redirigiendo al dashboard...")
      router.push("/dashboard")
    }
  }, [isHydrated, isAuthenticated, router])

  useEffect(() => {
    handleRedirect()
  }, [handleRedirect])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (error) clearError()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email.trim() || !formData.password.trim()) return

    console.log("📝 Enviando formulario de login...")
    console.log("📧 Email:", formData.email)
    console.log("🔗 API URL:", process.env.NEXT_PUBLIC_API_URL)

    try {
      console.log("🚀 Llamando a login()...")
      await login(formData.email, formData.password)
      console.log("✅ Login exitoso, esperando redirección...")
      // La redirección se maneja automáticamente por el useEffect
    } catch (error) {
      console.error("❌ Error en login:", error)
      console.error("❌ Error completo:", JSON.stringify(error, null, 2))
      // El error se maneja en el contexto
    }
  }

  // Mostrar loading mientras se hidrata
  if (!isHydrated) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid vh-100">
      <div className="row h-100">
        <div className="col-md-6 d-flex align-items-center justify-content-center bg-primary">
          <div className="text-center text-white">
            <h1 className="display-4 fw-bold">Omega</h1>
            <p className="lead">Sistema de Gestión Industrial</p>
          </div>
        </div>
        <div className="col-md-6 d-flex align-items-center justify-content-center">
          <div className="w-100" style={{ maxWidth: "400px" }}>
            <div className="card shadow">
              <div className="card-body p-5">
                <h2 className="card-title text-center mb-4">Iniciar Sesión</h2>

                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      Email
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      placeholder="Ingresa tu email"
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="password" className="form-label">
                      Contraseña
                    </label>
                    <div className="position-relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-control"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        placeholder="Ingresa tu contraseña"
                      />
                      <button
                        type="button"
                        className="btn btn-link position-absolute end-0 top-50 translate-middle-y"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                        style={{ textDecoration: "none" }}
                      >
                        <i className="material-icons">{showPassword ? "visibility_off" : "visibility"}</i>
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Iniciando sesión...
                      </>
                    ) : (
                      "Iniciar Sesión"
                    )}
                  </button>
                </form>

                <div className="text-center mt-3">
                  <p>
                    ¿No tienes cuenta? <Link href="/register">Regístrate aquí</Link>
                  </p>
                  <Link href="/forgot-password">¿Olvidaste tu contraseña?</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
