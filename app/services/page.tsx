"use client"

import Link from "next/link"

export default function Services() {
  const services = [
    {
      icon: "factory",
      title: "Gestión de Plantas",
      description: "Administra múltiples plantas industriales desde una sola plataforma centralizada.",
      features: ["Control centralizado", "Monitoreo en tiempo real", "Gestión de accesos", "Reportes automáticos"],
    },
    {
      icon: "settings",
      title: "Control de Procesos",
      description: "Monitorea y controla todos los procesos industriales con precisión.",
      features: ["Automatización", "Alertas inteligentes", "Optimización", "Trazabilidad completa"],
    },
    {
      icon: "analytics",
      title: "Análisis de Variables",
      description: "Gestiona y analiza variables críticas de tus procesos industriales.",
      features: ["Variables personalizadas", "Análisis estadístico", "Predicciones", "Dashboards interactivos"],
    },
    {
      icon: "assessment",
      title: "Reportes Avanzados",
      description: "Genera reportes detallados con análisis y visualizaciones profesionales.",
      features: ["Reportes automáticos", "Exportación múltiple", "Gráficos avanzados", "Programación de envíos"],
    },
    {
      icon: "security",
      title: "Seguridad y Accesos",
      description: "Sistema robusto de seguridad con control granular de permisos.",
      features: ["Autenticación segura", "Roles personalizados", "Auditoría completa", "Backup automático"],
    },
    {
      icon: "support_agent",
      title: "Soporte Técnico",
      description: "Soporte especializado 24/7 para garantizar la continuidad operativa.",
      features: ["Soporte 24/7", "Capacitación", "Mantenimiento", "Actualizaciones"],
    },
  ]

  return (
    <div className="min-vh-100 bg-light">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand fw-bold" href="/">
            Omega
          </Link>
          <div className="navbar-nav ms-auto">
            <Link className="nav-link" href="/">
              Inicio
            </Link>
            <Link className="nav-link" href="/about">
              Acerca de
            </Link>
            <Link className="nav-link active" href="/services">
              Servicios
            </Link>
            <Link className="nav-link" href="/contact">
              Contacto
            </Link>
            <Link className="nav-link" href="/login">
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container-fluid bg-primary text-white py-5">
        <div className="container">
          <div className="row">
            <div className="col-12 text-center">
              <h1 className="display-4 fw-bold mb-4">Nuestros Servicios</h1>
              <p className="lead">Soluciones completas para la gestión industrial moderna</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="container py-5">
        <div className="row g-4">
          {services.map((service, index) => (
            <div key={index} className="col-lg-4 col-md-6">
              <div className="card h-100 shadow">
                <div className="card-body p-4">
                  <div className="text-center mb-3">
                    <i className="material-icons text-primary" style={{ fontSize: "3rem" }}>
                      {service.icon}
                    </i>
                  </div>
                  <h3 className="h5 card-title text-center mb-3">{service.title}</h3>
                  <p className="card-text text-muted mb-3">{service.description}</p>
                  <ul className="list-unstyled">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="mb-2">
                        <i className="material-icons text-success me-2" style={{ fontSize: "1rem" }}>
                          check_circle
                        </i>
                        <small>{feature}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="row mt-5">
          <div className="col-12">
            <div className="card bg-primary text-white">
              <div className="card-body p-5 text-center">
                <h2 className="h3 mb-3">¿Listo para optimizar tu industria?</h2>
                <p className="lead mb-4">
                  Únete a cientos de empresas que ya confían en Omega para gestionar sus procesos industriales.
                </p>
                <div className="d-flex gap-3 justify-content-center">
                  <Link href="/register" className="btn btn-light btn-lg">
                    Comenzar ahora
                  </Link>
                  <Link href="/contact" className="btn btn-outline-light btn-lg">
                    Contactar ventas
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
