#!/usr/bin/env node

/**
 * GGBang E2E Test Runner
 * Comprehensive test execution with environment validation and reporting
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// ANSI color codes for beautiful console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const logo = `
${colors.cyan}╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 GGBang E2E Test Suite Runner                     ║
║   Comprehensive End-to-End Testing for Steps 1-5     ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝${colors.reset}
`;

class TestRunner {
  constructor() {
    this.startTime = Date.now();
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };
  }

  log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  async checkEnvironment() {
    this.log('\n🔍 Checking Environment Configuration...', colors.blue);
    
    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ];
    
    const optionalVars = [
      'TEST_USER_EMAIL',
      'TEST_USER_PASSWORD',
      'BASE_URL'
    ];

    let missingRequired = [];
    let missingOptional = [];

    // Check required variables
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingRequired.push(varName);
      } else {
        this.log(`  ✅ ${varName}: ${'*'.repeat(20)}...`, colors.green);
      }
    }

    // Check optional variables
    for (const varName of optionalVars) {
      if (!process.env[varName]) {
        missingOptional.push(varName);
      } else {
        this.log(`  ✅ ${varName}: ${process.env[varName]}`, colors.green);
      }
    }

    if (missingRequired.length > 0) {
      this.log('\n❌ ENVIRONMENT ERROR: Required variables missing!', colors.red);
      this.log('Missing required variables:', colors.red);
      missingRequired.forEach(varName => {
        this.log(`  - ${varName}`, colors.red);
      });
      
      this.log('\n📋 Setup Instructions:', colors.yellow);
      this.log('1. Create a .env file in your project root', colors.yellow);
      this.log('2. Add the following variables:', colors.yellow);
      this.log('   VITE_SUPABASE_URL=https://your-project-ref.supabase.co', colors.gray);
      this.log('   VITE_SUPABASE_ANON_KEY=your-anon-key-here', colors.gray);
      this.log('   TEST_USER_EMAIL=test@example.com', colors.gray);
      this.log('   TEST_USER_PASSWORD=testpassword123', colors.gray);
      
      throw new Error('Environment configuration incomplete');
    }

    if (missingOptional.length > 0) {
      this.log('\n⚠️  Optional variables missing (tests will use defaults):', colors.yellow);
      missingOptional.forEach(varName => {
        this.log(`  - ${varName}`, colors.yellow);
      });
    }

    this.log('\n✅ Environment validation passed!', colors.green);
  }

  async runPlaywrightTests(options = {}) {
    this.log('\n🎭 Running Playwright E2E Tests...', colors.blue);
    
    const playwrightArgs = [
      'test',
      '--reporter=list,json,html'
    ];

    if (options.headed) playwrightArgs.push('--headed');
    if (options.debug) playwrightArgs.push('--debug');
    if (options.ui) playwrightArgs.push('--ui');
    if (options.grep) playwrightArgs.push('--grep', options.grep);

    return new Promise((resolve, reject) => {
      const playwrightProcess = spawn('npx', ['playwright', ...playwrightArgs], {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env }
      });

      playwrightProcess.on('close', (code) => {
        if (code === 0) {
          this.log('\n✅ All tests completed successfully!', colors.green);
          resolve(code);
        } else {
          this.log(`\n❌ Tests failed with exit code ${code}`, colors.red);
          resolve(code);
        }
      });

      playwrightProcess.on('error', (error) => {
        this.log(`\n❌ Failed to run Playwright: ${error.message}`, colors.red);
        reject(error);
      });
    });
  }

  async run(options = {}) {
    console.log(logo);
    
    try {
      // Pre-flight checks
      await this.checkEnvironment();

      // Run tests
      const exitCode = await this.runPlaywrightTests(options);

      // Final summary
      const totalTime = (Date.now() - this.startTime) / 1000;
      this.log(`\n🎯 Test Suite Completed in ${totalTime.toFixed(2)}s`, colors.cyan);
      
      if (exitCode === 0) {
        this.log('🎉 All tests passed successfully!', colors.green);
      } else {
        this.log('⚠️  Some tests failed. Check reports for details.', colors.yellow);
      }

      return exitCode;

    } catch (error) {
      this.log(`\n💥 Test run failed: ${error.message}`, colors.red);
      return 1;
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--headed':
        options.headed = true;
        break;
      case '--debug':
        options.debug = true;
        break;
      case '--ui':
        options.ui = true;
        break;
      case '--grep':
        options.grep = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
GGBang E2E Test Runner

Usage: node tests/run-tests.cjs [options]

Options:
  --headed              Run tests in headed mode (see browser)
  --debug               Run tests in debug mode
  --ui                  Run tests with Playwright UI
  --grep <pattern>      Run only tests matching pattern
  --help, -h            Show this help message
        `);
        return 0;
    }
  }

  const runner = new TestRunner();
  const exitCode = await runner.run(options);
  process.exit(exitCode);
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { TestRunner };