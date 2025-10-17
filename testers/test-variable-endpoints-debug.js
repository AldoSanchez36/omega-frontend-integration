#!/usr/bin/env node

/**
 * Test específico para diagnosticar problemas con endpoints de variables
 * 
 * Este script verifica específicamente los endpoints que están fallando
 * y analiza las diferencias entre variables que funcionan y las que no.
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

class VariableEndpointsDebugTester {
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

  async testLogin() {
    this.log('🔐 Testing Login with different credentials...', 'info');
    
    const credentials = [
      { email: "admin@example.com", password: "admin123" },
      { email: "admin@example.com", password: "admin123456" },
      { email: "admin", password: "admin123" },
      { email: "admin", password: "admin123456" }
    ];
    
    for (const cred of credentials) {
      try {
        this.log(`📡 Trying login with: ${cred.email} / ${cred.password}`, 'test');
        
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(cred)
        });
        
        const data = await response.json();
        
        if (response.ok) {
          this.token = data.token;
          this.log(`✅ Login successful with: ${cred.email} / ${cred.password}`, 'success');
          return true;
        } else {
          this.log(`❌ Login failed with: ${cred.email} / ${cred.password} - ${data.msg || data.message}`, 'error');
        }
      } catch (error) {
        this.log(`💥 Login error with: ${cred.email} / ${cred.password} - ${error.message}`, 'error');
      }
    }
    
    return false;
  }

  async testVariableEndpoint(variableName, description) {
    if (!this.token) {
      this.log(`❌ No token available for testing ${variableName}`, 'error');
      return;
    }

    const endpoints = [
      {
        url: `/api/mediciones/variable/${encodeURIComponent(variableName)}`,
        description: `${description} - Basic variable endpoint`
      },
      {
        url: `/api/mediciones/variable-id/${encodeURIComponent(variableName)}`,
        description: `${description} - Variable ID endpoint`
      },
      {
        url: `/api/mediciones/sistema/${encodeURIComponent(variableName)}`,
        description: `${description} - Sistema endpoint`
      }
    ];

    for (const endpoint of endpoints) {
      try {
        this.log(`📡 Testing: ${endpoint.description}`, 'test');
        this.log(`🌐 URL: ${API_BASE_URL}${endpoint.url}`, 'info');
        
        const response = await fetch(`${API_BASE_URL}${endpoint.url}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        });
        
        const result = {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          endpoint: endpoint.url,
          url: `${API_BASE_URL}${endpoint.url}`,
          description: endpoint.description,
          variableName,
          timestamp: new Date().toISOString()
        };

        if (response.ok) {
          try {
            result.data = await response.json();
            this.log(`✅ ${endpoint.description} - Status: ${response.status}`, 'success');
          } catch (e) {
            result.data = await response.text();
            this.log(`✅ ${endpoint.description} - Status: ${response.status} (text response)`, 'success');
          }
        } else {
          try {
            result.error = await response.json();
            this.log(`❌ ${endpoint.description} - Status: ${response.status} - ${result.error?.msg || result.error?.message || JSON.stringify(result.error)}`, 'error');
          } catch (e) {
            result.error = await response.text();
            this.log(`❌ ${endpoint.description} - Status: ${response.status} - ${result.error}`, 'error');
          }
        }

        this.testResults.push({
          category: 'Variable Endpoints',
          test: endpoint.description,
          variableName,
          ...result
        });

      } catch (error) {
        const result = {
          success: false,
          error: error.message,
          endpoint: endpoint.url,
          url: `${API_BASE_URL}${endpoint.url}`,
          description: endpoint.description,
          variableName,
          timestamp: new Date().toISOString()
        };
        
        this.log(`💥 ${endpoint.description} - Error: ${error.message}`, 'error');
        
        this.testResults.push({
          category: 'Variable Endpoints',
          test: endpoint.description,
          variableName,
          ...result
        });
      }
    }
  }

  async testAllVariables() {
    this.log('🔍 Testing All Variables...', 'info');
    
    const variables = [
      { name: 'S1', description: 'S1 (Working)' },
      { name: 's2', description: 's2 (Failing)' },
      { name: 'S2', description: 'S2 (Failing)' },
      { name: 'Cloruros', description: 'Cloruros (Failing)' },
      { name: 'Cloro Libre', description: 'Cloro Libre (Failing)' }
    ];
    
    for (const variable of variables) {
      await this.testVariableEndpoint(variable.name, variable.description);
    }
  }

  async testBackendVariables() {
    this.log('🔍 Testing Backend Variables Endpoint...', 'info');
    
    if (!this.token) {
      this.log('❌ No token available for backend variables test', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/variables`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.log(`✅ Backend variables loaded: ${data.variables?.length || data.length || 0} variables`, 'success');
        
        // Log all variable names
        const variables = data.variables || data || [];
        this.log('📋 Available variables in backend:', 'info');
        variables.forEach((variable, index) => {
          this.log(`   ${index + 1}. ${variable.nombre} (ID: ${variable.id})`, 'info');
        });
        
        this.testResults.push({
          category: 'Backend Variables',
          test: 'Get all variables',
          success: true,
          status: response.status,
          data: variables,
          timestamp: new Date().toISOString()
        });
      } else {
        const errorData = await response.json();
        this.log(`❌ Backend variables failed: ${response.status} - ${errorData.msg || errorData.message}`, 'error');
        
        this.testResults.push({
          category: 'Backend Variables',
          test: 'Get all variables',
          success: false,
          status: response.status,
          error: errorData,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      this.log(`💥 Backend variables error: ${error.message}`, 'error');
      
      this.testResults.push({
        category: 'Backend Variables',
        test: 'Get all variables',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    this.log('\n' + '='.repeat(60), 'info');
    this.log('🧪 VARIABLE ENDPOINTS DEBUG REPORT', 'bright');
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
    const variables = [...new Set(this.testResults.map(r => r.variableName).filter(Boolean))];
    if (variables.length > 0) {
      this.log(`\n🔍 ANALYSIS BY VARIABLE:`, 'info');
      variables.forEach(variable => {
        const variableResults = this.testResults.filter(r => r.variableName === variable);
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
      results: this.testResults
    };
  }

  async runAllTests() {
    this.log('🚀 Starting Variable Endpoints Debug Testing...', 'bright');
    this.log(`🌐 API Base URL: ${API_BASE_URL}`, 'info');
    
    try {
      // Test login first
      const loginSuccess = await this.testLogin();
      if (!loginSuccess) {
        this.log('❌ Cannot proceed without authentication', 'error');
        return this.generateReport();
      }
      
      // Test backend variables
      await this.testBackendVariables();
      
      // Test all variables
      await this.testAllVariables();
      
      const report = this.generateReport();
      
      this.log('\n🎉 Testing completed!', 'success');
      return report;
      
    } catch (error) {
      this.log(`💥 Fatal error during testing: ${error.message}`, 'error');
      throw error;
    }
  }
}

async function runVariableEndpointsDebugTests() {
  const tester = new VariableEndpointsDebugTester();
  
  try {
    const report = await tester.runAllTests();
    
    if (typeof window === 'undefined') {
      // Save report to tester-results folder
      const reportPath = tester.reportHelper.saveJsonReport('variable-endpoints-debug-test', report);
      console.log(`📄 Report saved to: ${reportPath}`);
      
      // Also save the old format for backward compatibility
      const fs = require('fs');
      const legacyPath = './variable-endpoints-debug-test-report.json';
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
  module.exports = { VariableEndpointsDebugTester, runVariableEndpointsDebugTests };
}

if (typeof window === 'undefined' && require.main === module) {
  runVariableEndpointsDebugTests();
}
