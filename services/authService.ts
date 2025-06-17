import { httpService } from "./httpService"

const API_ENDPOINTS = {
  AUTH: {
    REGISTER: "/api/auth/register",
    LOGIN: "/api/auth/login",
    LOGOUT: "/api/auth/logout",
    USER: "/api/auth/user",
    USERS: "/api/auth/users",
    UPDATE_USER: "/api/auth/update",
    DELETE_USER: "/api/auth/delete",
  },
  PLANTAS: {
    CREAR: "/api/plantas/crear",
    MIS_PLANTAS: "/api/plantas/mis-plantas",
  },
  PROCESOS: {
    CREAR: "/api/procesos/crear",
    BY_PLANTA: "/api/procesos/planta",
    ALL: "/api/procesos",
  },
  VARIABLES: {
    CREAR: "/api/variables/crear",
    BY_PROCESO: "/api/variables/proceso",
    ALL: "/api/variables",
  },
  FORMULAS: {
    CREAR: "/api/formulas/crear",
    BY_PROCESO: "/api/formulas/proceso",
    ALL: "/api/formulas",
  },
  REPORTES: {
    CREATE: "/api/reportes",
    BY_ID: "/api/reportes",
    BY_USER: "/api/reportes/usuario",
  },
  UPLOAD: "/api/upload",
}

interface User {
  id: string
  username: string
  email: string
  puesto: "admin" | "user" | "client"
  created_at?: string
}

interface LoginRequest {
  email: string
  password: string
}

interface RegisterRequest {
  username: string
  email: string
  password: string
  puesto: string
}

interface LoginResponse {
  ok: boolean
  msg: string
  username: string
  email: string
  puesto: string
  token: string
}

class AuthService {
  async login(credentials: LoginRequest): Promise<{ token: string; user: User }> {
    console.log("🔐 AuthService.login - Iniciando...")

    const response = await httpService.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials, {
      requiresAuth: false,
    })

    console.log("📡 Respuesta del servidor:", { ok: response.ok, username: response.username })

    if (response.ok && response.token) {
      const adaptedResponse = {
        token: response.token,
        user: {
          id: response.email,
          username: response.username,
          email: response.email,
          puesto: response.puesto as "admin" | "user" | "client",
          created_at: new Date().toISOString(),
        },
      }

      console.log("💾 Guardando en localStorage...")

      // Guardar en localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("omega_token", adaptedResponse.token)
        localStorage.setItem("omega_user", JSON.stringify(adaptedResponse.user))

        // Verificar inmediatamente
        const savedToken = localStorage.getItem("omega_token")
        const savedUser = localStorage.getItem("omega_user")

        console.log("🔍 Verificación inmediata:")
        console.log("  Token guardado:", !!savedToken)
        console.log("  Usuario guardado:", !!savedUser)

        if (!savedToken || !savedUser) {
          console.error("❌ Error: Los datos no se guardaron correctamente")
          throw new Error("Failed to save authentication data")
        }
      }

      console.log("✅ Login completado exitosamente")
      return adaptedResponse
    } else {
      console.log("❌ Login fallido:", response.msg)
      throw new Error(response.msg || "Login failed")
    }
  }

  async register(userData: RegisterRequest): Promise<{ token: string; user: User }> {
    const response = await httpService.post<LoginResponse>(API_ENDPOINTS.AUTH.REGISTER, userData, {
      requiresAuth: false,
    })

    if (response.ok && response.token) {
      const adaptedResponse = {
        token: response.token,
        user: {
          id: response.email,
          username: response.username,
          email: response.email,
          puesto: response.puesto as "admin" | "user" | "client",
          created_at: new Date().toISOString(),
        },
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("omega_token", adaptedResponse.token)
        localStorage.setItem("omega_user", JSON.stringify(adaptedResponse.user))
      }

      return adaptedResponse
    } else {
      throw new Error(response.msg || "Registration failed")
    }
  }

  async logout(): Promise<void> {
    try {
      await httpService.post(API_ENDPOINTS.AUTH.LOGOUT)
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("omega_token")
        localStorage.removeItem("omega_user")
        console.log("🗑️ Datos eliminados del localStorage")
      }
    }
  }

  getCurrentUser(): User | null {
    if (typeof window === "undefined") {
      return null
    }

    try {
      const userStr = localStorage.getItem("omega_user")
      if (!userStr) {
        console.log("👤 getCurrentUser: No hay datos en localStorage")
        return null
      }

      const user = JSON.parse(userStr)
      console.log("👤 getCurrentUser:", user.username)
      return user
    } catch (error) {
      console.error("❌ Error parseando usuario:", error)
      return null
    }
  }

  getToken(): string | null {
    if (typeof window === "undefined") {
      return null
    }

    const token = localStorage.getItem("omega_token")
    console.log("🔑 getToken:", token ? "✅ Existe" : "❌ No existe")
    return token
  }

  isAuthenticated(): boolean {
    const hasToken = !!this.getToken()
    const hasUser = !!this.getCurrentUser()
    const isAuth = hasToken && hasUser
    console.log("🔐 isAuthenticated:", { hasToken, hasUser, isAuth })
    return isAuth
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser()
    return user?.puesto === "admin"
  }

  async getUsers(): Promise<User[]> {
    return httpService.get<User[]>(API_ENDPOINTS.AUTH.USERS)
  }

  async getUserById(id: string): Promise<User> {
    return httpService.get<User>(`${API_ENDPOINTS.AUTH.USER}/${id}`)
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    return httpService.patch<User>(`${API_ENDPOINTS.AUTH.UPDATE_USER}/${id}`, userData)
  }

  async deleteUser(id: string): Promise<void> {
    return httpService.delete(`${API_ENDPOINTS.AUTH.DELETE_USER}/${id}`)
  }
}

export const authService = new AuthService()
export { API_ENDPOINTS }
