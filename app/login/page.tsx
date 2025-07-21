"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUser } from "@/context/UserContext"
import { useLanguage } from "@/context/LanguageContext"
import SelectLanguage from "@/components/SelectLanguage";


export default function Login() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading, error, clearError, isHydrated } = useUser()
  const { translations, changeLanguage, language } = useLanguage()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  useEffect(() => {
    if (isAuthenticated === true) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, router])

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
    try {
      await login(formData.email, formData.password)
      // Redirección automática por useEffect
    } catch (error) {
      // El error se maneja en el contexto
    }
  }

  if (!isHydrated) {
    return (
      <div className="d-flex vh-100 align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <h5 className="text-primary mb-3">Cargando autenticación...</h5>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid vh-100">
      <div className="row h-100">
        <div className="col-md-6 d-flex align-items-center justify-content-center bg-primary">
          <div className="text-center text-white">
            <h1 className="display-4 fw-bold">Organomex</h1>
            <p className="lead">{translations.login?.OrganomexSubtitle} </p>
          </div>
        </div>
        <div className="col-md-6 d-flex align-items-center justify-content-center">
          <div className="w-100" style={{ maxWidth: "400px" }}>
            <div className="card shadow">
              <div className="card-body p-5">
                <div className="login-container">
                  <div className="login-card">
                    <div className="login-header">
                      <SelectLanguage />
                      <h2>{translations.login?.title}</h2>
                      <p>{translations.login?.subtitle}</p>
                    </div>

                    {error && (
                      <div className="alert alert-danger" role="alert">
                        {translations.login?.errorEmailOrUser}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                      <div className="form-group ">
                        <label htmlFor="email" className="mb-1 ">{translations.login?.email}</label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="form-control"
                          placeholder={translations.login?.emailPlaceholder}
                          required
                          disabled={isLoading}
                        />
                      </div>

                      <div className="form-group">
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                          <label htmlFor="password" className="mb-1 mt-3" style={{ marginBottom: 0, marginRight: 8 }}>{translations.login?.password}</label>
                          <button
                            type="button"
                            className="password-toggle mb-1 mt-3"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                            style={{ background: 'none', border: 'none', padding: 0, marginLeft: 4, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            aria-label={showPassword ? (language === 'es' ? 'Ocultar contraseña' : 'Hide password') : (language === 'es' ? 'Mostrar contraseña' : 'Show password')}
                          >
                            <i className={`material-icons ${showPassword ? "text-primary" : "text-muted"}`}>
                              {showPassword ? "visibility_off" : "visibility"}
                            </i>
                          </button>
                        </div>
                        <div className="password-input-container">
                          <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="form-control"
                            placeholder={translations.login?.passwordPlaceholder}
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                      <center className="p-3">
                      <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={isLoading || !formData.email.trim() || !formData.password.trim()}
                      >
                        {isLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            {translations.login?.loading}
                          </>
                        ) : (
                          translations.login?.button
                        )}
                      </button>
                      </center>
                    </form>

                    <div className="login-footer text-start">
                      <Link href="/forgot-password" className="forgot-password-link">
                        {translations.login?.forgotPassword}
                      </Link>
                      <p>
                        {translations.login?.noAccount} {" "}
                        <Link href="/register" className="register-link">
                          {translations.login?.registerHere}
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
