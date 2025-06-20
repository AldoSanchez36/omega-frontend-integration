"use client"

import type React from "react"
import { useEffect, useState } from "react"
import axios from "axios"
import { authService } from "@/services/authService"

interface User {
  _id: string
  username: string
  email: string
  puesto?: string
  role?: string
  createdAt?: string
  updatedAt?: string
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log("🔍 Iniciando petición al backend con axios...")
        setLoading(true)
        setError(null)
        
        // Obtener token
        const token = authService.getToken()
        if (!token) {
          console.error("❌ No hay token de autenticación")
          setError("No hay token de autenticación")
          setLoading(false)
          return
        }
        
        console.log("🔑 Token encontrado:", token.substring(0, 20) + "...")
        
        // Hacer la petición con axios
        const response = await axios.get("http://localhost:4000/api/auth/users", {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        
        console.log("📡 Respuesta del servidor:")
        console.log("Status:", response.status)
        console.log("Status Text:", response.statusText)
        console.log("Headers:", response.headers)
        
        console.log("📦 Datos recibidos:")
        console.log(JSON.stringify(response.data, null, 2))
        
        // Procesar los datos recibidos
        const usersData = Array.isArray(response.data) ? response.data : (response.data.users || response.data.usuarios || [])
        setUsers(usersData)
        
        // Obtener el rol del usuario actual desde el token
        try {
          const tokenData = JSON.parse(atob(token.split('.')[1]))
          setCurrentUserRole(tokenData.userType || tokenData.role || 'user')
        } catch (e) {
          console.error("Error decodificando token:", e)
          setCurrentUserRole('user')
        }
        
      } catch (err) {
        console.error("❌ Error en la petición:")
        if (axios.isAxiosError(err)) {
          console.error("Status:", err.response?.status)
          console.error("Status Text:", err.response?.statusText)
          console.error("Data:", err.response?.data)
          console.error("Message:", err.message)
          
          if (err.response?.status === 401) {
            setError("Sesión expirada. Por favor, inicia sesión nuevamente.")
          } else {
            setError(`Error del servidor: ${err.response?.status} - ${err.response?.statusText}`)
          }
        } else {
          console.error("Error:", err)
          setError("Error de conexión. Verifica que el backend esté corriendo.")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const getRoleBadge = (role: string) => {
    const roleMap: { [key: string]: { color: string; text: string } } = {
      admin: { color: "bg-danger", text: "Administrador" },
      user: { color: "bg-primary", text: "Usuario" },
      client: { color: "bg-secondary", text: "Cliente" },
      manager: { color: "bg-warning", text: "Gerente" }
    }
    
    const roleInfo = roleMap[role.toLowerCase()] || { color: "bg-info", text: role }
    return (
      <span className={`badge ${roleInfo.color} text-white`}>
        {roleInfo.text}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isAdmin = currentUserRole === 'admin'

  if (loading) {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <h5>Cargando usuarios...</h5>
        </div>
      </div>
    )
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Navigation Bar */}
      {/* <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <a className="navbar-brand fw-bold" href="/">
            <span className="material-icons me-2">business</span>
            Omega
          </a>
          
          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <a className="nav-link" href="/dashboard">
                  <span className="material-icons me-1">dashboard</span>
                  Dashboard
                </a>
              </li>
              {isAdmin && (
                <li className="nav-item">
                  <a className="nav-link" href="/dashboard-manager">
                    <span className="material-icons me-1">admin_panel_settings</span>
                    Admin Panel
                  </a>
                </li>
              )}
              <li className="nav-item">
                <a className="nav-link" href="/reports">
                  <span className="material-icons me-1">assessment</span>
                  Reportes
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link active" href="/users-management">
                  <span className="material-icons me-1">people</span>
                  Usuarios
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/services">
                  <span className="material-icons me-1">build</span>
                  Servicios
                </a>
              </li>
            </ul>
            
            <ul className="navbar-nav">
              <li className="nav-item">
                <a className="nav-link" href="/profile">
                  <span className="material-icons me-1">account_circle</span>
                  Perfil
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/logout">
                  <span className="material-icons me-1">logout</span>
                  Cerrar Sesión
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>/*}

      {/* Header */}
      <div className="bg-primary text-white py-4">
        <div className="container">
          <div className="row align-items-center">
            <div className="col">
              <h1 className="h3 mb-0">
                <span className="material-icons me-2">people</span>
                Gestión de Usuarios
              </h1>
              <p className="mb-0 opacity-75">Administra los usuarios del sistema</p>
            </div>
            <div className="col-auto">
              <span className="badge bg-light text-primary">
                {users.length} usuarios
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-4">
        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            <span className="material-icons me-2">warning</span>
            <strong>Error:</strong> {error}
            <button type="button" className="btn-close" onClick={() => setError(null)}></button>
          </div>
        )}

        <div className="card shadow-sm">
          <div className="card-header bg-white">
            <div className="row align-items-center">
              <div className="col">
                <h5 className="mb-0">Lista de Usuarios</h5>
              </div>
              <div className="col-auto">
                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => window.location.reload()}
                >
                  <span className="material-icons me-1">refresh</span>
                  Actualizar
                </button>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="border-0">Usuario</th>
                    <th className="border-0">Correo</th>
                    <th className="border-0">Rol</th>
                    <th className="border-0">Fecha de Creación</th>
                    <th className="border-0">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user._id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div>
                              <div className="fw-semibold">{user.username}</div>
                              
                            </div>
                          </div>
                        </td>
                        <td>
                          <a href={`mailto:${user.email}`} className="text-decoration-none">
                            {user.email}
                          </a>
                        </td>
                        <td>
                          {getRoleBadge(user.puesto || user.role || 'user')}
                        </td>
                        <td>
                          <small className="text-muted">
                            {formatDate(user.createdAt || '')}
                          </small>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" title="Editar">
                              <span className="material-icons">edit</span>
                            </button>
                            <button className="btn btn-outline-success" title="Guardar">
                              <span className="material-icons">save</span>
                            </button>
                            <button className="btn btn-outline-danger" title="Eliminar">
                              <span className="material-icons">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-5">
                        <div className="text-muted">
                          <span className="material-icons display-1">people_outline</span>
                          <h5 className="mt-3">No se encontraron usuarios</h5>
                          <p>No hay usuarios registrados en el sistema.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-4">
          <div className="card border-info">
            <div className="card-header bg-info text-white">
              <h6 className="mb-0">
                <span className="material-icons me-2">info</span>
                Información de Debug
              </h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <small className="text-muted">Total de usuarios:</small>
                  <div className="fw-bold">{users.length}</div>
                </div>
                <div className="col-md-3">
                  <small className="text-muted">Token disponible:</small>
                  <div className="fw-bold text-success">
                    {authService.getToken() ? "✅ Sí" : "❌ No"}
                  </div>
                </div>
                <div className="col-md-3">
                  <small className="text-muted">Tu rol:</small>
                  <div className="fw-bold text-primary">
                    {currentUserRole}
                  </div>
                </div>
                <div className="col-md-3">
                  <small className="text-muted">Estado:</small>
                  <div className="fw-bold text-success">✅ Conectado</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}