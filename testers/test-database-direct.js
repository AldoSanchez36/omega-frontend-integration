#!/usr/bin/env node

/**
 * Test directo para consultar la base de datos sin autenticación
 * 
 * Este script hace llamadas directas a los endpoints del backend para ver
 * exactamente qué variables están disponibles, usando diferentes métodos.
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

class DatabaseDirectTester {
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

  async testBackendStatus() {
    this.log('🔍 Testing Backend Status...', 'info');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        this.log('✅ Backend is running and requires authentication (401)', 'success');
        return true;
      } else if (response.ok) {
        this.log('✅ Backend is running and accessible (200)', 'success');
        return true;
      } else {
        this.log(`⚠️ Backend responded with status: ${response.status}`, 'warning');
        return false;
      }
    } catch (error) {
      this.log(`❌ Backend is not accessible: ${error.message}`, 'error');
      return false;
    }
  }

  async testVariablesWithoutAuth() {
    this.log('📋 Testing Variables Endpoint Without Auth...', 'info');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/variables`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        timestamp: new Date().toISOString()
      };

      if (response.ok) {
        try {
          const data = await response.json();
          result.data = data;
          const variables = data.variables || data || [];
          this.log(`✅ Variables endpoint accessible: ${variables.length} variables found`, 'success');
          
          this.log('\n📋 ALL VARIABLES IN DATABASE:', 'info');
          variables.forEach((variable, index) => {
            this.log(`   ${index + 1}. "${variable.nombre}" (ID: ${variable.id}) - ${variable.unidad || 'No unit'}`, 'info');
          });
          
        } catch (e) {
          result.data = await response.text();
          this.log(`✅ Variables endpoint accessible (text response)`, 'success');
        }
      } else {
        try {
          result.error = await response.json();
          this.log(`❌ Variables endpoint failed: ${response.status} - ${result.error?.msg || result.error?.message || JSON.stringify(result.error)}`, 'error');
        } catch (e) {
          result.error = await response.text();
          this.log(`❌ Variables endpoint failed: ${response.status} - ${result.error}`, 'error');
        }
      }

      this.testResults.push({
        category: 'Variables Endpoint',
        test: 'Get variables without auth',
        ...result
      });

    } catch (error) {
      const result = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.log(`💥 Variables endpoint error: ${error.message}`, 'error');
      
      this.testResults.push({
        category: 'Variables Endpoint',
        test: 'Get variables without auth',
        ...result
      });
    }
  }

  async testMeasurementsWithoutAuth() {
    this.log('📊 Testing Measurements Endpoint Without Auth...', 'info');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/mediciones`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        timestamp: new Date().toISOString()
      };

      if (response.ok) {
        try {
          const data = await response.json();
          result.data = data;
          const measurements = data.mediciones || data || [];
          this.log(`✅ Measurements endpoint accessible: ${measurements.length} measurements found`, 'success');
          
        } catch (e) {
          result.data = await response.text();
          this.log(`✅ Measurements endpoint accessible (text response)`, 'success');
        }
      } else {
        try {
          result.error = await response.json();
          this.log(`❌ Measurements endpoint failed: ${response.status} - ${result.error?.msg || result.error?.message || JSON.stringify(result.error)}`, 'error');
        } catch (e) {
          result.error = await response.text();
          this.log(`❌ Measurements endpoint failed: ${response.status} - ${result.error}`, 'error');
        }
      }

      this.testResults.push({
        category: 'Measurements Endpoint',
        test: 'Get measurements without auth',
        ...result
      });

    } catch (error) {
      const result = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.log(`💥 Measurements endpoint error: ${error.message}`, 'error');
      
      this.testResults.push({
        category: 'Measurements Endpoint',
        test: 'Get measurements without auth',
        ...result
      });
    }
  }

  async testSpecificVariablesWithoutAuth() {
    this.log('🎯 Testing Specific Variables Without Auth...', 'info');
    
    const variablesToTest = ['S1', 's2', 'S2', 'Cloruros', 'Cloro Libre'];
    
    for (const variable of variablesToTest) {
      try {
        this.log(`📡 Testing variable: "${variable}"`, 'test');
        
        const response = await fetch(`${API_BASE_URL}/api/mediciones/variable/${encodeURIComponent(variable)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const result = {
          variable,
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          timestamp: new Date().toISOString()
        };

        if (response.ok) {
          try {
            const data = await response.json();
            result.data = data;
            result.measurementsCount = (data.mediciones || data || []).length;
            this.log(`✅ "${variable}" - Status: ${response.status} - ${result.measurementsCount} measurements`, 'success');
          } catch (e) {
            result.data = await response.text();
            this.log(`✅ "${variable}" - Status: ${response.status} (text response)`, 'success');
          }
        } else {
          try {
            result.error = await response.json();
            this.log(`❌ "${variable}" - Status: ${response.status} - ${result.error?.msg || result.error?.message || JSON.stringify(result.error)}`, 'error');
          } catch (e) {
            result.error = await response.text();
            this.log(`❌ "${variable}" - Status: ${response.status} - ${result.error}`, 'error');
          }
        }

        this.testResults.push({
          category: 'Specific Variables',
          test: `Test variable "${variable}" without auth`,
          ...result
        });

      } catch (error) {
        const result = {
          variable,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
        
        this.log(`💥 "${variable}" - Error: ${error.message}`, 'error');
        
        this.testResults.push({
          category: 'Specific Variables',
          test: `Test variable "${variable}" without auth`,
          ...result
        });
      }
    }
  }

  async testBackendEndpoints() {
    this.log('🔍 Testing Backend Endpoints...', 'info');
    
    const endpoints = [
      '/api/variables',
      '/api/mediciones',
      '/api/plantas/all',
      '/api/procesos',
      '/api/auth/users'
    ];
    
    for (const endpoint of endpoints) {
      try {
        this.log(`📡 Testing endpoint: ${endpoint}`, 'test');
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const result = {
          endpoint,
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          timestamp: new Date().toISOString()
        };

        if (response.ok) {
          try {
            const data = await response.json();
            result.data = data;
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
          category: 'Backend Endpoints',
          test: `Test ${endpoint}`,
          ...result
        });

      } catch (error) {
        const result = {
          endpoint,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
        
        this.log(`💥 ${endpoint} - Error: ${error.message}`, 'error');
        
        this.testResults.push({
          category: 'Backend Endpoints',
          test: `Test ${endpoint}`,
          ...result
        });
      }
    }
  }

  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    this.log('\n' + '='.repeat(60), 'info');
    this.log('🧪 DATABASE DIRECT TEST REPORT', 'bright');
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
    this.log('🚀 Starting Database Direct Testing...', 'bright');
    this.log(`🌐 API Base URL: ${API_BASE_URL}`, 'info');
    
    try {
      const backendStatus = await this.testBackendStatus();
      if (!backendStatus) {
        this.log('❌ Backend is not accessible', 'error');
        return this.generateReport();
      }
      
      await this.testBackendEndpoints();
      await this.testVariablesWithoutAuth();
      await this.testMeasurementsWithoutAuth();
      await this.testSpecificVariablesWithoutAuth();
      
      const report = this.generateReport();
      
      this.log('\n🎉 Testing completed!', 'success');
      return report;
      
    } catch (error) {
      this.log(`💥 Fatal error during testing: ${error.message}`, 'error');
      throw error;
    }
  }
}

async function runDatabaseDirectTests() {
  const tester = new DatabaseDirectTester();
  
  try {
    const report = await tester.runAllTests();
    
    if (typeof window === 'undefined') {
      // Save report to tester-results folder
      const reportPath = tester.reportHelper.saveJsonReport('database-direct-test', report);
      console.log(`📄 Report saved to: ${reportPath}`);
      
      // Also save the old format for backward compatibility
      const fs = require('fs');
      const legacyPath = './database-direct-test-report.json';
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
  module.exports = { DatabaseDirectTester, runDatabaseDirectTests };
}

if (typeof window === 'undefined' && require.main === module) {
  runDatabaseDirectTests();
}
