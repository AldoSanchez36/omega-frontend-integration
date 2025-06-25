"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function Settings() {
  const router = useRouter()
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    role: "",
    department: "",
    phone: "",
    bio: "",
    preferences: {
      notifications: true,
      darkMode: false,
      language: "es",
    },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const mockUser: User = {
    id: "1",
    name: "Admin User",
    email: "admin@omega.com",
    role: "admin",
  }

  // Función para agregar logs de debug
  const addDebugLog = (message: string) => {
    console.log(`🐛 Settings: ${message}`)
    setDebugInfo((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const loadUserData = async () => {
      addDebugLog("Cargando datos del usuario")

      try {
        // Mock user data - replace with real fetch call
        const mockUserData = {
          name: "Admin User",
          email: "admin@omega.com",
          role: "admin",
          department: "Sistemas",
          phone: "+1 234 567 8900",
          bio: "Administrador del sistema Omega Dashboard con experiencia en monitoreo industrial.",
          preferences: {
            notifications: true,
            darkMode: false,
            language: "es",
          },
        }

        setUserData(mockUserData)
        addDebugLog("Datos del usuario cargados exitosamente")
      } catch (error) {
        addDebugLog(`Error cargando datos del usuario: ${error}`)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setUserData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handlePreferenceChange = (preference: string, value: boolean | string) => {
    setUserData((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: value,
      },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    addDebugLog("Guardando configuración del usuario")

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      addDebugLog("Configuración guardada exitosamente")
    } catch (error) {
      addDebugLog(`Error guardando configuración: ${error}`)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    addDebugLog("Logout solicitado - redirigiendo a home")
    router.push("/")
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-danger"
      case "operator":
        return "bg-primary"
      case "viewer":
        return "bg-success"
      default:
        return "bg-secondary"
    }
  }

  if (loading) {
    return (
      <div className="min-vh-100 bg-light">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "50vh" }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand fw-bold" href="/">
            <span className="material-icons me-2">business</span>
            Omega Dashboard
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <Link className="nav-link" href="/dashboard">
                  <span className="material-icons me-1">dashboard</span>
                  Dashboard
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" href="/dashboard-test">
                  <span className="material-icons me-1">dashboard</span>
                  Dashboard Test
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" href="/reports">
                  <span className="material-icons me-1">assessment</span>
                  Reportes
                </Link>
              </li>
            </ul>
            {/* User Dropdown */}
            <ul className="navbar-nav">
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle d-flex align-items-center"
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <span className="material-icons me-2">account_circle</span>
                  {mockUser.name}
                </a>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <div className="dropdown-item-text px-3 py-2">
                      <div className="fw-bold">{mockUser.name}</div>
                      <small className="text-muted">{mockUser.email}</small>
                      <br />
                      <small className="text-muted">{mockUser.role}</small>
                    </div>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <Link className="dropdown-item" href="/settings">
                      <span className="material-icons me-2">settings</span>
                      Configuración
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item text-danger" onClick={handleLogout}>
                      <span className="material-icons me-2">logout</span>
                      Cerrar Sesión
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container py-4">
        {/* Status Banner */}
        <div className="alert alert-info" role="alert">
          <i className="material-icons me-2">info</i>
          <strong>⚙️ Configuración:</strong> Gestiona tu perfil y preferencias del sistema.
        </div>

        {/* Page Header */}
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-0">Configuración</h1>
            <p className="text-muted">Gestiona tu perfil y preferencias del sistema</p>
            <p className="text-info">
              <strong>URL actual:</strong> /settings
            </p>
          </div>
        </div>

        {/* Profile Overview */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="material-icons me-2">person</i>
                  Perfil de Usuario
                </h5>
              </div>
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-3" 
                       style={{ width: "80px", height: "80px" }}>
                    <span className="material-icons text-white" style={{ fontSize: "2rem" }}>
                      person
                    </span>
                  </div>
                  <div className="flex-grow-1">
                    <h4 className="mb-1">{userData.name}</h4>
                    <p className="text-muted mb-2">{userData.email}</p>
                    <div className="d-flex align-items-center">
                      <span className={`badge ${getRoleBadgeColor(userData.role)} me-2`}>
                        {userData.role.toUpperCase()}
                      </span>
                      <span className="text-muted">•</span>
                      <span className="text-muted ms-2">{userData.department}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="material-icons me-2">edit</i>
                  Información Personal
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold">Nombre Completo</label>
                    <input
                      type="text"
                      className="form-control"
                      value={userData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Tu nombre completo"
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={userData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="tu@email.com"
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold">Departamento</label>
                    <input
                      type="text"
                      className="form-control"
                      value={userData.department}
                      onChange={(e) => handleInputChange("department", e.target.value)}
                      placeholder="Tu departamento"
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold">Teléfono</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={userData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div className="col-12 mb-3">
                    <label className="form-label fw-bold">Biografía</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={userData.bio}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      placeholder="Cuéntanos sobre ti..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Preferences */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="material-icons me-2">tune</i>
                  Preferencias del Sistema
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-1">Notificaciones</h6>
                        <small className="text-muted">Recibir notificaciones del sistema</small>
                      </div>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={userData.preferences.notifications}
                          onChange={(e) => handlePreferenceChange("notifications", e.target.checked)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4 mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-1">Modo Oscuro</h6>
                        <small className="text-muted">Cambiar a tema oscuro</small>
                      </div>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={userData.preferences.darkMode}
                          onChange={(e) => handlePreferenceChange("darkMode", e.target.checked)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4 mb-3">
                    <div>
                      <h6 className="mb-1">Idioma</h6>
                      <small className="text-muted">Idioma de la interfaz</small>
                      <select
                        className="form-select mt-1"
                        value={userData.preferences.language}
                        onChange={(e) => handlePreferenceChange("language", e.target.value)}
                      >
                        <option value="es">Español</option>
                        <option value="en">English</option>
                        <option value="pt">Português</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="material-icons me-2">security</i>
                  Seguridad
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4 mb-2">
                    <button className="btn btn-outline-primary w-100">
                      <i className="material-icons me-2">lock</i>
                      Cambiar Contraseña
                    </button>
                  </div>
                  <div className="col-md-4 mb-2">
                    <button className="btn btn-outline-info w-100">
                      <i className="material-icons me-2">phone_android</i>
                      Autenticación 2FA
                    </button>
                  </div>
                  <div className="col-md-4 mb-2">
                    <button className="btn btn-outline-secondary w-100">
                      <i className="material-icons me-2">devices</i>
                      Sesiones Activas
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <div className="d-flex justify-content-end">
                  <button 
                    className="btn btn-primary btn-lg" 
                    onClick={handleSave} 
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="material-icons me-2">save</i>
                        Guardar Configuración
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">🐛 Debug Settings</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Estado Actual:</h6>
                    <ul className="list-unstyled">
                      <li>✅ Página de configuración cargada</li>
                      <li>✅ Datos del usuario cargados</li>
                      <li>✅ Formularios funcionales</li>
                      <li>✅ Navegación funcional</li>
                      <li>👤 Usuario: {userData.name}</li>
                      <li>📧 Email: {userData.email}</li>
                      <li>🔔 Notificaciones: {userData.preferences.notifications ? "Activadas" : "Desactivadas"}</li>
                      <li>🌙 Modo Oscuro: {userData.preferences.darkMode ? "Activado" : "Desactivado"}</li>
                      <li>🌐 Idioma: {userData.preferences.language}</li>
                      <li>💾 Guardando: {saving ? "Sí" : "No"}</li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6>Logs Recientes:</h6>
                    <div
                      className="bg-dark text-light p-2 rounded"
                      style={{ fontSize: "0.8rem", maxHeight: "150px", overflowY: "auto" }}
                    >
                      {debugInfo.length > 0 ? (
                        debugInfo.map((log, index) => (
                          <div key={index} className="text-info">
                            <small>{log}</small>
                          </div>
                        ))
                      ) : (
                        <div className="text-muted">No hay logs aún...</div>
                      )}
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
