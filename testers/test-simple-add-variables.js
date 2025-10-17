#!/usr/bin/env node

/**
 * Script simple para agregar las variables faltantes
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

async function authenticate() {
  log('🔐 Authenticating...', 'info');
  
  const credentials = [
    { email: "aldotrufa@example.com", password: "password123" },
    { email: "admin@example.com", password: "admin123" },
    { email: "admin", password: "admin123" }
  ];
  
  for (const cred of credentials) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          log(`🎉 Authentication successful with: ${cred.email}`, 'success');
          return data.token;
        }
      }
    } catch (error) {
      log(`❌ Error with ${cred.email}: ${error.message}`, 'error');
    }
  }
  
  log(`❌ Authentication failed with all credentials`, 'error');
  return null;
}

async function addVariable(token, variable) {
  log(`➕ Adding variable: "${variable.nombre}"`, 'test');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/variables`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(variable)
    });
    
    if (response.ok) {
      const data = await response.json();
      log(`✅ Variable "${variable.nombre}" created successfully`, 'success');
      return { success: true, data };
    } else {
      const error = await response.json();
      log(`❌ Failed to create variable "${variable.nombre}": ${error.msg || error.message || JSON.stringify(error)}`, 'error');
      return { success: false, error };
    }
  } catch (error) {
    log(`💥 Error creating variable "${variable.nombre}": ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

async function verifyVariables(token) {
  log('🔍 Verifying variables...', 'info');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/variables`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const variables = data.variables || data || [];
      log(`📝 Found ${variables.length} variables`, 'info');
      
      // Check for our target variables
      const targetVariables = ['S1', 's2', 'S2', 'Cloruros', 'Cloro Libre'];
      log('\n🔍 CHECKING TARGET VARIABLES:', 'info');
      
      targetVariables.forEach(varName => {
        const found = variables.find(v => v.nombre === varName);
        if (found) {
          log(`   ✅ "${varName}" - FOUND (ID: ${found.id})`, 'success');
        } else {
          log(`   ❌ "${varName}" - NOT FOUND`, 'error');
        }
      });
      
      return variables;
    } else {
      log('❌ Failed to get variables', 'error');
      return null;
    }
  } catch (error) {
    log(`💥 Error getting variables: ${error.message}`, 'error');
    return null;
  }
}

async function testVariableEndpoint(token, variableName) {
  log(`📡 Testing variable: "${variableName}"`, 'test');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/mediciones/variable/${encodeURIComponent(variableName)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const measurements = data.mediciones || data || [];
      log(`   ✅ "${variableName}" - Status: ${response.status} - ${measurements.length} measurements`, 'success');
      return { success: true, measurements: measurements.length };
    } else {
      const error = await response.json();
      log(`   ❌ "${variableName}" - Status: ${response.status} - ${error.msg || error.message || JSON.stringify(error)}`, 'error');
      return { success: false, status: response.status, error };
    }
  } catch (error) {
    log(`   💥 Error testing "${variableName}": ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

async function main() {
  log('🚀 Starting Simple Add Variables Test...', 'bright');
  log(`🌐 API Base URL: ${API_BASE_URL}`, 'info');
  
  try {
    // Step 1: Authenticate
    const token = await authenticate();
    if (!token) {
      throw new Error('Authentication failed');
    }

    // Step 2: Add missing variables
    const missingVariables = [
      { nombre: "S1", unidad: "ppm" },
      { nombre: "s2", unidad: "ppm" },
      { nombre: "S2", unidad: "ppm" }
    ];

    const addResults = [];
    for (const variable of missingVariables) {
      const result = await addVariable(token, variable);
      addResults.push({ variable: variable.nombre, ...result });
    }
    
    // Step 3: Verify variables were created
    const variables = await verifyVariables(token);
    
    // Step 4: Test endpoints
    const targetVariables = ['S1', 's2', 'S2', 'Cloruros', 'Cloro Libre'];
    const endpointResults = [];
    
    for (const variableName of targetVariables) {
      const result = await testVariableEndpoint(token, variableName);
      endpointResults.push({ variable: variableName, ...result });
    }
    
    log('\n🎉 Test completed!', 'success');
    
    const report = {
      authentication: !!token,
      addResults,
      variables: variables ? variables.length : 0,
      endpointResults,
      timestamp: new Date().toISOString()
    };
    
    // Save report
    const fs = require('fs');
    const reportPath = './simple-add-variables-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`📄 Report saved to: ${reportPath}`, 'info');
    
    return report;
    
  } catch (error) {
    log(`💥 Fatal error: ${error.message}`, 'error');
    process.exit(1);
  }
}

if (typeof window === 'undefined' && require.main === module) {
  main();
}
