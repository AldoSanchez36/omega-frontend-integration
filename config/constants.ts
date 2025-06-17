// Configuración centralizada de la aplicación
export const CONFIG = {
  // URLs
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000",

  // Puertos
  BACKEND_PORT: 4000,
  FRONTEND_PORT: 3000,

  // Endpoints principales
  ENDPOINTS: {
    AUTH: {
      LOGIN: "/api/auth/login",
      REGISTER: "/api/auth/register",
      LOGOUT: "/api/auth/logout",
    },
    PLANTAS: {
      CREATE: "/api/plantas/crear",
      MY_PLANTS: "/api/plantas/mis-plantas",
    },
    REPORTES: {
      CREATE: "/api/reportes",
      BY_USER: "/api/reportes/usuario",
    },
  },

  // Configuración de desarrollo
  IS_DEVELOPMENT: process.env.NODE_ENV === "development",
  IS_PRODUCTION: process.env.NODE_ENV === "production",
}

// Validación de configuración
if (CONFIG.IS_DEVELOPMENT) {
  console.log("🔧 Configuración de desarrollo:")
  console.log("   Backend:", CONFIG.API_BASE_URL)
  console.log("   Frontend:", CONFIG.FRONTEND_URL)
}
