#!/usr/bin/env node

/**
 * Script para agregar las variables faltantes a la base de datos
 * 
 * Este script:
 * 1. Se autentica
 * 2. Agrega las variables S1, s2, S2 que faltan
 * 3. Verifica que se crearon correctamente
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

class AddMissingVariablesTester {
  constructor() {
    this.token = null;
    this.user = null;
  }

  log(message, type = 'info') {
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

  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
      },
      timeout: 15000
    };

    // Create a fresh request options object to avoid body reuse issues
    const requestOptions = { 
      ...defaultOptions, 
      ...options,
      body: options.body ? JSON.stringify(JSON.parse(options.body)) : options.body
    };
    
    try {
      this.log(`📡 ${options.method || 'GET'} ${endpoint}`, 'test');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const result = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        endpoint,
        method: options.method || 'GET',
        timestamp: new Date().toISOString()
      };

      if (response.ok) {
        try {
          result.data = await response.json();
          this.log(`✅ ${endpoint} - Status: ${response.status}`, 'success');
        } catch (e) {
          result.data = await response.text();
          this.log(`✅ ${endpoint} - Status: ${response.status} (text response)`, 'success');
        }
      } else {
        try {
          result.error = await response.json();
          this.log(`❌ ${endpoint} - Status: ${response.status} - ${result.error?.msg || result.error?.message || JSON.stringify(result.error)}`, 'error');
        } catch (e) {
          result.error = await response.text();
          this.log(`❌ ${endpoint} - Status: ${response.status} - ${result.error}`, 'error');
        }
      }

      return result;
    } catch (error) {
      const result = {
        success: false,
        error: error.message,
        endpoint,
        method: options.method || 'GET',
        timestamp: new Date().toISOString()
      };
      
      if (error.name === 'AbortError') {
        result.error = 'Request timeout';
        this.log(`⏰ ${endpoint} - Timeout after 15000ms`, 'warning');
      } else {
        this.log(`💥 ${endpoint} - Error: ${error.message}`, 'error');
      }
      
      return result;
    }
  }

  async authenticate() {
    this.log('🔐 Authenticating...', 'info');
    
    const credentials = [
      { email: "aldotrufa@example.com", password: "password123" },
      { email: "admin@example.com", password: "admin123" },
      { email: "admin", password: "admin123" }
    ];
    
    for (const cred of credentials) {
      const result = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(cred)
      });
      
      if (result.success && result.data?.token) {
        this.token = result.data.token;
        this.user = result.data;
        this.log(`🎉 Authentication successful with: ${cred.email}`, 'success');
        return true;
      }
    }
    
    this.log(`❌ Authentication failed with all credentials`, 'error');
    return false;
  }

  async addMissingVariables() {
    this.log('📝 Adding missing variables...', 'info');
    
    if (!this.token) {
      this.log('❌ No authentication token available', 'error');
      return false;
    }

    const missingVariables = [
      { nombre: "S1", unidad: "ppm" },
      { nombre: "s2", unidad: "ppm" },
      { nombre: "S2", unidad: "ppm" }
    ];

    const results = [];

    for (const variable of missingVariables) {
      this.log(`\n➕ Adding variable: "${variable.nombre}"`, 'test');
      
      const result = await this.makeRequest('/api/variables', {
        method: 'POST',
        body: JSON.stringify(variable)
      });

      results.push({
        variable: variable.nombre,
        success: result.success,
        status: result.status,
        data: result.data,
        error: result.error
      });

      if (result.success) {
        this.log(`✅ Variable "${variable.nombre}" created successfully`, 'success');
      } else {
        this.log(`❌ Failed to create variable "${variable.nombre}": ${result.error?.msg || result.error?.message || JSON.stringify(result.error)}`, 'error');
      }
    }

    return results;
  }

  async verifyVariables() {
    this.log('🔍 Verifying variables...', 'info');
    
    if (!this.token) {
      this.log('❌ No authentication token available', 'error');
      return false;
    }

    // Get all variables
    const result = await this.makeRequest('/api/variables');
    
    if (result.success && result.data?.variables) {
      const variables = result.data.variables;
      this.log(`📝 Found ${variables.length} variables`, 'info');
      
      // Check for our target variables
      const targetVariables = ['S1', 's2', 'S2', 'Cloruros', 'Cloro Libre'];
      this.log('\n🔍 CHECKING TARGET VARIABLES:', 'info');
      
      targetVariables.forEach(varName => {
        const found = variables.find(v => v.nombre === varName);
        if (found) {
          this.log(`   ✅ "${varName}" - FOUND (ID: ${found.id})`, 'success');
        } else {
          this.log(`   ❌ "${varName}" - NOT FOUND`, 'error');
        }
      });
      
      return variables;
    } else {
      this.log('❌ Failed to get variables', 'error');
      return null;
    }
  }

  async testVariableEndpoints() {
    this.log('🎯 Testing variable endpoints...', 'info');
    
    if (!this.token) {
      this.log('❌ No authentication token available', 'error');
      return false;
    }

    const targetVariables = ['S1', 's2', 'S2', 'Cloruros', 'Cloro Libre'];
    
    for (const variable of targetVariables) {
      this.log(`\n📡 Testing variable: "${variable}"`, 'test');
      
      const result = await this.makeRequest(`/api/mediciones/variable/${encodeURIComponent(variable)}`);

      if (result.success) {
        const measurements = result.data?.mediciones || result.data || [];
        this.log(`   ✅ "${variable}" - Status: ${result.status} - ${measurements.length} measurements`, 'success');
      } else {
        this.log(`   ❌ "${variable}" - Status: ${result.status} - ${result.error?.msg || result.error?.message || JSON.stringify(result.error)}`, 'error');
      }
    }
  }

  async runAllTests() {
    this.log('🚀 Starting Add Missing Variables Test...', 'bright');
    this.log(`🌐 API Base URL: ${API_BASE_URL}`, 'info');
    
    try {
      // Step 1: Authenticate
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        throw new Error('Authentication failed');
      }

      // Step 2: Add missing variables
      const addResults = await this.addMissingVariables();
      
      // Step 3: Verify variables were created
      const variables = await this.verifyVariables();
      
      // Step 4: Test endpoints
      await this.testVariableEndpoints();
      
      this.log('\n🎉 Test completed!', 'success');
      
      return {
        authentication: authSuccess,
        addResults,
        variables,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.log(`💥 Fatal error during testing: ${error.message}`, 'error');
      throw error;
    }
  }
}

async function runAddMissingVariablesTest() {
  const tester = new AddMissingVariablesTester();
  
  try {
    const report = await tester.runAllTests();
    
    if (typeof window === 'undefined') {
      const fs = require('fs');
      const reportPath = './add-missing-variables-test-report.json';
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Report saved to: ${reportPath}`);
    }
    
    return report;
  } catch (error) {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AddMissingVariablesTester, runAddMissingVariablesTest };
}

if (typeof window === 'undefined' && require.main === module) {
  runAddMissingVariablesTest();
}
