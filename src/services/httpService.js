const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000"

class HttpService {
  constructor(baseURL) {
    this.baseURL = baseURL
  }

  getAuthToken() {
    return localStorage.getItem("omega_token")
  }

  getHeaders(requiresAuth = true) {
    const headers = {
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

  async handleResponse(response) {
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem("omega_token")
        localStorage.removeItem("omega_user")
        window.location.href = "/login"
        throw new Error("Session expired")
      }

      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      return response.json()
    }

    return response.text()
  }

  async get(endpoint, options = {}) {
    const { requiresAuth = true, ...fetchOptions } = options

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "GET",
      headers: this.getHeaders(requiresAuth),
      ...fetchOptions,
    })

    return this.handleResponse(response)
  }

  async post(endpoint, data, options = {}) {
    const { requiresAuth = true, ...fetchOptions } = options

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(requiresAuth),
      body: JSON.stringify(data),
      ...fetchOptions,
    })

    return this.handleResponse(response)
  }

  async patch(endpoint, data, options = {}) {
    const { requiresAuth = true, ...fetchOptions } = options

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "PATCH",
      headers: this.getHeaders(requiresAuth),
      body: JSON.stringify(data),
      ...fetchOptions,
    })

    return this.handleResponse(response)
  }

  async delete(endpoint, options = {}) {
    const { requiresAuth = true, ...fetchOptions } = options

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders(requiresAuth),
      ...fetchOptions,
    })

    return this.handleResponse(response)
  }

  async uploadFile(endpoint, file, fieldName = "FotoFileI") {
    const formData = new FormData()
    formData.append(fieldName, file)

    const token = this.getAuthToken()
    const headers = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    })

    return this.handleResponse(response)
  }
}

export const httpService = new HttpService(API_BASE_URL)
export default API_BASE_URL
