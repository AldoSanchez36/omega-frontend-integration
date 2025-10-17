#!/usr/bin/env node

/**
 * Script de Testing para Agregar Formula
 * 
 * Este script prueba todos los endpoints utilizados en la página /agregar-formula
 * para verificar la conectividad y funcionalidad correcta.
 * 
 * Endpoints probados:
 * - POST /api/formulas/crear - Crear nueva fórmula
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const { ReportHelper } = require('./report-helper.js');

// Configuración de testing
const TEST_CONFIG = {
  TEST_USER: {
    email: "aldotrufa@example.com",
    password: "password123",
    username: "aldo Sanchez"
  },
  TIMEOUT: 15000,
  MAX_RETRIES: 3
};

// Colores para logging
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class AgregarFormulaTester {
  constructor() {
    this.token = null;
    this.user = null;
    this.testResults = [];
    this.startTime = Date.now();
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

  async testFormulaEndpoints() {
    this.log('🧮 Testing Formula Endpoints...', 'info');
    
    if (!this.token) {
      this.log('❌ No authentication token available', 'error');
      return;
    }

    // Test data for formula creation
    const testFormula = {
      nombre: "Test Formula",
      expresion: "x + y * 2",
      variables: [
        { nombre: "x", prueba: "2" },
        { nombre: "y", prueba: "3" }
      ],
      variable_resultado_id: "test-variable-id"
    };

    const formulaTests = [
      {
        name: 'Create Formula',
        endpoint: '/api/formulas/crear',
        method: 'POST',
        data: testFormula,
        category: 'Formulas'
      }
    ];

    for (const test of formulaTests) {
      const result = await this.makeRequest(test.endpoint, {
        method: test.method,
        body: JSON.stringify(test.data)
      });
      
      this.testResults.push({
        category: test.category,
        test: test.name,
        ...result
      });
    }
  }

  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    this.log('\n' + '='.repeat(60), 'info');
    this.log('🧮 AGREGAR FORMULA TESTING REPORT', 'bright');
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
    this.log('🚀 Starting Agregar Formula Endpoint Testing...', 'bright');
    this.log(`🌐 API Base URL: ${API_BASE_URL}`, 'info');
    this.log(`⏱️  Timeout: ${TEST_CONFIG.TIMEOUT}ms`, 'info');
    
    try {
      await this.testAuthentication();
      await this.testFormulaEndpoints();
      
      const report = this.generateReport();
      
      this.log('\n🎉 Testing completed!', 'success');
      return report;
      
    } catch (error) {
      this.log(`💥 Fatal error during testing: ${error.message}`, 'error');
      throw error;
    }
  }
}

async function runAgregarFormulaTests() {
  const tester = new AgregarFormulaTester();
  
  try {
    const report = await tester.runAllTests();
    
    if (typeof window === 'undefined') {
      // Save report to tester-results folder
      const reportPath = tester.reportHelper.saveJsonReport('agregar-formula-test', report);
      console.log(`📄 Report saved to: ${reportPath}`);
      
      // Also save the old format for backward compatibility
      const fs = require('fs');
      const legacyPath = './agregar-formula-test-report.json';
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
  module.exports = { AgregarFormulaTester, runAgregarFormulaTests };
}

if (typeof window === 'undefined' && require.main === module) {
  runAgregarFormulaTests();
}
