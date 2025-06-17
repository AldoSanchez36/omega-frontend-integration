"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useUser } from "../context/UserContext"
import { useForm } from "../hooks/useForm"
import "./styles/RegisterScreen.css"

const RegisterScreen = () => {
  const navigate = useNavigate()
  const { register, isAuthenticated, isLoading, error, clearError } = useUser()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { formState, onInputChange, onResetForm } = useForm({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    puesto: "user", // default role
  })

  const { username, email, password, confirmPassword, puesto } = formState

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard-manager")
    }
  }, [isAuthenticated, navigate])

  const onSubmit = async (event) => {
    event.preventDefault()
    clearError()

    // Validaciones
    if (!username.trim() || !email.trim() || !password.trim()) {
      return
    }

    if (password !== confirmPassword) {
      alert("Las contraseñas no coinciden")
      return
    }

    if (password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres")
      return
    }

    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        puesto,
      })
      // Navigation will happen automatically due to useEffect
    } catch (error) {
      // Error is handled by context
      console.error("Registration error:", error)
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h2>Crear Cuenta</h2>
          <p>Únete a Omega</p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="username">Nombre de Usuario</label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={onInputChange}
              className="form-control"
              placeholder="Ingresa tu nombre de usuario"
              required
              disabled={isLoading}
            />
          </div>

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
            <label htmlFor="puesto">Rol</label>
            <select
              id="puesto"
              name="puesto"
              value={puesto}
              onChange={onInputChange}
              className="form-control"
              disabled={isLoading}
            >
              <option value="user">Usuario</option>
              <option value="client">Cliente</option>
              <option value="admin">Administrador</option>
            </select>
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
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <i className={`material-icons ${showPassword ? "text-primary" : "text-muted"}`}>
                  {showPassword ? "visibility_off" : "visibility"}
                </i>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={onInputChange}
                className="form-control"
                placeholder="Confirma tu contraseña"
                required
                disabled={isLoading}
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                <i className={`material-icons ${showConfirmPassword ? "text-primary" : "text-muted"}`}>
                  {showConfirmPassword ? "visibility_off" : "visibility"}
                </i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={
              isLoading || !username.trim() || !email.trim() || !password.trim() || password !== confirmPassword
            }
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creando cuenta...
              </>
            ) : (
              "Crear Cuenta"
            )}
          </button>
        </form>

        <div className="register-footer">
          <p>
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="login-link">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterScreen
