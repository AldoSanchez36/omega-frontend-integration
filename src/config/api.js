const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000"

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: "/api/auth/register",
    LOGIN: "/api/auth/login",
    LOGOUT: "/api/auth/logout",
    USER: "/api/auth/user",
    USERS: "/api/auth/users",
    UPDATE_USER: "/api/auth/update",
    DELETE_USER: "/api/auth/delete",
  },
  // Plants
  PLANTAS: {
    CREAR: "/api/plantas/crear",
    MIS_PLANTAS: "/api/plantas/mis-plantas",
  },
  // Processes
  PROCESOS: {
    CREAR: "/api/procesos/crear",
    BY_PLANTA: "/api/procesos/planta",
    ALL: "/api/procesos",
  },
  // Variables
  VARIABLES: {
    CREAR: "/api/variables/crear",
    BY_PROCESO: "/api/variables/proceso",
    ALL: "/api/variables",
  },
  // Formulas
  FORMULAS: {
    CREAR: "/api/formulas/crear",
    BY_PROCESO: "/api/formulas/proceso",
    ALL: "/api/formulas",
  },
  // Access Control
  ACCESOS: {
    PLANTAS: {
      ASIGNAR: "/api/accesos/plantas/asignar",
      USUARIO: "/api/accesos/plantas/usuario",
      REVOCAR: "/api/accesos/plantas/revocar",
    },
    PROCESOS: {
      ASIGNAR: "/api/accesos/procesos/asignar",
      USUARIO: "/api/accesos/procesos/usuario",
      REVOCAR: "/api/accesos/procesos/revocar",
    },
  },
  // Reports
  REPORTES: {
    CREATE: "/api/reportes",
    BY_ID: "/api/reportes",
    BY_USER: "/api/reportes/usuario",
  },
  // Upload
  UPLOAD: "/api/upload",
}

export default API_BASE_URL
