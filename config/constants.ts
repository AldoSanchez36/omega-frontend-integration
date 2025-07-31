// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
//export const API_BASE_URL = "https://omegabackend-vefy.onrender.com"

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`
}

// Common API endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  LOGOUT: '/api/auth/logout',
  USERS: '/api/auth/users',
  USER_BY_ID: (userId: string) => `/api/auth/user/${userId}`,
  USER_BY_NAME: (username: string) => `/api/auth/user-by-name/${username}`,
  FORGOT_PASSWORD: '/api/auth/forgot-password',
  RESET_PASSWORD: '/api/auth/reset-password',
  VERIFY_EMAIL: '/api/auth/verificar',
  USER_UPDATE: (userId: string) => `/api/auth/update/${userId}`,
  USER_DELETE: (userId: string) => `/api/auth/delete/${userId}`,
  
  // Plants
  PLANTS_CREATE: '/api/plantas/crear',
  PLANTS_ACCESSIBLE: '/api/plantas/accesibles',
  PLANTS_ALL: '/api/plantas/all', 
  PLANTS_ALL_ID: '/api/plantas/allID',
  PLANTS_BY_USER: (userId: string) => `/api/plantas/mis-plantas/${userId}`,
  PLANTS_ACCESS_BY_USER: (userId: string) => `/api/accesos/plantas/usuario/${userId}`,
  PLANTS_ASSIGN_ACCESS: '/api/accesos/plantas/asignar',
  PLANTS_UPDATE_ACCESS: '/api/accesos/plantas/actualizar',
  PLANTS_REVOKE_ACCESS: '/api/accesos/plantas/revocar',
  
  // Systems/Processes
  SYSTEMS_BY_PLANT: (plantId: string) => `/api/procesos/planta/${plantId}`,
  SYSTEMS_BY_PLANT_NAME: (plantName: string) => `/api/procesos/planta-nombre/${encodeURIComponent(plantName)}`, 
  SYSTEMS_ALL: '/api/procesos',
  SYSTEM_CREATE: '/api/procesos/crear',
  SYSTEM_UPDATE: (processId: string) => `/api/procesos/${processId}`, 
  
  // Variables/Parameters
  VARIABLES_BY_SYSTEM: (systemId: string) => `/api/variables/proceso/${systemId}`,
  VARIABLES_ALL: '/api/variables',
  VARIABLE_CREATE: '/api/variables/crear',
  VARIABLE_UPDATE: (id: string) => `/api/variables/${id}`,
  VARIABLE_DELETE: (id: string) => `/api/variables/${id}`,
  VARIABLE_DELETE_BY_PROCESS: (variableId: string, processId: string) => `/api/variables/${variableId}/proceso/${processId}`,
  
  // Formulas
  FORMULAS_CREATE: '/api/formulas/crear',
  FORMULAS_BY_PROCESS: (processId: string) => `/api/formulas/proceso/${processId}`,
  FORMULAS_ALL: '/api/formulas',
  
  // Process Access Control
  PROCESS_ACCESS_ASSIGN: '/api/accesos/procesos/asignar',
  PROCESS_ACCESS_BY_USER: (userId: string) => `/api/accesos/procesos/usuario/${userId}`,
  PROCESS_ACCESS_UPDATE: '/api/accesos/procesos/actualizar',
  PROCESS_ACCESS_REVOKE: '/api/accesos/procesos/revocar',
  
  // Tolerances
  TOLERANCES: '/api/variables-tolerancia',
  TOLERANCE_BY_ID: (id: string) => `/api/variables-tolerancia/${id}`,
  TOLERANCE_BY_NAME: (id: string) => `/api/variables-tolerancia/nombre/${id}`,
  TOLERANCE_UPDATE: (id: string) => `/api/variables-tolerancia/${id}`,
  TOLERANCE_DELETE: (id: string) => `/api/variables-tolerancia/${id}`,
  
  // Measurements
  MEASUREMENTS: '/api/mediciones',
  MEASUREMENT_BY_ID: (id: string) => `/api/mediciones/${id}`,
  MEASUREMENT_UPDATE: (id: string) => `/api/mediciones/${id}`,
  MEASUREMENT_DELETE: (id: string) => `/api/mediciones/${id}`,
  MEASUREMENTS_BY_VARIABLEID: (variable: string) => `/api/mediciones/variable-id/${encodeURIComponent(variable)}`,
  MEASUREMENTS_BY_VARIABLE_NAME: (variableName: string) => `/api/mediciones/variable/${encodeURIComponent(variableName)}`, 
  MEASUREMENTS_BY_SYSTEM: (sistema: string) => `/api/mediciones/sistema/${encodeURIComponent(sistema)}`,
  MEASUREMENTS_BY_PROCESS: (processName: string) => `/api/mediciones/proceso/${encodeURIComponent(processName)}`,
  MEASUREMENTS_BY_CLIENT: (clientName: string) => `/api/mediciones/cliente/${encodeURIComponent(clientName)}`,
  MEASUREMENTS_BY_VARIABLE_AND_BY_SISTEM: (variableId: string, sistem_name: string) => `/api/variables/${variableId}/sistema/${sistem_name}`,
  MEASUREMENTS_BY_VARIABLE_AND_BY_PROCESS: (variableId: string, process_name: string) => `/api/variables/${variableId}/proceso/${process_name}`,
  MEASUREMENTS_BY_VARIABLE_AND_BY_NAME: (variableId: string, client: string) => `/api/variables/${variableId}/proceso/${client}`,
  
  // Nuevos endpoints correctos según la documentación
  MEASUREMENTS_BY_VARIABLE_AND_SYSTEM: (variableName: string, systemName: string) => `/api/mediciones/variable/${encodeURIComponent(variableName)}/sistema/${encodeURIComponent(systemName)}`,
  MEASUREMENTS_BY_VARIABLE_AND_PROCESS: (variableName: string, processName: string) => `/api/mediciones/variable/${encodeURIComponent(variableName)}/proceso/${encodeURIComponent(processName)}`,
  MEASUREMENTS_BY_VARIABLE_AND_CLIENT: (variableName: string, clientName: string) => `/api/mediciones/variable/${encodeURIComponent(variableName)}/cliente/${encodeURIComponent(clientName)}`,
  
  // Reports
  REPORTS: '/api/reportes',
  REPORT_BY_ID: (id: string) => `/api/reportes/${id}`,
  REPORTS_BY_USER: (userId: string) => `/api/reportes/usuario/${userId}`,
  
  // File Upload
  FILE_UPLOAD: '/api/upload',
  
  // PDF Documents
  PDF_DOCUMENTS: '/api/documentos-pdf',
  PDF_DOCUMENT_BY_ID: (id: string) => `/api/documentos-pdf/${id}`,
  PDF_DOCUMENT_DELETE: (id: string) => `/api/documentos-pdf/${id}`,
  PDF_DOCUMENTS_DASHBOARD: '/api/documentos-pdf/dashboard',
  
  // PDF Document Permissions
  PDF_PERMISSIONS: '/api/documentos-pdf-permisos',
  PDF_PERMISSION_BY_ID: (id: string) => `/api/documentos-pdf-permisos/${id}`,
  PDF_PERMISSION_DELETE: (id: string) => `/api/documentos-pdf-permisos/${id}`,
  
  // Dashboard
  DASHBOARD_RESUMEN: '/api/dashboard/resumen',
  DASHBOARD_RESUMEN_ADMIN: '/api/dashboard/resumen-admin',
} as const

// Environment configuration
export const ENV_CONFIG = {
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  API_BASE_URL,
} as const
