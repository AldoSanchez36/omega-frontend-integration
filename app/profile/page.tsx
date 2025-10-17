"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUser } from "@/context/UserContext"
import Navbar from "@/components/Navbar"

export default function Profile() {
  const { user, logout, isAuthenticated, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])


  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-vh-100 bg-light">
      <Navbar role={user?.puesto || 'client'} />
      {/* Main Content */}
      <div className="container py-4">
        <div className="row">
          <div className=" mx-auto">
            {/* Perfil visual estilo settings */}
            <div className="card mb-4">
              <div className="card-header">
                <h2 className="h4 mb-0 d-flex align-items-center">
                  <i className="material-icons me-2">person</i>
                  Mi Perfil
                </h2>
              </div>
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-3" style={{ width: "80px", height: "80px" }}>
                    <span className="material-icons text-white" style={{ fontSize: "2rem" }}>
                      person
                    </span>
                  </div>
                  <div className="flex-grow-1">
                    <h4 className="mb-1">{user.username}</h4>
                    <p className="text-muted mb-2">{user.email}</p>
                    <div className="d-flex align-items-center">
                      <span className={`badge bg-${user.puesto === "admin" ? "danger" : "primary"} me-2`}>
                        {user.puesto}
                      </span>
                      <span className="text-muted">•</span>
                    </div>
                  </div>
                </div>
                {/* Fin header visual */}
                <div>
                  <div className="row mb-3">
                    <div className="col-sm-3">
                      <strong>Nombre de usuario:</strong>
                    </div>
                    <div className="col-sm-9">{user.username}</div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-sm-3">
                      <strong>Email:</strong>
                    </div>
                    <div className="col-sm-9">{user.email}</div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-sm-3">
                      <strong>Rol:</strong>
                    </div>
                    <div className="col-sm-9">
                      <span className={`badge bg-${user.puesto === "admin" ? "danger" : "primary"}`}>
                        {user.puesto}
                      </span>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-sm-3">
                      <strong>Fecha de registro:</strong>
                    </div>
                    <div className="col-sm-9">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : "No disponible"}
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-sm-3">
                      <strong>ID de usuario:</strong>
                    </div>
                    <div className="col-sm-9">
                      <code>{user.id}</code>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <Link href="/dashboard" className="btn btn-outline-secondary">
                      <i className="material-icons me-2">dashboard</i>
                      Volver al dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            {/* Preferencias del Sistema (visual, sin funcionalidad real) */}
            {/* <div className="row mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h5 className="card-title mb-0">
                      <i className="material-icons me-2">tune</i>
                      Preferencias del Sistema
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1">Notificaciones</h6>
                            <small className="text-muted">Recibir notificaciones del sistema</small>
                          </div>
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={true}
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1">Modo Oscuro</h6>
                            <small className="text-muted">Cambiar a tema oscuro</small>
                          </div>
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={false}
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div>
                          <h6 className="mb-1">Idioma</h6>
                          <small className="text-muted">Idioma de la interfaz</small>
                          <select
                            className="form-select mt-1"
                            value={"es"}
                            disabled
                          >
                            <option value="es">Español</option>
                            <option value="en">English</option>
                            <option value="pt">Português</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div> */}
            {/* Seguridad (visual, sin funcionalidad real) */}
            {/* <div className="row mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h5 className="card-title mb-0">
                      <i className="material-icons me-2">security</i>
                      Seguridad
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-4 mb-2">
                        <button className="btn btn-outline-primary w-100" disabled>
                          <i className="material-icons me-2">lock</i>
                          Cambiar Contraseña
                        </button>
                      </div>
                      <div className="col-md-4 mb-2">
                        <button className="btn btn-outline-info w-100" disabled>
                          <i className="material-icons me-2">phone_android</i>
                          Autenticación 2FA
                        </button>
                      </div>
                      <div className="col-md-4 mb-2">
                        <button className="btn btn-outline-secondary w-100" disabled>
                          <i className="material-icons me-2">devices</i>
                          Sesiones Activas
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  )
}
