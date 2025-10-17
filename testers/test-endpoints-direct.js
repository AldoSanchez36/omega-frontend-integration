#!/usr/bin/env node

/**
 * Test directo de endpoints sin autenticación
 * 
 * Este script prueba directamente los endpoints que están fallando
 * para identificar si el problema es de autenticación o de configuración del endpoint.
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

class DirectEndpointTester {
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

  async testVariableEndpoints() {
    this.log('🧪 Testing Variable Endpoints Directly...', 'info');
    
    const variables = ['Cloruros', 'Cloro Libre', 's2'];
    
    for (const variable of variables) {
      this.log(`\n🔍 Testing variable: "${variable}"`, 'test');
      
      // Test 1: Endpoint básico sin encoding
      const endpoint1 = `/api/mediciones/variable/${variable}`;
      const result1 = await this.testEndpoint(endpoint1, `Variable "${variable}" - Sin encoding`);
      this.testResults.push({
        category: 'Variable Endpoints',
        test: `Variable "${variable}" - Sin encoding`,
        variable,
        encoding: 'none',
        ...result1
      });

      // Test 2: Endpoint con encodeURIComponent
      const endpoint2 = `/api/mediciones/variable/${encodeURIComponent(variable)}`;
      const result2 = await this.testEndpoint(endpoint2, `Variable "${variable}" - Con encodeURIComponent`);
      this.testResults.push({
        category: 'Variable Endpoints',
        test: `Variable "${variable}" - Con encodeURIComponent`,
        variable,
        encoding: 'encodeURIComponent',
        ...result2
      });

      // Test 3: Endpoint con variable-id
      const endpoint3 = `/api/mediciones/variable-id/${encodeURIComponent(variable)}`;
      const result3 = await this.testEndpoint(endpoint3, `Variable "${variable}" - Variable ID endpoint`);
      this.testResults.push({
        category: 'Variable Endpoints',
        test: `Variable "${variable}" - Variable ID endpoint`,
        variable,
        endpoint: 'variable-id',
        ...result3
      });

      // Test 4: Endpoint con sistema
      const endpoint4 = `/api/mediciones/sistema/${encodeURIComponent(variable)}`;
      const result4 = await this.testEndpoint(endpoint4, `Variable "${variable}" - Sistema endpoint`);
      this.testResults.push({
        category: 'Variable Endpoints',
        test: `Variable "${variable}" - Sistema endpoint`,
        variable,
        endpoint: 'sistema',
        ...result4
      });
    }
  }

  async testBasicEndpoints() {
    this.log('🔍 Testing Basic API Endpoints...', 'info');
    
    const basicEndpoints = [
      { endpoint: '/api/mediciones', description: 'All measurements' },
      { endpoint: '/api/variables', description: 'All variables' },
      { endpoint: '/api/plantas/all', description: 'All plants' },
      { endpoint: '/api/procesos', description: 'All processes' }
    ];
    
    for (const { endpoint, description } of basicEndpoints) {
      const result = await this.testEndpoint(endpoint, description);
      this.testResults.push({
        category: 'Basic Endpoints',
        test: description,
        ...result
      });
    }
  }

  async testAuthenticationEndpoints() {
    this.log('🔐 Testing Authentication Endpoints...', 'info');
    
    const authEndpoints = [
      { endpoint: '/api/auth/login', description: 'Login endpoint' },
      { endpoint: '/api/auth/users', description: 'Users endpoint' }
    ];
    
    for (const { endpoint, description } of authEndpoints) {
      const result = await this.testEndpoint(endpoint, description);
      this.testResults.push({
        category: 'Authentication Endpoints',
        test: description,
        ...result
      });
    }
  }

  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    this.log('\n' + '='.repeat(60), 'info');
    this.log('🧪 DIRECT ENDPOINT TESTING REPORT', 'bright');
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
      
      // Mostrar qué endpoint funciona
      const workingEndpoints = variableResults
        .filter(r => r.success)
        .map(r => r.endpoint || r.encoding)
        .filter(Boolean);
      
      if (workingEndpoints.length > 0) {
        this.log(`     ✅ Working endpoints: ${workingEndpoints.join(', ')}`, 'success');
      } else {
        this.log(`     ❌ No working endpoints found`, 'error');
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
    this.log('🚀 Starting Direct Endpoint Testing...', 'bright');
    this.log(`🌐 API Base URL: ${API_BASE_URL}`, 'info');
    
    try {
      await this.testBasicEndpoints();
      await this.testAuthenticationEndpoints();
      await this.testVariableEndpoints();
      
      const report = this.generateReport();
      
      this.log('\n🎉 Testing completed!', 'success');
      return report;
      
    } catch (error) {
      this.log(`💥 Fatal error during testing: ${error.message}`, 'error');
      throw error;
    }
  }
}

async function runDirectEndpointTests() {
  const tester = new DirectEndpointTester();
  
  try {
    const report = await tester.runAllTests();
    
    if (typeof window === 'undefined') {
      // Save report to tester-results folder
      const reportPath = tester.reportHelper.saveJsonReport('direct-endpoint-test', report);
      console.log(`📄 Report saved to: ${reportPath}`);
      
      // Also save the old format for backward compatibility
      const fs = require('fs');
      const legacyPath = './direct-endpoint-test-report.json';
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
  module.exports = { DirectEndpointTester, runDirectEndpointTests };
}

if (typeof window === 'undefined' && require.main === module) {
  runDirectEndpointTests();
}

