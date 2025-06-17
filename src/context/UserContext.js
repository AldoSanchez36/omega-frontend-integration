"use client"

import { createContext, useContext, useReducer, useEffect } from "react"

// Importamos los servicios que vamos a crear
import { authService } from "../services/authService"

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  language: "es", // Mantenemos el idioma
}

const userReducer = (state, action) => {
  switch (action.type) {
    case "LOGIN_START":
      return { ...state, isLoading: true, error: null }
    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }
    case "LOGIN_FAILURE":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      }
    case "LOGOUT":
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
      return { ...state, user: { ...state.user, ...action.payload } }
    default:
      return state
  }
}

const UserContext = createContext()

export const UserProvider = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState)

  useEffect(() => {
    // Check if user is already logged in
    const initAuth = () => {
      const user = authService.getCurrentUser()
      const token = authService.getToken()
      const savedLanguage = localStorage.getItem("omega_language") || "es"

      dispatch({ type: "SET_LANGUAGE", payload: savedLanguage })

      if (user && token) {
        dispatch({ type: "LOGIN_SUCCESS", payload: user })
      } else {
        dispatch({ type: "SET_LOADING", payload: false })
      }
    }

    initAuth()
  }, [])

  const login = async (email, password) => {
    dispatch({ type: "LOGIN_START" })
    try {
      const response = await authService.login({ email, password })
      dispatch({ type: "LOGIN_SUCCESS", payload: response.user })
      return response
    } catch (error) {
      dispatch({
        type: "LOGIN_FAILURE",
        payload: error.message || "Login failed",
      })
      throw error
    }
  }

  const register = async (userData) => {
    dispatch({ type: "LOGIN_START" })
    try {
      const response = await authService.register(userData)
      // Auto login after registration
      if (response.user) {
        dispatch({ type: "LOGIN_SUCCESS", payload: response.user })
      }
      return response
    } catch (error) {
      dispatch({
        type: "LOGIN_FAILURE",
        payload: error.message || "Registration failed",
      })
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      dispatch({ type: "LOGOUT" })
    }
  }

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" })
  }

  const setLanguage = (lang) => {
    localStorage.setItem("omega_language", lang)
    dispatch({ type: "SET_LANGUAGE", payload: lang })
  }

  const updateUser = (userData) => {
    dispatch({ type: "UPDATE_USER", payload: userData })
  }

  const value = {
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

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}

// Mantenemos compatibilidad con el nombre anterior
export const useAuth = useUser
