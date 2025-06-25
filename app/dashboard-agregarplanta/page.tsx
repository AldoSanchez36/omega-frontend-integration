"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Navbar } from "@/components/Navbar"

// Define types locally to resolve import issue

interface Client {
  id: string
  name: string
  email: string
  company?: string
  puesto?: string
  username: string
}

type UserRole = "admin" | "user" | "client" | "guest";

interface User {
  id: string
  name: string
  email: string
  role: UserRole

}

export default function AgregarPlanta() {
  const router = useRouter()
  const token = typeof window !== "undefined" ? localStorage.getItem("omega_token") : null

  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [plantData, setPlantData] = useState({
    name: "",
    location: "",
    description: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
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
    console.log(`🐛 AgregarPlanta: ${message}`)
    setDebugInfo((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const loadClients = async () => {
      addDebugLog("Cargando clientes disponibles")
      try {
        const res = await fetch("http://localhost:4000/api/auth/users", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.message || "No se pudieron cargar los clientes")
        }
        const data = await res.json()
        // Filtrar solo usuarios con puesto === 'client'
        const clientes = (data.usuarios || []).filter((u: any) => u.puesto === "client")
        console.log(clientes)
        setClients(clientes)
        addDebugLog(`Cargados ${clientes.length} clientes (puesto=client)`)
      } catch (error: any) {
        addDebugLog(`Error cargando clientes: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }
    loadClients()
  }, [token])

  const handleInputChange = (field: string, value: string) => {
    setPlantData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    addDebugLog("Iniciando creación de nueva planta")
    try {
      const plantPayload = {
        nombre: plantData.name,
        ubicacion: plantData.location,
        descripcion: plantData.description,
        contacto: plantData.contactPerson,
        email_contacto: plantData.contactEmail,
        telefono_contacto: plantData.contactPhone,
        cliente_id: selectedClient,
        status: "active",
      }
      // Llamada real a la API para crear la planta
      const res = await fetch("http://localhost:4000/api/plantas/crear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(plantPayload),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "Error creando planta")
      }
      addDebugLog(`Planta "${plantData.name}" creada exitosamente`)
      router.push("/dashboard")
    } catch (error: any) {
      addDebugLog(`Error creando planta: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    addDebugLog("Logout solicitado - redirigiendo a home")
    router.push("/")
  }

  const isFormValid = selectedClient && plantData.name && plantData.location

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
                    <Link className="dropdown-item" href="/profile">
                      <span className="material-icons me-2">person</span>
                      Perfil
                    </Link>
                  </li>
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
          <strong>🏭 Agregar Planta:</strong> Formulario para crear una nueva planta en el sistema.
        </div>

        {/*<div className="min-h-screen bg-gray-50">
      <Navbar role={mockUser.role} />*/}


        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-0">Agregar Nueva Planta</h1>
            <p className="text-muted">Completa la información para crear una nueva planta</p>
            <p className="text-info">
              <strong>URL actual:</strong> /dashboard-agregarplanta
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Client Selection */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Selección de Cliente</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Cliente *</label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder="Seleccionar cliente existente"
                      // @ts-ignore
                      children={
                        selectedClient
                          ? (() => {
                              const client = clients.find((c) => c.id === selectedClient)
                              return client ? client.username : "-"
                            })()
                          : "-"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-[#f6f6f6] text-gray-900">
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedClient && (
                <div className="alert alert-primary">
                  <h6 className="alert-heading">Cliente Seleccionado</h6>
                  {(() => {
                    const client = clients.find((c) => c.id === selectedClient)
                    return client ? (
                      <div className="mt-2">
                        <p className="mb-1"><strong>{client.company}</strong></p>
                        <p className="mb-0 text-muted">{client.email}</p>
                      </div>
                    ) : null
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Plant Information */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Información de la Planta</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Nombre de la Planta *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={plantData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Ej: Planta Norte"
                    required
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Ubicación *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={plantData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="Ej: Ciudad, País"
                    required
                  />
                </div>

                <div className="col-12 mb-3">
                  <label className="form-label">Descripción</label>
                  <textarea
                    className="form-control"
                    value={plantData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Descripción detallada de la planta..."
                    rows={3}
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Información de Contacto</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Persona de Contacto</label>
                  <input
                    type="text"
                    className="form-control"
                    value={plantData.contactPerson}
                    onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                    placeholder="Nombre completo"
                  />
                </div>

                <div className="col-md-4 mb-3">
                  <label className="form-label">Email de Contacto</label>
                  <input
                    type="email"
                    className="form-control"
                    value={plantData.contactEmail}
                    onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                    placeholder="contacto@empresa.com"
                  />
                </div>

                <div className="col-md-4 mb-3">
                  <label className="form-label">Teléfono de Contacto</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={plantData.contactPhone}
                    onChange={(e) => handleInputChange("contactPhone", e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => router.push("/dashboard")}
                >
                  <i className="material-icons me-2">cancel</i>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!isFormValid || saving}
                >
                  {saving ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" role="status">
                        <span className="visually-hidden">Guardando...</span>
                      </div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <i className="material-icons me-2">factory</i>
                      Crear Planta
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>


        {/* Debug Info */}
        <div className="row mt-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">🐛 Debug Agregar Planta</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Estado Actual:</h6>
                    <ul className="list-unstyled">
                      <li>✅ Formulario cargado correctamente</li>
                      <li>✅ Clientes cargados: {clients.length}</li>
                      <li>✅ Cliente seleccionado: {selectedClient ? "Sí" : "No"}</li>
                      <li>✅ Formulario válido: {isFormValid ? "Sí" : "No"}</li>
                      <li>🔄 Guardando: {saving ? "Sí" : "No"}</li>
                      <li>📝 Nombre planta: {plantData.name || "No ingresado"}</li>
                      <li>📍 Ubicación: {plantData.location || "No ingresada"}</li>
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
