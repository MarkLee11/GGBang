#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 GGBang Environment Setup');
console.log('============================\n');

// 检查 .env 文件是否存在
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ .env file already exists');
  
  // 读取并检查现有配置
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasSupabaseUrl = envContent.includes('VITE_SUPABASE_URL=');
  const hasSupabaseKey = envContent.includes('VITE_SUPABASE_ANON_KEY=');
  
  console.log('📋 Current configuration:');
  console.log(`   VITE_SUPABASE_URL: ${hasSupabaseUrl ? '✅' : '❌'}`);
  console.log(`   VITE_SUPABASE_ANON_KEY: ${hasSupabaseKey ? '✅' : '❌'}`);
  
  if (hasSupabaseUrl && hasSupabaseKey) {
    console.log('\n🎉 Your Supabase configuration looks complete!');
    console.log('   You can now run: npm run dev');
    process.exit(0);
  }
} else {
  console.log('❌ .env file not found');
}

console.log('\n📝 To fix the "supabaseUrl is required" error:');
console.log('1. Create a .env file in your project root');
console.log('2. Add your Supabase configuration:');
console.log('');
console.log('   VITE_SUPABASE_URL=https://your-project-ref.supabase.co');
console.log('   VITE_SUPABASE_ANON_KEY=your-anon-key-here');
console.log('');
console.log('3. Get these values from:');
console.log('   - Go to https://supabase.com/dashboard');
console.log('   - Select your project');
console.log('   - Go to Settings > API');
console.log('   - Copy Project URL and anon public key');
console.log('');
console.log('4. Restart your development server');
console.log('');

if (!envExists) {
  console.log('💡 You can copy from env.example:');
  console.log('   cp env.example .env');
  console.log('   # Then edit .env with your actual values');
}

console.log('🔗 For more help, see: README.md');
