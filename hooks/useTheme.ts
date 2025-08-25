"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function useThemeCustom() {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Evitar hidratación incorrecta
  useEffect(() => {
    setMounted(true)
  }, [])

  // Función para cambiar el tema
  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light")
    } else {
      setTheme("dark")
    }
  }

  // Función para establecer tema específico
  const changeTheme = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme)
  }

  // Función para obtener el tema actual (considerando el tema del sistema)
  const getCurrentTheme = () => {
    if (!mounted) return "light"
    if (theme === "system") return systemTheme
    return theme
  }

  // Función para verificar si está en modo oscuro
  const isDarkMode = () => {
    const currentTheme = getCurrentTheme()
    return currentTheme === "dark"
  }

  return {
    theme,
    systemTheme,
    mounted,
    toggleTheme,
    changeTheme,
    getCurrentTheme,
    isDarkMode
  }
}
