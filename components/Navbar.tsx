"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useUser } from "@/context/UserContext"
import { useLanguage } from "@/context/LanguageContext"
import SelectLanguage from "@/components/SelectLanguage";

interface NavbarProps {
  role: "admin" | "user" | "client" | "guest"
}

const NAV_LINKS = [
  // Solo para admin
  { path: "/agregar-formula",       label: "Agregar fórmula", icon: "ƒₓ", roles: ["admin"] },
  { path: "/dashboard-agregarsistema",  label: "Agregar plantas o Sistema", icon: "factory", roles: ["admin"] },
  // Para admin y user
  { path: "/users-management",      label: "Gestión de usuarios", icon: "people", roles: ["admin", "user"] },
  { path: "/dashboard-reportmanager",  label: "Reportes", icon: "article", roles: ["admin", "user"] },
  { path: "/dashboard-agregarvariables",  label: "Gestor de parámetros", icon: "tune", roles: ["admin", "user"] },
  //{ path: "/reports", label: "Reporte", icon: "assessment", roles: ["admin", "user"/* , "client" */] },
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
  const [currentDate, setCurrentDate] = useState<string>("");
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Manejar scroll para navbar fijo y agregar padding al body
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsScrolled(scrollTop > 0);
    };

    // Agregar padding-top al body para compensar el navbar fijo
    const navbarHeight = 56; // Altura típica del navbar
    document.body.style.paddingTop = `${navbarHeight}px`;

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      // Limpiar el padding al desmontar
      document.body.style.paddingTop = '0px';
    };
  }, []);

  // Actualizar fecha actual
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const formattedDate = now.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      setCurrentDate(formattedDate);
    };

    updateDate();
    // Actualizar cada minuto
    const interval = setInterval(updateDate, 60000);
    
    return () => clearInterval(interval);
  }, []);

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
    <nav 
      className="navbar navbar-expand-lg navbar-dark"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1030,
        background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
        boxShadow: isScrolled ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
        transition: 'box-shadow 0.3s ease'
      }}
    >
      <div className="container d-flex justify-content-between align-items-center">
        <Link className="navbar-brand fw-bold d-flex align-items-center" href="/dashboard" style={{ textDecoration: 'none', height: '56px' }}>
          <Image
            src="/logo_empresa.jpeg"
            alt="STATU QUO Servicios Ambientales"
            width={180}
            height={56}
            style={{ 
              objectFit: 'contain',
              height: '100%',
              width: 'auto',
              maxWidth: '200px',
              marginRight: '12px'
            }}
            priority
          />
          <span className="text-white" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Organomex</span>
        </Link>
        <div className="d-flex align-items-center">
          {currentDate && (
            <div className="text-light me-3 d-none d-md-block">
              <small className="text-light-50">
                <span className="material-icons me-1" style={{ fontSize: '16px' }}>calendar_today</span>
                {currentDate}
              </small>
            </div>
          )}
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
                <div
                  className="dropdown-item-text text-muted small mb-2"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <div>
                    Signed in as<br />
                    <strong>{user?.email}</strong>
                  </div>
                  <hr/>
                  <SelectLanguage variant="menu" />
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
      </div>
    </nav>
  )
}

export default Navbar 