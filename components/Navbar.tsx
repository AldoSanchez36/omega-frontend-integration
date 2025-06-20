"use client"

import React from "react"
import Link from "next/link"
import { useUser } from "@/context/UserContext"

interface NavbarProps {
  role: "admin" | "user" | "client" | "guest"
}

const NAV_LINKS = [
  // Solo para admin
  { path: "/users-management", label: "Gestión de usuarios", icon: "people", roles: ["admin"] },
  { path: "/agregar-formula", label: "Agregar fórmula", icon: "science", roles: ["admin"] },
  { path: "/dashboard-parameters", label: "Administrador de parámetros", icon: "tune", roles: ["admin"] },
  { path: "/dashboard-manager", label: "Dashboard del administrador", icon: "admin_panel_settings", roles: ["admin"] },
  // Para admin y user
  { path: "/layouts", label: "Administrador de clientes", icon: "view_quilt", roles: ["admin", "user"] },
  // Para admin, user y client
  { path: "/reports", label: "Reportes", icon: "assessment", roles: ["admin", "user", "client"] },
  // Para admin y client
  { path: "/home", label: "Página principal", icon: "home", roles: ["admin", "client"] },
  // Para cualquier usuario autenticado
  { path: "/profile", label: "Perfil de usuario", icon: "account_circle", roles: ["admin", "user", "client"] },
  { path: "/contact", label: "Contacto", icon: "mail", roles: ["admin", "user", "client"] },
  { path: "/about", label: "Acerca de", icon: "info", roles: ["admin", "user", "client"] },
  { path: "/services", label: "Servicios", icon: "build", roles: ["admin", "user", "client"] },
]

const PUBLIC_LINKS = [
  { path: "/login", label: "Login", icon: "login" },
  { path: "/register", label: "Registro", icon: "person_add" },
  { path: "/forgot-password", label: "Recuperar contraseña", icon: "lock_open" },
]

export const Navbar: React.FC<NavbarProps> = ({ role }) => {
  const { isAuthenticated, user } = useUser();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <Link className="navbar-brand fw-bold" href="/">
          <span className="material-icons me-2">business</span>
          Omega
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            {isAuthenticated ? (
              NAV_LINKS.filter(link => link.roles.includes(role)).map(link => (
                <li className="nav-item" key={link.path}>
                  <Link className="nav-link" href={link.path}>
                    <span className="material-icons me-1">{link.icon}</span>
                    {link.label}
                  </Link>
                </li>
              ))
            ) : (
              PUBLIC_LINKS.map(link => (
                <li className="nav-item" key={link.path}>
                  <Link className="nav-link" href={link.path}>
                    <span className="material-icons me-1">{link.icon}</span>
                    {link.label}
                  </Link>
                </li>
              ))
            )}
          </ul>
          {isAuthenticated && (
            <ul className="navbar-nav">
              <li className="nav-item">
                <Link className="nav-link" href="/logout">
                  <span className="material-icons me-1">logout</span>
                  Cerrar Sesión
                </Link>
              </li>
            </ul>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar 