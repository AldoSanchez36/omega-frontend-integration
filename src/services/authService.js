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

class AuthService {
  async login(credentials) {
    const response = await httpService.post(API_ENDPOINTS.AUTH.LOGIN, credentials, {
      requiresAuth: false,
    })

    if (response.token && response.user) {
      localStorage.setItem("omega_token", response.token)
      localStorage.setItem("omega_user", JSON.stringify(response.user))
    }

    return response
  }

  async register(userData) {
    const response = await httpService.post(API_ENDPOINTS.AUTH.REGISTER, userData, {
      requiresAuth: false,
    })

    if (response.token && response.user) {
      localStorage.setItem("omega_token", response.token)
      localStorage.setItem("omega_user", JSON.stringify(response.user))
    }

    return response
  }

  async logout() {
    try {
      await httpService.post(API_ENDPOINTS.AUTH.LOGOUT)
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      localStorage.removeItem("omega_token")
      localStorage.removeItem("omega_user")
    }
  }

  getCurrentUser() {
    const userStr = localStorage.getItem("omega_user")
    return userStr ? JSON.parse(userStr) : null
  }

  getToken() {
    return localStorage.getItem("omega_token")
  }

  isAuthenticated() {
    return !!this.getToken()
  }

  isAdmin() {
    const user = this.getCurrentUser()
    return user?.puesto === "admin"
  }

  async getUsers() {
    return httpService.get(API_ENDPOINTS.AUTH.USERS)
  }

  async getUserById(id) {
    return httpService.get(`${API_ENDPOINTS.AUTH.USER}/${id}`)
  }

  async updateUser(id, userData) {
    return httpService.patch(`${API_ENDPOINTS.AUTH.UPDATE_USER}/${id}`, userData)
  }

  async deleteUser(id) {
    return httpService.delete(`${API_ENDPOINTS.AUTH.DELETE_USER}/${id}`)
  }
}

export const authService = new AuthService()
export { API_ENDPOINTS }
