export interface User {
  id: string
  username: string
  email: string
  puesto: "admin" | "user" | "client"
  created_at?: string
}

export interface Plant {
  id: string
  nombre: string
  creado_por: string
  created_at?: string
}

export interface Process {
  id: string
  nombre: string
  descripcion?: string
  planta_id: string
  created_at?: string
}

export interface Variable {
  id: string
  nombre: string
  unidad: string
  proceso_id: string
  created_at?: string
}

export interface Formula {
  id: string
  nombre: string
  expresion: string
  proceso_id: string
  variables_usadas: any
  created_at?: string
}

export interface Report {
  id: string
  usuario_id: string
  planta_id: string
  proceso_id: string
  datos: any
  observaciones?: string
  created_at?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}
