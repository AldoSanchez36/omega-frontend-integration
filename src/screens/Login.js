"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useUser } from "../context/UserContext"
import { useForm } from "../hooks/useForm"
import "./styles/Login.css"

const Login = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading, error, clearError } = useUser()
  const [showPassword, setShowPassword] = useState(false)

  const { formState, onInputChange, onResetForm } = useForm({
    email: "",
    password: "",
  })

  const { email, password } = formState

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard-manager")
    }
  }, [isAuthenticated, navigate])

  const onSubmit = async (event) => {
    event.preventDefault()
    clearError()

    if (!email.trim() || !password.trim()) {
      return
    }

    try {
      await login(email, password)
      // Navigation will happen automatically due to useEffect
    } catch (error) {
      // Error is handled by context
      console.error("Login error:", error)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Iniciar Sesión</h2>
          <p>Accede a tu cuenta de Organomex</p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={onInputChange}
              className="form-control"
              placeholder="Ingresa tu email"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={password}
                onChange={onInputChange}
                className="form-control"
                placeholder="Ingresa tu contraseña"
                required
                disabled={isLoading}
              />
              <button type="button" className="password-toggle" onClick={togglePasswordVisibility} disabled={isLoading}>
                <i className={`material-icons ${showPassword ? "text-primary" : "text-muted"}`}>
                  {showPassword ? "visibility_off" : "visibility"}
                </i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isLoading || !email.trim() || !password.trim()}
          >
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

        <div className="login-footer">
          <Link to="/forgot-password" className="forgot-password-link">
            ¿Olvidaste tu contraseña?
          </Link>
          <p>
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="register-link">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
