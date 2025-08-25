"use client"

import type React from "react"

// Estilos personalizados para los switches
const customSwitchStyles = `
  .custom-switch {
    width: 3rem !important;
    height: 1.5rem !important;
    background-color: #e9ecef !important;
    border: 2px solid #dee2e6 !important;
    border-radius: 1rem !important;
    transition: all 0.3s ease !important;
    position: relative !important;
  }
  
  .custom-switch:checked {
    background-color: #0d6efd !important;
    border-color: #0d6efd !important;
  }
  
  .custom-switch:not(:checked) {
    background-color: #f8f9fa !important;
    border-color: #adb5bd !important;
  }
  
  .custom-switch::before {
    content: '' !important;
    position: absolute !important;
    top: 50% !important;
    left: 3px !important;
    width: 1.1rem !important;
    height: 1.1rem !important;
    background-color: #6c757d !important;
    border-radius: 50% !important;
    transition: all 0.3s ease !important;
    transform: translateY(-50%) !important;
  }
  
  .custom-switch:checked::before {
    background-color: white !important;
    transform: translateY(-50%) translateX(1.5rem) !important;
  }
  
  .custom-switch:not(:checked)::before {
    background-color: #6c757d !important;
    transform: translateY(-50%) translateX(0) !important;
  }
`

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUser } from "@/context/UserContext"
import Navbar from "@/components/Navbar"
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"
import { useThemeCustom } from "@/hooks/useTheme"

