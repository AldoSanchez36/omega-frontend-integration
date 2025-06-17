import type React from "react"
import type { Metadata } from "next"
import "bootstrap/dist/css/bootstrap.min.css"
import "./globals.css"
import { UserProvider } from "@/context/UserContext"
import AuthDebug from "@/components/AuthDebug"

export const metadata: Metadata = {
  title: "Omega - Sistema de Gestión Industrial",
  description: "Sistema completo de gestión industrial con reportes y análisis",
    generator: 'v0.dev'
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
      </head>
      <body>
        <UserProvider>
          {children}
          <AuthDebug />
        </UserProvider>
      </body>
    </html>
  )
}
