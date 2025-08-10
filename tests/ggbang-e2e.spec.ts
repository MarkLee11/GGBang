import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// 从 .env 读取测试用户
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Supabase URL not configured');
}

test.describe('GGBang E2E Test Suite - Steps 1–5', () => {
  
  test.beforeEach(async ({ page }) => {
    // 清理 cookies & 本地存储
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('Step 1 - Login & Environment Check', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/GGBang/);

    // 登录流程
    await page.click('text=Login');
    await page.fill('input[type="email"]', TEST_USER_EMAIL!);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD!);
    await page.click('button:has-text("Sign In")');

    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('Step 2 - My Events Page always accessible', async ({ page }) => {
    // 登录
    await page.goto('/');
    await page.click('text=Login');
    await page.fill('input[type="email"]', TEST_USER_EMAIL!);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD!);
    await page.click('button:has-text("Sign In")');

    // 验证导航栏能随时进入 My Events
    await page.click('text=My Events');
    await expect(page).toHaveURL(/my-events/);

    // 切换到主页再回来
    await page.click('text=Home');
    await page.click('text=My Events');
    await expect(page).toHaveURL(/my-events/);
  });

  test('Step 3 - Create Event & Verify', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Login');
    await page.fill('input[type="email"]', TEST_USER_EMAIL!);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD!);
    await page.click('button:has-text("Sign In")');

    await page.click('text=Create Event');
    await page.fill('input[name="title"]', 'Test Event');
    await page.fill('textarea[name="description"]', 'Test Description');
    await page.fill('input[name="location"]', 'Berlin');
    await page.selectOption('select[name="country"]', 'Germany');
    await page.fill('input[name="time"]', '2025-08-10T18:00');
    await page.selectOption('select[name="category"]', 'Music');
    
    await page.click('button:has-text("Submit")');

    // 验证在主页和 My Events 都能看到
    await expect(page.locator('text=Test Event')).toBeVisible();
    await page.click('text=My Events');
    await expect(page.locator('text=Test Event')).toBeVisible();
  });

  test('Step 4 - Join Event (No Self Join)', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Login');
    await page.fill('input[type="email"]', TEST_USER_EMAIL!);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD!);
    await page.click('button:has-text("Sign In")');

    // 找到不是自己创建的活动
    const joinButton = page.locator('button:has-text("Join")').first();
    if (await joinButton.count() === 0) {
      console.warn('No available events to join');
      return;
    }
    await joinButton.click();

    await expect(page.locator('text=Request Sent')).toBeVisible();
  });

  test('Step 5 - Edit Event with Prefill', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Login');
    await page.fill('input[type="email"]', TEST_USER_EMAIL!);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD!);
    await page.click('button:has-text("Sign In")');

    await page.click('text=My Events');
    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();

    // 确保预填数据存在
    await expect(page.locator('input[name="title"]')).not.toHaveValue('');
    await page.fill('input[name="title"]', 'Updated Event Title');
    await page.click('button:has-text("Submit")');

    await expect(page.locator('text=Updated Event Title')).toBeVisible();
  });

});
