"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// Add type declaration for window.bootstrap
declare global {
  interface Window {
    bootstrap?: any
  }
}

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

interface HistoricalDataPoint {
  timestamp: string
  value: number
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

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

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
    addDebugLog(`Dropdown ${!isDropdownOpen ? 'abierto' : 'cerrado'}`)
  }

  const closeDropdown = () => {
    setIsDropdownOpen(false)
  }

  // Mobile menu toggle function
  const toggleMobileMenu = () => {
    const mobileMenu = document.getElementById('mobileNavbar')
    if (mobileMenu) {
      const isVisible = mobileMenu.style.display === 'block'
      mobileMenu.style.display = isVisible ? 'none' : 'block'
      addDebugLog(`Menú móvil ${isVisible ? 'oculto' : 'mostrado'}`)
    }
  }

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      const mobileMenu = document.getElementById('mobileNavbar')
      const mobileButton = document.querySelector('.navbar-toggler')
      const userDropdown = document.querySelector('.dropdown')
      
      // Close mobile menu
      if (mobileMenu && mobileButton && 
          !mobileMenu.contains(target) && 
          !mobileButton.contains(target) &&
          mobileMenu.style.display === 'block') {
        mobileMenu.style.display = 'none'
        addDebugLog("Menú móvil cerrado por clic externo")
      }
      
      // Close user dropdown
      if (isDropdownOpen && userDropdown && !userDropdown.contains(target)) {
        closeDropdown()
        addDebugLog("Dropdown de usuario cerrado por clic externo")
      }
    }

    if (typeof window !== 'undefined') {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      if (typeof window !== 'undefined') {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isDropdownOpen])

  // Load Bootstrap JavaScript for navbar functionality
  useEffect(() => {
    const loadBootstrap = () => {
      if (typeof window !== 'undefined') {
        // Check if Bootstrap is already loaded
        if (!window.bootstrap) {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
          script.integrity = 'sha384-geWF76RCwLtnZ8qwWowPQNguL3RmwHVBC9FhGdlKrxdiJJigb/j/68SIy3Te4Bkz'
          script.crossOrigin = 'anonymous'
          script.onload = () => {
            addDebugLog("Bootstrap JavaScript cargado exitosamente")
            // Initialize Bootstrap components after loading
            if (window.bootstrap) {
              // Initialize all collapse elements
              const collapseElements = document.querySelectorAll('[data-bs-toggle="collapse"]')
              collapseElements.forEach(element => {
                new window.bootstrap.Collapse(element, {
                  toggle: false
                })
              })
              addDebugLog("Componentes Bootstrap inicializados")
            }
          }
          script.onerror = () => {
            addDebugLog("Error cargando Bootstrap JavaScript")
          }
          document.head.appendChild(script)
        } else {
          addDebugLog("Bootstrap JavaScript ya está cargado")
          // Initialize components if Bootstrap is already available
          if (window.bootstrap) {
            const collapseElements = document.querySelectorAll('[data-bs-toggle="collapse"]')
            collapseElements.forEach(element => {
              new window.bootstrap.Collapse(element, {
                toggle: false
              })
            })
            addDebugLog("Componentes Bootstrap inicializados")
          }
        }
      }
    }
    
    loadBootstrap()
  }, [])

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
    addDebugLog("Logout solicitado - redirigiendo a logout")
    router.push("/logout")
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

  // Generate historical data for the last 24 hours
  const generateHistoricalData = (param: Parameter): HistoricalDataPoint[] => {
    const data: HistoricalDataPoint[] = []
    const now = new Date()
    
    // Generate 24 data points (one per hour)
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
      
      // Generate realistic values with some variation
      const baseValue = param.value
      const variation = (Math.random() - 0.5) * (param.maxValue - param.minValue) * 0.3
      const value = Math.max(param.minValue, Math.min(param.maxValue, baseValue + variation))
      
      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(value * 10) / 10 // Round to 1 decimal place
      })
    }
    
    return data
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Custom Navigation with User Dropdown */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary" style={{ zIndex: 1030 }}>
        <div className="container">
          <Link className="navbar-brand fw-bold" href="/">
            <span className="material-icons me-2">business</span>
            Omega Dashboard
          </Link>
          
          {/* Desktop Navigation - Always Visible */}
          <div className="d-none d-lg-flex navbar-nav me-auto">
            <Link className="nav-link" href="/dashboard-test">
              <span className="material-icons me-1">dashboard</span>
              Dashboard Test
            </Link>
            <Link className="nav-link" href="/reports">
              <span className="material-icons me-1">assessment</span>
              Reportes
            </Link>
            <Link className="nav-link" href="/plants">
              <span className="material-icons me-1">factory</span>
              Plantas
            </Link>
            <Link className="nav-link" href="/services">
              <span className="material-icons me-1">build</span>
              Servicios
            </Link>
            <Link className="nav-link" href="/users-management">
              <span className="material-icons me-1">people</span>
              Usuarios
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="navbar-toggler d-lg-none"
            type="button"
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* User Dropdown - Always Visible */}
          <div className="navbar-nav ms-auto">
            <div className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle d-flex align-items-center"
                href="#"
                role="button"
                onClick={(e) => {
                  e.preventDefault()
                  toggleDropdown()
                }}
                aria-expanded={isDropdownOpen}
                style={{ cursor: 'pointer' }}
              >
                <div className="rounded-circle bg-white d-flex align-items-center justify-content-center me-2" 
                     style={{ width: "40px", height: "40px", boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <span className="material-icons text-primary" style={{ fontSize: "24px" }}>
                    person
                  </span>
                </div>
                <span className="d-none d-md-inline fw-medium">{mockUser.username}</span>
                <span className="material-icons ms-1" style={{ fontSize: "18px" }}>
                  expand_more
                </span>
              </a>
              <ul className={`dropdown-menu dropdown-menu-end ${isDropdownOpen ? 'show' : ''}`} 
                  style={{ zIndex: 1040, minWidth: '250px', marginTop: '8px' }}>
                <li>
                  <div className="dropdown-item-text px-3 py-3">
                    <div className="d-flex align-items-center">
                      <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-3" 
                           style={{ width: "50px", height: "50px" }}>
                        <span className="material-icons text-white" style={{ fontSize: "28px" }}>
                          person
                        </span>
                      </div>
                      <div>
                        <div className="fw-bold text-dark">{mockUser.username}</div>
                        <small className="text-muted d-block">{mockUser.email}</small>
                        <small className="text-primary fw-medium">{mockUser.puesto}</small>
                      </div>
                    </div>
                  </div>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <Link className="dropdown-item py-2" href="/profile" onClick={closeDropdown}>
                    <span className="material-icons me-3" style={{ fontSize: "20px" }}>account_circle</span>
                    <span className="fw-medium">Mi Perfil</span>
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item py-2" href="/settings" onClick={closeDropdown}>
                    <span className="material-icons me-3" style={{ fontSize: "20px" }}>settings</span>
                    <span className="fw-medium">Configuración</span>
                  </Link>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item py-2 text-danger" onClick={() => {
                    closeDropdown()
                    handleLogout()
                  }}>
                    <span className="material-icons me-3" style={{ fontSize: "20px" }}>logout</span>
                    <span className="fw-medium">Cerrar Sesión</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div id="mobileNavbar" className="d-lg-none" style={{ 
          display: 'none', 
          backgroundColor: '#f8f9fa', 
          borderTop: '1px solid #dee2e6',
          padding: '1rem 0',
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1020
        }}>
          <div className="container">
            <div className="d-flex flex-column gap-2">
              <Link className="nav-link text-dark py-2" href="/dashboard-test" onClick={() => {
                const mobileMenu = document.getElementById('mobileNavbar')
                if (mobileMenu) mobileMenu.style.display = 'none'
              }}>
                <span className="material-icons me-2">dashboard</span>
                Dashboard Test
              </Link>
              <Link className="nav-link text-dark py-2" href="/reports" onClick={() => {
                const mobileMenu = document.getElementById('mobileNavbar')
                if (mobileMenu) mobileMenu.style.display = 'none'
              }}>
                <span className="material-icons me-2">assessment</span>
                Reportes
              </Link>
              <Link className="nav-link text-dark py-2" href="/plants" onClick={() => {
                const mobileMenu = document.getElementById('mobileNavbar')
                if (mobileMenu) mobileMenu.style.display = 'none'
              }}>
                <span className="material-icons me-2">factory</span>
                Plantas
              </Link>
              <Link className="nav-link text-dark py-2" href="/services" onClick={() => {
                const mobileMenu = document.getElementById('mobileNavbar')
                if (mobileMenu) mobileMenu.style.display = 'none'
              }}>
                <span className="material-icons me-2">build</span>
                Servicios
              </Link>
              <Link className="nav-link text-dark py-2" href="/users-management" onClick={() => {
                const mobileMenu = document.getElementById('mobileNavbar')
                if (mobileMenu) mobileMenu.style.display = 'none'
              }}>
                <span className="material-icons me-2">people</span>
                Usuarios
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container py-4">
        {/* Status Banner */}
        <div className="alert alert-info" role="alert">
          <i className="material-icons me-2">info</i>
          <strong>🔧 Dashboard Mejorado:</strong> Navbar completamente funcional sin dependencias de Bootstrap JS. 
          <br />
          <small className="text-muted">
            • Navegación visible en desktop • Menú móvil funcional • Dropdown de usuario mejorado • Sin conflictos de JavaScript
          </small>
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

        {/* System Charts - Historical Data */}
        <div className="row mb-4">
          <div className="col-12">
            <h5 className="mb-3">📈 Gráficos Históricos de Sistemas</h5>
          </div>
          {plants.slice(0, 4).map((plant) => (
            <div key={plant.id} className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h6 className="card-title mb-0">
                    <i className="material-icons me-2">factory</i>
                    {plant.nombre}
                  </h6>
                  <span className={`badge ${getStatusColor(plant.status || "active")}`}>
                    {plant.status || "active"}
                  </span>
                </div>
                <div className="card-body">
                  {plant.systems && plant.systems.length > 0 ? (
                    <div className="space-y-3">
                      {plant.systems.slice(0, 2).map((system) => (
                        <div key={system.id} className="border rounded p-3">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="mb-0">{system.name}</h6>
                            <span className={`badge ${getStatusColor(system.status)}`}>
                              {system.status}
                            </span>
                          </div>
                          
                          {/* Historical Data Chart */}
                          <div className="mb-3">
                            <h6 className="text-muted mb-2">Datos Históricos (Últimas 24 horas)</h6>
                            <div className="bg-light rounded p-3">
                              {/* Time labels */}
                              <div className="d-flex justify-content-between mb-2">
                                <small className="text-muted">00:00</small>
                                <small className="text-muted">06:00</small>
                                <small className="text-muted">12:00</small>
                                <small className="text-muted">18:00</small>
                                <small className="text-muted">24:00</small>
                              </div>
                              
                              {/* Historical values for each parameter */}
                              {system.parameters.map((param) => {
                                // Generate historical data for the last 24 hours
                                const historicalData = generateHistoricalData(param)
                                const maxValue = Math.max(...historicalData.map((d: HistoricalDataPoint) => d.value))
                                const minValue = Math.min(...historicalData.map((d: HistoricalDataPoint) => d.value))
                                
                                return (
                                  <div key={param.id} className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                      <small className="fw-bold">{param.name}</small>
                                      <small className="text-muted">
                                        Actual: {param.value} {param.unit}
                                      </small>
                                    </div>
                                    
                                    {/* Historical chart line */}
                                    <div className="position-relative" style={{ height: "40px" }}>
                                      <svg width="100%" height="40" className="position-absolute">
                                        <polyline
                                          fill="none"
                                          stroke="#007bff"
                                          strokeWidth="2"
                                          points={historicalData.map((d: HistoricalDataPoint, i: number) => 
                                            `${(i / (historicalData.length - 1)) * 100},${40 - ((d.value - minValue) / (maxValue - minValue)) * 35}`
                                          ).join(' ')}
                                        />
                                        {/* Data points */}
                                        {historicalData.map((d: HistoricalDataPoint, i: number) => (
                                          <circle
                                            key={i}
                                            cx={`${(i / (historicalData.length - 1)) * 100}%`}
                                            cy={40 - ((d.value - minValue) / (maxValue - minValue)) * 35}
                                            r="2"
                                            fill="#007bff"
                                          />
                                        ))}
                                      </svg>
                                      
                                      {/* Value labels */}
                                      <div className="d-flex justify-content-between position-absolute w-100" style={{ top: "-20px" }}>
                                        <small className="text-muted">{maxValue.toFixed(1)}</small>
                                        <small className="text-muted">{minValue.toFixed(1)}</small>
                                      </div>
                                    </div>
                                    
                                    {/* Statistics */}
                                    <div className="row text-center mt-2">
                                      <div className="col-4">
                                        <small className="text-muted d-block">Máx</small>
                                        <small className="fw-bold text-success">{maxValue.toFixed(1)}</small>
                                      </div>
                                      <div className="col-4">
                                        <small className="text-muted d-block">Prom</small>
                                        <small className="fw-bold text-primary">
                                          {(historicalData.reduce((sum: number, d: HistoricalDataPoint) => sum + d.value, 0) / historicalData.length).toFixed(1)}
                                        </small>
                                      </div>
                                      <div className="col-4">
                                        <small className="text-muted d-block">Mín</small>
                                        <small className="fw-bold text-danger">{minValue.toFixed(1)}</small>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                          
                          {/* System info */}
                          <div className="mt-3 pt-3 border-top">
                            <div className="row text-center">
                              <div className="col-6">
                                <small className="text-muted d-block">Tipo</small>
                                <small className="fw-bold">{system.type}</small>
                              </div>
                              <div className="col-6">
                                <small className="text-muted d-block">Parámetros</small>
                                <small className="fw-bold">{system.parameters.length}</small>
                              </div>
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
                      <li>✅ Bootstrap JavaScript cargado</li>
                      <li>✅ Navbar responsive configurado</li>
                      <li>📊 Plantas: {plants.length}</li>
                      <li>📋 Reportes: {reports.length}</li>
                      <li>🔄 Cargando: {dataLoading ? "Sí" : "No"}</li>
                      <li>🌐 Bootstrap: {typeof window !== 'undefined' && window.bootstrap ? "Cargado" : "No cargado"}</li>
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
