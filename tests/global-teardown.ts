import { type FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 Global teardown started...');
  
  // Clean up any global resources if needed
  // For example, close database connections, clean temp files, etc.
  
  console.log('✅ Global teardown completed');
}

export default globalTeardown;
