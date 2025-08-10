/**
 * Test Environment Configuration
 * Manages test data, environment setup, and cleanup
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface TestEnvironment {
  supabaseUrl: string;
  supabaseAnonKey: string;
  testUserEmail: string;
  testUserPassword: string;
  baseUrl: string;
}

export function getTestEnvironment(): TestEnvironment {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(`
❌ ENVIRONMENT ERROR: Supabase configuration missing!

Required environment variables:
- VITE_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}
- VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}

Please ensure your .env file contains these values:
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

For testing, you also need:
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-test-password
    `);
  }
  
  return {
    supabaseUrl,
    supabaseAnonKey,
    testUserEmail: process.env.TEST_USER_EMAIL || 'test@example.com',
    testUserPassword: process.env.TEST_USER_PASSWORD || 'testpassword123',
    baseUrl: process.env.BASE_URL || 'http://localhost:5173'
  };
}

export function createTestSupabaseClient() {
  const env = getTestEnvironment();
  return createClient(env.supabaseUrl, env.supabaseAnonKey);
}

// Test data factory
export class TestDataFactory {
  static createTestEvent(suffix = Date.now()) {
    return {
      title: `E2E Test Event ${suffix}`,
      description: `This is an automated test event created by Playwright E2E tests. Created at ${new Date().toISOString()}`,
      location: 'Test City, Test Country',
      category: 'parties',
      capacity: 10,
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      time: '20:00',
      place_hint: 'Near the test center',
      is_public: true
    };
  }
  
  static createTestUser(suffix = Date.now()) {
    return {
      email: `test.user.${suffix}@example.com`,
      password: 'TestPassword123!',
      displayName: `Test User ${suffix}`
    };
  }
}

// Test cleanup utilities
export class TestCleanup {
  private supabase = createTestSupabaseClient();
  
  async cleanupTestEvents(titlePattern = 'E2E Test Event') {
    try {
      const { data: events, error } = await this.supabase
        .from('events')
        .select('id, title')
        .ilike('title', `%${titlePattern}%`);
      
      if (error) {
        console.warn('Error fetching test events for cleanup:', error);
        return;
      }
      
      if (events && events.length > 0) {
        const { error: deleteError } = await this.supabase
          .from('events')
          .delete()
          .in('id', events.map(e => e.id));
        
        if (deleteError) {
          console.warn('Error cleaning up test events:', deleteError);
        } else {
          console.log(`🧹 Cleaned up ${events.length} test events`);
        }
      }
    } catch (error) {
      console.warn('Test cleanup failed:', error);
    }
  }
  
  async cleanupTestJoinRequests() {
    try {
      // Clean up join requests for test events
      const { error } = await this.supabase
        .from('join_requests')
        .delete()
        .in('event_id', 
          this.supabase
            .from('events')
            .select('id')
            .ilike('title', '%E2E Test Event%')
        );
      
      if (error) {
        console.warn('Error cleaning up test join requests:', error);
      } else {
        console.log('🧹 Cleaned up test join requests');
      }
    } catch (error) {
      console.warn('Join request cleanup failed:', error);
    }
  }
}

// Environment validation
export function validateTestEnvironment() {
  try {
    const env = getTestEnvironment();
    console.log('🔍 Test Environment Validation:');
    console.log(`  ✅ Supabase URL: ${env.supabaseUrl}`);
    console.log(`  ✅ Anon Key: ${env.supabaseAnonKey.substring(0, 20)}...`);
    console.log(`  ✅ Test User: ${env.testUserEmail}`);
    console.log(`  ✅ Base URL: ${env.baseUrl}`);
    return true;
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    return false;
  }
}

// Pre-test setup
export async function setupTestEnvironment() {
  console.log('🚀 Setting up test environment...');
  
  // Validate environment
  if (!validateTestEnvironment()) {
    throw new Error('Environment validation failed');
  }
  
  // Test Supabase connection
  try {
    const supabase = createTestSupabaseClient();
    const { data, error } = await supabase.from('events').select('count').limit(1);
    
    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
    
    console.log('✅ Supabase connection verified');
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);
    throw error;
  }
  
  console.log('✅ Test environment setup complete\n');
}
