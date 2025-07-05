"use client"

import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from "react"
import { authService } from "@/services/authService"

interface User {
  id: string
  username: string
  email: string
  puesto: "admin" | "user" | "client"
  created_at?: string
}

interface UserState {
  user: User | null
  isAuthenticated: boolean | null
  isLoading: boolean
  error: string | null
  language: string
  isHydrated: boolean
}

type UserAction =
  | { type: "LOGIN_START" }
  | { type: "LOGIN_SUCCESS"; payload: User }
  | { type: "LOGIN_FAILURE"; payload: string }
  | { type: "LOGOUT" }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_LANGUAGE"; payload: string }
  | { type: "UPDATE_USER"; payload: Partial<User> }
  | { type: "SET_HYDRATED"; payload: boolean }

const initialState: UserState = {
  user: null,
  isAuthenticated: null,
  isLoading: false,
  error: null,
  language: "es",
  isHydrated: true,
}

const userReducer = (state: UserState, action: UserAction): UserState => {
  switch (action.type) {
    case "LOGIN_START":
      /* console.log("🔄 LOGIN_START") */
      return { ...state, isLoading: true, error: null }
    case "LOGIN_SUCCESS":
      /* console.log("✅ LOGIN_SUCCESS - Usuario:", action.payload.username) */
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }
    case "LOGIN_FAILURE":
      /* console.log("❌ LOGIN_FAILURE - Error:", action.payload) */
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      }
    case "LOGOUT":
      console.log("🚪 LOGOUT")
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      }
    case "CLEAR_ERROR":
      return { ...state, error: null }
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }
    case "SET_LANGUAGE":
      return { ...state, language: action.payload }
    case "UPDATE_USER":
      return { ...state, user: state.user ? { ...state.user, ...action.payload } : null }
    case "SET_HYDRATED":
      /* console.log("💧 SET_HYDRATED:", action.payload) */
      return { ...state, isHydrated: action.payload }
    default:
      return state
  }
}

interface UserContextType extends UserState {
  login: (email: string, password: string) => Promise<void>
  register: (userData: any) => Promise<void>
  logout: () => void
  clearError: () => void
  setLanguage: (lang: string) => void
  updateUser: (userData: Partial<User>) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(userReducer, initialState)
  const initializationRef = useRef(false)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    /* console.log("⚠️ UserContext: Inicialización de auth deshabilitada para desarrollo") */

    // Solo configurar idioma
    const savedLanguage = localStorage.getItem("omega_language") || "es"
    dispatch({ type: "SET_LANGUAGE", payload: savedLanguage })
    dispatch({ type: "SET_HYDRATED", payload: true })

    return
    
    // Prevenir múltiples inicializaciones
    if (initializationRef.current) {
      console.log("⚠️ Inicialización ya ejecutada, saltando...")
      return
    }

    const initAuth = async () => {
      console.log("🚀 Inicializando autenticación (ÚNICA VEZ)...")
      initializationRef.current = true

      try {
        // Marcar como hidratado
        if (mountedRef.current) {
          dispatch({ type: "SET_HYDRATED", payload: true })
        }

        // Configurar idioma
        const savedLanguage = localStorage.getItem("omega_language") || "es"
        if (mountedRef.current) {
          dispatch({ type: "SET_LANGUAGE", payload: savedLanguage })
        }

        // Verificar autenticación existente
        const user = authService.getCurrentUser()
        const token = authService.getToken()

        console.log("🔍 Verificando auth existente:", {
          user: user?.username || null,
          hasToken: !!token,
        })

        if (user && token && mountedRef.current) {
          console.log("✅ Usuario encontrado, autenticando...")
          dispatch({ type: "LOGIN_SUCCESS", payload: user })
        } else {
          console.log("❌ No hay usuario autenticado")
          if (mountedRef.current) {
            dispatch({ type: "SET_LOADING", payload: false })
          }
        }
      } catch (error) {
        console.error("❌ Error inicializando auth:", error)
        if (mountedRef.current) {
          dispatch({ type: "SET_LOADING", payload: false })
        }
      }
    }

    // Ejecutar después de que el componente esté montado
    const timeoutId = setTimeout(initAuth, 50)

    return () => {
      clearTimeout(timeoutId)
    }
  }, []) // Sin dependencias para ejecutar solo una vez

  const login = async (email: string, password: string) => {
    /* console.log("🔐 UserContext.login - Iniciando...") */
    dispatch({ type: "LOGIN_START" })

    try {
      const response = await authService.login({ email, password })
      /* console.log("✅ Login exitoso en contexto") */

      // Verificar que los datos se guardaron correctamente antes de actualizar el estado
      const savedUser = authService.getCurrentUser()
      const savedToken = authService.getToken()

      if (savedUser && savedToken) {
        /* console.log("✅ Datos verificados en localStorage, actualizando estado...") */
        dispatch({ type: "LOGIN_SUCCESS", payload: response.user })
      } else {
        /* console.error("❌ Error: Datos no encontrados después del login") */
        throw new Error("Failed to save authentication data")
      }
    } catch (error) {
      /* console.error("❌ Error en login:", error) */
      dispatch({
        type: "LOGIN_FAILURE",
        payload: error instanceof Error ? error.message : "Login failed",
      })
      throw error
    }
  }

  const register = async (userData: any) => {
    dispatch({ type: "LOGIN_START" })
    try {
      const response = await authService.register(userData)
      if (response.user) {
        dispatch({ type: "LOGIN_SUCCESS", payload: response.user })
      }
    } catch (error) {
      dispatch({
        type: "LOGIN_FAILURE",
        payload: error instanceof Error ? error.message : "Registration failed",
      })
      throw error
    }
  }

  const logout = () => {
    try {
      authService.logout() // NO await
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      dispatch({ type: "LOGOUT" })
    }
  }

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" })
  }

  const setLanguage = (lang: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("omega_language", lang)
    }
    dispatch({ type: "SET_LANGUAGE", payload: lang })
  }

  const updateUser = (userData: Partial<User>) => {
    dispatch({ type: "UPDATE_USER", payload: userData })
  }

  const value: UserContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    setLanguage,
    updateUser,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export const useUser = (): UserContextType => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
