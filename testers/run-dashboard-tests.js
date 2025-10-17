#!/usr/bin/env node

/**
 * Script de Ejecución para Tests del Dashboard
 * 
 * Uso:
 *   node testers/run-dashboard-tests.js
 *   npm run test:dashboard
 */

const { DashboardTester } = require('./testend-dashboard.js');
const fs = require('fs');
const path = require('path');
const { ReportHelper } = require('./report-helper.js');

// Configuración del entorno
const config = {
  // URL del API (puede ser sobrescrita por variable de entorno)
  API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:4000",
  
  // Credenciales de prueba
  TEST_CREDENTIALS: {
    email: process.env.TEST_EMAIL || "admin@example.com",
    password: process.env.TEST_PASSWORD || "admin123",
    username: process.env.TEST_USERNAME || "admin"
  },
  
  // Configuración de timeouts
  TIMEOUT: parseInt(process.env.TEST_TIMEOUT) || 10000,
  MAX_RETRIES: parseInt(process.env.TEST_MAX_RETRIES) || 3
};

// Función para mostrar ayuda
function showHelp() {
  console.log(`
🧪 Dashboard Testing Script

USAGE:
  node testers/run-dashboard-tests.js [options]

OPTIONS:
  --help, -h          Mostrar esta ayuda
  --url <url>         URL del API (default: ${config.API_URL})
  --email <email>     Email de prueba (default: ${config.TEST_CREDENTIALS.email})
  --password <pass>   Password de prueba (default: ${config.TEST_CREDENTIALS.password})
  --timeout <ms>      Timeout en milisegundos (default: ${config.TIMEOUT})
  --verbose, -v       Modo verbose
  --quiet, -q         Modo silencioso

ENVIRONMENT VARIABLES:
  NEXT_PUBLIC_API_URL    URL del API
  TEST_EMAIL            Email de prueba
  TEST_PASSWORD         Password de prueba
  TEST_TIMEOUT          Timeout en ms
  TEST_MAX_RETRIES      Número máximo de reintentos

EXAMPLES:
  # Ejecutar con configuración por defecto
  node testers/run-dashboard-tests.js

  # Ejecutar con URL específica
  node testers/run-dashboard-tests.js --url http://localhost:3000

  # Ejecutar con credenciales específicas
  node testers/run-dashboard-tests.js --email test@example.com --password testpass

  # Ejecutar en modo verbose
  node testers/run-dashboard-tests.js --verbose
`);
}

// Función para parsear argumentos de línea de comandos
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    verbose: false,
    quiet: false,
    url: config.API_URL,
    email: config.TEST_CREDENTIALS.email,
    password: config.TEST_CREDENTIALS.password,
    timeout: config.TIMEOUT
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      case '--url':
        options.url = args[++i];
        break;
      case '--email':
        options.email = args[++i];
        break;
      case '--password':
        options.password = args[++i];
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i]);
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--quiet':
      case '-q':
        options.quiet = true;
        break;
      default:
        console.error(`❌ Unknown option: ${arg}`);
        console.log('Use --help for usage information');
        process.exit(1);
    }
  }

  return options;
}

// Función principal
async function main() {
  const options = parseArgs();
  
  // Configurar variables de entorno
  process.env.NEXT_PUBLIC_API_URL = options.url;
  
  if (!options.quiet) {
    console.log('🚀 Starting Dashboard Endpoint Testing...');
    console.log(`🌐 API URL: ${options.url}`);
    console.log(`👤 Test User: ${options.email}`);
    console.log(`⏱️  Timeout: ${options.timeout}ms`);
    console.log('');
  }

  try {
    // Crear instancia del tester
    const tester = new DashboardTester();
    const reportHelper = new ReportHelper();
    
    // Configurar credenciales de prueba
    tester.TEST_CONFIG = {
      TEST_USER: {
        email: options.email,
        password: options.password,
        username: options.email.split('@')[0]
      },
      TIMEOUT: options.timeout,
      MAX_RETRIES: config.MAX_RETRIES
    };
    
    // Ejecutar tests
    const report = await tester.runAllTests();
    
    // Guardar reporte en tester-results folder
    const reportPath = reportHelper.saveJsonReport('dashboard-test', report);
    
    if (!options.quiet) {
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    }
    
    // Also save the old format for backward compatibility
    const reportDir = path.dirname(__filename);
    const legacyPath = path.join(reportDir, 'dashboard-test-report.json');
    fs.writeFileSync(legacyPath, JSON.stringify(report, null, 2));
    
    if (!options.quiet) {
      console.log(`📄 Legacy report saved to: ${legacyPath}`);
    }
    
    // Exit code basado en resultados
    const exitCode = report.summary.failed > 0 ? 1 : 0;
    
    if (exitCode === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log(`\n❌ ${report.summary.failed} test(s) failed`);
    }
    
    process.exit(exitCode);
    
  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main, parseArgs, showHelp };
