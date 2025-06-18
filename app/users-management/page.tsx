"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authService } from "@/services/authService"

interface User {
  _id: string
  username: string
  email: string
  puesto: string
}

export default function UsersManagement() {
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<User>({
    _id: "",
    username: "",
    email: "",
    puesto: "",
  })

  const router = useRouter()

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        setLoading(true)
        setError(null)
        
        console.log("🔍 Intentando cargar usuarios desde el backend...")
        
        // Verificar que tenemos token
        const token = authService.getToken()
        if (!token) {
          console.error("❌ No hay token de autenticación")
          setError("No hay token de autenticación")
          router.push("/login")
          return
        }
        
        console.log("🔑 Token encontrado:", token.substring(0, 20) + "...")
        
        // Hacer la petición al backend
        const response = await fetch("http://localhost:4000/api/auth/users", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        
        console.log("📡 Respuesta del servidor:", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        })
        
        if (!response.ok) {
          if (response.status === 401) {
            console.error("❌ Token inválido o expirado")
            setError("Sesión expirada. Por favor, inicia sesión nuevamente.")
            router.push("/login")
            return
          }
          throw new Error(`Error HTTP: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log("📦 Datos recibidos:", data)
        
        // El backend puede devolver los usuarios directamente o en una propiedad
        const usuariosData = Array.isArray(data) ? data : (data.usuarios || data.users || [])
        
        console.log("👥 Usuarios procesados:", usuariosData)
        setUsuarios(usuariosData)
        
      } catch (err) {
        console.error("❌ Error cargando usuarios:", err)
        setError(`Error al cargar los usuarios: ${err instanceof Error ? err.message : 'Error desconocido'}`)
        
        // Fallback a datos mock solo si hay error de conexión
        if (err instanceof Error && err.message.includes('fetch')) {
          console.log("🔄 Usando datos mock como fallback")
          setUsuarios([
            { _id: "1", username: "admin", email: "admin@omega.com", puesto: "admin" },
            { _id: "2", username: "usuario1", email: "user1@omega.com", puesto: "user" },
            { _id: "3", username: "cliente1", email: "client1@omega.com", puesto: "client" },
          ])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUsuarios()
  }, [router])

  const handleEdit = (user: User) => {
    setCurrentUser(user)
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      console.log("💾 Guardando usuario:", currentUser)
      
      const token = authService.getToken()
      if (!token) {
        setError("No hay token de autenticación")
        return
      }
      
      // Intentar guardar en backend
      const response = await fetch(`http://localhost:4000/api/auth/update/${currentUser._id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: currentUser.username,
          email: currentUser.email,
          puesto: currentUser.puesto
        }),
      })
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }
      
      const updatedUser = await response.json()
      console.log("✅ Usuario actualizado:", updatedUser)
      
      // Actualizar la lista de usuarios localmente
      setUsuarios((prev) => prev.map((user) => (user._id === currentUser._id ? currentUser : user)))
      setShowModal(false)
      alert("Usuario actualizado correctamente")
      
    } catch (err) {
      console.error("❌ Error al guardar:", err)
      
      // Fallback: actualizar localmente
      console.log("🔄 Actualizando localmente como fallback")
      setUsuarios((prev) => prev.map((user) => (user._id === currentUser._id ? currentUser : user)))
      setShowModal(false)
      alert("Usuario actualizado localmente (backend no disponible)")
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setCurrentUser({
      ...currentUser,
      [name]: value,
    })
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando usuarios...</span>
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
            Omega
          </Link>
          <div className="navbar-nav ms-auto">
            <Link className="nav-link" href="/dashboard">
              Dashboard
            </Link>
            <Link className="nav-link" href="/reports">
              Reportes
            </Link>
            <Link className="nav-link active" href="/users-management">
              Usuarios
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container py-4">
        <div className="row">
          <div className="col-12">
            <div className="card shadow">
              <div className="card-header bg-primary text-white">
                <h1 className="h4 mb-0">
                  <i className="material-icons me-2">people</i>
                  Gestión de Usuarios
                </h1>
              </div>
              <div className="card-body">
                {error && (
                  <div className="alert alert-danger">
                    <strong>Error:</strong> {error}
                    <br />
                    <small>Verifica que el backend esté corriendo en http://localhost:4000</small>
                  </div>
                )}

                {/* Debug Info */}
                <div className="alert alert-info mb-3">
                  <strong>🔍 Debug Info:</strong>
                  <br />
                  <small>
                    • Usuarios cargados: {usuarios.length}
                    <br />
                    • Token disponible: {authService.getToken() ? "✅ Sí" : "❌ No"}
                    <br />
                    • Backend URL: http://localhost:4000/api/auth/users
                  </small>
                </div>

                <div className="table-responsive">
                  <table className="table table-striped table-hover">
                    <thead className="table-dark">
                      <tr>
                        <th>ID</th>
                        <th>Nombre de Usuario</th>
                        <th>Correo Electrónico</th>
                        <th>Puesto</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.length > 0 ? (
                        usuarios.map((usuario) => (
                          <tr key={usuario._id}>
                            <td>
                              <code>{usuario._id}</code>
                            </td>
                            <td>
                              <strong>{usuario.username}</strong>
                            </td>
                            <td>{usuario.email}</td>
                            <td>
                              <span
                                className={`badge ${
                                  usuario.puesto === "admin"
                                    ? "bg-danger"
                                    : usuario.puesto === "user"
                                      ? "bg-primary"
                                      : "bg-secondary"
                                }`}
                              >
                                {usuario.puesto}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEdit(usuario)}
                                title="Editar usuario"
                              >
                                <i className="material-icons">edit</i>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center py-4">
                            <i className="material-icons text-muted" style={{ fontSize: "3rem" }}>
                              people_outline
                            </i>
                            <p className="text-muted mt-2">No se encontraron usuarios</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3">
                  <Link href="/dashboard" className="btn btn-secondary">
                    <i className="material-icons me-2">home</i>
                    Volver al Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para edición */}
      {showModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Editar Usuario</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <form>
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">
                      Nombre de Usuario
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="username"
                      name="username"
                      value={currentUser.username}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={currentUser.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="puesto" className="form-label">
                      Puesto
                    </label>
                    <select
                      className="form-select"
                      id="puesto"
                      name="puesto"
                      value={currentUser.puesto}
                      onChange={handleChange}
                    >
                      <option value="user">User</option>
                      <option value="client">Client</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSave}>
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}