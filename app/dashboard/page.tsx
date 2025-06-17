"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Plant {
  id: string
  nombre: string
  creado_por: string
  created_at?: string
}

interface Report {
  id: string
  usuario_id: string
  planta_id: string
  proceso_id: string
  datos: any
  observaciones?: string
  created_at?: string
}

export default function Dashboard() {
  const router = useRouter()
  const [plants, setPlants] = useState<Plant[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  // 🚫 SIN CONTEXTO DE USUARIO - Usuario mock fijo
  const mockUser = {
    id: "dashboard-user-id",
    username: "Usuario Dashboard",
    email: "dashboard@example.com",
    puesto: "admin" as const,
    created_at: new Date().toISOString(),
  }

  // Función para agregar logs de debug
  const addDebugLog = (message: string) => {
    console.log(`🐛 Dashboard: ${message}`)
    setDebugInfo((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    addDebugLog("Dashboard montado - iniciando carga de datos")

    const loadData = async () => {
      try {
        setDataLoading(true)
        addDebugLog("Cargando datos mock...")

        // Simular carga de datos
        await new Promise((resolve) => setTimeout(resolve, 500))

        const mockPlants = [
          { id: "1", nombre: "Planta Norte", creado_por: mockUser.id, created_at: new Date().toISOString() },
          { id: "2", nombre: "Planta Sur", creado_por: mockUser.id, created_at: new Date().toISOString() },
          { id: "3", nombre: "Planta Central", creado_por: mockUser.id, created_at: new Date().toISOString() },
        ]

        const mockReports = [
          {
            id: "1",
            usuario_id: mockUser.id,
            planta_id: "1",
            proceso_id: "proc-1",
            datos: { temperatura: 25, presion: 1.2 },
            observaciones: "Reporte de prueba",
            created_at: new Date().toISOString(),
          },
          {
            id: "2",
            usuario_id: mockUser.id,
            planta_id: "2",
            proceso_id: "proc-2",
            datos: { temperatura: 30, presion: 1.5 },
            observaciones: "Segundo reporte",
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
        ]

        setPlants(mockPlants)
        setReports(mockReports)
        addDebugLog(`Datos cargados: ${mockPlants.length} plantas, ${mockReports.length} reportes`)
      } catch (error) {
        addDebugLog(`Error cargando datos: ${error}`)
      } finally {
        setDataLoading(false)
      }
    }

    loadData()
  }, [])

  const handleLogout = () => {
    addDebugLog("Logout solicitado - redirigiendo a home")
    router.push("/")
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand fw-bold" href="/">
            Omega Dashboard
          </Link>
          <div className="navbar-nav ms-auto">
            <Link className="nav-link" href="/dashboard-test">
              Dashboard Test
            </Link>
            <Link className="nav-link" href="/reports">
              Reportes
            </Link>
            <Link className="nav-link" href="/plants">
              Plantas
            </Link>
            <div className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                {mockUser.username}
              </a>
              <ul className="dropdown-menu">
                <li>
                  <span className="dropdown-item-text">
                    <small className="text-muted">{mockUser.puesto}</small>
                  </span>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <Link className="dropdown-item" href="/profile">
                    Perfil
                  </Link>
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
        {/* Status Banner */}
        <div className="alert alert-info" role="alert">
          <i className="material-icons me-2">info</i>
          <strong>🔧 Dashboard Reparado:</strong> Sin contexto de usuario, funcionando con datos mock.
        </div>

        {/* Welcome Section */}
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-0">Bienvenido, {mockUser.username}</h1>
            <p className="text-muted">Panel de control - {mockUser.puesto}</p>
            <p className="text-info">
              <strong>URL actual:</strong> /dashboard
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h5 className="card-title">Plantas</h5>
                    <h2 className="mb-0">{dataLoading ? "..." : plants.length}</h2>
                  </div>
                  <div className="align-self-center">
                    <i className="material-icons" style={{ fontSize: "3rem" }}>
                      factory
                    </i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-success text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h5 className="card-title">Reportes</h5>
                    <h2 className="mb-0">{dataLoading ? "..." : reports.length}</h2>
                  </div>
                  <div className="align-self-center">
                    <i className="material-icons" style={{ fontSize: "3rem" }}>
                      assessment
                    </i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-info text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h5 className="card-title">Procesos</h5>
                    <h2 className="mb-0">15</h2>
                  </div>
                  <div className="align-self-center">
                    <i className="material-icons" style={{ fontSize: "3rem" }}>
                      settings
                    </i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-warning text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h5 className="card-title">Variables</h5>
                    <h2 className="mb-0">52</h2>
                  </div>
                  <div className="align-self-center">
                    <i className="material-icons" style={{ fontSize: "3rem" }}>
                      analytics
                    </i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">🚀 Acciones Rápidas</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3 mb-2">
                    <button
                      className="btn btn-outline-primary w-100"
                      onClick={() => addDebugLog("Nuevo Reporte clickeado")}
                    >
                      <i className="material-icons me-2">add</i>
                      Nuevo Reporte
                    </button>
                  </div>
                  <div className="col-md-3 mb-2">
                    <button
                      className="btn btn-outline-success w-100"
                      onClick={() => addDebugLog("Nueva Planta clickeado")}
                    >
                      <i className="material-icons me-2">factory</i>
                      Nueva Planta
                    </button>
                  </div>
                  <div className="col-md-3 mb-2">
                    <button
                      className="btn btn-outline-info w-100"
                      onClick={() => addDebugLog("Nuevo Proceso clickeado")}
                    >
                      <i className="material-icons me-2">settings</i>
                      Nuevo Proceso
                    </button>
                  </div>
                  <div className="col-md-3 mb-2">
                    <button
                      className="btn btn-outline-warning w-100"
                      onClick={() => addDebugLog("Nueva Variable clickeado")}
                    >
                      <i className="material-icons me-2">analytics</i>
                      Nueva Variable
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">📊 Reportes Recientes</h5>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => addDebugLog("Ver todos los reportes clickeado")}
                >
                  Ver todos
                </button>
              </div>
              <div className="card-body">
                {dataLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Cargando reportes...</span>
                    </div>
                  </div>
                ) : reports.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Fecha</th>
                          <th>Planta</th>
                          <th>Proceso</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((report) => (
                          <tr key={report.id}>
                            <td>
                              <code>{report.id}</code>
                            </td>
                            <td>{new Date(report.created_at || "").toLocaleDateString()}</td>
                            <td>
                              <span className="badge bg-primary">{report.planta_id}</span>
                            </td>
                            <td>
                              <span className="badge bg-info">{report.proceso_id}</span>
                            </td>
                            <td>
                              <span className="badge bg-success">✅ Completado</span>
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button
                                  className="btn btn-outline-primary"
                                  onClick={() => addDebugLog(`Ver reporte ${report.id}`)}
                                >
                                  <i className="material-icons" style={{ fontSize: "1rem" }}>
                                    visibility
                                  </i>
                                </button>
                                <button
                                  className="btn btn-outline-secondary"
                                  onClick={() => addDebugLog(`Descargar reporte ${report.id}`)}
                                >
                                  <i className="material-icons" style={{ fontSize: "1rem" }}>
                                    download
                                  </i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="material-icons text-muted" style={{ fontSize: "4rem" }}>
                      description
                    </i>
                    <p className="text-muted mt-2">No hay reportes disponibles</p>
                    <button className="btn btn-primary" onClick={() => addDebugLog("Crear primer reporte clickeado")}>
                      Crear Primer Reporte
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">🐛 Debug Dashboard</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Estado Actual:</h6>
                    <ul className="list-unstyled">
                      <li>✅ Dashboard cargado sin redirecciones</li>
                      <li>✅ Sin contexto de usuario</li>
                      <li>✅ Datos mock funcionando</li>
                      <li>✅ Navegación funcional</li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6>Logs Recientes:</h6>
                    <div
                      className="bg-dark text-light p-2 rounded"
                      style={{ fontSize: "0.8rem", maxHeight: "150px", overflowY: "auto" }}
                    >
                      {debugInfo.length > 0 ? (
                        debugInfo.map((log, index) => <div key={index}>{log}</div>)
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
