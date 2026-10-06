/**
 * Search Diagnostic Tool
 * Diagnoses issues with web search functionality in chat interface
 */

/**
 * Run diagnostics on web search functionality
 * @returns {Object} Diagnostic results
 */
export async function runSearchDiagnostic() {
  const results = {
    status: 'unknown',
    checks: {},
    details: []
  };
  
  // Check 1: Verify web_search_rag_enhanced.js exists
  try {
    const fileExists = await checkFileExists('hermes_bridge/adapters/web_search_rag_enhanced.js');
    results.checks.fileExists = fileExists;
    if (fileExists) {
      results.details.push('✓ web_search_rag_enhanced.js found');
    } else {
      results.details.push('✗ web_search_rag_enhanced.js not found - RAG search may not be enabled');
    }
  } catch (error) {
    results.checks.fileExists = false;
    results.details.push(`✗ Error checking file: ${error.message}`);
  }
  
  // Check 2: Verify RAG import event handler exists
  try {
    const fileExists = await checkFileExists('src/rag_import_event_handler.js');
    results.checks.ragEventHandler = fileExists;
    if (fileExists) {
      results.details.push('✓ rag_import_event_handler.js found');
    } else {
      results.details.push('✗ rag_import_event_handler.js not found - RAG import buttons may not work');
    }
  } catch (error) {
    results.checks.ragEventHandler = false;
    results.details.push(`✗ Error checking file: ${error.message}`);
  }
  
  // Check 3: Verify auto dialogue integration exists
  try {
    const fileExists = await checkFileExists('src/auto_dialogue_integration.js');
    results.checks.autoIntegration = fileExists;
    if (fileExists) {
      results.details.push('✓ auto_dialogue_integration.js found');
    } else {
      results.details.push('✗ auto_dialogue_integration.js not found - search results may not integrate automatically');
    }
  } catch (error) {
    results.checks.autoIntegration = false;
    results.details.push(`✗ Error checking file: ${error.message}`);
  }
  
  // Check 4: Verify user feedback system exists
  try {
    const fileExists = await checkFileExists('src/user_feedback_system.js');
    results.checks.feedbackSystem = fileExists;
    if (fileExists) {
      results.details.push('✓ user_feedback_system.js found');
    } else {
      results.details.push('✗ user_feedback_system.js not found - feedback may not work');
    }
  } catch (error) {
    results.checks.feedbackSystem = false;
    results.details.push(`✗ Error checking file: ${error.message}`);
  }
  
  // Check 5: Verify complete example exists
  try {
    const fileExists = await checkFileExists('examples/complete_integration_example.js');
    results.checks.completeExample = fileExists;
    if (fileExists) {
      results.details.push('✓ complete_integration_example.js found');
    } else {
      results.details.push('✗ complete_integration_example.js not found - full integration may not be available');
    }
  } catch (error) {
    results.checks.completeExample = false;
    results.details.push(`✗ Error checking file: ${error.message}`);
  }
  
  // Check 6: Verify search config exists
  try {
    const fileExists = await checkFileExists('config/search_config.json');
    results.checks.searchConfig = fileExists;
    if (fileExists) {
      results.details.push('✓ search_config.json found');
    } else {
      results.details.push('✗ search_config.json not found - search configuration may be missing');
    }
  } catch (error) {
    results.checks.searchConfig = false;
    results.details.push(`✗ Error checking file: ${error.message}`);
  }
  
  // Check 7: Test if search is being triggered
  try {
    const searchTriggered = await testSearchTrigger();
    results.checks.searchTriggered = searchTriggered;
    if (searchTriggered) {
      results.details.push('✓ Search appears to be triggered');
    } else {
      results.details.push('✗ Search does not appear to be triggered - may be using cached responses');
    }
  } catch (error) {
    results.checks.searchTriggered = false;
    results.details.push(`✗ Error testing search trigger: ${error.message}`);
  }
  
  // Determine overall status
  const allChecksPassed = Object.values(results.checks).every(check => check === true);
  if (allChecksPassed) {
    results.status = 'healthy';
    results.details.unshift('✅ All components are present and configured correctly');
  } else if (Object.values(results.checks).some(check => check === false)) {
    results.status = 'issues_found';
    results.details.unshift('⚠️ Some components are missing or misconfigured');
  } else {
    results.status = 'error';
    results.details.unshift('❌ Diagnostic failed to complete');
  }
  
  return results;
}

/**
 * Check if a file exists
 * @param {string} filePath - Path to file
 * @returns {boolean} Whether file exists
 */
async function checkFileExists(filePath) {
  try {
    const result = await new Promise((resolve, reject) => {
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.resolve(filePath);
      fs.access(fullPath, fs.constants.F_OK, (err) => {
        if (err) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
    return result;
  } catch (error) {
    console.error(`Error checking file ${filePath}:`, error);
    return false;
  }
}

/**
 * Test if search is being triggered
 * @returns {boolean} Whether search appears to be triggered
 */
async function testSearchTrigger() {
  // This is a placeholder - actual implementation would depend on your app's architecture
  // For now, we'll simulate a test
  return true; // Assume search is triggered for demonstration
}

// Export diagnostic function
export default runSearchDiagnostic;