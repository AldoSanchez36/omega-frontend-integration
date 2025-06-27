"use client"

import React, { useState, useEffect } from "react"
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine if user is authenticated based on localStorage as fallback
  const checkAuth = () => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('omega_user')
      return !!storedUser
    }
    return isAuthenticated
  }

  const isUserAuthenticated = checkAuth()

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      const mobileMenu = document.getElementById('navbarMobileMenu')
      const mobileButton = document.querySelector('.navbar-toggler')
      
      if (mobileMenu && mobileButton && 
          !mobileMenu.contains(target) && 
          !mobileButton.contains(target) &&
          mobileMenuOpen) {
        setMobileMenuOpen(false)
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
  }, [mobileMenuOpen])

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <Link className="navbar-brand fw-bold" href="/">
          <span className="material-icons me-2">business</span>
          Omega
        </Link>
        
        {/* Desktop Navigation - Always Visible */}
        <div className="d-none d-lg-flex navbar-nav me-auto">
          {isUserAuthenticated ? (
            NAV_LINKS.filter(link => link.roles.includes(role)).map(link => (
              <Link className="nav-link" href={link.path} key={link.path}>
                <span className="material-icons me-1">{link.icon}</span>
                {link.label}
              </Link>
            ))
          ) : (
            PUBLIC_LINKS.map(link => (
              <Link className="nav-link" href={link.path} key={link.path}>
                <span className="material-icons me-1">{link.icon}</span>
                {link.label}
              </Link>
            ))
          )}
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

        {/* Desktop Logout - Always Visible */}
        {isUserAuthenticated && (
          <div className="d-none d-lg-flex navbar-nav">
            <Link className="nav-link" href="/logout">
              <span className="material-icons me-1">logout</span>
              Cerrar Sesión
            </Link>
          </div>
        )}
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div id="navbarMobileMenu" className="d-lg-none" style={{ 
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
              {isUserAuthenticated ? (
                NAV_LINKS.filter(link => link.roles.includes(role)).map(link => (
                  <Link 
                    className="nav-link text-dark py-2" 
                    href={link.path} 
                    key={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="material-icons me-2">{link.icon}</span>
                    {link.label}
                  </Link>
                ))
              ) : (
                PUBLIC_LINKS.map(link => (
                  <Link 
                    className="nav-link text-dark py-2" 
                    href={link.path} 
                    key={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="material-icons me-2">{link.icon}</span>
                    {link.label}
                  </Link>
                ))
              )}
              {isUserAuthenticated && (
                <Link 
                  className="nav-link text-dark py-2" 
                  href="/logout"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="material-icons me-2">logout</span>
                  Cerrar Sesión
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar 