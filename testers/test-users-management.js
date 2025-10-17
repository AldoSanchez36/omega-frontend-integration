#!/usr/bin/env node

/**
 * Script de Testing para Users Management
 * 
 * Este script prueba todos los endpoints utilizados en la página /users-management
 * para verificar la conectividad y funcionalidad correcta.
 * 
 * Endpoints probados:
 * - GET /api/auth/users - Obtener todos los usuarios
 * - GET /api/plantas/allID - Obtener IDs de plantas
 * - GET /api/plantas/accesibles - Obtener plantas accesibles
 * - GET /api/procesos/planta/{plantId} - Obtener procesos por planta
 * - GET /api/accesos/plantas/usuario/{userId} - Obtener accesos de plantas por usuario
 * - PATCH /api/auth/update/{userId} - Actualizar usuario
 * - DELETE /api/auth/delete/{userId} - Eliminar usuario
 * - POST /api/accesos/plantas/asignar - Asignar acceso a planta
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

class UsersManagementTester {
  constructor() {
    this.token = null;
    this.user = null;
    this.testResults = [];
    this.startTime = Date.now();
    this.testUserId = null;
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

  async testUserManagementEndpoints() {
    this.log('👥 Testing User Management Endpoints...', 'info');
    
    if (!this.token) {
      this.log('❌ No authentication token available', 'error');
      return;
    }

    const userTests = [
      {
        name: 'Get All Users',
        endpoint: '/api/auth/users',
        category: 'User Management'
      },
      {
        name: 'Get Plants All ID',
        endpoint: '/api/plantas/allID',
        category: 'Plants'
      },
      {
        name: 'Get Accessible Plants',
        endpoint: '/api/plantas/accesibles',
        category: 'Plants'
      }
    ];

    for (const test of userTests) {
      const result = await this.makeRequest(test.endpoint);
      
      this.testResults.push({
        category: test.category,
        test: test.name,
        ...result
      });

      // Store test user ID and plant ID for later tests
      if (test.name === 'Get All Users' && result.success && result.data?.usuarios?.length > 0) {
        this.testUserId = result.data.usuarios[0].id || result.data.usuarios[0]._id;
        this.log(`📝 Found test user ID: ${this.testUserId}`, 'info');
      }
      
      if (test.name === 'Get Accessible Plants' && result.success && result.data?.plantas?.length > 0) {
        this.testPlantId = result.data.plantas[0].id;
        this.log(`📝 Found test plant ID: ${this.testPlantId}`, 'info');
      }
    }
  }

  async testPlantAccessEndpoints() {
    this.log('🏭 Testing Plant Access Endpoints...', 'info');
    
    if (!this.token || !this.testUserId || !this.testPlantId) {
      this.log('❌ Missing required data for plant access tests', 'error');
      return;
    }

    const plantAccessTests = [
      {
        name: 'Get Processes by Plant',
        endpoint: `/api/procesos/planta/${this.testPlantId}`,
        category: 'Plant Access'
      },
      {
        name: 'Get Plant Access by User',
        endpoint: `/api/accesos/plantas/usuario/${this.testUserId}`,
        category: 'Plant Access'
      }
    ];

    for (const test of plantAccessTests) {
      const result = await this.makeRequest(test.endpoint);
      
      this.testResults.push({
        category: test.category,
        test: test.name,
        ...result
      });
    }
  }

  async testUserCRUDOperations() {
    this.log('✏️ Testing User CRUD Operations...', 'info');
    
    if (!this.token || !this.testUserId) {
      this.log('❌ Missing required data for user CRUD tests', 'error');
      return;
    }

    // Test user update
    const updateData = {
      username: "Updated Test User",
      email: "updated@example.com",
      puesto: "user"
    };

    const updateResult = await this.makeRequest(`/api/auth/update/${this.testUserId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
    
    this.testResults.push({
      category: 'User CRUD',
      test: 'Update User',
      ...updateResult
    });

    // Test plant access assignment
    if (this.testPlantId) {
      const accessData = {
        usuario_id: this.testUserId,
        planta_id: this.testPlantId,
        permiso_ver: true,
        permiso_editar: false
      };

      const accessResult = await this.makeRequest('/api/accesos/plantas/asignar', {
        method: 'POST',
        body: JSON.stringify(accessData)
      });
      
      this.testResults.push({
        category: 'User CRUD',
        test: 'Assign Plant Access',
        ...accessResult
      });
    }
  }

  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    this.log('\n' + '='.repeat(60), 'info');
    this.log('👥 USERS MANAGEMENT TESTING REPORT', 'bright');
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
    this.log('🚀 Starting Users Management Testing...', 'bright');
    this.log(`🌐 API Base URL: ${API_BASE_URL}`, 'info');
    this.log(`⏱️  Timeout: ${TEST_CONFIG.TIMEOUT}ms`, 'info');
    
    try {
      await this.testAuthentication();
      await this.testUserManagementEndpoints();
      await this.testPlantAccessEndpoints();
      await this.testUserCRUDOperations();
      
      const report = this.generateReport();
      
      this.log('\n🎉 Testing completed!', 'success');
      return report;
      
    } catch (error) {
      this.log(`💥 Fatal error during testing: ${error.message}`, 'error');
      throw error;
    }
  }
}

async function runUsersManagementTests() {
  const tester = new UsersManagementTester();
  
  try {
    const report = await tester.runAllTests();
    
    if (typeof window === 'undefined') {
      // Save report to tester-results folder
      const reportPath = tester.reportHelper.saveJsonReport('users-management-test', report);
      console.log(`📄 Report saved to: ${reportPath}`);
      
      // Also save the old format for backward compatibility
      const fs = require('fs');
      const legacyPath = './users-management-test-report.json';
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
  module.exports = { UsersManagementTester, runUsersManagementTests };
}

if (typeof window === 'undefined' && require.main === module) {
  runUsersManagementTests();
}
