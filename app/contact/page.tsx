"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Aquí puedes agregar la lógica para enviar el formulario
    console.log("Formulario enviado:", formData)
    alert("Mensaje enviado correctamente. Te contactaremos pronto.")
    setFormData({ name: "", email: "", subject: "", message: "" })
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
            <Link className="nav-link" href="/">
              Inicio
            </Link>
            <Link className="nav-link" href="/about">
              Acerca de
            </Link>
            <Link className="nav-link" href="/services">
              Servicios
            </Link>
            <Link className="nav-link active" href="/contact">
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
              <h1 className="display-4 fw-bold mb-4">Contacto</h1>
              <p className="lead">Estamos aquí para ayudarte</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-5">
        <div className="row">
          <div className="col-lg-8">
            <div className="card shadow">
              <div className="card-body p-5">
                <h2 className="h3 mb-4">Envíanos un mensaje</h2>
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="name" className="form-label">
                        Nombre completo
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
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
                  </div>
                  <div className="mb-3">
                    <label htmlFor="subject" className="form-label">
                      Asunto
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="message" className="form-label">
                      Mensaje
                    </label>
                    <textarea
                      className="form-control"
                      id="message"
                      name="message"
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      required
                    ></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary btn-lg">
                    Enviar mensaje
                  </button>
                </form>
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="card shadow">
              <div className="card-body p-4">
                <h3 className="h4 mb-4">Información de contacto</h3>
                <div className="mb-3">
                  <div className="d-flex align-items-center mb-2">
                    <i className="material-icons text-primary me-2">location_on</i>
                    <strong>Dirección</strong>
                  </div>
                  <p className="ms-4 text-muted">
                    Av. Tecnológico 123
                    <br />
                    Ciudad Industrial, CP 12345
                  </p>
                </div>
                <div className="mb-3">
                  <div className="d-flex align-items-center mb-2">
                    <i className="material-icons text-primary me-2">phone</i>
                    <strong>Teléfono</strong>
                  </div>
                  <p className="ms-4 text-muted">+52 (55) 1234-5678</p>
                </div>
                <div className="mb-3">
                  <div className="d-flex align-items-center mb-2">
                    <i className="material-icons text-primary me-2">email</i>
                    <strong>Email</strong>
                  </div>
                  <p className="ms-4 text-muted">contacto@omega.com</p>
                </div>
                <div className="mb-3">
                  <div className="d-flex align-items-center mb-2">
                    <i className="material-icons text-primary me-2">schedule</i>
                    <strong>Horarios</strong>
                  </div>
                  <p className="ms-4 text-muted">
                    Lunes a Viernes: 9:00 - 18:00
                    <br />
                    Sábados: 9:00 - 14:00
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
