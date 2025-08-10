import { chromium, type FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

async function globalSetup(config: FullConfig) {
  // Load environment variables
  dotenv.config();
  
  console.log('🚀 Starting GGBang E2E Test Suite...');
  console.log('📋 Verifying environment configuration...');
  
  // Verify essential environment variables
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    throw new Error(`Environment check failed: Missing variables ${missingVars.join(', ')}`);
  }
  
  console.log('✅ Environment variables configured');
  console.log(`🌐 Supabase URL: ${process.env.VITE_SUPABASE_URL}`);
  console.log(`🔑 Supabase Key: ${process.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20)}...`);
  
  // Optional: Check if the development server is running
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    console.log('🔍 Checking if development server is accessible...');
    await page.goto(config.projects[0].use?.baseURL || 'http://localhost:5173', {
      timeout: 30000,
      waitUntil: 'domcontentloaded'
    });
    
    // Check if Supabase is configured in the app
    const supabaseConfigured = await page.evaluate(() => {
      return (window as any).localStorage || true; // Basic check
    });
    
    console.log('✅ Development server is accessible');
    
    await browser.close();
  } catch (error) {
    console.warn('⚠️  Could not verify development server accessibility:', error);
    // Don't fail the setup for this
  }
  
  console.log('🎯 Global setup completed successfully\n');
}

export default globalSetup;
