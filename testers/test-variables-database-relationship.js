#!/usr/bin/env node

/**
 * Test para diagnosticar la relación entre variables y procesos en la base de datos
 * 
 * Este script verifica:
 * 1. Qué variables existen en la base de datos
 * 2. Qué procesos existen
 * 3. Qué relaciones variables_procesos existen
 * 4. Por qué "Cloruros" y "Cloro Libre" dan 404 pero "S1" funciona
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

class VariablesDatabaseRelationshipTester {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
    this.reportHelper = new ReportHelper();
    this.token = null;
    this.user = null;
    this.variables = [];
    this.processes = [];
    this.variableProcesses = [];
    this.measurements = [];
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
      timeout: 15000
    };

    const requestOptions = { ...defaultOptions, ...options };
    
    try {
      this.log(`📡 Testing: ${options.method || 'GET'} ${endpoint}`, 'test');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
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
        this.log(`⏰ ${endpoint} - Timeout after 15000ms`, 'warning');
      } else {
        this.log(`💥 ${endpoint} - Error: ${error.message}`, 'error');
      }
      
      return result;
    }
  }

  async testAuthentication() {
    this.log('🔐 Testing Authentication...', 'info');
    
    const credentials = [
      { email: "aldotrufa@example.com", password: "password123" },
      { email: "admin@example.com", password: "admin123" },
      { email: "admin", password: "admin123" }
    ];
    
    for (const cred of credentials) {
      const result = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(cred)
      });
      
      if (result.success && result.data?.token) {
        this.token = result.data.token;
        this.user = result.data;
        this.log(`🎉 Authentication successful with: ${cred.email}`, 'success');
        break;
      }
    }
    
    this.testResults.push({
      category: 'Authentication',
      test: 'Login',
      success: !!this.token,
      timestamp: new Date().toISOString()
    });

    if (!this.token) {
      this.log(`❌ Authentication failed with all credentials`, 'error');
    }
  }

  async testVariablesData() {
    this.log('📊 Testing Variables Data...', 'info');
    
    if (!this.token) {
      this.log('❌ No authentication token available', 'error');
      return;
    }

    // Get all variables
    const variablesResult = await this.makeRequest('/api/variables');
    this.testResults.push({
      category: 'Variables',
      test: 'Get All Variables',
      ...variablesResult
    });

    if (variablesResult.success && variablesResult.data?.variables) {
      this.variables = variablesResult.data.variables;
      this.log(`📝 Found ${this.variables.length} variables`, 'info');
      
      // Show all variables
      this.log('\n📋 ALL VARIABLES IN DATABASE:', 'info');
      this.variables.forEach((variable, index) => {
        this.log(`   ${index + 1}. "${variable.nombre}" (ID: ${variable.id}) - ${variable.unidad || 'No unit'}`, 'info');
      });
      
      // Check specific variables
      const targetVariables = ['S1', 's2', 'S2', 'Cloruros', 'Cloro Libre'];
      this.log('\n🔍 CHECKING TARGET VARIABLES:', 'info');
      targetVariables.forEach(varName => {
        const found = this.variables.find(v => 
          v.nombre === varName || 
          v.nombre.toLowerCase() === varName.toLowerCase()
        );
        
        if (found) {
          this.log(`   ✅ "${varName}" - FOUND (ID: ${found.id})`, 'success');
        } else {
          this.log(`   ❌ "${varName}" - NOT FOUND`, 'error');
        }
      });
    }
  }

  async testProcessesData() {
    this.log('⚙️ Testing Processes Data...', 'info');
    
    if (!this.token) {
      this.log('❌ No authentication token available', 'error');
      return;
    }

    // Get accessible plants first
    const plantsResult = await this.makeRequest('/api/plantas/accesibles');
    this.testResults.push({
      category: 'Plants',
      test: 'Get Accessible Plants',
      ...plantsResult
    });

    if (plantsResult.success && plantsResult.data?.plantas?.length > 0) {
      const plantId = plantsResult.data.plantas[0].id;
      this.log(`📝 Using plant ID: ${plantId}`, 'info');

      // Get processes for this plant
      const processesResult = await this.makeRequest(`/api/procesos/planta/${plantId}`);
      this.testResults.push({
        category: 'Processes',
        test: 'Get Processes by Plant',
        ...processesResult
      });

      if (processesResult.success && processesResult.data?.procesos) {
        this.processes = processesResult.data.procesos;
        this.log(`📝 Found ${this.processes.length} processes`, 'info');
        
        // Show all processes
        this.log('\n📋 ALL PROCESSES IN DATABASE:', 'info');
        this.processes.forEach((process, index) => {
          this.log(`   ${index + 1}. "${process.nombre}" (ID: ${process.id}) - ${process.descripcion || 'No description'}`, 'info');
        });
      }
    }
  }

  async testVariableProcessRelationships() {
    this.log('🔗 Testing Variable-Process Relationships...', 'info');
    
    if (!this.token || this.processes.length === 0) {
      this.log('❌ Missing required data for relationship tests', 'error');
      return;
    }

    // Test each process to see what variables are associated
    for (const process of this.processes) {
      this.log(`\n🔍 Testing process: "${process.nombre}" (ID: ${process.id})`, 'info');
      
      const variablesResult = await this.makeRequest(`/api/variables/proceso/${process.id}`);
      this.testResults.push({
        category: 'Variable-Process Relationships',
        test: `Get Variables for Process ${process.nombre}`,
        ...variablesResult
      });

      if (variablesResult.success && variablesResult.data?.variables) {
        const processVariables = variablesResult.data.variables;
        this.log(`   📝 Found ${processVariables.length} variables for "${process.nombre}":`, 'info');
        
        processVariables.forEach(variable => {
          this.log(`      - "${variable.nombre}" (ID: ${variable.id}) - ${variable.unidad}`, 'info');
        });
        
        // Check if target variables are in this process
        const targetVariables = ['S1', 's2', 'S2', 'Cloruros', 'Cloro Libre'];
        targetVariables.forEach(varName => {
          const found = processVariables.find(v => 
            v.nombre === varName || 
            v.nombre.toLowerCase() === varName.toLowerCase()
          );
          
          if (found) {
            this.log(`   ✅ "${varName}" - FOUND in "${process.nombre}"`, 'success');
          } else {
            this.log(`   ❌ "${varName}" - NOT FOUND in "${process.nombre}"`, 'error');
          }
        });
      } else {
        this.log(`   ❌ Failed to get variables for "${process.nombre}"`, 'error');
      }
    }
  }

  async testSpecificVariableEndpoints() {
    this.log('🎯 Testing Specific Variable Endpoints...', 'info');
    
    if (!this.token) {
      this.log('❌ No authentication token available', 'error');
      return;
    }

    const targetVariables = ['S1', 's2', 'S2', 'Cloruros', 'Cloro Libre'];
    
    for (const variable of targetVariables) {
      this.log(`\n📡 Testing variable: "${variable}"`, 'test');
      
      const result = await this.makeRequest(`/api/mediciones/variable/${encodeURIComponent(variable)}`);
      this.testResults.push({
        category: 'Variable Endpoints',
        test: `Test variable "${variable}"`,
        variable,
        ...result
      });

      if (result.success) {
        const measurements = result.data?.mediciones || result.data || [];
        this.log(`   ✅ "${variable}" - Status: ${result.status} - ${measurements.length} measurements`, 'success');
      } else {
        this.log(`   ❌ "${variable}" - Status: ${result.status} - ${result.error?.msg || result.error?.message || JSON.stringify(result.error)}`, 'error');
      }
    }
  }

  async testMeasurementsData() {
    this.log('📈 Testing Measurements Data...', 'info');
    
    if (!this.token) {
      this.log('❌ No authentication token available', 'error');
      return;
    }

    // Get all measurements
    const measurementsResult = await this.makeRequest('/api/mediciones');
    this.testResults.push({
      category: 'Measurements',
      test: 'Get All Measurements',
      ...measurementsResult
    });

    if (measurementsResult.success && measurementsResult.data?.mediciones) {
      this.measurements = measurementsResult.data.mediciones;
      this.log(`📝 Found ${this.measurements.length} measurements`, 'info');
      
      // Group measurements by variable
      const measurementsByVariable = {};
      this.measurements.forEach(measurement => {
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
    }
  }

  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    this.log('\n' + '='.repeat(60), 'info');
    this.log('🔍 VARIABLES DATABASE RELATIONSHIP TEST REPORT', 'bright');
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
    
    // Análisis específico del problema
    this.log(`\n🎯 PROBLEM ANALYSIS:`, 'info');
    this.log(`   Variables in database: ${this.variables.length}`, 'info');
    this.log(`   Processes in database: ${this.processes.length}`, 'info');
    this.log(`   Measurements in database: ${this.measurements.length}`, 'info');
    
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
      results: this.testResults,
      data: {
        variables: this.variables,
        processes: this.processes,
        measurements: this.measurements
      }
    };
  }

  async runAllTests() {
    this.log('🚀 Starting Variables Database Relationship Testing...', 'bright');
    this.log(`🌐 API Base URL: ${API_BASE_URL}`, 'info');
    
    try {
      await this.testAuthentication();
      await this.testVariablesData();
      await this.testProcessesData();
      await this.testVariableProcessRelationships();
      await this.testSpecificVariableEndpoints();
      await this.testMeasurementsData();
      
      const report = this.generateReport();
      
      this.log('\n🎉 Testing completed!', 'success');
      return report;
      
    } catch (error) {
      this.log(`💥 Fatal error during testing: ${error.message}`, 'error');
      throw error;
    }
  }
}

async function runVariablesDatabaseRelationshipTests() {
  const tester = new VariablesDatabaseRelationshipTester();
  
  try {
    const report = await tester.runAllTests();
    
    if (typeof window === 'undefined') {
      // Save report to tester-results folder
      const reportPath = tester.reportHelper.saveJsonReport('variables-database-relationship-test', report);
      console.log(`📄 Report saved to: ${reportPath}`);
      
      // Also save the old format for backward compatibility
      const fs = require('fs');
      const legacyPath = './variables-database-relationship-test-report.json';
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
  module.exports = { VariablesDatabaseRelationshipTester, runVariablesDatabaseRelationshipTests };
}

if (typeof window === 'undefined' && require.main === module) {
  runVariablesDatabaseRelationshipTests();
}
