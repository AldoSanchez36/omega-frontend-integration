"use client"

import Link from "next/link"

export default function About() {
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
            <Link className="nav-link active" href="/about">
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
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container-fluid bg-primary text-white py-5">
        <div className="container">
          <div className="row">
            <div className="col-12 text-center">
              <h1 className="display-4 fw-bold mb-4">Acerca de Omega</h1>
              <p className="lead">Innovación en gestión industrial desde 2020</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-5">
        <div className="row">
          <div className="col-lg-8 mx-auto">
            <div className="card shadow">
              <div className="card-body p-5">
                <h2 className="h3 mb-4">Nuestra Historia</h2>
                <p className="mb-4">
                  Omega nació de la necesidad de modernizar y optimizar los procesos industriales mediante tecnología
                  avanzada. Nuestro sistema integral permite a las empresas gestionar sus plantas, procesos y variables
                  de manera eficiente y segura.
                </p>

                <h3 className="h4 mb-3">Misión</h3>
                <p className="mb-4">
                  Proporcionar soluciones tecnológicas innovadoras que permitan a las industrias optimizar sus procesos,
                  reducir costos y mejorar la calidad de sus productos mediante un sistema de gestión integral.
                </p>

                <h3 className="h4 mb-3">Visión</h3>
                <p className="mb-4">
                  Ser la plataforma líder en gestión industrial, reconocida por nuestra innovación, confiabilidad y
                  capacidad de adaptación a las necesidades específicas de cada cliente.
                </p>

                <h3 className="h4 mb-3">Valores</h3>
                <div className="row">
                  <div className="col-md-6">
                    <ul className="list-unstyled">
                      <li className="mb-2">
                        <i className="material-icons text-primary me-2">check_circle</i>
                        Innovación constante
                      </li>
                      <li className="mb-2">
                        <i className="material-icons text-primary me-2">check_circle</i>
                        Calidad en el servicio
                      </li>
                      <li className="mb-2">
                        <i className="material-icons text-primary me-2">check_circle</i>
                        Seguridad de datos
                      </li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <ul className="list-unstyled">
                      <li className="mb-2">
                        <i className="material-icons text-primary me-2">check_circle</i>
                        Soporte técnico 24/7
                      </li>
                      <li className="mb-2">
                        <i className="material-icons text-primary me-2">check_circle</i>
                        Transparencia
                      </li>
                      <li className="mb-2">
                        <i className="material-icons text-primary me-2">check_circle</i>
                        Compromiso con el cliente
                      </li>
                    </ul>
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
