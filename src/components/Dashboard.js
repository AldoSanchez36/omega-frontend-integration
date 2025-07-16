"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { plantService } from "../services/plantService"
import { reportService } from "../services/reportService"

const Dashboard = () => {
  const { user, logout } = useAuth()
  const [plants, setPlants] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [plantsData, reportsData] = await Promise.all([
          plantService.getMyPlants(user.id),
          reportService.getUserReports(user.id),
        ])
        setPlants(plantsData)
        setReports(reportsData)
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadData()
    }
  }, [user])

  const handleLogout = async () => {
    await logout()
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <a className="navbar-brand fw-bold" href="/">
            Organomex
          </a>
          <div className="navbar-nav ms-auto">
            <div className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                {user?.username}
              </a>
              <ul className="dropdown-menu">
                <li>
                  <span className="dropdown-item-text">
                    <small className="text-muted">{user?.puesto}</small>
                  </span>
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
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {/* Welcome Section */}
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-0">Bienvenido, {user?.username}</h1>
            <p className="text-muted">Panel de control - {user?.puesto}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h5 className="card-title">Plantas</h5>
                    <h2 className="mb-0">{plants.length}</h2>
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
          <div className="col-md-4">
            <div className="card bg-success text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h5 className="card-title">Reportes</h5>
                    <h2 className="mb-0">{reports.length}</h2>
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
          <div className="col-md-4">
            <div className="card bg-info text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h5 className="card-title">Acceso</h5>
                    <h2 className="mb-0">{user?.puesto === "admin" ? "Total" : "Limitado"}</h2>
                  </div>
                  <div className="align-self-center">
                    <i className="material-icons" style={{ fontSize: "3rem" }}>
                      security
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
                <h5 className="card-title mb-0">Acciones Rápidas</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3 mb-2">
                    <button className="btn btn-outline-primary w-100">
                      <i className="material-icons me-2">add</i>
                      Nuevo Reporte
                    </button>
                  </div>
                  <div className="col-md-3 mb-2">
                    <button className="btn btn-outline-success w-100">
                      <i className="material-icons me-2">factory</i>
                      Ver Plantas
                    </button>
                  </div>
                  <div className="col-md-3 mb-2">
                    <button className="btn btn-outline-info w-100">
                      <i className="material-icons me-2">settings</i>
                      Procesos
                    </button>
                  </div>
                  <div className="col-md-3 mb-2">
                    <button className="btn btn-outline-warning w-100">
                      <i className="material-icons me-2">analytics</i>
                      Variables
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Reportes Recientes</h5>
              </div>
              <div className="card-body">
                {reports.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Fecha</th>
                          <th>Planta</th>
                          <th>Proceso</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.slice(0, 5).map((report) => (
                          <tr key={report.id}>
                            <td>{report.id.slice(0, 8)}...</td>
                            <td>{new Date(report.created_at).toLocaleDateString()}</td>
                            <td>{report.planta_id}</td>
                            <td>{report.proceso_id}</td>
                            <td>
                              <button className="btn btn-sm btn-outline-primary">Ver</button>
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
                    <button className="btn btn-primary">Crear Primer Reporte</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
