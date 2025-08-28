"use client"

import { useUser } from "@/context/UserContext"
import { useEffect, useState } from "react"

export function useThemeCustom() {
  const { isDarkMode, toggleDarkMode, isAuthenticated } = useUser()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Solo aplicar el tema si el usuario está autenticado
  useEffect(() => {
    if (!mounted) return
    
    if (isAuthenticated) {
      if (isDarkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } else {
      // Si no está autenticado, remover la clase dark
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode, isAuthenticated, mounted])

  const toggleTheme = () => {
    if (isAuthenticated) {
      toggleDarkMode()
    }
  }

  const changeTheme = (newTheme: "light" | "dark" | "system") => {
    if (!isAuthenticated) return
    
    if (newTheme === "dark" && !isDarkMode) {
      toggleDarkMode()
    } else if (newTheme === "light" && isDarkMode) {
      toggleDarkMode()
    }
  }

  const getCurrentTheme = () => {
    if (!mounted || !isAuthenticated) return "light"
    return isDarkMode ? "dark" : "light"
  }

  return {
    theme: isAuthenticated && isDarkMode ? "dark" : "light",
    setTheme: changeTheme,
    systemTheme: "system",
    mounted,
    toggleTheme,
    changeTheme,
    getCurrentTheme,
    isDarkMode: isAuthenticated ? isDarkMode : false,
    isAuthenticated
  }
}
