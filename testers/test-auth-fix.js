#!/usr/bin/env node

/**
 * Test de verificación de la solución de autenticación
 * 
 * Este script verifica que la solución de autenticación funciona correctamente
 * usando el mismo patrón que las otras páginas.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const { ReportHelper } = require('./report-helper.js');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class AuthFixTester {
  constructor() {
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

  async testEndpoint(endpoint, description, headers = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      this.log(`📡 Testing: ${description}`, 'test');
      this.log(`🌐 URL: ${url}`, 'info');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
      
      const result = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        endpoint,
        url,
        description,
        timestamp: new Date().toISOString()
      };

      if (response.ok) {
        try {
          result.data = await response.json();
          this.log(`✅ ${description} - Status: ${response.status}`, 'success');
        } catch (e) {
          result.data = await response.text();
          this.log(`✅ ${description} - Status: ${response.status} (text response)`, 'success');
        }
      } else {
        try {
          result.error = await response.json();
          this.log(`❌ ${description} - Status: ${response.status} - ${result.error?.msg || result.error?.message || JSON.stringify(result.error)}`, 'error');
        } catch (e) {
          result.error = await response.text();
          this.log(`❌ ${description} - Status: ${response.status} - ${result.error}`, 'error');
        }
      }

      return result;
    } catch (error) {
      const result = {
        success: false,
        error: error.message,
        endpoint,
        url,
        description,
        timestamp: new Date().toISOString()
      };
      
      this.log(`💥 ${description} - Error: ${error.message}`, 'error');
      return result;
    }
  }

  async testAuthenticationFlow() {
    this.log('🔐 Testing Authentication Flow...', 'info');
    
    // Test 1: Login
    const loginData = {
      email: "admin@example.com",
      password: "admin123"
    };
    
    this.log(`📡 Attempting login with: ${loginData.email}`, 'test');
    
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });
    
    const loginResult = {
      success: loginResponse.ok,
      status: loginResponse.status,
      statusText: loginResponse.statusText,
      endpoint: '/api/auth/login',
      description: 'Login',
      timestamp: new Date().toISOString()
    };
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      loginResult.data = loginData;
      loginResult.token = loginData.token;
      this.log(`✅ Login successful - Token: ${loginData.token ? 'Yes' : 'No'}`, 'success');
      
      // Test 2: Use token for authenticated requests
      const token = loginData.token;
      
      // Test variables endpoint
      const variablesResult = await this.testEndpoint(
        '/api/variables',
        'Variables endpoint with token',
        { 'Authorization': `Bearer ${token}` }
      );
      this.testResults.push({
        category: 'Authentication Flow',
        test: 'Variables with token',
        ...variablesResult
      });
      
      // Test measurements endpoint
      const measurementsResult = await this.testEndpoint(
        '/api/mediciones',
        'Measurements endpoint with token',
        { 'Authorization': `Bearer ${token}` }
      );
      this.testResults.push({
        category: 'Authentication Flow',
        test: 'Measurements with token',
        ...measurementsResult
      });
      
      // Test specific variable endpoints
      const variables = ['Cloruros', 'Cloro Libre'];
      
      for (const variable of variables) {
        // Test basic variable endpoint
        const basicEndpoint = `/api/mediciones/variable/${encodeURIComponent(variable)}`;
        const basicResult = await this.testEndpoint(
          basicEndpoint,
          `Variable "${variable}" - Basic endpoint`,
          { 'Authorization': `Bearer ${token}` }
        );
        this.testResults.push({
          category: 'Variable Endpoints',
          test: `Variable "${variable}" - Basic endpoint`,
          variable,
          ...basicResult
        });
        
        // Test variable-id endpoint
        const variableIdEndpoint = `/api/mediciones/variable-id/${encodeURIComponent(variable)}`;
        const variableIdResult = await this.testEndpoint(
          variableIdEndpoint,
          `Variable "${variable}" - Variable ID endpoint`,
          { 'Authorization': `Bearer ${token}` }
        );
        this.testResults.push({
          category: 'Variable Endpoints',
          test: `Variable "${variable}" - Variable ID endpoint`,
          variable,
          ...variableIdResult
        });
      }
      
    } else {
      const errorData = await loginResponse.json().catch(() => ({}));
      loginResult.error = errorData;
      this.log(`❌ Login failed: ${errorData.msg || errorData.message || 'Unknown error'}`, 'error');
    }
    
    this.testResults.push({
      category: 'Authentication Flow',
      test: 'Login',
      ...loginResult
    });
  }

  async testWithoutAuthentication() {
    this.log('🔓 Testing Endpoints Without Authentication...', 'info');
    
    const endpoints = [
      { endpoint: '/api/variables', description: 'Variables without auth' },
      { endpoint: '/api/mediciones', description: 'Measurements without auth' },
      { endpoint: '/api/mediciones/variable/Cloruros', description: 'Variable Cloruros without auth' },
      { endpoint: '/api/mediciones/variable/Cloro%20Libre', description: 'Variable Cloro Libre without auth' }
    ];
    
    for (const { endpoint, description } of endpoints) {
      const result = await this.testEndpoint(endpoint, description);
      this.testResults.push({
        category: 'No Authentication',
        test: description,
        ...result
      });
    }
  }

  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    this.log('\n' + '='.repeat(60), 'info');
    this.log('🧪 AUTH FIX TESTING REPORT', 'bright');
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
    if (variables.length > 0) {
      this.log(`\n🔍 ANALYSIS BY VARIABLE:`, 'info');
      variables.forEach(variable => {
        const variableResults = this.testResults.filter(r => r.variable === variable);
        const successful = variableResults.filter(r => r.success).length;
        const total = variableResults.length;
        const rate = ((successful / total) * 100).toFixed(1);
        
        this.log(`   "${variable}": ${successful}/${total} (${rate}%)`, 
          successful > 0 ? 'success' : 'error');
      });
    }
    
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
    this.log('🚀 Starting Auth Fix Testing...', 'bright');
    this.log(`🌐 API Base URL: ${API_BASE_URL}`, 'info');
    
    try {
      await this.testWithoutAuthentication();
      await this.testAuthenticationFlow();
      
      const report = this.generateReport();
      
      this.log('\n🎉 Testing completed!', 'success');
      return report;
      
    } catch (error) {
      this.log(`💥 Fatal error during testing: ${error.message}`, 'error');
      throw error;
    }
  }
}

async function runAuthFixTests() {
  const tester = new AuthFixTester();
  
  try {
    const report = await tester.runAllTests();
    
    if (typeof window === 'undefined') {
      // Save report to tester-results folder
      const reportPath = tester.reportHelper.saveJsonReport('auth-fix-test', report);
      console.log(`📄 Report saved to: ${reportPath}`);
      
      // Also save the old format for backward compatibility
      const fs = require('fs');
      const legacyPath = './auth-fix-test-report.json';
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
  module.exports = { AuthFixTester, runAuthFixTests };
}

if (typeof window === 'undefined' && require.main === module) {
  runAuthFixTests();
}
