/**
 * Archivo de Configuración de Ejemplo para Tests del Dashboard
 * 
 * Copia este archivo como 'test-config.js' y ajusta los valores según tu entorno.
 */

module.exports = {
  // Configuración del API
  API: {
    // URL base del API
    BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
    
    // Timeout para requests (en milisegundos)
    TIMEOUT: parseInt(process.env.TEST_TIMEOUT) || 10000,
    
    // Número máximo de reintentos
    MAX_RETRIES: parseInt(process.env.TEST_MAX_RETRIES) || 3
  },

  // Credenciales de prueba
  TEST_USER: {
    // Usuario administrador para pruebas completas
    ADMIN: {
      email: process.env.TEST_ADMIN_EMAIL || "admin@example.com",
      password: process.env.TEST_ADMIN_PASSWORD || "admin123",
      username: process.env.TEST_ADMIN_USERNAME || "admin"
    },
    
    // Usuario regular para pruebas de permisos
    USER: {
      email: process.env.TEST_USER_EMAIL || "user@example.com",
      password: process.env.TEST_USER_PASSWORD || "user123",
      username: process.env.TEST_USER_USERNAME || "user"
    },
    
    // Cliente para pruebas de acceso limitado
    CLIENT: {
      email: process.env.TEST_CLIENT_EMAIL || "client@example.com",
      password: process.env.TEST_CLIENT_PASSWORD || "client123",
      username: process.env.TEST_CLIENT_USERNAME || "client"
    }
  },

  // Configuración de testing
  TESTING: {
    // Habilitar tests de datos históricos (pueden ser lentos)
    ENABLE_HISTORICAL_TESTS: process.env.ENABLE_HISTORICAL_TESTS !== 'false',
    
    // Habilitar tests de reportes
    ENABLE_REPORT_TESTS: process.env.ENABLE_REPORT_TESTS !== 'false',
    
    // Habilitar tests de upload de archivos
    ENABLE_UPLOAD_TESTS: process.env.ENABLE_UPLOAD_TESTS !== 'false',
    
    // Rango de fechas para tests históricos
    DATE_RANGE: {
      START: process.env.TEST_START_DATE || "2024-01-01",
      END: process.env.TEST_END_DATE || new Date().toISOString().split('T')[0]
    }
  },

  // Configuración de logging
  LOGGING: {
    // Nivel de logging (error, warn, info, debug)
    LEVEL: process.env.LOG_LEVEL || "info",
    
    // Habilitar colores en logs
    COLORS: process.env.LOG_COLORS !== 'false',
    
    // Guardar logs en archivo
    SAVE_TO_FILE: process.env.SAVE_LOGS === 'true',
    
    // Archivo de logs
    LOG_FILE: process.env.LOG_FILE || "./testers/test-logs.log"
  },

  // Configuración de reportes
  REPORTS: {
    // Formato del reporte (json, html, both)
    FORMAT: process.env.REPORT_FORMAT || "json",
    
    // Directorio para reportes
    OUTPUT_DIR: process.env.REPORT_OUTPUT_DIR || "./testers/reports",
    
    // Incluir datos de respuesta en el reporte
    INCLUDE_RESPONSE_DATA: process.env.INCLUDE_RESPONSE_DATA === 'true',
    
    // Incluir headers de respuesta
    INCLUDE_RESPONSE_HEADERS: process.env.INCLUDE_RESPONSE_HEADERS === 'true'
  },

  // Configuración de notificaciones (opcional)
  NOTIFICATIONS: {
    // Habilitar notificaciones por email
    EMAIL_ENABLED: process.env.EMAIL_NOTIFICATIONS === 'true',
    
    // Configuración SMTP
    SMTP: {
      HOST: process.env.SMTP_HOST || "smtp.gmail.com",
      PORT: parseInt(process.env.SMTP_PORT) || 587,
      USER: process.env.SMTP_USER || "",
      PASS: process.env.SMTP_PASS || "",
      FROM: process.env.SMTP_FROM || "test@example.com"
    },
    
    // Destinatarios de notificaciones
    RECIPIENTS: (process.env.NOTIFICATION_RECIPIENTS || "").split(",").filter(Boolean)
  }
};
