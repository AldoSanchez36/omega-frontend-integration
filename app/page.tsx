"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/context/UserContext"
import Link from "next/link"

export default function Home() {
  const { isAuthenticated, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
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
          <Link className="navbar-brand fw-bold" href="/">
            Omega
          </Link>
          <div className="navbar-nav ms-auto">
            <Link className="nav-link" href="/about">
              Acerca de
            </Link>
            <Link className="nav-link" href="/services">
              Servicios
            </Link>
            <Link className="nav-link" href="/contact">
              Contacto
            </Link>
            <Link className="nav-link" href="/login">
              Iniciar Sesión
            </Link>
            <Link className="nav-link" href="/register">
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container-fluid bg-primary text-white py-5">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <h1 className="display-4 fw-bold mb-4">Sistema de Gestión Organomex</h1>
              <p className="lead mb-4">
                Plataforma completa para la gestión de plantas industriales, procesos, variables y generación de
                reportes técnicos.
              </p>
              <div className="d-flex gap-3">
                <Link href="/login" className="btn btn-light btn-lg">
                  Iniciar secion
                </Link>
                <Link href="/register" className="btn btn-outline-light btn-lg">
                  Registrarse
                </Link>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="text-center">
                <i className="material-icons" style={{ fontSize: "10rem", opacity: 0.8 }}>
                  factory
                </i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container py-5">
        <div className="row">
          <div className="col-12 text-center mb-5">
            <h2 className="h1 mb-3">Características Principales</h2>
            <p className="lead text-muted">Todo lo que necesitas para gestionar tu operación industrial</p>
          </div>
        </div>
        <div className="row g-4">
          <div className="col-md-4">
            <div className="card h-100 text-center">
              <div className="card-body">
                <i className="material-icons text-primary mb-3" style={{ fontSize: "3rem" }}>
                  factory
                </i>
                <h5 className="card-title">Gestión de Plantas</h5>
                <p className="card-text">Administra múltiples plantas industriales desde una sola plataforma</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100 text-center">
              <div className="card-body">
                <i className="material-icons text-success mb-3" style={{ fontSize: "3rem" }}>
                  settings
                </i>
                <h5 className="card-title">Control de Procesos</h5>
                <p className="card-text">Monitorea y controla todos los procesos industriales en tiempo real</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100 text-center">
              <div className="card-body">
                <i className="material-icons text-info mb-3" style={{ fontSize: "3rem" }}>
                  assessment
                </i>
                <h5 className="card-title">Reportes Avanzados</h5>
                <p className="card-text">Genera reportes detallados con análisis y visualizaciones</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-dark text-white py-4 mt-5">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <h5>Omega</h5>
              <p className="mb-0">Sistema de Gestión Industrial</p>
            </div>
            <div className="col-md-6 text-md-end">
              <p className="mb-0">&copy; 2024 Omega. Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
