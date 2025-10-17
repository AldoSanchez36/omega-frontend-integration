#!/usr/bin/env node

/**
 * Test que simula exactamente lo que está pasando en el frontend
 * 
 * Este script simula las llamadas que hace el frontend para entender
 * por qué algunas variables funcionan y otras no.
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

class FrontendSimulationTester {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
    this.reportHelper = new ReportHelper();
    this.token = null;
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

  async testDirectEndpoints() {
    this.log('🔍 Testing Direct Endpoints (No Auth Required)...', 'info');
    
    const variables = ['S1', 's2', 'Cloruros', 'Cloro Libre'];
    
    for (const variable of variables) {
      const endpoints = [
        `/api/mediciones/variable/${encodeURIComponent(variable)}`,
        `/api/mediciones/variable-id/${encodeURIComponent(variable)}`,
        `/api/mediciones/sistema/${encodeURIComponent(variable)}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          this.log(`📡 Testing: ${endpoint}`, 'test');
          
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          const result = {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            endpoint,
            url: `${API_BASE_URL}${endpoint}`,
            variable,
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

          this.testResults.push({
            category: 'Direct Endpoints',
            test: `Direct ${endpoint}`,
            variable,
            ...result
          });

        } catch (error) {
          const result = {
            success: false,
            error: error.message,
            endpoint,
            url: `${API_BASE_URL}${endpoint}`,
            variable,
            timestamp: new Date().toISOString()
          };
          
          this.log(`💥 ${endpoint} - Error: ${error.message}`, 'error');
          
          this.testResults.push({
            category: 'Direct Endpoints',
            test: `Direct ${endpoint}`,
            variable,
            ...result
          });
        }
      }
    }
  }

  async testWithMockToken() {
    this.log('🔍 Testing With Mock Token...', 'info');
    
    // Simular un token (aunque sea inválido)
    const mockToken = 'mock-token-12345';
    
    const variables = ['S1', 's2', 'Cloruros', 'Cloro Libre'];
    
    for (const variable of variables) {
      const endpoints = [
        `/api/mediciones/variable/${encodeURIComponent(variable)}`,
        `/api/mediciones/variable-id/${encodeURIComponent(variable)}`,
        `/api/mediciones/sistema/${encodeURIComponent(variable)}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          this.log(`📡 Testing: ${endpoint} (with mock token)`, 'test');
          
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mockToken}`
            }
          });
          
          const result = {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            endpoint,
            url: `${API_BASE_URL}${endpoint}`,
            variable,
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

          this.testResults.push({
            category: 'Mock Token Endpoints',
            test: `Mock Token ${endpoint}`,
            variable,
            ...result
          });

        } catch (error) {
          const result = {
            success: false,
            error: error.message,
            endpoint,
            url: `${API_BASE_URL}${endpoint}`,
            variable,
            timestamp: new Date().toISOString()
          };
          
          this.log(`💥 ${endpoint} - Error: ${error.message}`, 'error');
          
          this.testResults.push({
            category: 'Mock Token Endpoints',
            test: `Mock Token ${endpoint}`,
            variable,
            ...result
          });
        }
      }
    }
  }

  async testURLEncoding() {
    this.log('🔍 Testing URL Encoding Variations...', 'info');
    
    const variables = [
      { name: 'Cloro Libre', encoded: 'Cloro%20Libre' },
      { name: 'Cloro Libre', encoded: 'Cloro+Libre' },
      { name: 'Cloro Libre', encoded: 'Cloro Libre' },
      { name: 's2', encoded: 's2' },
      { name: 's2', encoded: 'S2' },
      { name: 'Cloruros', encoded: 'Cloruros' }
    ];
    
    for (const variable of variables) {
      const endpoint = `/api/mediciones/variable/${variable.encoded}`;
      
      try {
        this.log(`📡 Testing: ${endpoint} (${variable.name})`, 'test');
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const result = {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          endpoint,
          url: `${API_BASE_URL}${endpoint}`,
          variable: variable.name,
          encoded: variable.encoded,
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

        this.testResults.push({
          category: 'URL Encoding',
          test: `URL Encoding ${endpoint}`,
          variable: variable.name,
          ...result
        });

      } catch (error) {
        const result = {
          success: false,
          error: error.message,
          endpoint,
          url: `${API_BASE_URL}${endpoint}`,
          variable: variable.name,
          encoded: variable.encoded,
          timestamp: new Date().toISOString()
        };
        
        this.log(`💥 ${endpoint} - Error: ${error.message}`, 'error');
        
        this.testResults.push({
          category: 'URL Encoding',
          test: `URL Encoding ${endpoint}`,
          variable: variable.name,
          ...result
        });
      }
    }
  }

  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    this.log('\n' + '='.repeat(60), 'info');
    this.log('🧪 FRONTEND SIMULATION TEST REPORT', 'bright');
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
    
    // Análisis por variable
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
        
        // Mostrar análisis de status codes
        const statusResults = variableResults.filter(r => r.status);
        if (statusResults.length > 0) {
          const statuses = statusResults.map(r => r.status).join(', ');
          this.log(`     Status codes: ${statuses}`, 'info');
        }
      });
    }
    
    // Análisis por categoría
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
    this.log('🚀 Starting Frontend Simulation Testing...', 'bright');
    this.log(`🌐 API Base URL: ${API_BASE_URL}`, 'info');
    
    try {
      await this.testDirectEndpoints();
      await this.testWithMockToken();
      await this.testURLEncoding();
      
      const report = this.generateReport();
      
      this.log('\n🎉 Testing completed!', 'success');
      return report;
      
    } catch (error) {
      this.log(`💥 Fatal error during testing: ${error.message}`, 'error');
      throw error;
    }
  }
}

async function runFrontendSimulationTests() {
  const tester = new FrontendSimulationTester();
  
  try {
    const report = await tester.runAllTests();
    
    if (typeof window === 'undefined') {
      // Save report to tester-results folder
      const reportPath = tester.reportHelper.saveJsonReport('frontend-simulation-test', report);
      console.log(`📄 Report saved to: ${reportPath}`);
      
      // Also save the old format for backward compatibility
      const fs = require('fs');
      const legacyPath = './frontend-simulation-test-report.json';
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
  module.exports = { FrontendSimulationTester, runFrontendSimulationTests };
}

if (typeof window === 'undefined' && require.main === module) {
  runFrontendSimulationTests();
}
