import type React from "react"
import type { Metadata } from "next"
import "bootstrap/dist/css/bootstrap.min.css"
import "./globals.css"
import { UserProvider } from "@/context/UserContext"
import AuthDebug from "@/components/AuthDebug"
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/components/theme-provider"

import BootstrapScript from "@/components/BootstrapScript"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Organomex - Sistema de Gestión Industrial",
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
  return (
    <html lang="es">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className={`${inter.className} transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LanguageProvider>
            <UserProvider>
              {children}
              {/* <AuthDebug /> */}
              <BootstrapScript />
            </UserProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
