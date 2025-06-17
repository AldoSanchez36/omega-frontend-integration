"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUser } from "@/context/UserContext"

export default function Profile() {
  const { user, updateUser, logout, isAuthenticated, isLoading } = useUser()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    puesto: "",
  })

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
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Aquí puedes agregar la lógica para actualizar el perfil
    updateUser(formData)
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
            <div className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle active"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                {user.username}
              </a>
              <ul className="dropdown-menu">
                <li>
                  <Link className="dropdown-item active" href="/profile">
                    Perfil
                  </Link>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <button className="dropdown-item" onClick={handleLogout}>
                    Cerrar Sesión
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container py-4">
        <div className="row">
          <div className="col-lg-8 mx-auto">
            <div className="card shadow">
              <div className="card-header bg-primary text-white">
                <h2 className="h4 mb-0">
                  <i className="material-icons me-2">person</i>
                  Mi Perfil
                </h2>
              </div>
              <div className="card-body p-4">
                {!editing ? (
                  <div>
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <strong>Nombre de usuario:</strong>
                      </div>
                      <div className="col-sm-9">{user.username}</div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <strong>Email:</strong>
                      </div>
                      <div className="col-sm-9">{user.email}</div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <strong>Rol:</strong>
                      </div>
                      <div className="col-sm-9">
                        <span className={`badge bg-${user.puesto === "admin" ? "danger" : "primary"}`}>
                          {user.puesto}
                        </span>
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <strong>Fecha de registro:</strong>
                      </div>
                      <div className="col-sm-9">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "No disponible"}
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <strong>ID de usuario:</strong>
                      </div>
                      <div className="col-sm-9">
                        <code>{user.id}</code>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <button className="btn btn-primary" onClick={() => setEditing(true)}>
                        <i className="material-icons me-2">edit</i>
                        Editar perfil
                      </button>
                      <Link href="/dashboard" className="btn btn-outline-secondary">
                        <i className="material-icons me-2">dashboard</i>
                        Volver al dashboard
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label htmlFor="username" className="form-label">
                        Nombre de usuario
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                      />
                    </div>
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
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="puesto" className="form-label">
                        Rol
                      </label>
                      <select
                        className="form-control"
                        id="puesto"
                        name="puesto"
                        value={formData.puesto}
                        onChange={handleChange}
                        disabled={user.puesto !== "admin"}
                      >
                        <option value="user">Usuario</option>
                        <option value="client">Cliente</option>
                        <option value="admin">Administrador</option>
                      </select>
                      {user.puesto !== "admin" && (
                        <small className="text-muted">Solo los administradores pueden cambiar roles</small>
                      )}
                    </div>
                    <div className="d-flex gap-2">
                      <button type="submit" className="btn btn-success">
                        <i className="material-icons me-2">save</i>
                        Guardar cambios
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
                        <i className="material-icons me-2">cancel</i>
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
