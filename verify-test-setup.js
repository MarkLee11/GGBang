#!/usr/bin/env node

/**
 * GGBang E2E Test Setup Verification
 * Quick verification script to ensure all test components are properly configured
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    log(`  ✅ ${description}: ${filePath}`, colors.green);
    return true;
  } else {
    log(`  ❌ ${description}: ${filePath} (missing)`, colors.red);
    return false;
  }
}

function checkDirectory(dirPath, description) {
  const fullPath = path.join(__dirname, dirPath);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
  
  if (exists) {
    log(`  ✅ ${description}: ${dirPath}`, colors.green);
    return true;
  } else {
    log(`  ❌ ${description}: ${dirPath} (missing)`, colors.red);
    return false;
  }
}

function checkPackageScript(scriptName) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const hasScript = packageJson.scripts && packageJson.scripts[scriptName];
    
    if (hasScript) {
      log(`  ✅ npm script: ${scriptName}`, colors.green);
      return true;
    } else {
      log(`  ❌ npm script: ${scriptName} (missing)`, colors.red);
      return false;
    }
  } catch (error) {
    log(`  ❌ Error checking package.json: ${error.message}`, colors.red);
    return false;
  }
}

function main() {
  log('\n🔍 GGBang E2E Test Setup Verification', colors.cyan);
  log('=' .repeat(50), colors.blue);
  
  let allValid = true;
  
  // Check core test files
  log('\n📁 Core Test Files:', colors.blue);
  allValid &= checkFile('playwright.config.ts', 'Playwright Configuration');
  allValid &= checkFile('tests/ggbang-e2e.spec.ts', 'Main E2E Test Suite');
  allValid &= checkFile('tests/utils/test-helpers.ts', 'Test Helper Utilities');
  allValid &= checkFile('tests/test-environment.ts', 'Test Environment Config');
  allValid &= checkFile('tests/global-setup.ts', 'Global Test Setup');
  allValid &= checkFile('tests/global-teardown.ts', 'Global Test Teardown');
  
  // Check test runner and documentation
  log('\n🚀 Test Runner & Documentation:', colors.blue);
  allValid &= checkFile('tests/run-tests.cjs', 'Custom Test Runner');
  allValid &= checkFile('tests/README.md', 'Test Documentation');
  allValid &= checkFile('E2E_TEST_DOCUMENTATION.md', 'Complete E2E Documentation');
  
  // Check directories
  log('\n📂 Test Directories:', colors.blue);
  allValid &= checkDirectory('tests', 'Tests Directory');
  allValid &= checkDirectory('tests/utils', 'Test Utils Directory');
  
  // Check npm scripts
  log('\n📜 NPM Scripts:', colors.blue);
  allValid &= checkPackageScript('test:e2e');
  allValid &= checkPackageScript('test:e2e:ui');
  allValid &= checkPackageScript('test:e2e:debug');
  allValid &= checkPackageScript('test:e2e:headed');
  allValid &= checkPackageScript('test:setup');
  
  // Check dependencies
  log('\n📦 Dependencies:', colors.blue);
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const devDeps = packageJson.devDependencies || {};
    
    const requiredDeps = [
      '@playwright/test',
      '@supabase/supabase-js',
      'typescript',
      '@types/node',
      'dotenv',
      'node-fetch'
    ];
    
    requiredDeps.forEach(dep => {
      if (devDeps[dep]) {
        log(`  ✅ ${dep}: ${devDeps[dep]}`, colors.green);
      } else {
        log(`  ❌ ${dep}: missing`, colors.red);
        allValid = false;
      }
    });
  } catch (error) {
    log(`  ❌ Error checking dependencies: ${error.message}`, colors.red);
    allValid = false;
  }
  
  // Environment check reminder
  log('\n🔧 Environment Setup:', colors.blue);
  const envExists = fs.existsSync(path.join(__dirname, '.env'));
  if (envExists) {
    log('  ✅ .env file exists', colors.green);
  } else {
    log('  ⚠️  .env file missing - create from .env.test.example', colors.yellow);
  }
  
  // Summary
  log('\n📊 Setup Verification Summary:', colors.cyan);
  if (allValid && envExists) {
    log('🎉 All components are properly configured!', colors.green);
    log('\n🚀 Ready to run tests:', colors.blue);
    log('  npm run test:e2e', colors.cyan);
  } else {
    log('⚠️  Some components need attention:', colors.yellow);
    if (!allValid) {
      log('  - Fix missing files or dependencies above', colors.yellow);
    }
    if (!envExists) {
      log('  - Create .env file with your configuration', colors.yellow);
    }
  }
  
  log('\n📚 For detailed setup instructions, see:', colors.blue);
  log('  - tests/README.md', colors.cyan);
  log('  - E2E_TEST_DOCUMENTATION.md', colors.cyan);
  
  return allValid && envExists ? 0 : 1;
}

// Run if called directly (ES module way)
const exitCode = main();
process.exit(exitCode);
