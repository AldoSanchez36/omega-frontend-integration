"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useUser } from "@/context/UserContext"

interface NavbarProps {
  role: "admin" | "user" | "client" | "guest"
}

const NAV_LINKS = [
  // Solo para admin
  { path: "/agregar-formula",       label: "Agregar fórmula", icon: "science", roles: ["admin"] },
  { path: "/dashboard-parameters",  label: "Admi. de variables(parametros)", icon: "tune", roles: ["admin"] },
  { path: "/dashboard-agregarplanta",  label: "Agregar plantas o Sistema", icon: "tune", roles: ["admin"] },
  { path: "/dashboard-reportmanager",  label: "Reportes", icon: "tune", roles: ["admin", "user"] },
  // Para admin y user
  { path: "/users-management",      label: "Gestión de usuarios", icon: "people", roles: ["admin", "user"] },
  { path: "/reports", label: "Reporte", icon: "assessment", roles: ["admin", "user"/* , "client" */] },
  // Para admin, user y client

  // Para cualquier usuario autenticado
  { path: "/dashboard",             label: "Dashboard", icon: "home", roles: ["admin", "user", "client"] },
  { path: "/profile",   label: "Perfil de usuario", icon: "account_circle", roles: ["admin", "user", "client"] },
  
]

const PUBLIC_LINKS = [
  { path: "/logout", label: "Logout", icon: "logout" },
  
]
/* { path: "/register", label: "Registro", icon: "person_add" },
  { path: "/forgot-password", label: "Recuperar contraseña", icon: "lock_open" },
  { path: "/contact",   label: "Contacto", icon: "mail", roles: ["admin", "user", "client"] },
  { path: "/about",     label: "Acerca de", icon: "info", roles: ["admin", "user", "client"] },
  { path: "/services",  label: "Servicios", icon: "build", roles: ["admin", "user", "client"] }, */

export const Navbar: React.FC<NavbarProps> = ({ role }) => {
  const { isAuthenticated, user } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Obtén la ruta actual para evitar mostrar links activos
  let currentPath = "";
  if (typeof window !== "undefined") {
    currentPath = window.location.pathname;
  }

  // Filtra los links según el rol y autenticación
  const filteredLinks = isAuthenticated
    ? NAV_LINKS.filter(link => link.roles.includes(role))
    : PUBLIC_LINKS;

  // No muestres el link activo (por ejemplo, no muestres /login si ya estás en /login)
  const visibleLinks = filteredLinks.filter(link => link.path !== currentPath);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container d-flex justify-content-between align-items-center">
        <Link className="navbar-brand fw-bold" href="/">
          <span className="material-icons me-2">business</span>
          Organomex
        </Link>
        <div className="position-relative" ref={dropdownRef}>
          <button
            className="btn btn-light"
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            style={{ minWidth: 120 }}
          >
            Opciones <span className="material-icons align-middle ms-1">expand_more</span>
          </button>
          {dropdownOpen && (
            <div
              className="dropdown-menu show position-absolute mt-2 end-0 shadow"
              style={{ minWidth: 240, left: 'auto', right: 0 }}
            >
              {isAuthenticated && (
                <div className="dropdown-item-text text-muted small mb-2">
                  Signed in as<br />
                  <strong>{user?.email}</strong>
                </div>
              )}
              <div className="dropdown-divider"></div>
              {visibleLinks.map(link => (
                <Link className="dropdown-item" href={link.path} key={link.path}>
                  <span className="material-icons me-2 align-middle">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
              <div className="dropdown-divider"></div>
              {/* El link de logout siempre debe estar disponible si está autenticado */}
              {isAuthenticated && currentPath !== "/logout" && (
                <Link className="dropdown-item" href="/logout">
                  <span className="material-icons me-2 align-middle">logout</span>
                  Cerrar sesión
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar 