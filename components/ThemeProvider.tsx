"use client"

import { useEffect } from "react"
import { useUser } from "@/context/UserContext"

interface ThemeProviderProps {
  children: React.ReactNode
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const { isDarkMode, isAuthenticated } = useUser()

  useEffect(() => {
    // Solo aplicar el tema si el usuario está autenticado
    if (isAuthenticated) {
      if (isDarkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } else {
      // Si no está autenticado, asegurar que no haya clase dark
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode, isAuthenticated])

  return <>{children}</>
}