export default function Profile() {
  const { user, updateUser, logout, isAuthenticated, isLoading } = useUser()
  const router = useRouter()
  const { theme, toggleTheme, isDarkMode } = useThemeCustom()
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    puesto: "",
  })
  
  // Estado para preferencias
  const [preferencias, setPreferencias] = useState({
    notificaciones_email: true,
    notificaciones_sistema: true,
    notificaciones_reportes: true,
    idioma: 'es',
    densidad_interfaz: 'normal'
  })
  const [guardandoPreferencias, setGuardandoPreferencias] = useState(false)
  const [cargandoPreferencias, setCargandoPreferencias] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        puesto: user.puesto,
      })
      
      // Cargar preferencias del usuario
      cargarPreferencias()
    }
  }, [user])
  
  // Función para cargar preferencias desde la API
  const cargarPreferencias = async () => {
    try {
      setCargandoPreferencias(true)
      const token = localStorage.getItem('Organomex_token')
      
      if (!token) {
        console.error('No hay token de autenticación')
        return
      }
      
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PREFERENCIAS_MIS_PREFERENCIAS}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.preferencias) {
          setPreferencias(data.preferencias)
        }
      } else {
        console.error('Error al cargar preferencias:', response.statusText)
      }
    } catch (error) {
      console.error('Error al cargar preferencias:', error)
    } finally {
      setCargandoPreferencias(false)
    }
  }
  
  // Función para manejar cambios en preferencias
  const handlePreferenciaChange = (campo: string, valor: any) => {
    setPreferencias(prev => ({
      ...prev,
      [campo]: valor
    }))
  }
  
  // Función para guardar preferencias
  const handleGuardarPreferencias = async () => {
    try {
      setGuardandoPreferencias(true)
      const token = localStorage.getItem('Organomex_token')
      
      if (!token) {
        alert('No hay token de autenticación')
        return
      }
      
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PREFERENCIAS_MIS_PREFERENCIAS}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferencias)
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.ok) {
          alert('Preferencias guardadas correctamente')
        } else {
          alert('Error al guardar preferencias: ' + data.msg)
        }
      } else {
        alert('Error al guardar preferencias')
      }
    } catch (error) {
      console.error('Error al guardar preferencias:', error)
      alert('Error al guardar preferencias')
    } finally {
      setGuardandoPreferencias(false)
    }
  }
  
  // Función para restaurar valores por defecto
  const handleRestaurarPreferencias = () => {
    if (confirm('¿Estás seguro de que quieres restaurar las preferencias por defecto?')) {
      setPreferencias({
        notificaciones_email: true,
        notificaciones_sistema: true,
        notificaciones_reportes: true,
        idioma: 'es',
        densidad_interfaz: 'normal'
      })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Solo incluir puesto si el usuario es admin
    const updateData: any = {
      username: formData.username,
      email: formData.email,
    }
    
    // Solo agregar puesto si es admin
    if (user?.puesto === "admin") {
      updateData.puesto = formData.puesto
    }
    
    updateUser(updateData)
    setEditing(false)
    alert("Perfil actualizado correctamente")
  }

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customSwitchStyles }} />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <Navbar role={user?.puesto || 'client'} />
        {/* Main Content */}
        <div className="container py-4 bg-transparent">
        <div className="row">
          <div className=" mx-auto">
            {/* Perfil visual estilo settings */}
            <div className="card mb-4 dark:bg-gray-800 dark:border-gray-700 transition-colors duration-300">
              <div className="card-header dark:bg-gray-700 dark:border-gray-600">
                <h2 className="h4 mb-0 d-flex align-items-center dark:text-white">
                  <i className="material-icons me-2">person</i>
                  Mi Perfil
                </h2>
              </div>
              <div className="card-body p-4 dark:text-gray-200">
                                    <div className="d-flex align-items-center mb-4">
                      <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-3" style={{ width: "80px", height: "80px" }}>
                        <span className="material-icons text-white" style={{ fontSize: "2rem" }}>
                          person
                        </span>
                      </div>
                      <div className="flex-grow-1">
                        <h4 className="mb-1 dark:text-white">{user.username}</h4>
                        <p className="text-muted mb-2 dark:text-gray-400">{user.email}</p>
                        <div className="d-flex align-items-center">
                          <span className={`badge bg-${user.puesto === "admin" ? "danger" : "primary"} me-2`}>
                            {user.puesto}
                          </span>
                          <span className="text-muted dark:text-gray-400">•</span>
                        </div>
                      </div>
                    </div>
                {/* Fin header visual */}
                {!editing ? (
                  <div>
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <strong className="dark:text-white">Nombre de usuario:</strong>
                      </div>
                      <div className="col-sm-9 dark:text-gray-200">{user.username}</div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <strong className="dark:text-white">Email:</strong>
                      </div>
                      <div className="col-sm-9 dark:text-gray-200">{user.email}</div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <strong className="dark:text-white">Rol:</strong>
                      </div>
                      <div className="col-sm-9">
                        <span className={`badge bg-${user.puesto === "admin" ? "danger" : "primary"}`}>
                          {user.puesto}
                        </span>
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <strong className="dark:text-white">Fecha de registro:</strong>
                      </div>
                      <div className="col-sm-9 dark:text-gray-200">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "No disponible"}
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <strong className="dark:text-white">ID de usuario:</strong>
                      </div>
                      <div className="col-sm-9">
                        <code className="dark:text-gray-300">{user.id}</code>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <button className="btn btn-primary dark:bg-blue-600 dark:border-blue-600 dark:hover:bg-blue-700" onClick={() => setEditing(true)}>
                        <i className="material-icons me-2">edit</i>
                        Editar perfil
                      </button>
                      <Link href="/dashboard" className="btn btn-outline-secondary dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                        <i className="material-icons me-2">dashboard</i>
                        Volver al dashboard
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label htmlFor="username" className="form-label dark:text-white">
                        Nombre de usuario
                      </label>
                      <input
                        type="text"
                        className="form-control dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label dark:text-white">
                        Email
                      </label>
                      <input
                        type="email"
                        className="form-control dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        id="email"
                        name="email"
                        value={formData.email}
                        
                        required
                        disabled
                        readOnly
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Rol</label>
                      <div className="form-control-plaintext">
                        <span className={`badge bg-${user.puesto === "admin" ? "danger" : "primary"}`}>
                          {user.puesto}
                        </span>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <button type="submit" className="btn btn-success dark:bg-green-600 dark:border-green-600 dark:hover:bg-green-700">
                        <i className="material-icons me-2">save</i>
                        Guardar cambios
                      </button>
                      <button type="button" className="btn btn-secondary dark:bg-gray-600 dark:border-gray-600 dark:hover:bg-gray-700" onClick={() => setEditing(false)}>
                        <i className="material-icons me-2">cancel</i>
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
            {/* Preferencias del Sistema */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="card dark:bg-gray-800 dark:border-gray-700 transition-colors duration-300">
                  <div className="card-header dark:bg-gray-700 dark:border-gray-600">
                    <h5 className="card-title mb-0 dark:text-white">
                      <i className="material-icons me-2">tune</i>
                      Preferencias del Sistema
                    </h5>
                  </div>
                  <div className="card-body dark:text-gray-200">
                    {cargandoPreferencias ? (
                      <div className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Cargando preferencias...</span>
                        </div>
                        <p className="mt-2 text-muted">Cargando preferencias...</p>
                      </div>
                    ) : (
                      <>
                        <div className="row">
                          <div className="col-md-4 mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1 dark:text-white">Notificaciones del Sistema</h6>
                            <small className="text-muted dark:text-gray-400">Recibir notificaciones del sistema</small>
                          </div>
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input custom-switch"
                              type="checkbox"
                              checked={preferencias?.notificaciones_sistema || false}
                              onChange={(e) => handlePreferenciaChange('notificaciones_sistema', e.target.checked)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1">Notificaciones por Email</h6>
                            <small className="text-muted">Recibir notificaciones por correo</small>
                          </div>
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input custom-switch"
                              type="checkbox"
                              checked={preferencias?.notificaciones_email || false}
                              onChange={(e) => handlePreferenciaChange('notificaciones_email', e.target.checked)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1">Notificaciones de Reportes</h6>
                            <small className="text-muted">Recibir notificaciones de reportes</small>
                          </div>
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input custom-switch"
                              type="checkbox"
                              checked={preferencias?.notificaciones_reportes || false}
                              onChange={(e) => handlePreferenciaChange('notificaciones_reportes', e.target.checked)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Funcionalidades no preparadas aún */}
                    
                    <div className="row mt-3">
                      <div className="col-md-4 mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1 dark:text-white">Modo Oscuro</h6>
                            <small className="text-muted dark:text-gray-400">
                              Cambiar a tema oscuro
                              <span className="ms-2 px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                                {isDarkMode() ? '🌙 Oscuro' : '☀️ Claro'}
                              </span>
                            </small>
                          </div>
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input custom-switch"
                              type="checkbox"
                              checked={isDarkMode()}
                              onChange={toggleTheme}
                            />
                          </div>
                        </div>
                      </div>
                      {/*
                      <div className="col-md-4 mb-3">
                        <div>
                          <h6 className="mb-1">Idioma</h6>
                          <small className="text-muted">Idioma de la interfaz</small>
                          <select
                            className="form-select mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={preferencias?.idioma || 'es'}
                            onChange={(e) => handlePreferenciaChange('idioma', e.target.value)}
                          >
                            <option value="es" className="dark:bg-gray-700 dark:text-white">Español</option>
                            <option value="en" className="dark:bg-gray-700 dark:text-white">English</option>
                          </select>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div>
                          <h6 className="mb-1">Densidad de Interfaz</h6>
                          <small className="text-muted">Tamaño de elementos</small>
                          <select
                            className="form-select mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={preferencias?.densidad_interfaz || 'normal'}
                            onChange={(e) => handlePreferenciaChange('densidad_interfaz', e.target.value)}
                          >
                            <option value="compacta" className="dark:bg-gray-700 dark:text-white">Compacta</option>
                            <option value="normal" className="dark:bg-gray-700 dark:text-white">Normal</option>
                            <option value="amplia" className="dark:bg-gray-700 dark:text-white">Amplia</option>
                          </select>
                        </div>
                      </div>
                    </div>
                     <div className="row mt-3">
                      <div className="col-md-4 mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1">Mostrar Tutoriales</h6>
                            <small className="text-muted">Mostrar guías de uso</small>
                          </div>
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={preferencias?.mostrar_tutoriales || false}
                              onChange={(e) => handlePreferenciaChange('mostrar_tutoriales', e.target.checked)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1">Auto-guardar</h6>
                            <small className="text-muted">Guardar cambios automáticamente</small>
                          </div>
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={preferencias?.auto_guardar || false}
                              onChange={(e) => handlePreferenciaChange('auto_guardar', e.target.checked)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1">Autenticación 2FA</h6>
                            <small className="text-muted">Verificación en dos pasos</small>
                          </div>
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={preferencias?.autenticacion_2fa || false}
                              onChange={(e) => handlePreferenciaChange('autenticacion_2fa', e.target.checked)}
                            />
                          </div>
                        </div>
                      </div>*/}
                    </div> 
                    <div className="mt-4 text-center">
                      <button 
                        className="btn btn-primary me-2 dark:bg-blue-600 dark:border-blue-600 dark:hover:bg-blue-700" 
                        onClick={handleGuardarPreferencias}
                        disabled={guardandoPreferencias}
                      >
                        {guardandoPreferencias ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Guardando...
                          </>
                        ) : (
                          <>
                            <i className="material-icons me-2">save</i>
                            Guardar Preferencias
                          </>
                        )}
                      </button>
                      <button 
                        className="btn btn-outline-secondary dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700" 
                        onClick={handleRestaurarPreferencias}
                        disabled={guardandoPreferencias}
                      >
                        <i className="material-icons me-2">restore</i>
                        Restaurar Valores por Defecto
                      </button>
                    </div>
                        </>
                      )}
                  </div>
                </div>
              </div>
            </div>
            {/* Seguridad (visual, sin funcionalidad real) */}
            {/* <div className="row mb-4">
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
                        <button className="btn btn-outline-primary w-100" disabled>
                          <i className="material-icons me-2">lock</i>
                          Cambiar Contraseña
                        </button>
                      </div>
                      <div className="col-md-4 mb-2">
                        <button className="btn btn-outline-info w-100" disabled>
                          <i className="material-icons me-2">phone_android</i>
                          Autenticación 2FA
                        </button>
                      </div>
                      <div className="col-md-4 mb-2">
                        <button className="btn btn-outline-secondary w-100" disabled>
                          <i className="material-icons me-2">devices</i>
                          Sesiones Activas
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
