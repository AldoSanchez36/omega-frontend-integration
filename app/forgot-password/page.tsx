"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simular envío de email
    setTimeout(() => {
      setMessage("Se ha enviado un enlace de recuperación a tu email.")
      setIsLoading(false)
    }, 2000)
  }

  return (
    <div className="container-fluid vh-100">
      <div className="row h-100">
        <div className="col-md-6 d-flex align-items-center justify-content-center bg-primary">
          <div className="text-center text-white">
            <h1 className="display-4 fw-bold">Omega</h1>
            <p className="lead">Recupera tu acceso</p>
          </div>
        </div>
        <div className="col-md-6 d-flex align-items-center justify-content-center">
          <div className="w-100" style={{ maxWidth: "400px" }}>
            <div className="card shadow">
              <div className="card-body p-5">
                <h2 className="card-title text-center mb-4">Recuperar Contraseña</h2>

                {message && (
                  <div className="alert alert-success" role="alert">
                    {message}
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ingresa tu email"
                      required
                      disabled={isLoading}
                    />
                    <small className="text-muted">Te enviaremos un enlace para restablecer tu contraseña.</small>
                  </div>

                  <button type="submit" className="btn btn-primary w-100 mb-3" disabled={isLoading || !email.trim()}>
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Enviando...
                      </>
                    ) : (
                      "Enviar enlace de recuperación"
                    )}
                  </button>
                </form>

                <div className="text-center">
                  <p>
                    ¿Recordaste tu contraseña? <Link href="/login">Inicia sesión aquí</Link>
                  </p>
                  <Link href="/">Volver al inicio</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
