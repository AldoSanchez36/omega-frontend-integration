#!/usr/bin/env node

/**
 * Test para consultar directamente la base de datos y ver qué variables existen
 * 
 * Este script hace llamadas directas a los endpoints del backend para ver
 * exactamente qué variables están disponibles en la base de datos.
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

class DatabaseVariablesTester {
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
    this.log('🔐 Testing Login...', 'info');
    
    const credentials = [
      { email: "admin@example.com", password: "admin123" },
      { email: "admin", password: "admin123" },
      { email: "admin@example.com", password: "admin123456" },
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

  async testVariablesEndpoint() {
    this.log('📋 Testing Variables Endpoint...', 'info');
    
    if (!this.token) {
      this.log('❌ No token available for variables test', 'error');
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
        const variables = data.variables || data || [];
        
        this.log(`✅ Variables endpoint successful: ${variables.length} variables found`, 'success');
        
        this.log('\n📋 ALL VARIABLES IN DATABASE:', 'info');
        variables.forEach((variable, index) => {
          this.log(`   ${index + 1}. "${variable.nombre}" (ID: ${variable.id}) - ${variable.unidad || 'No unit'}`, 'info');
        });
        
        // Buscar variables específicas que están fallando
        const failingVariables = ['S1', 's2', 'S2', 'Cloruros', 'Cloro Libre'];
        this.log('\n🔍 CHECKING SPECIFIC FAILING VARIABLES:', 'info');
        
        failingVariables.forEach(varName => {
          const found = variables.find(v => 
            v.nombre === varName || 
            v.nombre.toLowerCase() === varName.toLowerCase()
          );
          
          if (found) {
            this.log(`   ✅ "${varName}" - FOUND (ID: ${found.id})`, 'success');
          } else {
            this.log(`   ❌ "${varName}" - NOT FOUND`, 'error');
          }
        });
        
        // Buscar variables similares
        this.log('\n🔍 SIMILAR VARIABLES:', 'info');
        const similarVariables = variables.filter(v => 
          v.nombre.toLowerCase().includes('cloro') ||
          v.nombre.toLowerCase().includes('s1') ||
          v.nombre.toLowerCase().includes('s2') ||
          v.nombre.toLowerCase().includes('cloruros')
        );
        
        if (similarVariables.length > 0) {
          similarVariables.forEach(variable => {
            this.log(`   📌 "${variable.nombre}" (ID: ${variable.id})`, 'warning');
          });
        } else {
          this.log('   No similar variables found', 'warning');
        }
        
        this.testResults.push({
          category: 'Variables Endpoint',
          test: 'Get all variables',
          success: true,
          status: response.status,
          totalVariables: variables.length,
          variables: variables,
          failingVariables: failingVariables,
          similarVariables: similarVariables,
          timestamp: new Date().toISOString()
        });
        
      } else {
        const errorData = await response.json();
        this.log(`❌ Variables endpoint failed: ${response.status} - ${errorData.msg || errorData.message}`, 'error');
        
        this.testResults.push({
          category: 'Variables Endpoint',
          test: 'Get all variables',
          success: false,
          status: response.status,
          error: errorData,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      this.log(`💥 Variables endpoint error: ${error.message}`, 'error');
      
      this.testResults.push({
        category: 'Variables Endpoint',
        test: 'Get all variables',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async testMeasurementsEndpoint() {
    this.log('📊 Testing Measurements Endpoint...', 'info');
    
    if (!this.token) {
      this.log('❌ No token available for measurements test', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/mediciones`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const measurements = data.mediciones || data || [];
        
        this.log(`✅ Measurements endpoint successful: ${measurements.length} measurements found`, 'success');
        
        // Analizar mediciones por variable
        const measurementsByVariable = {};
        measurements.forEach(measurement => {
          const variableName = measurement.variable || measurement.nombre || measurement.parametro || 'Unknown';
          if (!measurementsByVariable[variableName]) {
            measurementsByVariable[variableName] = [];
          }
          measurementsByVariable[variableName].push(measurement);
        });
        
        this.log('\n📊 MEASUREMENTS BY VARIABLE:', 'info');
        Object.entries(measurementsByVariable).forEach(([variable, measurements]) => {
          this.log(`   "${variable}": ${measurements.length} measurements`, 'info');
        });
        
        this.testResults.push({
          category: 'Measurements Endpoint',
          test: 'Get all measurements',
          success: true,
          status: response.status,
          totalMeasurements: measurements.length,
          measurementsByVariable: measurementsByVariable,
          timestamp: new Date().toISOString()
        });
        
      } else {
        const errorData = await response.json();
        this.log(`❌ Measurements endpoint failed: ${response.status} - ${errorData.msg || errorData.message}`, 'error');
        
        this.testResults.push({
          category: 'Measurements Endpoint',
          test: 'Get all measurements',
          success: false,
          status: response.status,
          error: errorData,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      this.log(`💥 Measurements endpoint error: ${error.message}`, 'error');
      
      this.testResults.push({
        category: 'Measurements Endpoint',
        test: 'Get all measurements',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async testSpecificVariables() {
    this.log('🎯 Testing Specific Variables...', 'info');
    
    if (!this.token) {
      this.log('❌ No token available for specific variables test', 'error');
      return;
    }

    const variablesToTest = ['S1', 's2', 'S2', 'Cloruros', 'Cloro Libre'];
    
    for (const variable of variablesToTest) {
      try {
        this.log(`📡 Testing variable: "${variable}"`, 'test');
        
        const response = await fetch(`${API_BASE_URL}/api/mediciones/variable/${encodeURIComponent(variable)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
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
          test: `Test variable "${variable}"`,
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
          test: `Test variable "${variable}"`,
          ...result
        });
      }
    }
  }

  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    this.log('\n' + '='.repeat(60), 'info');
    this.log('🧪 DATABASE VARIABLES TEST REPORT', 'bright');
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
    this.log('🚀 Starting Database Variables Testing...', 'bright');
    this.log(`🌐 API Base URL: ${API_BASE_URL}`, 'info');
    
    try {
      const loginSuccess = await this.testLogin();
      if (!loginSuccess) {
        this.log('❌ Cannot proceed without authentication', 'error');
        return this.generateReport();
      }
      
      await this.testVariablesEndpoint();
      await this.testMeasurementsEndpoint();
      await this.testSpecificVariables();
      
      const report = this.generateReport();
      
      this.log('\n🎉 Testing completed!', 'success');
      return report;
      
    } catch (error) {
      this.log(`💥 Fatal error during testing: ${error.message}`, 'error');
      throw error;
    }
  }
}

async function runDatabaseVariablesTests() {
  const tester = new DatabaseVariablesTester();
  
  try {
    const report = await tester.runAllTests();
    
    if (typeof window === 'undefined') {
      // Save report to tester-results folder
      const reportPath = tester.reportHelper.saveJsonReport('database-variables-test', report);
      console.log(`📄 Report saved to: ${reportPath}`);
      
      // Also save the old format for backward compatibility
      const fs = require('fs');
      const legacyPath = './database-variables-test-report.json';
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
  module.exports = { DatabaseVariablesTester, runDatabaseVariablesTests };
}

if (typeof window === 'undefined' && require.main === module) {
  runDatabaseVariablesTests();
}
