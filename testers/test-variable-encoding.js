#!/usr/bin/env node

/**
 * Test específico para diagnosticar problemas de encoding en variables
 * 
 * Este script prueba específicamente los endpoints de variables que están fallando
 * con errores 404 según la imagen compartida.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const { ReportHelper } = require('./report-helper.js');

const TEST_CONFIG = {
  TEST_USER: {
    email: "admin@example.com",
    password: "admin123",
    username: "admin"
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

class VariableEncodingTester {
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
      this.log(`🌐 Full URL: ${url}`, 'info');
      
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
        url,
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
        url,
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
    this.log('🧪 Testing Variable Endpoints with Different Encoding...', 'info');
    
    if (!this.token) {
      this.log('❌ No authentication token available', 'error');
      return;
    }

    // Variables que están fallando según la imagen
    const problemVariables = [
      'Cloruros',
      'Cloro Libre',
      's2'
    ];

    for (const variable of problemVariables) {
      this.log(`\n🔍 Testing variable: "${variable}"`, 'test');
      
      // Test 1: Sin encoding (como está en la imagen)
      const endpoint1 = `/api/mediciones/variable/${variable}`;
      const result1 = await this.makeRequest(endpoint1);
      this.testResults.push({
        category: 'Variable Encoding',
        test: `Variable "${variable}" - Sin encoding`,
        variable,
        encoding: 'none',
        ...result1
      });

      // Test 2: Con encodeURIComponent (como está en el código)
      const endpoint2 = `/api/mediciones/variable/${encodeURIComponent(variable)}`;
      const result2 = await this.makeRequest(endpoint2);
      this.testResults.push({
        category: 'Variable Encoding',
        test: `Variable "${variable}" - Con encodeURIComponent`,
        variable,
        encoding: 'encodeURIComponent',
        ...result2
      });

      // Test 3: Con encodeURI (alternativa)
      const endpoint3 = `/api/mediciones/variable/${encodeURI(variable)}`;
      const result3 = await this.makeRequest(endpoint3);
      this.testResults.push({
        category: 'Variable Encoding',
        test: `Variable "${variable}" - Con encodeURI`,
        variable,
        encoding: 'encodeURI',
        ...result3
      });

      // Test 4: Con escape (otra alternativa)
      const endpoint4 = `/api/mediciones/variable/${escape(variable)}`;
      const result4 = await this.makeRequest(endpoint4);
      this.testResults.push({
        category: 'Variable Encoding',
        test: `Variable "${variable}" - Con escape`,
        variable,
        encoding: 'escape',
        ...result4
      });

      // Mostrar comparación de URLs
      this.log(`📋 URL Comparison for "${variable}":`, 'info');
      this.log(`   Sin encoding:     ${API_BASE_URL}${endpoint1}`, 'info');
      this.log(`   encodeURIComponent: ${API_BASE_URL}${endpoint2}`, 'info');
      this.log(`   encodeURI:        ${API_BASE_URL}${endpoint3}`, 'info');
      this.log(`   escape:           ${API_BASE_URL}${endpoint4}`, 'info');
    }
  }

  async testAlternativeEndpoints() {
    this.log('🔍 Testing Alternative Endpoints...', 'info');
    
    if (!this.token) {
      this.log('❌ No authentication token available', 'error');
      return;
    }

    const variables = ['Cloruros', 'Cloro Libre'];
    
    for (const variable of variables) {
      // Test con endpoint de variable-id
      const endpoint1 = `/api/mediciones/variable-id/${encodeURIComponent(variable)}`;
      const result1 = await this.makeRequest(endpoint1);
      this.testResults.push({
        category: 'Alternative Endpoints',
        test: `Variable ID endpoint for "${variable}"`,
        variable,
        endpoint: 'variable-id',
        ...result1
      });

      // Test con endpoint de sistema
      const endpoint2 = `/api/mediciones/sistema/${encodeURIComponent(variable)}`;
      const result2 = await this.makeRequest(endpoint2);
      this.testResults.push({
        category: 'Alternative Endpoints',
        test: `Sistema endpoint for "${variable}"`,
        variable,
        endpoint: 'sistema',
        ...result2
      });
    }
  }

  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    this.log('\n' + '='.repeat(60), 'info');
    this.log('🧪 VARIABLE ENCODING TESTING REPORT', 'bright');
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
    
    // Análisis específico por variable
    const variables = [...new Set(this.testResults.map(r => r.variable).filter(Boolean))];
    this.log(`\n🔍 ANALYSIS BY VARIABLE:`, 'info');
    variables.forEach(variable => {
      const variableResults = this.testResults.filter(r => r.variable === variable);
      const successful = variableResults.filter(r => r.success).length;
      const total = variableResults.length;
      const rate = ((successful / total) * 100).toFixed(1);
      
      this.log(`   "${variable}": ${successful}/${total} (${rate}%)`, 
        successful > 0 ? 'success' : 'error');
      
      // Mostrar qué encoding funciona
      const workingEncodings = variableResults
        .filter(r => r.success)
        .map(r => r.encoding || r.endpoint)
        .filter(Boolean);
      
      if (workingEncodings.length > 0) {
        this.log(`     ✅ Working encodings: ${workingEncodings.join(', ')}`, 'success');
      } else {
        this.log(`     ❌ No working encodings found`, 'error');
      }
    });
    
    const failedResults = this.testResults.filter(r => !r.success);
    if (failedResults.length > 0) {
      this.log(`\n❌ FAILED TESTS:`, 'error');
      failedResults.forEach(result => {
        this.log(`   • ${result.category} - ${result.test}`, 'error');
        this.log(`     Status: ${result.status} | Error: ${result.error?.message || result.error}`, 'error');
        this.log(`     URL: ${result.url}`, 'error');
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
    this.log('🚀 Starting Variable Encoding Testing...', 'bright');
    this.log(`🌐 API Base URL: ${API_BASE_URL}`, 'info');
    this.log(`⏱️  Timeout: ${TEST_CONFIG.TIMEOUT}ms`, 'info');
    
    try {
      await this.testAuthentication();
      await this.testVariableEndpoints();
      await this.testAlternativeEndpoints();
      
      const report = this.generateReport();
      
      this.log('\n🎉 Testing completed!', 'success');
      return report;
      
    } catch (error) {
      this.log(`💥 Fatal error during testing: ${error.message}`, 'error');
      throw error;
    }
  }
}

async function runVariableEncodingTests() {
  const tester = new VariableEncodingTester();
  
  try {
    const report = await tester.runAllTests();
    
    if (typeof window === 'undefined') {
      // Save report to tester-results folder
      const reportPath = tester.reportHelper.saveJsonReport('variable-encoding-test', report);
      console.log(`📄 Report saved to: ${reportPath}`);
      
      // Also save the old format for backward compatibility
      const fs = require('fs');
      const legacyPath = './variable-encoding-test-report.json';
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
  module.exports = { VariableEncodingTester, runVariableEncodingTests };
}

if (typeof window === 'undefined' && require.main === module) {
  runVariableEncodingTests();
}
