#!/usr/bin/env node

/**
 * Script de Testing para Dashboard Parameters
 * 
 * Este script prueba todos los endpoints utilizados en la página /dashboard-parameters
 * para verificar la conectividad y funcionalidad correcta.
 * 
 * Endpoints probados:
 * - PATCH /api/variables/{id} - Actualizar variable
 * - GET /api/variables - Obtener todas las variables
 * - POST /api/plantas/crear - Crear nueva planta
 * - GET /api/variables/proceso/{systemId} - Obtener variables por sistema
 * - POST /api/procesos/crear - Crear nuevo proceso
 * - DELETE /api/variables/{variableId}/proceso/{processId} - Eliminar variable del proceso
 * - POST /api/variables/crear - Crear nueva variable
 * - GET /api/variables-tolerancia - Obtener tolerancias
 * - PATCH /api/variables-tolerancia/{id} - Actualizar tolerancia
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const { ReportHelper } = require('./report-helper.js');

const TEST_CONFIG = {
  TEST_USER: {
    email: "aldotrufa@example.com",
    password: "password123",
    username: "aldo Sanchez"
  },
  TIMEOUT: 15000,
  MAX_RETRIES: 3
};

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class DashboardParametersTester {
  constructor() {
    this.token = null;
    this.user = null;
    this.testResults = [];
    this.startTime = Date.now();
    this.testVariableId = null;
    this.testSystemId = null;
    this.testPlantId = null;
    this.reportHelper = new ReportHelper();
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
      timeout: TEST_CONFIG.TIMEOUT
    };

    const requestOptions = { ...defaultOptions, ...options };
    
    try {
      this.log(`📡 Testing: ${options.method || 'GET'} ${endpoint}`, 'test');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TEST_CONFIG.TIMEOUT);
      
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
        this.log(`⏰ ${endpoint} - Timeout after ${TEST_CONFIG.TIMEOUT}ms`, 'warning');
      } else {
        this.log(`💥 ${endpoint} - Error: ${error.message}`, 'error');
      }
      
      return result;
    }
  }

  async testAuthentication() {
    this.log('🔐 Testing Authentication...', 'info');
    
    const result = await this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(TEST_CONFIG.TEST_USER)
    });
    
    this.testResults.push({
      category: 'Authentication',
      test: 'Login',
      ...result
    });

    if (result.success && result.data?.token) {
      this.token = result.data.token;
      this.user = result.data;
      this.log(`🎉 Authentication successful! Token obtained.`, 'success');
    } else {
      this.log(`❌ Authentication failed. Check if user exists and is verified.`, 'error');
    }
  }

  async testVariableEndpoints() {
    this.log('📊 Testing Variable Endpoints...', 'info');
    
    if (!this.token) {
      this.log('❌ No authentication token available', 'error');
      return;
    }

    const variableTests = [
      {
        name: 'Get All Variables',
        endpoint: '/api/variables',
        category: 'Variables'
      },
      {
        name: 'Get Tolerances',
        endpoint: '/api/variables-tolerancia',
        category: 'Tolerances'
      }
    ];

    for (const test of variableTests) {
      const result = await this.makeRequest(test.endpoint);
      
      this.testResults.push({
        category: test.category,
        test: test.name,
        ...result
      });

      // Store test data for later tests
      if (test.name === 'Get All Variables' && result.success && result.data?.variables?.length > 0) {
        this.testVariableId = result.data.variables[0].id;
        this.log(`📝 Found test variable ID: ${this.testVariableId}`, 'info');
      }
    }
  }

  async testPlantAndSystemEndpoints() {
    this.log('🏭 Testing Plant and System Endpoints...', 'info');
    
    if (!this.token) {
      this.log('❌ No authentication token available', 'error');
      return;
    }

    // Test plant creation
    const newPlantData = {
      nombre: "Test Plant for Parameters",
      location: "Test Location",
      description: "Test plant for parameter testing"
    };

    const createPlantResult = await this.makeRequest('/api/plantas/crear', {
      method: 'POST',
      body: JSON.stringify(newPlantData)
    });
    
    this.testResults.push({
      category: 'Plants',
      test: 'Create Plant',
      ...createPlantResult
    });

    if (createPlantResult.success && createPlantResult.data?.id) {
      this.testPlantId = createPlantResult.data.id;
      this.log(`📝 Created test plant ID: ${this.testPlantId}`, 'info');

      // Test system creation
      const newSystemData = {
        nombre: "Test System for Parameters",
        descripcion: "Test system for parameter testing",
        planta_id: this.testPlantId
      };

      const createSystemResult = await this.makeRequest('/api/procesos/crear', {
        method: 'POST',
        body: JSON.stringify(newSystemData)
      });
      
      this.testResults.push({
        category: 'Systems',
        test: 'Create System',
        ...createSystemResult
      });

      if (createSystemResult.success && createSystemResult.data?.id) {
        this.testSystemId = createSystemResult.data.id;
        this.log(`📝 Created test system ID: ${this.testSystemId}`, 'info');

        // Test getting variables by system
        const variablesBySystemResult = await this.makeRequest(`/api/variables/proceso/${this.testSystemId}`);
        
        this.testResults.push({
          category: 'Variables',
          test: 'Get Variables by System',
          ...variablesBySystemResult
        });
      }
    }
  }

  async testVariableCRUDOperations() {
    this.log('✏️ Testing Variable CRUD Operations...', 'info');
    
    if (!this.token || !this.testSystemId) {
      this.log('❌ Missing required data for variable CRUD tests', 'error');
      return;
    }

    // Test variable creation
    const newVariableData = {
      nombre: "Test Parameter",
      unidad: "units",
      proceso_id: this.testSystemId
    };

    const createVariableResult = await this.makeRequest('/api/variables/crear', {
      method: 'POST',
      body: JSON.stringify(newVariableData)
    });
    
    this.testResults.push({
      category: 'Variable CRUD',
      test: 'Create Variable',
      ...createVariableResult
    });

    if (createVariableResult.success && createVariableResult.data?.id) {
      const newVariableId = createVariableResult.data.id;
      this.log(`📝 Created test variable ID: ${newVariableId}`, 'info');

      // Test variable update
      const updateVariableData = {
        nombre: "Updated Test Parameter",
        unidad: "updated_units"
      };

      const updateVariableResult = await this.makeRequest(`/api/variables/${newVariableId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateVariableData)
      });
      
      this.testResults.push({
        category: 'Variable CRUD',
        test: 'Update Variable',
        ...updateVariableResult
      });

      // Test variable deletion from process
      const deleteVariableResult = await this.makeRequest(`/api/variables/${newVariableId}/proceso/${this.testSystemId}`, {
        method: 'DELETE'
      });
      
      this.testResults.push({
        category: 'Variable CRUD',
        test: 'Delete Variable from Process',
        ...deleteVariableResult
      });
    }
  }

  async testToleranceOperations() {
    this.log('📏 Testing Tolerance Operations...', 'info');
    
    if (!this.token) {
      this.log('❌ No authentication token available', 'error');
      return;
    }

    // Get tolerances first
    const tolerancesResult = await this.makeRequest('/api/variables-tolerancia');
    
    this.testResults.push({
      category: 'Tolerances',
      test: 'Get Tolerances',
      ...tolerancesResult
    });

    // If we have tolerances, test updating one
    if (tolerancesResult.success && tolerancesResult.data?.tolerancias?.length > 0) {
      const toleranceId = tolerancesResult.data.tolerancias[0].id;
      
      const updateToleranceData = {
        nombre: "Updated Test Tolerance",
        valor_minimo: 0,
        valor_maximo: 100
      };

      const updateToleranceResult = await this.makeRequest(`/api/variables-tolerancia/${toleranceId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateToleranceData)
      });
      
      this.testResults.push({
        category: 'Tolerances',
        test: 'Update Tolerance',
        ...updateToleranceResult
      });
    }
  }

  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    this.log('\n' + '='.repeat(60), 'info');
    this.log('📊 DASHBOARD PARAMETERS TESTING REPORT', 'bright');
    this.log('='.repeat(60), 'info');
    
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const failedTests = this.testResults.filter(r => !r.success).length;
    
    this.log(`\n📈 SUMMARY:`, 'info');
    this.log(`   Total Tests: ${totalTests}`, 'info');
    this.log(`   ✅ Successful: ${successfulTests}`, 'success');
    this.log(`   ❌ Failed: ${failedTests}`, 'error');
    this.log(`   ⏱️  Duration: ${duration}ms`, 'info');
    this.log(`   📊 Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`, 'info');
    
    const categories = {};
    this.testResults.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = { total: 0, successful: 0, failed: 0 };
      }
      categories[result.category].total++;
      if (result.success) {
        categories[result.category].successful++;
      } else {
        categories[result.category].failed++;
      }
    });
    
    this.log(`\n📋 RESULTS BY CATEGORY:`, 'info');
    Object.entries(categories).forEach(([category, stats]) => {
      const rate = ((stats.successful / stats.total) * 100).toFixed(1);
      this.log(`   ${category}: ${stats.successful}/${stats.total} (${rate}%)`, 
        stats.failed === 0 ? 'success' : 'warning');
    });
    
    const failedResults = this.testResults.filter(r => !r.success);
    if (failedResults.length > 0) {
      this.log(`\n❌ FAILED TESTS:`, 'error');
      failedResults.forEach(result => {
        this.log(`   • ${result.category} - ${result.test}`, 'error');
        this.log(`     Status: ${result.status} | Error: ${result.error?.message || result.error}`, 'error');
      });
    }
    
    this.log('\n' + '='.repeat(60), 'info');
    
    return {
      summary: {
        total: totalTests,
        successful: successfulTests,
        failed: failedTests,
        duration,
        successRate: (successfulTests / totalTests) * 100
      },
      categories,
      results: this.testResults
    };
  }

  async runAllTests() {
    this.log('🚀 Starting Dashboard Parameters Testing...', 'bright');
    this.log(`🌐 API Base URL: ${API_BASE_URL}`, 'info');
    this.log(`⏱️  Timeout: ${TEST_CONFIG.TIMEOUT}ms`, 'info');
    
    try {
      await this.testAuthentication();
      await this.testVariableEndpoints();
      await this.testPlantAndSystemEndpoints();
      await this.testVariableCRUDOperations();
      await this.testToleranceOperations();
      
      const report = this.generateReport();
      
      this.log('\n🎉 Testing completed!', 'success');
      return report;
      
    } catch (error) {
      this.log(`💥 Fatal error during testing: ${error.message}`, 'error');
      throw error;
    }
  }
}

async function runDashboardParametersTests() {
  const tester = new DashboardParametersTester();
  
  try {
    const report = await tester.runAllTests();
    
    if (typeof window === 'undefined') {
      // Save report to tester-results folder
      const reportPath = tester.reportHelper.saveJsonReport('dashboard-parameters-test', report);
      console.log(`📄 Report saved to: ${reportPath}`);
      
      // Also save the old format for backward compatibility
      const fs = require('fs');
      const legacyPath = './dashboard-parameters-test-report.json';
      fs.writeFileSync(legacyPath, JSON.stringify(report, null, 2));
      console.log(`📄 Legacy report saved to: ${legacyPath}`);
    }
    
    return report;
  } catch (error) {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DashboardParametersTester, runDashboardParametersTests };
}

if (typeof window === 'undefined' && require.main === module) {
  runDashboardParametersTests();
}
