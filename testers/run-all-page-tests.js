#!/usr/bin/env node

/**
 * Script Maestro para Ejecutar Todos los Tests de Páginas
 * 
 * Este script ejecuta todos los tests individuales de cada página
 * y genera un reporte consolidado.
 */

const { runAgregarFormulaTests } = require('./test-agregar-formula.js');
const { runUsersManagementTests } = require('./test-users-management.js');
const { runDashboardParametersTests } = require('./test-dashboard-parameters.js');
const { runDashboardReportManagerTests } = require('./test-reportmanager.js');
const { runDashboardAgregarSistemaTests } = require('./test-agregarsistema.js');
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

function log(message, type = 'info') {
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

async function runAllPageTests() {
  const startTime = Date.now();
  const allResults = [];
  const reportHelper = new ReportHelper();
  
  log('🚀 Starting All Page Tests...', 'bright');
  log('='.repeat(80), 'info');
  
  const testSuites = [
    {
      name: 'Agregar Formula',
      runner: runAgregarFormulaTests,
      path: '/agregar-formula'
    },
    {
      name: 'Users Management',
      runner: runUsersManagementTests,
      path: '/users-management'
    },
    {
      name: 'Dashboard Parameters',
      runner: runDashboardParametersTests,
      path: '/dashboard-parameters'
    },
    {
      name: 'Dashboard Report Manager',
      runner: runDashboardReportManagerTests,
      path: '/reportmanager'
    },
    {
      name: 'Dashboard Agregar Sistema',
      runner: runDashboardAgregarSistemaTests,
      path: '/agregarsistema'
    }
  ];

  for (const suite of testSuites) {
    log(`\n🧪 Running ${suite.name} Tests...`, 'test');
    log(`📍 Path: ${suite.path}`, 'info');
    log('-'.repeat(60), 'info');
    
    try {
      const result = await suite.runner();
      allResults.push({
        name: suite.name,
        path: suite.path,
        ...result,
        success: result.summary.failed === 0
      });
      
      log(`✅ ${suite.name} completed - ${result.summary.successful}/${result.summary.total} tests passed`, 'success');
    } catch (error) {
      log(`❌ ${suite.name} failed: ${error.message}`, 'error');
      allResults.push({
        name: suite.name,
        path: suite.path,
        success: false,
        error: error.message
      });
    }
  }

  // Generate consolidated report
  const endTime = Date.now();
  const totalDuration = endTime - startTime;
  
  log('\n' + '='.repeat(80), 'info');
  log('📊 CONSOLIDATED TESTING REPORT', 'bright');
  log('='.repeat(80), 'info');
  
  const totalSuites = allResults.length;
  const successfulSuites = allResults.filter(r => r.success).length;
  const failedSuites = allResults.filter(r => !r.success).length;
  
  const totalTests = allResults.reduce((sum, r) => sum + (r.summary?.total || 0), 0);
  const totalSuccessful = allResults.reduce((sum, r) => sum + (r.summary?.successful || 0), 0);
  const totalFailed = allResults.reduce((sum, r) => sum + (r.summary?.failed || 0), 0);
  
  log(`\n📈 OVERALL SUMMARY:`, 'info');
  log(`   Test Suites: ${totalSuites}`, 'info');
  log(`   ✅ Successful Suites: ${successfulSuites}`, 'success');
  log(`   ❌ Failed Suites: ${failedSuites}`, 'error');
  log(`   📊 Suite Success Rate: ${((successfulSuites / totalSuites) * 100).toFixed(1)}%`, 'info');
  log(`   ⏱️  Total Duration: ${totalDuration}ms`, 'info');
  
  log(`\n📋 INDIVIDUAL TEST SUMMARY:`, 'info');
  log(`   Total Tests: ${totalTests}`, 'info');
  log(`   ✅ Successful Tests: ${totalSuccessful}`, 'success');
  log(`   ❌ Failed Tests: ${totalFailed}`, 'error');
  log(`   📊 Test Success Rate: ${((totalSuccessful / totalTests) * 100).toFixed(1)}%`, 'info');
  
  log(`\n📋 RESULTS BY PAGE:`, 'info');
  allResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const rate = result.summary ? `${result.summary.successful}/${result.summary.total} (${result.summary.successRate.toFixed(1)}%)` : 'N/A';
    log(`   ${status} ${result.name}: ${rate}`, result.success ? 'success' : 'error');
  });
  
  if (failedSuites.length > 0) {
    log(`\n❌ FAILED TEST SUITES:`, 'error');
    failedSuites.forEach(result => {
      log(`   • ${result.name} (${result.path})`, 'error');
      if (result.error) {
        log(`     Error: ${result.error}`, 'error');
      }
    });
  }
  
  log('\n' + '='.repeat(80), 'info');
  
  // Save consolidated report
  const consolidatedReport = {
    summary: {
      totalSuites,
      successfulSuites,
      failedSuites,
      totalTests,
      totalSuccessful,
      totalFailed,
      totalDuration,
      suiteSuccessRate: (successfulSuites / totalSuites) * 100,
      testSuccessRate: (totalSuccessful / totalTests) * 100
    },
    results: allResults,
    timestamp: new Date().toISOString()
  };
  
  if (typeof window === 'undefined') {
    // Save consolidated report to tester-results folder
    const reportPath = reportHelper.saveJsonReport('consolidated-page-tests', consolidatedReport);
    log(`📄 Consolidated report saved to: ${reportPath}`, 'info');
    
    // Also save the old format for backward compatibility
    const fs = require('fs');
    const legacyPath = './consolidated-page-tests-report.json';
    fs.writeFileSync(legacyPath, JSON.stringify(consolidatedReport, null, 2));
    log(`📄 Legacy report saved to: ${legacyPath}`, 'info');
  }
  
  log('\n🎉 All page tests completed!', 'success');
  
  // Exit with appropriate code
  const exitCode = failedSuites > 0 ? 1 : 0;
  process.exit(exitCode);
}

if (require.main === module) {
  runAllPageTests().catch(error => {
    log(`💥 Fatal error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { runAllPageTests };
