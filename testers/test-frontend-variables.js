#!/usr/bin/env node

/**
 * Test para verificar qué variables se están cargando en el frontend
 * 
 * Este script simula el flujo del frontend para ver exactamente
 * qué variables se están intentando cargar.
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

class FrontendVariablesTester {
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

  async testFrontendFlow() {
    this.log('🔍 Testing Frontend Flow...', 'info');
    
    try {
      // 1. Obtener variables disponibles
      this.log('📋 Step 1: Getting available variables...', 'test');
      const variablesResponse = await fetch(`${API_BASE_URL}/api/variables`);
      const variablesData = await variablesResponse.json();
      const variables = variablesData.variables || variablesData || [];
      
      this.log(`✅ Found ${variables.length} variables in database`, 'success');
      
      // Mostrar todas las variables
      this.log('\n📋 ALL VARIABLES IN DATABASE:', 'info');
      variables.forEach((variable, index) => {
        this.log(`   ${index + 1}. "${variable.nombre}" (ID: ${variable.id}) - ${variable.unidad || 'No unit'}`, 'info');
      });
      
      // 2. Simular el flujo del frontend
      this.log('\n🎯 Step 2: Simulating frontend flow...', 'test');
      
      // Las variables que están fallando según la imagen del usuario
      const failingVariables = ['S1', 's2', 'S2', 'Cloruros', 'Cloro Libre'];
      
      this.log('\n🔍 CHECKING FAILING VARIABLES:', 'info');
      failingVariables.forEach(varName => {
        const found = variables.find(v => 
          v.nombre === varName || 
          v.nombre.toLowerCase() === varName.toLowerCase()
        );
        
        if (found) {
          this.log(`   ✅ "${varName}" - FOUND in database (ID: ${found.id})`, 'success');
        } else {
          this.log(`   ❌ "${varName}" - NOT FOUND in database`, 'error');
        }
      });
      
      // 3. Buscar variables similares
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
      
      // 4. Analizar el problema
      this.log('\n🎯 PROBLEM ANALYSIS:', 'info');
      
      const existingVariables = failingVariables.filter(varName => 
        variables.find(v => v.nombre === varName)
      );
      
      const missingVariables = failingVariables.filter(varName => 
        !variables.find(v => v.nombre === varName)
      );
      
      this.log(`   ✅ Variables that exist: ${existingVariables.join(', ')}`, 'success');
      this.log(`   ❌ Variables that don't exist: ${missingVariables.join(', ')}`, 'error');
      
      // 5. Recomendaciones
      this.log('\n💡 RECOMMENDATIONS:', 'info');
      
      if (missingVariables.length > 0) {
        this.log(`   • The frontend is trying to load variables that don't exist: ${missingVariables.join(', ')}`, 'warning');
        this.log(`   • These variables need to be added to the database or the frontend needs to be updated`, 'warning');
      }
      
      if (existingVariables.length > 0) {
        this.log(`   • These variables exist and should work: ${existingVariables.join(', ')}`, 'success');
      }
      
      this.testResults.push({
        category: 'Frontend Flow',
        test: 'Simulate frontend flow',
        success: true,
        totalVariables: variables.length,
        existingVariables: existingVariables,
        missingVariables: missingVariables,
        similarVariables: similarVariables,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.log(`💥 Frontend flow error: ${error.message}`, 'error');
      
      this.testResults.push({
        category: 'Frontend Flow',
        test: 'Simulate frontend flow',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async testVariableEndpoints() {
    this.log('\n🎯 Testing Variable Endpoints...', 'info');
    
    // Las variables que están fallando según la imagen del usuario
    const failingVariables = ['S1', 's2', 'S2', 'Cloruros', 'Cloro Libre'];
    
    for (const variable of failingVariables) {
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
          category: 'Variable Endpoints',
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
          category: 'Variable Endpoints',
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
    this.log('🧪 FRONTEND VARIABLES TEST REPORT', 'bright');
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
    this.log('🚀 Starting Frontend Variables Testing...', 'bright');
    this.log(`🌐 API Base URL: ${API_BASE_URL}`, 'info');
    
    try {
      await this.testFrontendFlow();
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

async function runFrontendVariablesTests() {
  const tester = new FrontendVariablesTester();
  
  try {
    const report = await tester.runAllTests();
    
    if (typeof window === 'undefined') {
      // Save report to tester-results folder
      const reportPath = tester.reportHelper.saveJsonReport('frontend-variables-test', report);
      console.log(`📄 Report saved to: ${reportPath}`);
      
      // Also save the old format for backward compatibility
      const fs = require('fs');
      const legacyPath = './frontend-variables-test-report.json';
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
  module.exports = { FrontendVariablesTester, runFrontendVariablesTests };
}

if (typeof window === 'undefined' && require.main === module) {
  runFrontendVariablesTests();
}
