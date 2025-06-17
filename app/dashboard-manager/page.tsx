"use client"

import { useState } from "react"
import Link from "next/link"

export default function DashboardManager() {
  const [vendors] = useState([
    { name: "Chemist Inc", address: "123 Lab St" },
    { name: "Rohm Supplies", address: "456 Industrial Ave" },
    { name: "AquaPure", address: "789 Water Rd" },
  ])

  const [parameters] = useState([
    { name: "pH del Agua", value: "7.5" },
    { name: "Nivel de Calcio", value: "120 mg/L" },
    { name: "Nivel de Cobre", value: "0.3 mg/L" },
  ])

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
            <Link className="nav-link" href="/contact">
              Contacto
            </Link>
            <Link className="nav-link" href="/about">
              Acerca de
            </Link>
            <Link className="nav-link" href="/services">
              Servicios
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container py-4">
        <div className="row">
          <div className="col-12">
            <h1 className="h3 mb-4">
              <i className="material-icons me-2">dashboard</i>
              Dashboard Manager
            </h1>
          </div>
        </div>

        <div className="row">
          {/* Available Parameters */}
          <div className="col-md-6 mb-4">
            <div className="card shadow">
              <div className="card-header bg-info text-white">
                <h5 className="card-title mb-0">
                  <i className="material-icons me-2">settings</i>
                  Parámetros Disponibles
                </h5>
              </div>
              <div className="card-body">
                <ul className="list-group list-group-flush">
                  {parameters.map((param, index) => (
                    <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                      <span>
                        <strong>{param.name}</strong>
                      </span>
                      <span className="badge bg-primary rounded-pill">{param.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Saved Vendors */}
          <div className="col-md-6 mb-4">
            <div className="card shadow">
              <div className="card-header bg-success text-white">
                <h5 className="card-title mb-0">
                  <i className="material-icons me-2">business</i>
                  Proveedores Guardados
                </h5>
              </div>
              <div className="card-body">
                <div className="list-group">
                  {vendors.map((vendor, index) => (
                    <div key={index} className="list-group-item">
                      <div className="d-flex w-100 justify-content-between">
                        <h6 className="mb-1">{vendor.name}</h6>
                      </div>
                      <p className="mb-1 text-muted">
                        <i className="material-icons me-1" style={{ fontSize: "1rem" }}>
                          location_on
                        </i>
                        {vendor.address}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="row">
          <div className="col-12">
            <div className="card shadow">
              <div className="card-header bg-warning text-dark">
                <h5 className="card-title mb-0">
                  <i className="material-icons me-2">flash_on</i>
                  Acciones Rápidas
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3 mb-2">
                    <Link href="/param-manager" className="btn btn-outline-primary w-100">
                      <i className="material-icons me-2">tune</i>
                      Gestionar Parámetros
                    </Link>
                  </div>
                  <div className="col-md-3 mb-2">
                    <Link href="/users-management" className="btn btn-outline-success w-100">
                      <i className="material-icons me-2">people</i>
                      Gestionar Usuarios
                    </Link>
                  </div>
                  <div className="col-md-3 mb-2">
                    <Link href="/reports" className="btn btn-outline-info w-100">
                      <i className="material-icons me-2">assessment</i>
                      Ver Reportes
                    </Link>
                  </div>
                  <div className="col-md-3 mb-2">
                    <Link href="/agregar-formula" className="btn btn-outline-warning w-100">
                      <i className="material-icons me-2">functions</i>
                      Agregar Fórmula
                    </Link>
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
