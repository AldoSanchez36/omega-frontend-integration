"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Plant {
  id: string
  nombre: string
  creado_por: string
  created_at?: string
  location?: string
  description?: string
  status?: string
  systems?: System[]
}

interface System {
  id: string
  name: string
  type: string
  description: string
  plantId: string
  parameters: Parameter[]
  status: string
}

interface Parameter {
  id: string
  name: string
  unit: string
  value: number
  minValue: number
  maxValue: number
  systemId: string
}

interface Report {
  id: string
  usuario_id: string
  planta_id: string
  proceso_id: string
  datos: any
  observaciones?: string
  created_at?: string
  title?: string
  plantName?: string
  systemName?: string
  status?: string
}

export default function Dashboard() {
  const router = useRouter()
  const [plants, setPlants] = useState<Plant[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  // Usuario mock fijo
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

        const mockPlants: Plant[] = [
          { 
            id: "1", 
            nombre: "Planta Norte", 
            creado_por: mockUser.id, 
            created_at: new Date().toISOString(),
            location: "Ciudad Norte",
            description: "Planta de producción principal",
            status: "active",
            systems: [
              {
                id: "1",
                name: "Sistema de Temperatura",
                type: "temperature",
                description: "Control de temperatura",
                plantId: "1",
                parameters: [
                  { id: "1", name: "Temp Ambiente", unit: "°C", value: 25, minValue: 0, maxValue: 50, systemId: "1" },
                  { id: "2", name: "Humedad", unit: "%", value: 60, minValue: 0, maxValue: 100, systemId: "1" },
                ],
                status: "online",
              },
            ]
          },
          { 
            id: "2", 
            nombre: "Planta Sur", 
            creado_por: mockUser.id, 
            created_at: new Date().toISOString(),
            location: "Ciudad Sur",
            description: "Planta de respaldo",
            status: "active",
            systems: [
              {
                id: "2",
                name: "Sistema de Presión",
                type: "pressure",
                description: "Control de presión",
                plantId: "2",
                parameters: [
                  { id: "3", name: "Presión Principal", unit: "PSI", value: 120, minValue: 0, maxValue: 200, systemId: "2" },
                ],
                status: "online",
              },
            ]
          },
          { 
            id: "3", 
            nombre: "Planta Central", 
            creado_por: mockUser.id, 
            created_at: new Date().toISOString(),
            location: "Ciudad Central",
            description: "Planta experimental",
            status: "maintenance",
            systems: []
          },
        ]

        const mockReports: Report[] = [
          {
            id: "1",
            usuario_id: mockUser.id,
            planta_id: "1",
            proceso_id: "proc-1",
            datos: { temperatura: 25, presion: 1.2 },
            observaciones: "Reporte de prueba",
            created_at: new Date().toISOString(),
            title: "Reporte Temperatura Enero",
            plantName: "Planta Norte",
            systemName: "Sistema de Temperatura",
            status: "completed"
          },
          {
            id: "2",
            usuario_id: mockUser.id,
            planta_id: "2",
            proceso_id: "proc-2",
            datos: { temperatura: 30, presion: 1.5 },
            observaciones: "Segundo reporte",
            created_at: new Date(Date.now() - 86400000).toISOString(),
            title: "Reporte Presión Enero",
            plantName: "Planta Sur",
            systemName: "Sistema de Presión",
            status: "completed"
          },
        ]

        setPlants(mockPlants)
        setReports(mockReports)
        addDebugLog(`Datos cargados: ${mockPlants.length} plantas, ${mockReports.length} reportes`)
      } catch (error) {
        addDebugLog(`Error cargando datos: ${error}`)
      } finally {
        setDataLoading(false)
        addDebugLog("Carga de datos completada")
      }
    }

    loadData()
  }, [])

  const handleLogout = () => {
    addDebugLog("Logout solicitado - redirigiendo a home")
    router.push("/")
  }

  const handleNewReport = () => {
    addDebugLog("Nuevo Reporte clickeado - redirigiendo a report manager")
    router.push("/dashboard-reportmanager")
  }

  const handleNewPlant = () => {
    addDebugLog("Nueva Planta clickeado - redirigiendo a agregar planta")
    router.push("/dashboard-agregarplanta")
  }

  const handleNewSystem = () => {
    addDebugLog("Nuevo Sistema clickeado - redirigiendo a agregar sistema")
    router.push("/dashboard-agregarsistema")
  }

  const handleNewVariable = () => {
    addDebugLog("Nueva Variable clickeado - redirigiendo a parámetros")
    router.push("/dashboard-parameters")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "online":
      case "completed":
        return "bg-success"
      case "maintenance":
      case "pending":
        return "bg-warning"
      case "inactive":
      case "offline":
      case "error":
        return "bg-danger"
      default:
        return "bg-secondary"
    }
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Enhanced Navigation with User Dropdown */}
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
              <li className="nav-item">
                <Link className="nav-link" href="/plants">
                  <span className="material-icons me-1">factory</span>
                  Plantas
                </Link>
              </li>
            </ul>
            {/* Enhanced User Dropdown */}
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
                  {mockUser.username}
                </a>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <div className="dropdown-item-text px-3 py-2">
                      <div className="fw-bold">{mockUser.username}</div>
                      <small className="text-muted">{mockUser.email}</small>
                      <br />
                      <small className="text-muted">{mockUser.puesto}</small>
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
          <strong>🔧 Dashboard Mejorado:</strong> Con navbar mejorado y botones funcionales.
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
                      onClick={handleNewReport}
                    >
                      <i className="material-icons me-2">add</i>
                      Nuevo Reporte
                    </button>
                  </div>
                  <div className="col-md-3 mb-2">
                    <button
                      className="btn btn-outline-success w-100"
                      onClick={handleNewPlant}
                    >
                      <i className="material-icons me-2">factory</i>
                      Nueva Planta
                    </button>
                  </div>
                  <div className="col-md-3 mb-2">
                    <button
                      className="btn btn-outline-info w-100"
                      onClick={handleNewSystem}
                    >
                      <i className="material-icons me-2">settings</i>
                      Nuevo Sistema
                    </button>
                  </div>
                  <div className="col-md-3 mb-2">
                    <button
                      className="btn btn-outline-warning w-100"
                      onClick={handleNewVariable}
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
                          <th>Título</th>
                          <th>Planta</th>
                          <th>Sistema</th>
                          <th>Estado</th>
                          <th>Fecha</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((report) => (
                          <tr key={report.id}>
                            <td>
                              <strong>{report.title || `Reporte ${report.id}`}</strong>
                            </td>
                            <td>
                              <span className="badge bg-primary">{report.plantName || report.planta_id}</span>
                            </td>
                            <td>
                              <span className="badge bg-info">{report.systemName || report.proceso_id}</span>
                            </td>
                            <td>
                              <span className={`badge ${getStatusColor(report.status || "completed")}`}>
                                {report.status === "completed" ? "✅ Completado" : report.status || "Completado"}
                              </span>
                            </td>
                            <td>{new Date(report.created_at || "").toLocaleDateString()}</td>
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

        {/* System Charts - New Section */}
        <div className="row mb-4">
          <div className="col-12">
            <h5 className="mb-3">📈 Gráficos de Sistemas</h5>
          </div>
          {plants.slice(0, 4).map((plant) => (
            <div key={plant.id} className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h6 className="card-title mb-0">
                    <i className="material-icons me-2">factory</i>
                    Sistemas - {plant.nombre}
                  </h6>
                  <span className={`badge ${getStatusColor(plant.status || "active")}`}>
                    {plant.status || "active"}
                  </span>
                </div>
                <div className="card-body">
                  {plant.systems && plant.systems.length > 0 ? (
                    <div className="space-y-3">
                      {plant.systems.slice(0, 4).map((system) => (
                        <div key={system.id} className="border rounded p-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0">{system.name}</h6>
                            <span className={`badge ${getStatusColor(system.status)}`}>
                              {system.status}
                            </span>
                          </div>
                          <div className="row">
                            {system.parameters.map((param) => (
                              <div key={param.id} className="col-6 mb-2">
                                <div className="d-flex justify-content-between">
                                  <small className="text-muted">{param.name}:</small>
                                  <small className="fw-bold">
                                    {param.value} {param.unit}
                                  </small>
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* Mock chart placeholder */}
                          <div className="mt-3 p-3 bg-light rounded text-center">
                            <div className="d-flex align-items-center justify-center">
                              <i className="material-icons me-2">show_chart</i>
                              <span className="text-muted">Gráfico de {system.name}</span>
                            </div>
                            <div className="mt-2">
                              {system.parameters.map((param) => (
                                <div key={param.id} className="mb-2">
                                  <div className="d-flex justify-content-between mb-1">
                                    <small>{param.name}</small>
                                    <small>{param.value} {param.unit}</small>
                                  </div>
                                  <div className="progress" style={{ height: "8px" }}>
                                    <div 
                                      className="progress-bar bg-primary" 
                                      style={{ 
                                        width: `${((param.value - param.minValue) / (param.maxValue - param.minValue)) * 100}%` 
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <i className="material-icons text-muted" style={{ fontSize: "3rem" }}>
                        settings
                      </i>
                      <p className="text-muted mt-2">No hay sistemas configurados para esta planta</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
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
                      <li>✅ Navbar mejorado con dropdown de usuario</li>
                      <li>✅ Botones de acción funcionales</li>
                      <li>✅ Datos mock funcionando</li>
                      <li>✅ Navegación funcional</li>
                      <li>📊 Plantas: {plants.length}</li>
                      <li>📋 Reportes: {reports.length}</li>
                      <li>🔄 Cargando: {dataLoading ? "Sí" : "No"}</li>
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
