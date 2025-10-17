#!/usr/bin/env node

/**
 * Script para verificar qué endpoints están disponibles
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    test: colors.cyan
  };
  
  console.log(`${colorMap[type] || colors.reset}[${timestamp}] ${message}${colors.reset}`);
}

async function testEndpoint(endpoint, method = 'GET', body = null) {
  log(`📡 Testing: ${method} ${endpoint}`, 'test');
  
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    const result = {
      endpoint,
      method,
      status: response.status,
      statusText: response.statusText,
      success: response.ok
    };
    
    // Try to get response as text first
    const responseText = await response.text();
    
    // Try to parse as JSON
    try {
      result.data = JSON.parse(responseText);
      log(`✅ ${endpoint} - Status: ${response.status} (JSON)`, 'success');
    } catch (e) {
      result.data = responseText;
      if (responseText.includes('<!DOCTYPE')) {
        log(`❌ ${endpoint} - Status: ${response.status} (HTML response - endpoint may not exist)`, 'error');
      } else {
        log(`⚠️ ${endpoint} - Status: ${response.status} (Text response)`, 'warning');
      }
    }
    
    return result;
  } catch (error) {
    log(`💥 ${endpoint} - Error: ${error.message}`, 'error');
    return {
      endpoint,
      method,
      success: false,
      error: error.message
    };
  }
}

async function authenticate() {
  log('🔐 Authenticating...', 'info');
  
  const credentials = [
    { email: "aldotrufa@example.com", password: "password123" },
    { email: "admin@example.com", password: "admin123" },
    { email: "admin", password: "admin123" }
  ];
  
  for (const cred of credentials) {
    const result = await testEndpoint('/api/auth/login', 'POST', cred);
    if (result.success && result.data?.token) {
      log(`🎉 Authentication successful with: ${cred.email}`, 'success');
      return result.data.token;
    }
  }
  
  log(`❌ Authentication failed with all credentials`, 'error');
  return null;
}

async function main() {
  log('🚀 Starting Endpoint Check Test...', 'bright');
  log(`🌐 API Base URL: ${API_BASE_URL}`, 'info');
  
  try {
    // Test authentication
    const token = await authenticate();
    
    if (token) {
      log('\n🔍 Testing endpoints with authentication...', 'info');
      
      // Test various endpoints
      const endpoints = [
        '/api/variables',
        '/api/variables/crear',
        '/api/variables/create',
        '/api/mediciones',
        '/api/mediciones/variable/Cloruros',
        '/api/plantas',
        '/api/procesos',
        '/api/usuarios'
      ];
      
      const results = [];
      for (const endpoint of endpoints) {
        const result = await testEndpoint(endpoint);
        results.push(result);
      }
      
      // Test POST to create variable
      log('\n📝 Testing variable creation endpoints...', 'info');
      const createEndpoints = [
        '/api/variables',
        '/api/variables/crear',
        '/api/variables/create'
      ];
      
      for (const endpoint of createEndpoints) {
        const result = await testEndpoint(endpoint, 'POST', { nombre: 'TestVar', unidad: 'test' });
        results.push(result);
      }
      
      log('\n📊 SUMMARY:', 'info');
      results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const type = result.data && typeof result.data === 'object' ? 'JSON' : 'HTML/Text';
        log(`   ${status} ${result.method} ${result.endpoint} - ${result.status} (${type})`, result.success ? 'success' : 'error');
      });
      
    } else {
      log('❌ Cannot test authenticated endpoints without token', 'error');
    }
    
    log('\n🎉 Endpoint check completed!', 'success');
    
  } catch (error) {
    log(`💥 Fatal error: ${error.message}`, 'error');
    process.exit(1);
  }
}

if (typeof window === 'undefined' && require.main === module) {
  main();
}
