import type React from "react"
import type { Metadata } from "next"
import "bootstrap/dist/css/bootstrap.min.css"
import "./globals.css"
import { UserProvider } from "@/context/UserContext"
import AuthDebug from "@/components/AuthDebug"
import Navbar from "@/components/Navbar"
import { LanguageProvider } from "Elements/LanguageContext"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Omega - Sistema de Gestión Industrial",
  description: "Sistema completo de gestión industrial con reportes y análisis",
    generator: 'v0.dev'
}

function getUserRoleFromToken(): "admin" | "user" | "client" | "guest" {
  if (typeof window === "undefined") return "guest"
  const token = localStorage.getItem("token")
  if (!token) return "guest"
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return (
      payload.userType || payload.role || payload.puesto || "user"
    ) as "admin" | "user" | "client"
  } catch {
    return "guest"
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Detectar si la ruta es pública
  const isPublicRoute =
    typeof window !== "undefined" &&
    ["/login", "/register", "/forgot-password"].includes(window.location.pathname)

  // Obtener el rol del usuario
  let role: "admin" | "user" | "client" | "guest" = "guest"
  if (typeof window !== "undefined" && !isPublicRoute) {
    role = getUserRoleFromToken()
  }

  return (
    <html lang="es">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className={inter.className}>
        <LanguageProvider>
          <UserProvider>
            {/* Navbar global, oculto en rutas públicas */}
            {!isPublicRoute && <Navbar role={role} />}
            {children}
            <AuthDebug />
          </UserProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
