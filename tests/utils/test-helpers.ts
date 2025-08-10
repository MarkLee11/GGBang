import { Page, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Test configuration
export const TEST_CONFIG = {
  // Test user credentials (update these with your test account)
  TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || 'test@example.com',
  TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || 'testpassword123',
  
  // Test data
  TEST_EVENT: {
    title: `E2E Test Event ${Date.now()}`,
    description: 'This is an automated test event created by Playwright E2E tests',
    location: 'Test City, Test Country',
    category: 'parties',
    capacity: 10,
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    time: '20:00'
  },
  
  // Timeouts
  DEFAULT_TIMEOUT: 30000,
  NETWORK_TIMEOUT: 10000,
  SUPABASE_TIMEOUT: 15000
};

// Supabase client for direct database operations
export function createSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key not configured');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Environment verification
export function verifyEnvironment() {
  const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Supabase environment not configured. Missing: ${missing.join(', ')}`);
  }
}

// Page helpers
export class PageHelpers {
  constructor(private page: Page) {}
  
  // Wait for network to be idle (no pending requests)
  async waitForNetworkIdle(timeout = TEST_CONFIG.NETWORK_TIMEOUT) {
    await this.page.waitForLoadState('networkidle', { timeout });
  }
  
  // Wait for Supabase requests to complete
  async waitForSupabaseRequest(operation: string = 'any', timeout = TEST_CONFIG.SUPABASE_TIMEOUT) {
    return this.page.waitForResponse(
      response => {
        const url = response.url();
        return url.includes('supabase.co') && 
               (operation === 'any' || url.includes(operation)) &&
               response.status() === 200;
      },
      { timeout }
    );
  }
  
  // Check for console errors
  async checkConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    this.page.on('pageerror', error => {
      errors.push(`Page Error: ${error.message}`);
    });
    
    return errors;
  }
  
  // Verify no 404 or 500 errors
  async verifyNoNetworkErrors() {
    this.page.on('response', response => {
      const status = response.status();
      if (status >= 400) {
        throw new Error(`HTTP ${status} error on ${response.url()}`);
      }
    });
  }
  
  // Take screenshot with timestamp
  async takeTimestampedScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }
}

// Authentication helpers
export class AuthHelpers {
  constructor(private page: Page) {}
  
  // Login using Supabase Auth
  async loginWithCredentials(email: string, password: string) {
    console.log(`🔐 Logging in with email: ${email}`);
    
    // Click login button
    await this.page.click('[data-testid="login-button"], button:has-text("Sign In"), button:has-text("Login")');
    
    // Wait for login modal/form
    await this.page.waitForSelector('input[type="email"], input[name="email"]', { timeout: TEST_CONFIG.DEFAULT_TIMEOUT });
    
    // Fill credentials
    await this.page.fill('input[type="email"], input[name="email"]', email);
    await this.page.fill('input[type="password"], input[name="password"]', password);
    
    // Submit login form
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();
    await submitButton.click();
    
    // Wait for redirect/success
    await this.page.waitForURL(url => !url.includes('login') && !url.includes('signin'), { 
      timeout: TEST_CONFIG.DEFAULT_TIMEOUT 
    });
    
    console.log('✅ Login successful');
  }
  
  // Check if user is logged in
  async isLoggedIn(): Promise<boolean> {
    try {
      // Look for logout button or user menu
      const userIndicators = [
        '[data-testid="user-menu"]',
        'button:has-text("Logout")',
        'button:has-text("Sign Out")',
        '[data-testid="logout-button"]',
        '.user-profile',
        '.user-avatar'
      ];
      
      for (const selector of userIndicators) {
        if (await this.page.locator(selector).count() > 0) {
          return true;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }
  
  // Get current user info from page
  async getCurrentUserInfo() {
    // Try to extract user info from DOM
    const userInfo = await this.page.evaluate(() => {
      // Try to get user data from various possible sources
      const userMenus = document.querySelectorAll('[data-testid="user-menu"], .user-info, .user-profile');
      if (userMenus.length > 0) {
        return {
          displayName: userMenus[0].textContent?.trim(),
          isLoggedIn: true
        };
      }
      
      // Check localStorage for user data
      const localStorageUser = localStorage.getItem('supabase.auth.token');
      return {
        hasToken: !!localStorageUser,
        isLoggedIn: !!localStorageUser
      };
    });
    
    return userInfo;
  }
}

// Event management helpers
export class EventHelpers {
  constructor(private page: Page, private pageHelpers: PageHelpers) {}
  
  // Create a new event
  async createEvent(eventData = TEST_CONFIG.TEST_EVENT) {
    console.log(`📅 Creating event: ${eventData.title}`);
    
    // Navigate to create event page
    await this.page.click('[data-testid="create-event-button"], button:has-text("Create Event"), a[href*="create"]');
    
    // Wait for form
    await this.page.waitForSelector('form, [data-testid="event-form"]', { timeout: TEST_CONFIG.DEFAULT_TIMEOUT });
    
    // Fill form fields
    await this.page.fill('input[name="title"], input[placeholder*="title" i]', eventData.title);
    await this.page.fill('textarea[name="description"], textarea[placeholder*="description" i]', eventData.description);
    await this.page.fill('input[name="location"], input[placeholder*="location" i]', eventData.location);
    
    // Select category if available
    if (await this.page.locator('select[name="category"], [data-testid="category-select"]').count() > 0) {
      await this.page.selectOption('select[name="category"], [data-testid="category-select"]', eventData.category);
    }
    
    // Set capacity
    await this.page.fill('input[name="capacity"], input[type="number"]', eventData.capacity.toString());
    
    // Set date and time
    await this.page.fill('input[name="date"], input[type="date"]', eventData.date);
    await this.page.fill('input[name="time"], input[type="time"]', eventData.time);
    
    // Submit form
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Submit")').first();
    
    // Wait for Supabase response
    const responsePromise = this.pageHelpers.waitForSupabaseRequest('events');
    await submitButton.click();
    await responsePromise;
    
    // Wait for success indication
    await this.page.waitForSelector('.success, .toast-success, [data-testid="success-message"]', { 
      timeout: TEST_CONFIG.DEFAULT_TIMEOUT 
    });
    
    console.log('✅ Event created successfully');
    return eventData;
  }
  
  // Find event in list
  async findEventInList(eventTitle: string): Promise<boolean> {
    await this.pageHelpers.waitForNetworkIdle();
    
    const eventExists = await this.page.locator(`text="${eventTitle}"`).count() > 0;
    return eventExists;
  }
  
  // Join an event
  async joinEvent(eventTitle: string) {
    console.log(`🤝 Joining event: ${eventTitle}`);
    
    // Find the event card
    const eventCard = this.page.locator(`[data-testid="event-card"]:has-text("${eventTitle}"), .event-card:has-text("${eventTitle}")`).first();
    
    if (await eventCard.count() === 0) {
      throw new Error(`Event "${eventTitle}" not found in list`);
    }
    
    // Click join button
    const joinButton = eventCard.locator('button:has-text("Join"), button:has-text("Request"), [data-testid="join-button"]').first();
    
    const responsePromise = this.pageHelpers.waitForSupabaseRequest('join_requests');
    await joinButton.click();
    await responsePromise;
    
    console.log('✅ Join request submitted');
  }
  
  // Edit an event
  async editEvent(eventTitle: string, newData: Partial<typeof TEST_CONFIG.TEST_EVENT>) {
    console.log(`✏️ Editing event: ${eventTitle}`);
    
    // Find and click edit button
    const eventCard = this.page.locator(`[data-testid="event-card"]:has-text("${eventTitle}"), .event-card:has-text("${eventTitle}")`).first();
    const editButton = eventCard.locator('button:has-text("Edit"), [data-testid="edit-button"]').first();
    
    await editButton.click();
    
    // Wait for edit form
    await this.page.waitForSelector('form, [data-testid="edit-form"]', { timeout: TEST_CONFIG.DEFAULT_TIMEOUT });
    
    // Verify pre-filled data and update fields
    if (newData.title) {
      const titleField = this.page.locator('input[name="title"]').first();
      await expect(titleField).toHaveValue(eventTitle); // Verify pre-fill
      await titleField.fill(newData.title);
    }
    
    if (newData.description) {
      const descField = this.page.locator('textarea[name="description"]').first();
      await descField.fill(newData.description);
    }
    
    // Submit changes
    const responsePromise = this.pageHelpers.waitForSupabaseRequest('events');
    await this.page.click('button[type="submit"], button:has-text("Save"), button:has-text("Update")');
    await responsePromise;
    
    console.log('✅ Event updated successfully');
  }
}

// Database verification helpers
export class DatabaseHelpers {
  private supabase = createSupabaseClient();
  
  // Verify event exists in database
  async verifyEventInDatabase(eventTitle: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('events')
      .select('id, title')
      .eq('title', eventTitle);
    
    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
    
    return data && data.length > 0;
  }
  
  // Verify join request in database
  async verifyJoinRequestInDatabase(eventId: number, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('join_requests')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('requester_id', userId);
    
    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
    
    return data && data.length > 0 && data[0].status === 'pending';
  }
  
  // Get event by title
  async getEventByTitle(title: string) {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('title', title)
      .single();
    
    if (error) {
      throw new Error(`Failed to get event: ${error.message}`);
    }
    
    return data;
  }
  
  // Clean up test data
  async cleanupTestData(eventTitle: string) {
    try {
      // Delete test event
      await this.supabase
        .from('events')
        .delete()
        .eq('title', eventTitle);
      
      console.log(`🧹 Cleaned up test event: ${eventTitle}`);
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  }
}

// Test report generator
export class TestReporter {
  private results: Array<{
    step: string;
    status: 'PASS' | 'FAIL';
    duration: number;
    error?: string;
    details?: string;
  }> = [];
  
  addResult(step: string, status: 'PASS' | 'FAIL', duration: number, error?: string, details?: string) {
    this.results.push({ step, status, duration, error, details });
  }
  
  generateHTMLReport(): string {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GGBang E2E Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .pass { color: #10b981; }
        .fail { color: #ef4444; }
        .duration { color: #6366f1; }
        .test-results { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .test-item { padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
        .test-item:last-child { border-bottom: none; }
        .test-step { font-weight: 600; }
        .test-status { padding: 4px 12px; border-radius: 20px; font-size: 0.875em; font-weight: 500; }
        .status-pass { background: #dcfce7; color: #166534; }
        .status-fail { background: #fecaca; color: #991b1b; }
        .test-duration { color: #6b7280; font-size: 0.875em; }
        .error-details { background: #fef2f2; color: #991b1b; padding: 10px; border-radius: 4px; margin-top: 10px; font-family: monospace; font-size: 0.875em; }
        .timestamp { text-align: center; color: #6b7280; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 GGBang E2E Test Report</h1>
            <p>Comprehensive end-to-end testing results for Steps 1-5</p>
        </div>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-value">${totalTests}</div>
                <div>Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-value pass">${passedTests}</div>
                <div>Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value fail">${failedTests}</div>
                <div>Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value duration">${(totalDuration / 1000).toFixed(1)}s</div>
                <div>Total Duration</div>
            </div>
        </div>
        
        <div class="test-results">
            ${this.results.map(result => `
                <div class="test-item">
                    <div>
                        <div class="test-step">${result.step}</div>
                        <div class="test-duration">Duration: ${(result.duration / 1000).toFixed(2)}s</div>
                        ${result.error ? `<div class="error-details">${result.error}</div>` : ''}
                        ${result.details ? `<div style="margin-top: 8px; color: #6b7280;">${result.details}</div>` : ''}
                    </div>
                    <span class="test-status status-${result.status.toLowerCase()}">${result.status}</span>
                </div>
            `).join('')}
        </div>
        
        <div class="timestamp">
            Generated on ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>`;
    
    return html;
  }
  
  async saveReport(filename = 'test-results/e2e-test-report.html') {
    const fs = await import('fs').then(m => m.promises);
    await fs.writeFile(filename, this.generateHTMLReport());
    console.log(`📊 Test report saved to: ${filename}`);
  }
}
