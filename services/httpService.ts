const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean
}

class HttpService {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("omega_token")
  }

  private getHeaders(requiresAuth = true): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (requiresAuth) {
      const token = this.getAuthToken()
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
    }

    return headers
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    console.log("📡 Respuesta HTTP:", {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      ok: response.ok,
    })

    if (!response.ok) {
      if (response.status === 401) {
        console.log("🔒 Token expirado o inválido")

        // Solo limpiar localStorage y redirigir si estamos en el cliente
        if (typeof window !== "undefined") {
          localStorage.removeItem("omega_token")
          localStorage.removeItem("omega_user")

          // Solo redirigir si no estamos ya en login
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login"
          }
        }
        throw new Error("Session expired")
      }

      const errorData = await response.json().catch(() => ({}))
      console.error("❌ Error HTTP:", errorData)
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json()
      console.log("📦 Datos recibidos:", data)
      return data
    }

    return response.text() as unknown as T
  }

  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { requiresAuth = true, ...fetchOptions } = options

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "GET",
      headers: this.getHeaders(requiresAuth),
      ...fetchOptions,
    })

    return this.handleResponse<T>(response)
  }

  async post<T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    const { requiresAuth = true, ...fetchOptions } = options

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(requiresAuth),
      body: JSON.stringify(data),
      ...fetchOptions,
    })

    return this.handleResponse<T>(response)
  }

  async patch<T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    const { requiresAuth = true, ...fetchOptions } = options

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "PATCH",
      headers: this.getHeaders(requiresAuth),
      body: JSON.stringify(data),
      ...fetchOptions,
    })

    return this.handleResponse<T>(response)
  }

  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { requiresAuth = true, ...fetchOptions } = options

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders(requiresAuth),
      ...fetchOptions,
    })

    return this.handleResponse<T>(response)
  }

  async uploadFile<T>(endpoint: string, file: File, fieldName = "FotoFileI"): Promise<T> {
    const formData = new FormData()
    formData.append(fieldName, file)

    const token = this.getAuthToken()
    const headers: HeadersInit = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    })

    return this.handleResponse<T>(response)
  }
}

export const httpService = new HttpService(API_BASE_URL)
